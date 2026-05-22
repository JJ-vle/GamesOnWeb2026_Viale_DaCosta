import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial,
} from '@babylonjs/core'
import { Enemy } from '../Enemy'

/**
 * APEX-SENTINEL — Boss 3, "Le Duelliste Parfait"
 *
 * Phase DUEL (100% → 30% HP) :
 *   → Poursuite NavGrid rapide. Dodge si le joueur dashe (spike de vitesse détecté).
 *   → Bouclier frontal si un projectile joueur s'approche à moins de 9u.
 *
 * Phase RAGE (< 30% HP) :
 *   → Emissive rouge, vitesse x5. Laisse une traînée de feu au sol (5 DPS).
 *
 * Bullet Hell (toutes les 14s en RAGE) :
 *   → S'immobilise, spawn 4-6 piliers destructibles (60 HP) autour de lui.
 *   → Tir en spirale 360° (3 bras, 1 salve / 0.12s) pendant 6 secondes.
 *   → Les piliers absorbent les projectiles joueur ET boss.
 *
 * 350 HP / Speed x3-5 / 450 XP / 275 coins
 */
export class ApexSentinel extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 350, {
            fovDistance: 80,
            fovAngle: 360,
            attackRange: 2,
            retreatThreshold: 0,
        })

        this._headMat = null
        this._shieldMesh = null
        this._shieldMat = null
        this._fireTrails = []        // { mesh, mat, timer }
        this._pillars = []           // { mesh, mat, hp }
        this._activeProjectileObs = [] // observers scene pour les balles spirale

        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.8
        this.xpValue = 450
        this.coinValue = 275
        this.isBoss = true
        this.bossName = 'APEX-SENTINEL'

        // ── State machine ──
        this._state = 'DUEL'   // 'DUEL' | 'RAGE' | 'BULLET_HELL'
        this._initialized = false
        this._rageEntered = false
        this._prevPlayerPos = null

        // ── DUEL : dodge réactif ──
        this._dashReactCD = 0
        this._DASH_REACT_CD = 2.5
        this._PLAYER_SPEED_THRESHOLD = 15   // unités/s — pic de dash joueur
        this._isDashing = false
        this._dashVel = new Vector3(0, 0, 0)
        this._dashTimer = 0
        this._DASH_DURATION = 0.22
        this._BOSS_DASH_SPEED = 18

        // ── DUEL : bouclier parade ──
        this.isShielded = false
        this._shieldTimer = 0
        this._SHIELD_DURATION = 1.5
        this._shieldCD = 0
        this._SHIELD_CD = 4.0
        this._SHIELD_RADIUS = 9

        // ── RAGE : traînée de feu ──
        this._trailTimer = 0
        this._TRAIL_INTERVAL = 0.18
        this._TRAIL_LIFETIME = 3.0
        this._TRAIL_DPS = 5

        // ── RAGE → BULLET_HELL ──
        this._bulletHellTimer = 20
        this._BULLET_HELL_CD = 20
        this._bulletHellElapsed = 0
        this._BULLET_HELL_DURATION = 14

        // ── BULLET_HELL : spiral + patterns ──
        this._spiralAngle = 0
        this._spiralFireTimer = 0
        this._SPIRAL_FIRE_INTERVAL = 0.12
        this._SPIRAL_ARMS = 3
        this._bhPattern = 0        // 0=spiral-3-lent, 1=spiral-5-rapide, 2=ring-burst
        this._bhPatternTimer = 0
        this._BH_PATTERN_SWITCH = 4.5
    }

    // ─────────────────────────────────────────────────────────────
    //  MESH — humanoïde fin et métallique
    // ─────────────────────────────────────────────────────────────

    _createMesh() {
        const body = MeshBuilder.CreateCapsule('ApexSentinel_body', {
            height: 2.2, radius: 0.3, tessellation: 8, capSubdivisions: 2,
        }, this.scene)
        body.position = new Vector3(0, 1.2, 0)

        const mat = new StandardMaterial('apexMat', this.scene)
        mat.diffuseColor = new Color3(0.72, 0.80, 0.90)
        mat.specularColor = new Color3(1, 1, 1)
        mat.specularPower = 96
        mat.emissiveColor = new Color3(0.02, 0.22, 0.42)
        body.material = mat

        // Visière lumineuse
        const head = MeshBuilder.CreateBox('ApexSentinel_head', {
            width: 0.52, height: 0.28, depth: 0.52,
        }, this.scene)
        head.parent = body
        head.position = new Vector3(0, 1.2, 0)
        const headMat = new StandardMaterial('apexHeadMat', this.scene)
        headMat.diffuseColor = new Color3(0.04, 0.04, 0.14)
        headMat.emissiveColor = new Color3(0.0, 0.55, 1.0)
        headMat.specularColor = new Color3(1, 1, 1)
        headMat.specularPower = 128
        head.material = headMat
        this._headMat = headMat

        // Épaulières
        for (const x of [-0.48, 0.48]) {
            const pad = MeshBuilder.CreateBox('ApexSentinel_pad', {
                width: 0.36, height: 0.13, depth: 0.34,
            }, this.scene)
            pad.parent = body
            pad.position = new Vector3(x, 0.68, 0)
            pad.material = mat
        }

        // Bras
        for (const x of [-0.46, 0.46]) {
            const arm = MeshBuilder.CreateBox('ApexSentinel_arm', {
                width: 0.18, height: 0.95, depth: 0.18,
            }, this.scene)
            arm.parent = body
            arm.position = new Vector3(x, 0.12, 0)
            arm.material = mat
        }

        // Jambes
        for (const x of [-0.15, 0.15]) {
            const leg = MeshBuilder.CreateBox('ApexSentinel_leg', {
                width: 0.20, height: 0.95, depth: 0.20,
            }, this.scene)
            leg.parent = body
            leg.position = new Vector3(x, -0.85, 0)
            leg.material = mat
        }

        // Bouclier sphérique (invisible par défaut)
        const shield = MeshBuilder.CreateSphere('ApexSentinel_shield', {
            diameter: 2.5, segments: 8,
        }, this.scene)
        shield.parent = body
        shield.position = Vector3.Zero()
        const shieldMat = new StandardMaterial('apexShieldMat', this.scene)
        shieldMat.diffuseColor = new Color3(0.4, 0.75, 1.0)
        shieldMat.emissiveColor = new Color3(0.1, 0.5, 1.0)
        shieldMat.alpha = 0.0
        shieldMat.disableLighting = true
        shield.material = shieldMat
        shield.isPickable = false
        this._shieldMesh = shield
        this._shieldMat = shieldMat

        return body
    }

    // ─────────────────────────────────────────────────────────────
    //  DÉGÂTS — bloqués par bouclier ou dash
    // ─────────────────────────────────────────────────────────────

    takeDamage(amount) {
        if (this.isShielded || this._isDashing) return
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
            this._prevPlayerPos = playerMesh.position.clone()
            callbacks.onShowNotification?.('⚔ APEX-SENTINEL activé — Phase : Duel', '#00ccff', 4000)
        }

        // Traînée de feu (active en RAGE et BULLET_HELL)
        this._updateFireTrails(dt, playerMesh, callbacks)

        // Timer et animation du bouclier
        if (this.isShielded) {
            this._shieldTimer -= dt
            if (this._shieldTimer <= 0) {
                this.isShielded = false
                if (this._shieldMat) this._shieldMat.alpha = 0.0
            } else if (this._shieldMat) {
                this._shieldMat.alpha = 0.22 + 0.18 * Math.abs(Math.sin(performance.now() / 110))
            }
        }

        // Transition DUEL → RAGE
        if (this._state !== 'BULLET_HELL' && !this._rageEntered && this.life <= this.maxLife * 0.50) {
            this._enterRage(callbacks)
        }

        switch (this._state) {
            case 'DUEL':        this._tickDuel(dt, playerMesh, projectiles); break
            case 'RAGE':        this._tickRage(dt, playerMesh, callbacks); break
            case 'BULLET_HELL': this._tickBulletHell(dt, playerMesh, projectiles, callbacks); break
        }

        if (this._prevPlayerPos) this._prevPlayerPos.copyFrom(playerMesh.position)
        else this._prevPlayerPos = playerMesh.position.clone()
    }

    // ─────────────────────────────────────────────────────────────
    //  PHASE 1 : DUEL
    // ─────────────────────────────────────────────────────────────

    _tickDuel(dt, playerMesh, projectiles) {
        if (this._dashReactCD > 0) this._dashReactCD -= dt
        if (this._shieldCD > 0) this._shieldCD -= dt

        // Détection du dash joueur via spike de vitesse
        if (!this._isDashing && this._dashReactCD <= 0 && this._prevPlayerPos && dt > 0.0001) {
            const playerSpeed = Vector3.Distance(playerMesh.position, this._prevPlayerPos) / dt
            if (playerSpeed > this._PLAYER_SPEED_THRESHOLD) {
                this._triggerDodgeDash(playerMesh)
            }
        }

        // Exécution du dash réactif (pas de NavGrid pendant ce temps)
        if (this._isDashing) {
            this._dashTimer -= dt
            this.enemy.position.addInPlace(this._dashVel.scale(dt))
            if (this._dashTimer <= 0) this._isDashing = false
            return
        }

        // Parade : bouclier si un projectile joueur est proche
        if (!this.isShielded && this._shieldCD <= 0 && this._isUnderThreat(projectiles)) {
            this._activateShield()
        }

        // Poursuite NavGrid
        const result = this.updateNavGridAI(playerMesh, [])
        if (result?.moved) this.applyRotation(result.scaledMove)
    }

    _triggerDodgeDash(playerMesh) {
        // Imite la direction du dash joueur (même direction que le mouvement détecté)
        const dir = this._prevPlayerPos
            ? playerMesh.position.subtract(this._prevPlayerPos)
            : playerMesh.position.subtract(this.enemy.position)
        dir.y = 0
        if (dir.length() < 0.1) dir.set(1, 0, 0)
        else dir.normalize()

        this._dashVel.copyFrom(dir.scale(this._BOSS_DASH_SPEED))
        this._isDashing = true
        this._dashTimer = this._DASH_DURATION
        this._dashReactCD = this._DASH_REACT_CD

        if (this.material) this.material.emissiveColor.set(0.0, 1.0, 1.0)
        setTimeout(() => {
            if (this.material && this._state === 'DUEL') this.material.emissiveColor.set(0.02, 0.22, 0.42)
        }, 200)
    }

    _isUnderThreat(projectiles) {
        for (const proj of projectiles) {
            if (!proj || !proj.mesh || proj.isEnemy) continue
            if (Vector3.Distance(proj.mesh.position, this.enemy.position) < this._SHIELD_RADIUS) return true
        }
        return false
    }

    _activateShield() {
        this.isShielded = true
        this._shieldTimer = this._SHIELD_DURATION
        this._shieldCD = this._SHIELD_CD
        if (this._shieldMat) this._shieldMat.alpha = 0.42
    }

    // ─────────────────────────────────────────────────────────────
    //  PHASE 2 : RAGE
    // ─────────────────────────────────────────────────────────────

    _enterRage(callbacks) {
        this._rageEntered = true
        this._state = 'RAGE'
        this.speed = 2.8

        if (this.material) {
            this.material.diffuseColor.set(0.85, 0.07, 0.07)
            this.material.emissiveColor.set(1.0, 0.0, 0.0)
            this._originalDiffuseColor = this.material.diffuseColor.clone()
        }
        if (this._headMat) this._headMat.emissiveColor.set(1.0, 0.22, 0.0)

        this._bulletHellTimer = 8  // premier bullet hell déclenché rapidement après l'entrée en RAGE
        callbacks.onShowNotification?.('🔴 RAGE MODE ! APEX-SENTINEL déchaîné !', '#ff0000', 4000)
    }

    _tickRage(dt, playerMesh, callbacks) {
        this._bulletHellTimer -= dt
        if (this._bulletHellTimer <= 0) {
            this._enterBulletHell(callbacks)
            return
        }

        const result = this.updateNavGridAI(playerMesh, [])
        if (result?.moved) {
            this.applyRotation(result.scaledMove)
            if (result.scaledMove.lengthSquared() > 0.001) {
                this._trailTimer -= dt
                if (this._trailTimer <= 0) {
                    this._trailTimer = this._TRAIL_INTERVAL
                    this._spawnFireTrail()
                }
            }
        }

        // Pulse rouge
        const pulse = Math.abs(Math.sin(performance.now() / 200))
        if (this.material) this.material.emissiveColor.set(0.55 + 0.45 * pulse, 0.0, 0.0)
    }

    _spawnFireTrail() {
        const pos = this.enemy.position.clone()
        pos.y = this.enemy.position.y - 1.0  // au sol sous les pieds du boss, quelle que soit l'élévation de la map

        const mesh = MeshBuilder.CreateCylinder('apexFire', {
            height: 0.1, diameter: 1.8, tessellation: 8,
        }, this.scene)
        mesh.position.copyFrom(pos)
        mesh.isPickable = false

        const mat = new StandardMaterial('apexFireMat', this.scene)
        mat.diffuseColor = new Color3(1.0, 0.28, 0.0)
        mat.emissiveColor = new Color3(0.9, 0.16, 0.0)
        mat.alpha = 0.75
        mat.disableLighting = true
        mesh.material = mat

        this._fireTrails.push({ mesh, mat, timer: this._TRAIL_LIFETIME })
    }

    _updateFireTrails(dt, playerMesh, callbacks) {
        const px = playerMesh.position.x
        const pz = playerMesh.position.z
        for (let i = this._fireTrails.length - 1; i >= 0; i--) {
            const t = this._fireTrails[i]
            t.timer -= dt
            if (t.mat) t.mat.alpha = 0.75 * (t.timer / this._TRAIL_LIFETIME)

            // Dégâts si le joueur marche dans la zone
            const dx = px - t.mesh.position.x
            const dz = pz - t.mesh.position.z
            if (dx * dx + dz * dz < 0.81) {  // rayon 0.9
                callbacks.onDamagePlayer?.(this._TRAIL_DPS * dt)
            }

            if (t.timer <= 0) {
                try { t.mesh.dispose() } catch (_) {}
                this._fireTrails.splice(i, 1)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  BULLET HELL
    // ─────────────────────────────────────────────────────────────

    _enterBulletHell(callbacks) {
        this._state = 'BULLET_HELL'
        this._bulletHellElapsed = 0
        this._spiralAngle = 0
        this._spiralFireTimer = 0
        this._bhPattern = 0
        this._bhPatternTimer = 0

        this._spawnPillars()

        if (this.material) this.material.emissiveColor.set(1.0, 0.72, 0.0)
        callbacks.onShowNotification?.('💥 BULLET HELL ! Détruisez les piliers pour vous abriter !', '#ffaa00', 4500)
    }

    _spawnPillars() {
        // Piliers précédents nettoyés si on re-rentre en Bullet Hell
        this._cleanupPillars()

        const count = 4 + Math.floor(Math.random() * 3)  // 4 à 6 piliers
        const radius = 8.5
        const cx = this.enemy.position.x
        const cz = this.enemy.position.z

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2
            const mesh = MeshBuilder.CreateCylinder('apexPillar', {
                height: 4.0, diameter: 1.6, tessellation: 10,
            }, this.scene)
            mesh.position.set(
                cx + Math.cos(angle) * radius,
                2.0,
                cz + Math.sin(angle) * radius,
            )
            mesh.isPickable = false

            const mat = new StandardMaterial('apexPillarMat', this.scene)
            mat.diffuseColor = new Color3(0.35, 0.35, 0.55)
            mat.emissiveColor = new Color3(0.08, 0.08, 0.28)
            mat.specularColor = new Color3(0.7, 0.7, 1.0)
            mat.specularPower = 32
            mesh.material = mat

            this._pillars.push({ mesh, mat, hp: 60, maxHp: 60 })
        }
    }

    _tickBulletHell(dt, playerMesh, projectiles, callbacks) {
        this._bulletHellElapsed += dt

        this._checkPillarHits(projectiles)

        // Cycle entre patterns toutes les _BH_PATTERN_SWITCH secondes
        this._bhPatternTimer += dt
        if (this._bhPatternTimer >= this._BH_PATTERN_SWITCH) {
            this._bhPatternTimer = 0
            this._bhPattern = (this._bhPattern + 1) % 3
            this._spiralFireTimer = 0
        }

        if (this._bhPattern === 2) {
            // Pattern Ring Burst : salve de 16 balles circulaires toutes les 1.2s
            this._spiralFireTimer -= dt
            if (this._spiralFireTimer <= 0) {
                this._spiralFireTimer = 1.2
                this._fireBurstRing(playerMesh, callbacks)
            }
            this._spiralAngle += dt * 0.5
        } else {
            // Pattern 0 : 3 bras lent — Pattern 1 : 5 bras rapide
            const arms = this._bhPattern === 0 ? 3 : 5
            const rotSpeed = this._bhPattern === 0 ? 1.8 : 4.2
            const fireInterval = this._bhPattern === 0 ? 0.12 : 0.07
            this._spiralAngle += dt * rotSpeed
            this._spiralFireTimer -= dt
            if (this._spiralFireTimer <= 0) {
                this._spiralFireTimer = fireInterval
                this._fireSpiral(playerMesh, callbacks, arms)
            }
        }

        this.enemy.rotation.y = this._spiralAngle

        const pulse = Math.abs(Math.sin(performance.now() / 100))
        if (this.material) this.material.emissiveColor.set(1.0, 0.55 + 0.45 * pulse, 0.0)

        if (this._bulletHellElapsed >= this._BULLET_HELL_DURATION) {
            this._cleanupPillars()
            this._state = 'RAGE'
            this._bulletHellTimer = this._BULLET_HELL_CD
            if (this.material) this.material.emissiveColor.set(1.0, 0.0, 0.0)
            callbacks.onShowNotification?.('⚠ APEX-SENTINEL reprend la poursuite !', '#ff4400', 2200)
        }
    }

    _fireSpiral(playerMesh, callbacks, arms = this._SPIRAL_ARMS) {
        if (!this.enemy) return
        const pillarsRef = this._pillars

        for (let i = 0; i < arms; i++) {
            const angle = this._spiralAngle + (i / this._SPIRAL_ARMS) * Math.PI * 2
            const dir = new Vector3(Math.sin(angle), 0, Math.cos(angle))

            const bullet = MeshBuilder.CreateSphere('apexBullet', { diameter: 0.45, segments: 4 }, this.scene)
            bullet.position.copyFrom(this.enemy.position)
            bullet.position.y = 1.1

            const mat = new StandardMaterial('apexBulletMat', this.scene)
            mat.diffuseColor = new Color3(1, 0.62, 0)
            mat.emissiveColor = new Color3(1, 0.30, 0)
            mat.disableLighting = true
            bullet.material = mat

            const SPEED = 13
            const DAMAGE = 7
            const LIFETIME = 3.5
            const HIT_PLAYER_SQ = 1.44    // rayon 1.2u
            const HIT_PILLAR_SQ = 0.9 * 0.9 + 0.8 * 0.8  // ≈ cylindre rayon 0.8 + bullet 0.22

            let elapsed = 0
            let dead = false

            const obs = this.scene.onBeforeRenderObservable.add(() => {
                if (dead) return
                const frameDt = this.scene.getEngine().getDeltaTime() / 1000
                elapsed += frameDt
                bullet.position.addInPlace(dir.scale(SPEED * frameDt))

                // Collision piliers (arrêt de la balle — couverture pour le joueur)
                for (const pillar of pillarsRef) {
                    if (!pillar.mesh) continue
                    const pdx = bullet.position.x - pillar.mesh.position.x
                    const pdz = bullet.position.z - pillar.mesh.position.z
                    if (pdx * pdx + pdz * pdz < HIT_PILLAR_SQ) {
                        dead = true
                        try { bullet.dispose() } catch (_) {}
                        this.scene.onBeforeRenderObservable.remove(obs)
                        const idx = this._activeProjectileObs.indexOf(obs)
                        if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                        return
                    }
                }

                // Collision joueur
                const dx = bullet.position.x - playerMesh.position.x
                const dz = bullet.position.z - playerMesh.position.z
                const dy = bullet.position.y - playerMesh.position.y
                if (dx * dx + dz * dz + dy * dy < HIT_PLAYER_SQ) {
                    dead = true
                    callbacks.onDamagePlayer?.(DAMAGE)
                    try { bullet.dispose() } catch (_) {}
                    this.scene.onBeforeRenderObservable.remove(obs)
                    const idx = this._activeProjectileObs.indexOf(obs)
                    if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                    return
                }

                if (elapsed >= LIFETIME) {
                    dead = true
                    try { bullet.dispose() } catch (_) {}
                    this.scene.onBeforeRenderObservable.remove(obs)
                    const idx = this._activeProjectileObs.indexOf(obs)
                    if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                }
            })
            this._activeProjectileObs.push(obs)
        }
    }

    _fireBurstRing(playerMesh, callbacks) {
        if (!this.enemy) return
        const pillarsRef = this._pillars
        const COUNT = 16

        for (let i = 0; i < COUNT; i++) {
            const angle = (i / COUNT) * Math.PI * 2
            const dir = new Vector3(Math.sin(angle), 0, Math.cos(angle))

            const bullet = MeshBuilder.CreateSphere('apexBulletRing', { diameter: 0.50, segments: 4 }, this.scene)
            bullet.position.copyFrom(this.enemy.position)
            bullet.position.y = 1.1

            const mat = new StandardMaterial('apexBulletRingMat', this.scene)
            mat.diffuseColor = new Color3(1, 0.15, 0.9)
            mat.emissiveColor = new Color3(1, 0.05, 0.7)
            mat.disableLighting = true
            bullet.material = mat

            const SPEED = 11
            const DAMAGE = 5
            const LIFETIME = 3.5
            const HIT_PLAYER_SQ = 1.44
            const HIT_PILLAR_SQ = 0.9 * 0.9 + 0.8 * 0.8

            let elapsed = 0
            let dead = false

            const obs = this.scene.onBeforeRenderObservable.add(() => {
                if (dead) return
                const frameDt = this.scene.getEngine().getDeltaTime() / 1000
                elapsed += frameDt
                bullet.position.addInPlace(dir.scale(SPEED * frameDt))

                for (const pillar of pillarsRef) {
                    if (!pillar.mesh) continue
                    const pdx = bullet.position.x - pillar.mesh.position.x
                    const pdz = bullet.position.z - pillar.mesh.position.z
                    if (pdx * pdx + pdz * pdz < HIT_PILLAR_SQ) {
                        dead = true
                        try { bullet.dispose() } catch (_) {}
                        this.scene.onBeforeRenderObservable.remove(obs)
                        const idx = this._activeProjectileObs.indexOf(obs)
                        if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                        return
                    }
                }

                const dx = bullet.position.x - playerMesh.position.x
                const dz = bullet.position.z - playerMesh.position.z
                const dy = bullet.position.y - playerMesh.position.y
                if (dx * dx + dz * dz + dy * dy < HIT_PLAYER_SQ) {
                    dead = true
                    callbacks.onDamagePlayer?.(DAMAGE)
                    try { bullet.dispose() } catch (_) {}
                    this.scene.onBeforeRenderObservable.remove(obs)
                    const idx = this._activeProjectileObs.indexOf(obs)
                    if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                    return
                }

                if (elapsed >= LIFETIME) {
                    dead = true
                    try { bullet.dispose() } catch (_) {}
                    this.scene.onBeforeRenderObservable.remove(obs)
                    const idx = this._activeProjectileObs.indexOf(obs)
                    if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                }
            })
            this._activeProjectileObs.push(obs)
        }
    }

    _checkPillarHits(projectiles) {
        for (const pillar of this._pillars) {
            if (!pillar.mesh) continue
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const proj = projectiles[i]
                if (!proj || !proj.mesh || proj.isEnemy) continue
                const dx = proj.mesh.position.x - pillar.mesh.position.x
                const dz = proj.mesh.position.z - pillar.mesh.position.z
                if (dx * dx + dz * dz < 1.0) {  // rayon 1.0u
                    pillar.hp -= (proj.damage || 1)
                    try { proj.dispose() } catch (_) {}

                    // Flash orange quand le pilier est touché
                    if (pillar.mat) {
                        pillar.mat.emissiveColor.set(1, 0.5, 0)
                        const p = pillar
                        setTimeout(() => {
                            if (p.mesh && p.mat) {
                                const ratio = p.hp / p.maxHp
                                p.mat.emissiveColor.set(0.08 + 0.5 * (1 - ratio), 0.08, 0.28)
                                p.mat.diffuseColor.set(0.35 - 0.15 * (1 - ratio), 0.35 - 0.15 * (1 - ratio), 0.55)
                            }
                        }, 120)
                    }

                    if (pillar.hp <= 0) {
                        try { pillar.mesh.dispose() } catch (_) {}
                        pillar.mesh = null
                    }
                    break
                }
            }
        }
        this._pillars = this._pillars.filter(p => p.mesh !== null)
    }

    // ─────────────────────────────────────────────────────────────
    //  NETTOYAGE
    // ─────────────────────────────────────────────────────────────

    _cleanupPillars() {
        for (const p of this._pillars) try { p.mesh?.dispose() } catch (_) {}
        this._pillars = []
    }

    _cleanupFireTrails() {
        for (const t of this._fireTrails) try { t.mesh?.dispose() } catch (_) {}
        this._fireTrails = []
    }

    _cleanupProjectileObs() {
        for (const obs of this._activeProjectileObs) {
            try { this.scene.onBeforeRenderObservable.remove(obs) } catch (_) {}
        }
        this._activeProjectileObs = []
    }

    destroy() {
        this._cleanupPillars()
        this._cleanupFireTrails()
        this._cleanupProjectileObs()
        super.destroy()
    }

    disposeFull() {
        this._cleanupPillars()
        this._cleanupFireTrails()
        this._cleanupProjectileObs()
        try { this._shieldMesh?.dispose() } catch (_) {}
        this._shieldMesh = null
        super.disposeFull()
    }
}
