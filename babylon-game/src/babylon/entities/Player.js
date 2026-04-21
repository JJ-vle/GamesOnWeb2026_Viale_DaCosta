import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial,
    SceneLoader,
    PointLight
} from '@babylonjs/core'
import "@babylonjs/loaders"; // Pour supporter les fichiers .fbx, .glb, etc.
import { PlayerInventory } from './items/PlayerInventory.js';

export class Player {

    constructor(scene) {
        this.scene = scene;
        this.mesh = this._createMesh();
        this.verticalVelocity = 0;
        this.speedZ = 0.2;
        this.speedX = 0.1;

        this.maxLife = 20;
        this.life = this.maxLife;
        this._loadCharacter();


        // STATS
        this.strength = 1;  // multiplicateur de dégâts
        this.speed = 1;     // multiplicateur de vitesse de déplacement
        this.speedshot = 1; // multiplicateur cadence de tir
        this.luck = 1;      // multiplie les chances de proc
        this.regen = 0;     // HP/s régénération passive (0 = désactivé)
        this.lifesteal = 0; // réservé
        this.armor = 0;     // réduction de dégâts plate (ex: armor=2 → -2 dégâts reçus)

        this._regenAccum = 0; // accumulateur regen (évite les micro-heals chaque frame)
        this.inventory = new PlayerInventory(this);


        // ── I-frames ──
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this._blinkTimer = 0;

        // Cache pour optimisation rotation (évite scene.pick + getChildMeshes chaque frame)
        this._rotationFrameSkip = 0;
        this._childMeshCache = null;
        this._targetRotationY = 0; // rotation cible (mise à jour par pick)
        this._hasTargetRotation = false;

        // ── Orbiting projectiles (Égalité) ──
        this._orbitAngle = 0;
        this._orbitMeshes = [];
        this._orbitDamageCD = new Map(); // enemy → lastHitTime

        // ── Poison DoT ──
        this._poisonStacks = []; // [{ dps, remaining }]
    }

    async _loadCharacter() {
        const path = "/assets/models/";
        const idleFile = "mecha01_idle.glb"; // Fichier IDLE
        const runFile = "mecha01_run.glb";   // Fichier RUN (In Place)
        const backFile = "mecha01_run_back.glb"

        try {
            // 1. Charger le modèle IDLE (C'est lui qui sera visible)
            const result = await SceneLoader.ImportMeshAsync("", path, idleFile, this.scene);

            if (result.meshes.length > 0) {
                const root = result.meshes[0];
                root.scaling = new Vector3(0.6, 0.6, 0.6); // Réduit à 60%
                root.position = new Vector3(0, -0.67, 0); // Ajustez si besoin (offsetX, offsetZ)
                root.parent = this.mesh;

                // Correction Matériaux
                result.meshes.forEach(m => {
                    if (m.material) {
                        m.material.transparencyMode = 1;
                        if (m.material.albedoTexture) m.material.useAlphaFromAlbedoTexture = true;
                        if (m.material.diffuseTexture) m.material.useAlphaFromDiffuseTexture = true;
                        m.material.backFaceCulling = false;
                    }
                });

                this.mesh.isVisible = false;

                this.idleAnim = result.animationGroups[0];
                // --- CHARGEMENT ANIMATION RUN ---
                try {
                    const runContainer = await SceneLoader.LoadAssetContainerAsync(path, runFile, this.scene);
                    this.runAnim = runContainer.animationGroups[0];
                    if (this.runAnim) {
                        this.runAnim.name = "Run";
                        // console.log(`[Animation RUN] chargée. Frames: ${this.runAnim.from} -> ${this.runAnim.to}`);
                    }

                    // --- CHARGEMENT ANIMATION BACK ---
                    const backContainer = await SceneLoader.LoadAssetContainerAsync(path, backFile, this.scene);
                    this.walkBackAnim = backContainer.animationGroups[0]; // Correction: backContainer

                    // Cibles pour le retargeting (Communs à RUN et WALK_BACK)
                    const targetNodes = [...result.meshes, ...result.transformNodes];

                    // Retargeting RUN
                    if (this.runAnim) {
                        this.runAnim.stop();
                        this._retargetAnimation(this.runAnim, targetNodes);
                    }

                    // Retargeting WALK BACK
                    if (this.walkBackAnim) {
                        this.walkBackAnim.name = "WalkBack";
                        this.walkBackAnim.stop();
                        this._retargetAnimation(this.walkBackAnim, targetNodes);
                    }

                } catch (err) {
                    console.error("Erreur chargement Anim Run/Back:", err);
                }

                // Etat initial : Idle
                if (this.idleAnim) {
                    this.idleAnim.loopAnimation = true;
                    this.idleAnim.start(true);
                }
                this.currentAnim = "idle";
            }

        } catch (e) {
            // Erreur chargement modèle 3D — fallback sur le mesh par défaut
            console.warn("⚠️ Chargement modèle échoué (assets manquants?). Continuant avec mesh par défaut.", e.message);
            // Le mesh par défaut (box) reste visible pour que le jeu continue
            this.mesh.isVisible = true;
        }
    }

