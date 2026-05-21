import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
import { Enemy } from '../Enemy'

/**
 * NEON-LEVIATHAN — Boss de fin, "Le Tank Souverain"
 *
 * Phase 1 (Artillerie) : quasi-invulnérable (5% des dégâts).
 *   → Instancie deux tourelles (LeviathanTurret LEFT/RIGHT) via onSpawn.
 *   → Passe en Phase 2 quand les deux tourelles sont détruites.
 *
 * Phase 2 (Overheat) : vulnérable à 100% des dégâts.
 *   → Invoque 4 BossJammerUnit aux coins de l'arène → scene.isDashJammed = true.
 *   → Lance un cycle AOE : 12s avertissement (disc rouge pulsant)
 *                        → 3s d'AOE active (10 DPS si joueur dans le rayon 25u)
 *                        → 15s de refroidissement, puis reboucle.
 *
 * 500HP / 0 Speed / Catégorie Boss
 */
export class NeonLeviathan extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 500, false) // false = pas d'IA
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0
        this.damage = 8

        this.xpValue = 500
        this.coinValue = 300

        // ── État général ──
        this._phase = 1            // 1 = Artillerie | 2 = Overheat
        this._turretsAlive = 2
        this._jammersAlive = 0
        this._initialized = false  // premier appel à update()
        this._phase2Entered = false

        // ── AOE Phase 2 ──
        this._aoePhase = 'idle'    // 'idle' | 'warning' | 'active' | 'cooldown'
        this._aoeTimer = 0
        this._AOE_WARNING   = 12   // secondes d'avertissement
        this._AOE_ACTIVE    = 3    // secondes d'AOE active
        this._AOE_COOLDOWN  = 15   // secondes de cooldown
        this._AOE_RADIUS    = 25   // rayon en unités (≈50% de la map 130u)
        this._aoeWarningMesh = null

        // ── Visuels ──
        this._pulseTimer = 0
        this._originalEmissive = new Color3(0.0, 0.3, 1.0)

        // Notification une seule fois par transition
        this._phase2NotifDone = false
    }

    // ─────────────────────────────────────────────────────────────
    //  MESH
    // ─────────────────────────────────────────────────────────────

    _createMesh() {
        // Corps principal (boîte massive)
        const body = MeshBuilder.CreateBox('NeonLeviathan_body', {
            width: 9, height: 5, depth: 13
        }, this.scene)
        body.position = new Vector3(0, 2.5, 0)
        body.checkCollisions = false

        const mat = new StandardMaterial('leviathanMat', this.scene)
        mat.diffuseColor = new Color3(0.05, 0.05, 0.25)
        mat.emissiveColor = new Color3(0.0, 0.3, 1.0)
        body.material = mat

        // Épaulements latéraux (visuels d'armure)
        const wingL = MeshBuilder.CreateBox('NeonLeviathan_wingL', {
            width: 5, height: 1.5, depth: 9
        }, this.scene)
        wingL.parent = body
        wingL.position = new Vector3(-7, 0, 0)
        wingL.material = mat

        const wingR = MeshBuilder.CreateBox('NeonLeviathan_wingR', {
            width: 5, height: 1.5, depth: 9
        }, this.scene)
        wingR.parent = body
        wingR.position = new Vector3(7, 0, 0)
        wingR.material = mat

        // Dôme central (cœur du boss)
        const core = MeshBuilder.CreateSphere('NeonLeviathan_core', {
            diameter: 3.5, segments: 8
        }, this.scene)
        core.parent = body
        core.position = new Vector3(0, 1.5, 0)
        const coreMat = new StandardMaterial('leviathanCoreMat', this.scene)
        coreMat.diffuseColor = new Color3(0.0, 0.5, 1.0)
        coreMat.emissiveColor = new Color3(0.0, 0.4, 1.0)
        coreMat.alpha = 0.85
        core.material = coreMat
        this._coreMesh = core
        this._coreMat = coreMat

        return body
    }

    // ─────────────────────────────────────────────────────────────
    //  PRISE DE DÉGÂTS
    // ─────────────────────────────────────────────────────────────

    takeDamage(amount) {
        if (this._phase === 1) {
            // 95% de réduction — quasi invulnérable tant que les tourelles sont en vie
            amount = amount * 0.05
        }
        super.takeDamage(amount)
    }

    // ─────────────────────────────────────────────────────────────
    //  CALLBACKS des sous-entités
    // ─────────────────────────────────────────────────────────────

    /** Appelé par EnemySpawnHandler quand une tourelle meurt. */
    notifyTurretDeath() {
        this._turretsAlive = Math.max(0, this._turretsAlive - 1)
        if (this._turretsAlive === 0 && this._phase === 1) {
            this._phase = 2
        }
    }

    /** Appelé par EnemySpawnHandler quand un BossJammerUnit meurt. */
    notifyJammerDeath() {
        this._jammersAlive = Math.max(0, this._jammersAlive - 1)
        if (this._jammersAlive <= 0) {
            this.scene.isDashJammed = false
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  UPDATE PRINCIPAL
    // ─────────────────────────────────────────────────────────────

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Initialisation au premier appel : spawn des tourelles
        if (!this._initialized) {
            this._initialized = true
            this._spawnTurrets(callbacks)
            callbacks.onShowNotification?.('⚠ NEON-LEVIATHAN ACTIVÉ — Détruisez les tourelles !', '#ff4400', 4000)
        }

        // Rotation lente vers le joueur (cosmétique)
        this._updateRotation(playerMesh, dt)

        // ── Phase 1 : pulse bleu ──
        if (this._phase === 1) {
            this._pulseTimer += dt * 1.5
            const p = Math.abs(Math.sin(this._pulseTimer))
            this.material.emissiveColor.set(0, 0.2 + 0.3 * p, 0.7 + 0.3 * p)
            if (this._coreMat) this._coreMat.emissiveColor.set(0, 0.3 + 0.3 * p, 1)
        }

        // ── Transition Phase 2 ──
        if (this._phase === 2 && !this._phase2Entered) {
            this._phase2Entered = true
            this._enterPhase2(callbacks)
        }

        // ── Phase 2 : AOE cycle + pulse rouge ──
        if (this._phase === 2) {
            this._pulseTimer += dt * 3
            const p = Math.abs(Math.sin(this._pulseTimer))
            this.material.emissiveColor.set(0.8 + 0.2 * p, 0.1 * p, 0)
            if (this._coreMat) this._coreMat.emissiveColor.set(1, 0.1 * p, 0)

            this._tickAoe(dt, playerMesh, callbacks)
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  HELPERS INTERNES
    // ─────────────────────────────────────────────────────────────

    _updateRotation(playerMesh, dt) {
        const dir = playerMesh.position.subtract(this.enemy.position)
        dir.y = 0
        if (dir.length() > 0.5) {
            const targetY = Math.atan2(dir.x, dir.z)
            let diff = targetY - this.enemy.rotation.y
            while (diff < -Math.PI) diff += Math.PI * 2
            while (diff > Math.PI) diff -= Math.PI * 2
            this.enemy.rotation.y += diff * 0.01 // rotation très lente
        }
    }

    /** Spawn les deux tourelles flanquant le boss. */
    _spawnTurrets(callbacks) {
        if (!callbacks?.onSpawn) return
        const base = this.enemy.position
        callbacks.onSpawn('LeviathanTurretLeft',  new Vector3(base.x - 8, 1, base.z), { boss: this })
        callbacks.onSpawn('LeviathanTurretRight', new Vector3(base.x + 8, 1, base.z), { boss: this })
    }

    /** Transition vers la Phase 2 : changement visuel + spawn jammers + démarrage AOE. */
    _enterPhase2(callbacks) {
        // Changement visuel : cœur exposé (rouge/orangé)
        this.material.diffuseColor.set(0.35, 0.02, 0.0)
        if (this._coreMat) {
            this._coreMat.diffuseColor.set(1, 0.1, 0)
            this._coreMat.emissiveColor.set(1, 0.0, 0)
            this._coreMat.alpha = 1.0
        }

        callbacks.onShowNotification?.('💀 PHASE 2 — CŒUR EXPOSÉ ! Brouilleurs déployés.', '#ff0000', 5000)

        // Invocation des 4 jammers aux angles de l'arène
        const jamPos = [
            new Vector3(-38, 1, -38),
            new Vector3( 38, 1, -38),
            new Vector3(-38, 1,  38),
            new Vector3( 38, 1,  38),
        ]
        this._jammersAlive = jamPos.length
        this.scene.isDashJammed = true

        for (const pos of jamPos) {
            callbacks.onSpawn?.('BossJammer', pos, { boss: this })
        }

        // Création du mesh d'avertissement AOE (disc au sol)
        this._createAoeWarningMesh()

        // Démarrer le cycle d'avertissement
        this._aoePhase = 'warning'
        this._aoeTimer = this._AOE_WARNING
    }

    /** Crée le disque rouge qui indique la zone d'AOE au sol. */
    _createAoeWarningMesh() {
        if (this._aoeWarningMesh) {
            try { this._aoeWarningMesh.dispose() } catch (e) {}
        }
        this._aoeWarningMesh = MeshBuilder.CreateDisc('leviathanAoeDisc', {
            radius: this._AOE_RADIUS,
            tessellation: 48
        }, this.scene)
        this._aoeWarningMesh.position.copyFrom(this.enemy.position)
        this._aoeWarningMesh.position.y = 0.12
        this._aoeWarningMesh.rotation.x = Math.PI / 2

        const mat = new StandardMaterial('leviathanAoeMat', this.scene)
        mat.diffuseColor = new Color3(1, 0, 0)
        mat.emissiveColor = new Color3(0.8, 0, 0)
        mat.alpha = 0.0
        mat.backFaceCulling = false
        mat.disableLighting = true
        this._aoeWarningMesh.material = mat
    }

    /**
     * Cycle AOE complet :
     *   warning  → disc pulsant, alpha monte progressivement
     *   active   → disc brillant, 10 DPS si le joueur est dans le rayon
     *   cooldown → disc invisible, respiration avant le prochain cycle
     */
    _tickAoe(dt, playerMesh, callbacks) {
        if (this._aoePhase === 'idle') return

        this._aoeTimer -= dt
        const mat = this._aoeWarningMesh?.material

        if (this._aoePhase === 'warning') {
            const progress = 1 - Math.max(0, this._aoeTimer / this._AOE_WARNING)
            if (mat) {
                // Alpha qui monte + clignotement accéléré en fin de charge
                const blink = Math.abs(Math.sin(performance.now() / Math.max(50, 400 - progress * 350)))
                mat.alpha = 0.04 + 0.28 * progress * blink
                // Couleur qui tend vers le orange en fin de charge
                mat.emissiveColor.set(0.6 + 0.4 * progress, 0.2 * (1 - progress), 0)
            }

            if (this._aoeTimer <= 3) {
                // 3 dernières secondes : notifier le joueur
                if (!this._aoeLastWarning) {
                    this._aoeLastWarning = true
                    callbacks.onShowNotification?.('⚡ SURCHARGE IMMINENTE !', '#ff8800', 2500)
                }
            }

            if (this._aoeTimer <= 0) {
                this._aoePhase = 'active'
                this._aoeTimer = this._AOE_ACTIVE
                this._aoeLastWarning = false
                if (mat) { mat.alpha = 0.55; mat.emissiveColor.set(1, 0.3, 0) }
                callbacks.onShowNotification?.('☢ SURCHARGE ! FUYEZ LA ZONE !', '#ff2200', 3500)
            }

        } else if (this._aoePhase === 'active') {
            // Effet visuel : pulsation rouge vive
            if (mat) {
                mat.alpha = 0.4 + 0.2 * Math.abs(Math.sin(performance.now() / 120))
            }

            // Dégâts au joueur s'il est dans le rayon
            const dx = playerMesh.position.x - this.enemy.position.x
            const dz = playerMesh.position.z - this.enemy.position.z
            if (dx * dx + dz * dz < this._AOE_RADIUS * this._AOE_RADIUS) {
                callbacks.onDamagePlayer?.(10 * dt) // 10 DPS
            }

            if (this._aoeTimer <= 0) {
                this._aoePhase = 'cooldown'
                this._aoeTimer = this._AOE_COOLDOWN
                if (mat) { mat.alpha = 0.0 }
            }

        } else if (this._aoePhase === 'cooldown') {
            if (mat) mat.alpha = 0.0

            if (this._aoeTimer <= 0) {
                // Nouveau cycle
                this._aoePhase = 'warning'
                this._aoeTimer = this._AOE_WARNING
                if (mat) { mat.emissiveColor.set(0.8, 0, 0) }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  NETTOYAGE
    // ─────────────────────────────────────────────────────────────

    destroy() {
        this._cleanupAoe()
        this.scene.isDashJammed = false
        super.destroy()
    }

    disposeFull() {
        this._cleanupAoe()
        this.scene.isDashJammed = false
        super.disposeFull()
    }

    _cleanupAoe() {
        if (this._aoeWarningMesh) {
            try { this._aoeWarningMesh.dispose() } catch (e) {}
            this._aoeWarningMesh = null
        }
    }
}
