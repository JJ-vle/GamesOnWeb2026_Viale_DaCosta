import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
import { PerceptionSystem } from '../../systems/PerceptionSystem'
import { PathfindingHelper } from '../../systems/PathfindingHelper'
import { EnemyAIFSM } from '../../systems/EnemyAIFSM'

export class Enemy {

    constructor(scene, contact, maxLife, aiConfig = null) {
        this.scene = scene;
        this.enemy = null; // à créer dans les classes filles
        this.material = null
        this._originalDiffuseColor = null // Sauvegardé au premier takeDamage
        this.verticalVelocity = 0;
        this.contact = contact;

        this.maxLife = maxLife
        this.life = this.maxLife

        // Valeurs par défaut — chaque classe fille peut les surcharger
        this.xpValue = 10
        this.coinValue = 5

        this._hitTimer = 0
        this.onDeath = null // callback() quand l'ennemi meurt
        this._hasSeenPlayer = false

        // ──── SYSTÈMES IA ────
        this.perception = null
        this.fsm = null
        this.pathfinding = null
        if (aiConfig !== false) {
            this._initializeAI(aiConfig)
        }
    }

    /** Multiplicateur de ralentissement (1 = normal, 0 = immobile). */
    get _slow() {
        return (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
    }

    /**
     * Initialise les systèmes AI (overridable dans les classes filles)
     */
    _initializeAI(aiConfig = null) {
        // État de perception simple
        this.perception = {
            canSee: false,
            lastSeenPos: null,
            lastSeenTime: Infinity,
        }

        // ── OPTIMISATION: PerceptionSystem partagé (injecté par MainScene) ──
        // N'instancie plus un PerceptionSystem par ennemi
        this.perceptionSystem = null

        this.fsm = new EnemyAIFSM({
            fovDistance: 50,
            fovAngle: 90,
            attackRange: 5,
            retreatThreshold: 0.3,
            ...(aiConfig || {}),
        })

        // NavGrid partagée (sera injectée depuis MainScene)
        const navGrid = (aiConfig && aiConfig.navGrid) || null
        this.pathfinding = new PathfindingHelper(this.scene, navGrid)
    }

    /**
     * Injecte un PerceptionSystem partagé (1 seule instance pour tous les ennemis)
     */
    setPerceptionSystem(perceptionSystem) {
        this.perceptionSystem = perceptionSystem
    }

    /**
     * Injecte la NavGrid partagée dans le pathfinding de cet ennemi 
     * (appelé par MainScene après spawn)
     */
    setNavGrid(navGrid) {
        if (this.pathfinding) {
            this.pathfinding.navGrid = navGrid
        }
    }

    _createMesh() {
    }
    
    /**
     * Update principal par défaut.
     * Les classes filles surchargent update() et appellent updateNavGridAI() pour le mouvement.
     */
    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return
        this.updateHitFlash()

        // Mouvement IA NavGrid (si perception + fsm + pathfinding sont injectés)
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result && result.moved) {
            this.applyRotation(result.scaledMove)
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  BRIQUES RÉUTILISABLES — les classes filles composent avec ça
    // ──────────────────────────────────────────────────────────────

    /**
     * Gère le flash rouge au hit (à appeler en début d'update)
     */
    updateHitFlash() {
        if (this._hitTimer > 0) {
            this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000
            if (this._hitTimer <= 0) {
                if (this._originalDiffuseColor && this.material) {
                    this.material.diffuseColor = this._originalDiffuseColor.clone()
                } else if (this.material) {
                    this.material.diffuseColor = new Color3(1, 1, 1)
                }
            }
        }
    }

    /**
     * Pipeline IA complet: Perception → FSM → Pathfinding A* → Mouvement
     *
     * Retourne un objet { action, scaledMove, moved, dt } pour que la classe fille
     * puisse ajouter sa propre logique (tir, dash, rotation, animation…).
     *
     * @param {Mesh} playerMesh - mesh du joueur
     * @param {Enemy[]} enemies - liste des ennemis (pour séparation)
     * @param {Object} [options]
     * @param {number} [options.separationDist=2.5] - distance de séparation
     * @param {number} [options.separationForce=1.2] - force de séparation
     * @param {boolean} [options.useCollisions=true] - moveWithCollisions vs addInPlace
     * @returns {{ action: Object, scaledMove: Vector3, moved: boolean, dt: number } | null}
     */
    updateNavGridAI(playerMesh, enemies = [], options = {}) {
        if (!this.enemy || !this.fsm || !this.perception || !this.pathfinding) return null

        const dt = this.scene.getEngine().getDeltaTime() / 1000
        const {
            separationDist = 2.5,
            separationForce = 1.2,
            useCollisions = true,
        } = options

        // ── Allié converti: timer + ciblage ennemi ──
        if (this._isAlly) {
            this._allyTimer -= dt
            if (this._allyTimer <= 0) {
                this.life = 0
                this.destroy()
                return null
            }
            // Trouver l'ennemi non-allié le plus proche comme cible
            let closestEnemy = null
            let closestDist = Infinity
            for (const other of enemies) {
                if (!other || !other.enemy || other === this || other._isAlly || other.life <= 0) continue
                const d = Vector3.Distance(this.enemy.position, other.enemy.position)
                if (d < closestDist) { closestDist = d; closestEnemy = other }
            }
            // Utiliser la position de l'ennemi cible comme "playerMesh" pour la FSM
            const allyTarget = closestEnemy ? closestEnemy.enemy : null
            if (allyTarget) {
                this.perception.canSee = true
                if (this.perception.lastSeenPos) this.perception.lastSeenPos.copyFrom(allyTarget.position)
                else this.perception.lastSeenPos = allyTarget.position.clone()
                this.perception.lastSeenTime = 0
                this._hasSeenPlayer = true

                const action = this.fsm.getAction({
                    health: this.life,
                    maxHealth: this.maxLife,
                    position: this.enemy.position,
                    playerPos: allyTarget.position,
                    targetPos: allyTarget.position,
                })

                const targetPos = action.targetPos
                if (!targetPos || action.action === 'idle' || action.action === 'dead') {
                    return { action, scaledMove: Vector3.Zero(), moved: false, dt }
                }

                const moveVec = this.pathfinding.getMovementVector(
                    this.enemy.position, targetPos,
                    action.speed * (this.speed || 1), [], separationDist, separationForce
                )
                const scaledMove = moveVec.scale(this._slow)

                if (useCollisions) this.enemy.moveWithCollisions(scaledMove)
                else this.enemy.position.addInPlace(scaledMove)

                // Infliger des dégâts de contact à l'ennemi cible
                if (closestDist < 2.5 && closestEnemy.life > 0) {
                    closestEnemy.takeDamage(3 * dt) // 3 DPS au contact
                }

                return { action, scaledMove, moved: true, dt }
            }
            return { action: { action: 'idle' }, scaledMove: Vector3.Zero(), moved: false, dt }
        }

        // ── 1. PERCEPTION ──
        const fovDistance = this.fsm.config.fovDistance || 25
        const fovAngle = this.fsm.config.fovAngle || 120

        let playerVisible = false
        if (this.perceptionSystem) {
            playerVisible = this.perceptionSystem.canSeePlayer(
                this.enemy.position, playerMesh.position,
                fovDistance, fovAngle, Vector3.Forward(), false
            )
        } else {
            // Fallback simple : distance seule
            playerVisible = Vector3.Distance(this.enemy.position, playerMesh.position) < fovDistance
        }

        // Mise à jour perception
        this.perception.canSee = playerVisible
        if (playerVisible) {
            if (this.perception.lastSeenPos) this.perception.lastSeenPos.copyFrom(playerMesh.position)
            else this.perception.lastSeenPos = playerMesh.position.clone()
            this.perception.lastSeenTime = 0
            this._hasSeenPlayer = true
        } else if (this._hasSeenPlayer) {
            // Continue à tracker même si hors de vue
            if (this.perception.lastSeenPos) this.perception.lastSeenPos.copyFrom(playerMesh.position)
            else this.perception.lastSeenPos = playerMesh.position.clone()
            this.perception.lastSeenTime = 0
        } else {
            this.perception.lastSeenTime += dt
        }

        // ── 2. FSM → déterminer action ──
        const action = this.fsm.getAction({
            health: this.life,
            maxHealth: this.maxLife,
            position: this.enemy.position,
            playerPos: playerVisible ? playerMesh.position : null,
            targetPos: this.perception.lastSeenPos,
        })

        // ── 3. MOUVEMENT via Pathfinding A* ──
        const targetPos = action.targetPos
        if (!targetPos || action.action === 'idle' || action.action === 'dead') {
            return { action, scaledMove: Vector3.Zero(), moved: false, dt }
        }

        // Filtrer ennemis proches pour séparation (éviter O(N²))
        const nearbyEnemies = enemies.filter(e => {
            if (!e || !e.enemy) return false
            const dist = Vector3.Distance(this.enemy.position, e.enemy.position)
            return dist < 10
        })

        const moveVec = this.pathfinding.getMovementVector(
            this.enemy.position, targetPos,
            action.speed * (this.speed || 1),
            nearbyEnemies, separationDist, separationForce
        )

        const slow = this._slow
        const scaledMove = moveVec.scale(slow)

        if (useCollisions) {
            this.enemy.moveWithCollisions(scaledMove)
        } else {
            this.enemy.position.addInPlace(scaledMove)
        }

        return { action, scaledMove, moved: true, dt }
    }

    /**
     * Applique une rotation smooth vers la direction de mouvement.
     * @param {Vector3} moveVec - vecteur de mouvement courant
     * @param {number} [lerpFactor=0.15] - vitesse d'interpolation (0-1)
     */
    applyRotation(moveVec, lerpFactor = 0.15) {
        if (!this.enemy || moveVec.lengthSquared() < 0.0001) return

        const targetY = Math.atan2(moveVec.x, moveVec.z)
        let diff = targetY - this.enemy.rotation.y
        while (diff < -Math.PI) diff += Math.PI * 2
        while (diff > Math.PI) diff -= Math.PI * 2
        this.enemy.rotation.y += diff * lerpFactor
    }

    
    takeDamage(amount) {
        this.life -= amount

        // Sauvegarder la couleur d'origine avant le premier flash rouge
        if (this.material && !this._originalDiffuseColor) {
            this._originalDiffuseColor = this.material.diffuseColor.clone()
        }

        if (this.material) this.material.diffuseColor = new Color3(1, 0, 0)
        this._hitTimer = 0.1

        // AGGRO IMMÉDIAT: être touché → forcer la poursuite du joueur
        if (!this._isAlly) {
            this._hasSeenPlayer = true
            if (this.fsm) {
                this.fsm.send({ type: 'PLAYER_SPOTTED' })
            }
        }

        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }

    /**
     * Convertit l'ennemi en allié temporaire.
     * L'allié cible les ennemis proches au lieu du joueur.
     * @param {number} duration - durée en secondes (défaut: 15)
     */
    convertToAlly(duration = 15) {
        this._isAlly = true
        this._allyTimer = duration
        this.life = Math.ceil(this.maxLife * 0.5)
        this.contact = null // ne frappe plus le joueur au contact

        // Teinte verte pour indiquer l'allié
        if (this.material) {
            this.material.diffuseColor = new Color3(0.2, 1, 0.3)
            this.material.emissiveColor = new Color3(0, 0.4, 0.1)
            this._originalDiffuseColor = new Color3(0.2, 1, 0.3)
        }
    }
    
    // ── OPTIMISATION: Vecteur réutilisable de séparation ──
    static _sepVec = new Vector3(0, 0, 0)
    static _awayVec = new Vector3(0, 0, 0)
    
    _getFlockingVector(enemiesArray, separationDistance = 3, separationForce = 0.5) {
        const sep = Enemy._sepVec
        sep.set(0, 0, 0)
        if (!this.enemy || !enemiesArray) return sep

        const px = this.enemy.position.x, pz = this.enemy.position.z
        const sepDistSq = separationDistance * separationDistance
        let count = 0

        for (let i = 0; i < enemiesArray.length; i++) {
            const other = enemiesArray[i]
            if (other === this || !other.enemy) continue
            const dx = px - other.enemy.position.x
            const dz = pz - other.enemy.position.z
            const distSq = dx * dx + dz * dz
            if (distSq < sepDistSq && distSq > 0.000001) {
                const dist = Math.sqrt(distSq)
                const invDist = 1 / dist
                const force = separationDistance - dist
                sep.x += dx * invDist * force
                sep.z += dz * invDist * force
                count++
            }
        }
        if (count > 0) {
            sep.scaleInPlace(separationForce / count)
        }
        sep.y = 0
        return sep
    }

    /**
     * ── POOL: Réinitialise complètement l'ennemi pour réutilisation ──
     * Appelé par EnemyPool au lieu de destroy() quand on veut recycler.
     */
    reset() {
        this.life = this.maxLife
        this._hitTimer = 0
        this._hasSeenPlayer = false
        this.onDeath = null
        this.contact = null

        // Reset material color (annuler le flash rouge de takeDamage)
        if (this.material) {
            if (this._originalDiffuseColor) {
                this.material.diffuseColor = this._originalDiffuseColor.clone()
            } else {
                this.material.diffuseColor = new Color3(1, 1, 1)
            }
        }

        // Reset AI state — recréer si détruit par destroy()
        if (!this.perception) {
            this.perception = {
                canSee: false,
                lastSeenPos: null,
                lastSeenTime: Infinity,
            }
        } else {
            this.perception.canSee = false
            this.perception.lastSeenPos = null
            this.perception.lastSeenTime = Infinity
        }

        if (this.fsm) {
            // Sauvegarder la config AVANT de dispose
            const fsmConfig = this.fsm.config
            this.fsm.dispose()
            this.fsm = new EnemyAIFSM(fsmConfig)
        } else {
            // FSM été détruit par destroy() → recréer avec config par défaut
            this.fsm = new EnemyAIFSM({
                fovDistance: 50,
                fovAngle: 90,
                attackRange: 5,
                retreatThreshold: 0.3,
            })
        }

        if (this.pathfinding) {
            this.pathfinding._currentPath = []
            this.pathfinding._currentWaypointIndex = 0
            this.pathfinding._pathTarget = null
            this.pathfinding._stuckFrameCount = 0
            this.pathfinding._lastPos = null
        } else {
            // Pathfinding détruit par destroy() → recréer
            this.pathfinding = new PathfindingHelper(this.scene, null)
        }

        // Reset mesh visual
        if (this.enemy) {
            this.enemy.position.set(0, -1000, 0)
            this.enemy.setEnabled(false)
        }
    }
    
    destroy() {
        // Appeler onDeath AVANT de disposer quoi que ce soit
        const deathCallback = this.onDeath
        this.onDeath = null // Empêcher double-call

        // ⚠️ NE PAS détruire fsm/perception/pathfinding ici!
        // L'ennemi sera recyclé par le pool via reset() qui gère le cleanup proprement.
        // Si on les null ici, reset() ne peut plus les recréer correctement.

        // Cacher le mesh en attendant le recyclage
        if (this.enemy) {
            this.enemy.setEnabled(false)
            this.enemy.position.set(0, -1000, 0)
        }

        if (deathCallback) deathCallback()
    }

    /**
     * Dispose DÉFINITIVEMENT l'ennemi (mesh inclus).
     * Utilisé uniquement quand on veut vraiment libérer la mémoire GPU.
     */
    disposeFull() {
        if (this.fsm) {
            this.fsm.dispose()
            this.fsm = null
        }
        this.perception = null
        this.pathfinding = null
        this.perceptionSystem = null

        if (this.enemy) {
            this.enemy.dispose()
            this.enemy = null
        }
    }

}