    _retargetAnimation(animGroup, targetNodes) {
        const targetMap = {};
        targetNodes.forEach(node => {
            targetMap[node.name] = node;
        });

        // console.log(`[Retargeting] Cibles dispos dans le mesh:`, Object.keys(targetMap));


        animGroup.targetedAnimations.forEach(ta => {
            let targetName = ta.target.name;

            // Retirer le préfixe Mixamorig: si présent
            if (targetName.startsWith("Mixamorig:")) {
                targetName = targetName.replace("Mixamorig:", "");
            }

            if (targetMap[targetName]) {
                ta.target = targetMap[targetName];
            } else {
                console.warn(`⚠️ Cible "${ta.target.name}" (nettoyé: "${targetName}") NON TROUVÉE dans le modèle affiché.`);
            }
        });
    }

    _createMesh() {
        const box = MeshBuilder.CreateBox("player", { size: 1.2 }, this.scene); // Réduit à 60%
        box.position = new Vector3(4, 1, 0);

        const mat = new StandardMaterial("playerMat", this.scene);
        mat.diffuseColor = new Color3(1, 0, 0);
        box.material = mat;

        // Configuration des collisions
        box.checkCollisions = true;
        box.ellipsoid = new Vector3(0.6, 0.6, 0.6); // Taille de la "bulle" de collision (55%)

        // --- Lumière du joueur (Aura Cyberpunk) ---
        // Une lumière qui suit le joueur permettant d'éclairer autour de lui
        const playerLight = new PointLight("playerLight", new Vector3(0, 5, 0), this.scene);
        playerLight.parent = box;
        playerLight.diffuse = new Color3(0.9, 0.95, 1.0); // Lumière blanche pure, très légèrement bleutée
        playerLight.specular = new Color3(1, 1, 1);
        playerLight.intensity = 5.0; // Intensité très forte !
        playerLight.range = 100; // Rayon énorme pour vraiment voir l'écran

        return box;
    }

    getForwardDirection() {
        // direction "devant" le joueur
        return new Vector3(0, 0, 1)
    }

