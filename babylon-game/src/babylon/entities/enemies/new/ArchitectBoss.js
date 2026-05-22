import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial,
    TransformNode,
} from '@babylonjs/core'
import { Enemy } from '../Enemy'

/**
 * THE ARCHITECT — Boss 2, "Le Maître du Réseau"
 *
 * Phase 1 (100% → 50% HP) : Manipulation
 *   → Flotte et reste à distance. Invoque 2-3 GlitchEnemy toutes les 5s.
 *
 * Phase 2 (50% → 0% HP) : Laser Grid
 *   → Dashe vers le joueur en rafales. Lance un quadrillage de lasers au sol
 *     avec des zones sûres. 15 DPS si le joueur n'est pas dans une zone sûre.
 *
 * The Glitch (toutes les 15-20s) :
 *   → Inverse les contrôles du joueur pendant 3 secondes.
 *
 * 300 HP / 0 Speed / 400 XP / 250 coins
 */
export class ArchitectBoss extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 300, false)

        // Propriétés visuelles nécessaires avant _createMesh()
        this._baseY = 3.5
        this._orbitMeshes = []
        this._orbitNode = null
        this._headMat = null
        this._safeFloorMeshes = []

        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0
        this.xpValue = 400
        this.coinValue = 250
        this.isBoss = true
        this.bossName = 'THE ARCHITECT'

        // ── Phase ──
        this._phase = 1
        this._initialized = false
        this._phase2Entered = false
        this._floatTime = 0
        this._orbitAngle = 0

        // ── Phase 1 : invocations ──
        this._summonTimer = 5
        this._SUMMON_INTERVAL = 5

        // ── Phase 2 : dash ──
        this._dashState = 'pause'
        this._dashTimer = 2.5
        this._DASH_PAUSE = 2.5
        this._DASH_DURATION = 0.5
        this._dashDir = Vector3.Zero()
        this._DASH_SPEED = 22

        // ── Phase 2 : grille laser ──
        this._gridState = 'idle'
        this._gridTimer = 0
        this._GRID_WARNING = 3.0
        this._GRID_ACTIVE = 2.5
        this._GRID_COOLDOWN = 8.0
        this._gridMeshes = []
        this._safeZones = []

        // ── The Glitch ──
        this._GLITCH_MIN = 15
        this._GLITCH_MAX = 20
        this._GLITCH_DURATION = 3
        this._glitchElapsed = 0
        this._glitchCooldown = this._nextGlitchInterval()
        this._glitchPrewarned = false
    }

    _nextGlitchInterval() {
        return this._GLITCH_MIN + Math.random() * (this._GLITCH_MAX - this._GLITCH_MIN)
    }

    // ─────────────────────────────────────────────────────────────
    //  MESH
    // ─────────────────────────────────────────────────────────────

    _createMesh() {
        // Corps principal (torse humanoïde)
        const body = MeshBuilder.CreateBox('Architect_body', {
            width: 1.4, height: 2.2, depth: 0.7,
        }, this.scene)
        body.position = new Vector3(0, this._baseY, 0)

        const mat = new StandardMaterial('architectMat', this.scene)
        mat.diffuseColor = new Color3(0.05, 0.02, 0.15)
        mat.emissiveColor = new Color3(0.3, 0.0, 1.0)
        body.material = mat

        // ── Tête ──
        const head = MeshBuilder.CreateSphere('Architect_head', { diameter: 0.9, segments: 6 }, this.scene)
        head.parent = body
        head.position = new Vector3(0, 1.5, 0)
        const headMat = new StandardMaterial('architectHeadMat', this.scene)
        headMat.diffuseColor = new Color3(0.1, 0.05, 0.3)
        headMat.emissiveColor = new Color3(0.6, 0.0, 1.0)
        headMat.alpha = 0.92
        head.material = headMat
        this._headMat = headMat

        // ── Bras ──
        const armParts = [
            { name: 'armL', x: -0.95 },
            { name: 'armR', x:  0.95 },
        ]
        for (const { name, x } of armParts) {
            const arm = MeshBuilder.CreateBox('Architect_' + name, { width: 0.3, height: 1.5, depth: 0.3 }, this.scene)
            arm.parent = body
            arm.position = new Vector3(x, 0.15, 0)
            arm.material = mat
        }

        // ── Node d'orbite avec polygones ──
        this._orbitNode = new TransformNode('Architect_orbitNode', this.scene)
        this._orbitNode.parent = body
        this._orbitMeshes = []

        const ORB_RADIUS = 2.8
        const ORB_COUNT = 4
        for (let i = 0; i < ORB_COUNT; i++) {
            const angle = (i / ORB_COUNT) * Math.PI * 2
            const orb = MeshBuilder.CreatePolyhedron('Architect_orb_' + i, { type: 1, size: 0.3 }, this.scene)
            orb.position.x = Math.cos(angle) * ORB_RADIUS
            orb.position.z = Math.sin(angle) * ORB_RADIUS
            orb.position.y = Math.sin(i * 1.5) * 0.5
            orb.parent = this._orbitNode
            const orbMat = new StandardMaterial('architectOrbMat_' + i, this.scene)
            orbMat.emissiveColor = new Color3(0.6, 0.0, 1.0)
            orbMat.disableLighting = true
            orb.material = orbMat
            this._orbitMeshes.push(orb)
        }

        return body
    }

    // ─────────────────────────────────────────────────────────────
    //  PRISE DE DÉGÂTS — invulnérable pendant le dash
    // ─────────────────────────────────────────────────────────────

    takeDamage(amount) {
        if (this._dashState === 'dash') return
        super.takeDamage(amount)
    }

    // ─────────────────────────────────────────────────────────────
    //  UPDATE PRINCIPAL
    // ─────────────────────────────────────────────────────────────

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        if (!this.enemy) return
        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (!this._initialized) {
            this._initialized = true
            this._baseY = this.enemy.position.y
            if (this._orbitNode) this._orbitNode.parent = this.enemy
            callbacks.onShowNotification?.('⚡ THE ARCHITECT activé — Phase 1 : Manipulation', '#aa00ff', 4000)
        }

        // ── Flottaison Y ──
        this._floatTime += dt
        this.enemy.position.y = this._baseY + Math.sin(this._floatTime * 1.2) * 0.7

        // ── Rotation orbitale des polygones ──
        if (this._orbitNode) {
            this._orbitAngle += dt * 1.6
            this._orbitNode.rotation.y = this._orbitAngle
        }

        // ── Rotation lente vers le joueur ──
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        if (toPlayer.length() > 0.5) {
            const targetY = Math.atan2(toPlayer.x, toPlayer.z)
            let diff = targetY - this.enemy.rotation.y
            while (diff < -Math.PI) diff += Math.PI * 2
            while (diff > Math.PI) diff -= Math.PI * 2
            this.enemy.rotation.y += diff * 0.04
        }

        // ── Transition Phase 2 ──
        if (this._phase === 1 && this.life <= this.maxLife * 0.5) {
            this._phase = 2
        }
        if (this._phase === 2 && !this._phase2Entered) {
            this._phase2Entered = true
            this._enterPhase2(callbacks)
        }

        // ── Pulse visuel Phase 1 (violet) ──
        const pulse = Math.abs(Math.sin(this._floatTime * 2.5))
        if (this._phase === 1) {
            this.material.emissiveColor.set(0.1 + 0.15 * pulse, 0, 0.7 + 0.3 * pulse)
            if (this._headMat) this._headMat.emissiveColor.set(0.5 + 0.3 * pulse, 0, 1)
        }

        if (this._phase === 1) this._tickSummon(dt, callbacks)

        if (this._phase === 2) {
            this._tickDash(dt, playerMesh)
            this._tickLaserGrid(dt, playerMesh, callbacks)
        }

        this._tickGlitch(dt, callbacks)
    }

    // ─────────────────────────────────────────────────────────────
    //  PHASE 1 — INVOCATIONS
    // ─────────────────────────────────────────────────────────────

    _tickSummon(dt, callbacks) {
        this._summonTimer -= dt
        if (this._summonTimer > 0) return
        this._summonTimer = this._SUMMON_INTERVAL

        const count = 2 + Math.floor(Math.random() * 2)
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = 6 + Math.random() * 6
            const pos = new Vector3(
                this.enemy.position.x + Math.cos(angle) * dist,
                1,
                this.enemy.position.z + Math.sin(angle) * dist,
            )
            callbacks.onSpawn?.('ArchitectGlitch', pos, { boss: this })
        }
        callbacks.onShowNotification?.('📡 Unités Glitch invoquées', '#aa00ff', 1500)
    }

    // ─────────────────────────────────────────────────────────────
    //  PHASE 2 — DASH + GRILLE LASER
    // ─────────────────────────────────────────────────────────────

    _enterPhase2(callbacks) {
        this.material.emissiveColor.set(1, 0, 0.5)
        if (this._headMat) this._headMat.emissiveColor.set(1, 0, 0.3)
        this._orbitMeshes.forEach(m => { if (m.material) m.material.emissiveColor.set(1, 0, 0.5) })

        callbacks.onShowNotification?.('🔴 PHASE 2 — LASER GRID ! Trouvez les zones sûres !', '#ff0055', 5000)

        this._dashState = 'pause'
        this._dashTimer = this._DASH_PAUSE

        this._gridState = 'warning'
        this._gridTimer = this._GRID_WARNING
        this._buildLaserGrid()
    }

    _tickDash(dt, playerMesh) {
        this._dashTimer -= dt
        if (this._dashState === 'pause') {
            if (this._dashTimer <= 0) {
                const dir = playerMesh.position.subtract(this.enemy.position)
                dir.y = 0
                if (dir.length() > 0.1) dir.normalize()
                else dir.set(1, 0, 0)
                this._dashDir.copyFrom(dir)
                this._dashState = 'dash'
                this._dashTimer = this._DASH_DURATION
                this.material.emissiveColor.set(1, 0.6, 0) // flash orange pendant le dash
            }
        } else {
            this.enemy.position.addInPlace(this._dashDir.scale(this._DASH_SPEED * dt))
            if (this._dashTimer <= 0) {
                this._dashState = 'pause'
                this._dashTimer = this._DASH_PAUSE
                this.material.emissiveColor.set(1, 0, 0.5)
            }
        }
    }

    _buildLaserGrid() {
        this._cleanupLaserGrid()

        const COLS = 7, ROWS = 7, CELL = 4
        const cx = this.enemy.position.x
        const cz = this.enemy.position.z
        const halfGrid = (Math.max(COLS, ROWS) * CELL) / 2

        // 9 zones sûres aléatoires parmi les 49 cellules
        const safeSet = new Set()
        while (safeSet.size < 9) safeSet.add(Math.floor(Math.random() * COLS * ROWS))
        this._safeZones = []
        this._safeFloorMeshes = []

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const wx = cx - halfGrid + c * CELL + CELL / 2
                const wz = cz - halfGrid + r * CELL + CELL / 2

                if (safeSet.has(r * COLS + c)) {
                    this._safeZones.push({ x: wx, z: wz, half: CELL / 2 })
                    // Indicateur vert translucide pour les zones sûres
                    const sfMat = new StandardMaterial('safeMat_' + r + '_' + c, this.scene)
                    sfMat.emissiveColor = new Color3(0, 0.7, 0.3)
                    sfMat.disableLighting = true
                    sfMat.alpha = 0.15
                    const sf = MeshBuilder.CreateBox('safe_' + r + '_' + c, {
                        width: CELL * 0.9, height: 0.06, depth: CELL * 0.9,
                    }, this.scene)
                    sf.position.set(wx, 0.07, wz)
                    sf.material = sfMat
                    sf.isPickable = false
                    this._safeFloorMeshes.push(sf)
                    continue
                }

                // Croix de lignes laser rouge pour les cellules dangereuses
                const laserMat = new StandardMaterial('laserMat_' + r + '_' + c, this.scene)
                laserMat.diffuseColor = new Color3(1, 0, 0)
                laserMat.emissiveColor = new Color3(1, 0, 0)
                laserMat.disableLighting = true
                laserMat.alpha = 0.25

                const lH = MeshBuilder.CreateBox('lH_' + r + '_' + c, {
                    width: CELL * 0.9, height: 0.08, depth: 0.1,
                }, this.scene)
                lH.position.set(wx, 0.08, wz)
                lH.material = laserMat
                lH.isPickable = false

                const lV = MeshBuilder.CreateBox('lV_' + r + '_' + c, {
                    width: 0.1, height: 0.08, depth: CELL * 0.9,
                }, this.scene)
                lV.position.set(wx, 0.08, wz)
                lV.material = laserMat
                lV.isPickable = false

                this._gridMeshes.push({ h: lH, v: lV, mat: laserMat })
            }
        }
    }

    _tickLaserGrid(dt, playerMesh, callbacks) {
        if (this._gridState === 'idle') return
        this._gridTimer -= dt

        if (this._gridState === 'warning') {
            // Clignotement rouge de télégraphie
            const blink = 0.15 + 0.25 * Math.abs(Math.sin(performance.now() / 180))
            this._gridMeshes.forEach(({ mat }) => { if (mat) mat.alpha = blink })

            if (this._gridTimer <= 0) {
                this._gridState = 'active'
                this._gridTimer = this._GRID_ACTIVE
                this._gridMeshes.forEach(({ mat }) => {
                    if (mat) { mat.alpha = 0.9; mat.emissiveColor.set(1, 0.1, 0) }
                })
                callbacks.onShowNotification?.('⚠ LASER GRID ACTIF ! Zones vertes = sûres !', '#ff2200', 2200)
            }

        } else if (this._gridState === 'active') {
            const pulse = 0.7 + 0.3 * Math.abs(Math.sin(performance.now() / 70))
            this._gridMeshes.forEach(({ mat }) => { if (mat) mat.alpha = pulse })

            // Vérifier si le joueur est dans une zone sûre
            const px = playerMesh.position.x
            const pz = playerMesh.position.z
            let safe = false
            for (const z of this._safeZones) {
                if (Math.abs(px - z.x) < z.half && Math.abs(pz - z.z) < z.half) { safe = true; break }
            }
            if (!safe) callbacks.onDamagePlayer?.(15 * dt)

            if (this._gridTimer <= 0) {
                this._cleanupLaserGrid()
                this._gridState = 'cooldown'
                this._gridTimer = this._GRID_COOLDOWN
            }

        } else if (this._gridState === 'cooldown') {
            if (this._gridTimer <= 0) {
                this._gridState = 'warning'
                this._gridTimer = this._GRID_WARNING
                this._buildLaserGrid()
            }
        }
    }

    _cleanupLaserGrid() {
        for (const { h, v } of this._gridMeshes) {
            try { h?.dispose() } catch (_) {}
            try { v?.dispose() } catch (_) {}
        }
        this._gridMeshes = []
        for (const sf of this._safeFloorMeshes) {
            try { sf.dispose() } catch (_) {}
        }
        this._safeFloorMeshes = []
    }

    // ─────────────────────────────────────────────────────────────
    //  THE GLITCH — inversion des contrôles toutes les 15-20s
    // ─────────────────────────────────────────────────────────────

    _tickGlitch(dt, callbacks) {
        this._glitchElapsed += dt

        // Avertissement 1s avant
        if (!this._glitchPrewarned && this._glitchElapsed >= this._glitchCooldown - 1.0) {
            this._glitchPrewarned = true
            callbacks.onShowNotification?.('⚠ GLITCH IMMINENT...', '#ffff00', 900)
        }

        if (this._glitchElapsed >= this._glitchCooldown) {
            this._glitchElapsed = 0
            this._glitchCooldown = this._nextGlitchInterval()
            this._glitchPrewarned = false
            callbacks.onGlitchPlayer?.(this._GLITCH_DURATION)
            callbacks.onShowNotification?.('🔀 GLITCH ! Contrôles inversés !', '#ffff00', this._GLITCH_DURATION * 1000)
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  NETTOYAGE
    // ─────────────────────────────────────────────────────────────

    destroy() {
        this._cleanupLaserGrid()
        super.destroy()
    }

    disposeFull() {
        this._cleanupLaserGrid()
        this._orbitMeshes.forEach(m => { try { m.dispose() } catch (_) {} })
        try { this._orbitNode?.dispose() } catch (_) {}
        this._orbitNode = null
        super.disposeFull()
    }
}