    update(inputMap) {
        // Faire tourner le joueur vers la souris
        this._updateRotation();

        let forwardInput = 0;
        let sideInput = 0;

        // Gestion des inputs
        if (inputMap["ArrowUp"] || inputMap["z"] || inputMap["w"]) {
            forwardInput += 1;
        }
        if (inputMap["ArrowDown"] || inputMap["s"]) {
            forwardInput -= 1;
        }

        if (inputMap["ArrowLeft"] || inputMap["q"] || inputMap["a"]) {
            sideInput += 1;
        }
        if (inputMap["ArrowRight"] || inputMap["d"]) {
            sideInput -= 1;
        }

        // Normalisation de l'input pour éviter l'accélération en diagonale
        const inputMagnitude = Math.sqrt(forwardInput * forwardInput + sideInput * sideInput);
        if (inputMagnitude > 0) {
            forwardInput /= inputMagnitude;
            sideInput /= inputMagnitude;
        }

        let moveDir = new Vector3(0, 0, 0);
        const camera = this.scene.activeCamera;

        if (camera) {
            // Calcul des vecteurs de direction
            let forward = this.mesh.position.subtract(camera.position);
            forward.y = 0;
            forward.normalize();

            let right = Vector3.Cross(forward, Vector3.Up()).normalize();

            moveDir.addInPlace(forward.scale(forwardInput * this.speedZ * this.speed));
            moveDir.addInPlace(right.scale(sideInput * this.speedX * this.speed));
        }

        // --- GESTION ANIMATION ---

        // 1. Déterminer l'animation cible
        let targetAnimName = "run";
        let targetAnimGroup = this.runAnim;

        // Si on recule, on préfère l'animation de recul
        // On utilise l'input brut pour décider de l'intention de reculer
        if ((inputMap["ArrowDown"] || inputMap["s"]) && this.walkBackAnim) {
            targetAnimName = "walkBack";
            targetAnimGroup = this.walkBackAnim;
        }

        // 2. Appliquer le mouvement et l'animation
        if (moveDir.length() > 0) {
            this.mesh.moveWithCollisions(moveDir);

            // Si on doit changer d'animation ou si aucune n'est jouée
            if (this.currentAnim !== targetAnimName && targetAnimGroup) {
                // console.log(`State change: ${this.currentAnim} -> ${targetAnimName}`);
                this.scene.stopAllAnimations();
                targetAnimGroup.start(true, 1.0, targetAnimGroup.from, targetAnimGroup.to, false);
                this.currentAnim = targetAnimName;
            }
        } else {
            // Si on ne bouge pas -> Idle
            if (this.currentAnim !== "idle" && this.idleAnim) {
                // console.log("State change: MOVEMENT -> IDLE");
                this.scene.stopAllAnimations();
                this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
                this.currentAnim = "idle";
            }
        }

        // Maintenir le joueur au sol (pas de saut — Espace = capacité active)
        if (this.mesh.position.y < 1) {
            this.mesh.position.y = 1;
        }

        // ── Régénération passive ──
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        if (this.regen > 0 && this.life < this.maxLife) {
            this._regenAccum += this.regen * dt;
            if (this._regenAccum >= 1) {
                const healAmt = Math.floor(this._regenAccum);
                this._regenAccum -= healAmt;
                this.heal(healAmt);
            }
        }

        // ── Poison DoT tick ──
        this._updatePoison(dt);

        // ── I-frames : invulnérabilité temporaire ──
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= dt;
            this._blinkTimer += dt;
            // Clignotement toutes les 0.1s
            this.mesh.visibility = Math.floor(this._blinkTimer / 0.1) % 2 === 0 ? 0.2 : 1.0;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
                this.mesh.visibility = 1.0;
            }
        }

        // ── Orbiting projectiles (Égalité) ──
        this._updateOrbitingProjectiles(dt);
    }


    /**
     * Égalité: maintient des projectiles en orbite autour du joueur.
     * Nombre = player.orbitingProjectiles. Inflige 2 DPS par contact.
     */
    _updateOrbitingProjectiles(dt) {
        const count = this.orbitingProjectiles || 0
        if (count <= 0) {
            // Nettoyer si l'item est retiré
            if (this._orbitMeshes.length > 0) {
                this._orbitMeshes.forEach(m => m.dispose())
                this._orbitMeshes = []
            }
            return
        }

        // Créer/ajuster le nombre de meshes orbitants
        while (this._orbitMeshes.length < count) {
            const orb = MeshBuilder.CreateSphere(
                "orbitProj_" + this._orbitMeshes.length,
                { diameter: 0.4, segments: 6 }, this.scene
            )
            // Matériau partagé
            if (!Player._orbitMat || Player._orbitMat.getScene() !== this.scene) {
                const mat = new StandardMaterial("orbitProjMat", this.scene)
                mat.diffuseColor = new Color3(0.4, 0.6, 1)
                mat.emissiveColor = new Color3(0.2, 0.4, 1)
                mat.disableLighting = true
                Player._orbitMat = mat
            }
            orb.material = Player._orbitMat
            orb.isPickable = false
            orb.checkCollisions = false
            this._orbitMeshes.push(orb)
        }
        while (this._orbitMeshes.length > count) {
            this._orbitMeshes.pop().dispose()
        }

        // Rotation orbitale
        const orbitRadius = 2.5
        const orbitSpeed = 3.0 // rad/s
        this._orbitAngle += orbitSpeed * dt
        const angleStep = (Math.PI * 2) / count

        const now = performance.now() / 1000

        for (let i = 0; i < count; i++) {
            const orb = this._orbitMeshes[i]
            if (!orb) continue
            const angle = this._orbitAngle + i * angleStep
            orb.position.x = this.mesh.position.x + Math.cos(angle) * orbitRadius
            orb.position.y = this.mesh.position.y + 0.3
            orb.position.z = this.mesh.position.z + Math.sin(angle) * orbitRadius
        }

        // Dégâts au contact avec les ennemis (via CollisionSystem.enemies)
        if (this._collisionEnemies) {
            const orbRadiusSq = (orbitRadius + 1.5) * (orbitRadius + 1.5) // pré-filtre
            for (const enemy of this._collisionEnemies) {
                if (!enemy.enemy || enemy.life <= 0 || enemy._isAlly) continue
                // Pré-filtre distance au joueur
                const edx = enemy.enemy.position.x - this.mesh.position.x
                const edz = enemy.enemy.position.z - this.mesh.position.z
                if (edx * edx + edz * edz > orbRadiusSq) continue

                // Cooldown par ennemi (0.5s entre chaque hit)
                const lastHit = this._orbitDamageCD.get(enemy) || 0
                if (now - lastHit < 0.5) continue

                for (const orb of this._orbitMeshes) {
                    if (orb.intersectsMesh(enemy.enemy, false)) {
                        enemy.takeDamage(2)
                        this._orbitDamageCD.set(enemy, now)
                        break
                    }
                }
            }
        }
    }

    _updateRotation() {
        // Pick raycast throttlé (1 frame sur 3) pour obtenir la cible
        this._rotationFrameSkip++;
        if (this._rotationFrameSkip >= 3) {
            this._rotationFrameSkip = 0;

            // Cache les child meshes (ne change pas en cours de jeu)
            if (!this._childMeshCache) {
                this._childMeshCache = new Set(this.mesh.getChildMeshes());
            }
            const childSet = this._childMeshCache;

            const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
                return mesh !== this.mesh && !childSet.has(mesh);
            });

            if (pickResult.hit) {
                const targetPoint = pickResult.pickedPoint;
                targetPoint.y = this.mesh.position.y;
                // Calculer l'angle cible sans l'appliquer directement
                const dx = targetPoint.x - this.mesh.position.x;
                const dz = targetPoint.z - this.mesh.position.z;
                this._targetRotationY = Math.atan2(-dx, -dz);
                this._hasTargetRotation = true;
            }
        }

        // Interpolation fluide chaque frame vers la rotation cible
        if (this._hasTargetRotation) {
            let current = this.mesh.rotation.y;
            let target = this._targetRotationY;
            // Normaliser la différence d'angle entre -PI et PI
            let diff = target - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * 0.35;
        }
    }

    takeDamage(amount) {
        if (this.isInvulnerable) return;
        // Immuable: invulnérabilité temporaire via item actif
        if (this.invulnerableItem) return;
        // Confiance: multiplier les dégâts reçus
        const multiplied = amount * (this.damageTakenMultiplier || 1);
        // L'armure réduit les dégâts (minimum 1)
        const effective = Math.max(1, multiplied - this.armor);
        this.life -= effective;
        if (this.life < 0) this.life = 0;

        // ── Mise à jour: respawn si HP = 0 et respawnCount > 0 ──
        if (this.life <= 0 && (this.respawnCount || 0) > 0) {
            this.respawnCount--;
            this.life = Math.ceil(this.maxLife * 0.5);
            this.isInvulnerable = true;
            this.invulnerabilityTimer = 2.0;
            this._blinkTimer = 0;
            return;
        }

        // Super Hot (iframes: 0) → pas d'invulnérabilité post-hit
        const iframeDuration = this.iframes ?? 1.5;
        if (iframeDuration > 0) {
            this.isInvulnerable = true;
            this.invulnerabilityTimer = iframeDuration;
            this._blinkTimer = 0;
        }
    }

    heal(amount) {
        this.life += amount;
        if (this.life > this.maxLife) {
            this.life = this.maxLife;
        }
    }

    /**
     * Applique un stack de poison sur le joueur.
     * @param {number} dps - dégâts par seconde
     * @param {number} duration - durée en secondes
     */
    applyPoison(dps, duration) {
        this._poisonStacks.push({ dps, remaining: duration });
    }

    /**
     * Tick tous les stacks de poison actifs.
     * Si poisonToHeal est true (Solution Miracle), convertit en soin.
     */
    _updatePoison(dt) {
        if (this._poisonStacks.length === 0) return;

        let totalDps = 0;
        for (let i = this._poisonStacks.length - 1; i >= 0; i--) {
            const stack = this._poisonStacks[i];
            totalDps += stack.dps;
            stack.remaining -= dt;
            if (stack.remaining <= 0) {
                this._poisonStacks.splice(i, 1);
            }
        }

        const tickDamage = totalDps * dt;
        if (tickDamage <= 0) return;

        if (this.poisonToHeal) {
            // Solution Miracle : convertit le poison en soin
            this.heal(tickDamage);
        } else {
            // Dégâts de poison (ignore i-frames et armor)
            this.life -= tickDamage;
            if (this.life < 0) this.life = 0;
        }
    }
}