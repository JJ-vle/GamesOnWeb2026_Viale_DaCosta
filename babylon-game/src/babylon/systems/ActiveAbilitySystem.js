import { Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core'
import { ItemDatabase } from '../entities/items/items.js'
import { applySfxVolume } from './AudioSettings'

export class ActiveAbilitySystem {
    /**
     * @param {BABYLON.Scene} scene
     * @param {Player} player
     * @param {Array} enemies - référence live au tableau d'ennemis (MainScene.enemies)
     */
    constructor(scene, player, enemies) {
        this.scene = scene
        this.player = player
        this.enemies = enemies

        // Slot d'item actif équipé : null | itemId (ex: 'virus', 'immuable')
        this.equippedItem = null

        // Cooldown de la capacité active
        this.COOLDOWN = 10.0
        this.cooldownRemaining = 0

        // Verrou touche A pour éviter le repeat
        this._aLock = false

        // ── Buff temporaire (Virus, Immuable, etc.) ──
        this._activeBuff = null     // { itemId, modifiers, remaining }
        this._buffApplied = false

        // ── Dash (touche Espace) ──
        this.maxDashCharges = 1         // extensible par items futurs
        this.dashCharges = 1
        this.DASH_RECHARGE_TIME = 1.0   // secondes par charge
        this._dashRechargeTimer = 0
        this._spaceLock = false
        this._lastMoveDir = null        // Vector3 — direction du dernier mouvement

        // Référence optionnelle au UISystem pour afficher les notifications de brouillage
        this.uiSystem = null

        // Audio natif navigateur pour le dash
        this._dashBaseVolume = 0.05
        this._dashSound = new Audio('/assets/sounds/dash.mp3')
        this._dashSound.preload = 'auto'
        this._dashSound.volume = applySfxVolume(this._dashBaseVolume)
        this._dashAudioUnlocked = false

        // Callbacks optionnels
        this.onAbilityUsed = null    // () => void
        this.onItemChanged = null    // (itemType) => void
        this.onBuffStart = null      // (itemId) => void
        this.onBuffEnd = null        // (itemId) => void
        this.onDash = null           // () => void

        // Pool VFX
        this._healPool = this._createHealPool(8)
        this._explosionMesh = this._createExplosionMesh()
    }

    unlockAudio() {
        if (!this._dashSound || this._dashAudioUnlocked) return

        this._dashSound.load()
        const unlockAttempt = this._dashSound.play()
        if (unlockAttempt && typeof unlockAttempt.then === 'function') {
            unlockAttempt
                .then(() => {
                    this._dashSound.pause()
                    this._dashSound.currentTime = 0
                    this._dashAudioUnlocked = true
                })
                .catch(() => {
                    // Browser policy may still block until the next user gesture.
                })
        }
    }

    _playDashSound() {
        if (!this._dashSound) return

        const audio = this._dashSound.cloneNode(true)
        audio.volume = applySfxVolume(this._dashBaseVolume)
        audio.currentTime = 0

        const playPromise = audio.play()
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // Ignore playback failures when the browser still blocks audio.
            })
        }
    }

    _createHealPool(count) {
        const pool = []
        const mat = new StandardMaterial('healMat_shared', this.scene)
        mat.diffuseColor = new Color3(0, 1, 0.4)
        mat.emissiveColor = new Color3(0, 0.8, 0.3)

        for (let i = 0; i < count; i++) {
            const sphere = MeshBuilder.CreateSphere(`healVFX_pool_${i}`, { diameter: 0.3 }, this.scene)
            sphere.material = mat
            sphere.setEnabled(false)
            pool.push(sphere)
        }
        return pool
    }

    _createExplosionMesh() {
        const sphere = MeshBuilder.CreateSphere('explosionVFX_pool', { diameter: 0.5, segments: 6 }, this.scene)
        const mat = new StandardMaterial('explosionMat_pool', this.scene)
        mat.diffuseColor = new Color3(1, 0.4, 0)
        mat.emissiveColor = new Color3(1, 0.2, 0)
        sphere.material = mat
        sphere.setEnabled(false)
        return sphere
    }

    /**
     * Change l'item équipé dans le slot actif
     * @param {string|null} itemType
     */
    equip(itemType) {
        if (this._activeBuff) this._endBuff()

        this.equippedItem = itemType
        this.cooldownRemaining = 0

        const itemDef = ItemDatabase[itemType]
        if (itemDef && itemDef.cooldown) {
            this.COOLDOWN = itemDef.cooldown
        } else {
            this.COOLDOWN = 10.0
        }

        if (this.onItemChanged) this.onItemChanged(itemType)
    }

    /**
     * À appeler dans la boucle update de MainScene
     * @param {number} deltaTime - secondes
     * @param {Object} inputMap
     */
    update(deltaTime, inputMap) {
        // Décrémenter le cooldown de la capacité active
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining -= deltaTime
            if (this.cooldownRemaining < 0) this.cooldownRemaining = 0
        }

        // Tick buff temporaire
        if (this._activeBuff) {
            this._activeBuff.remaining -= deltaTime
            if (this._activeBuff.remaining <= 0) {
                this._endBuff()
            }
        }

        // Recharge des charges de dash
        if (this.dashCharges < this.maxDashCharges) {
            this._dashRechargeTimer -= deltaTime
            if (this._dashRechargeTimer <= 0) {
                this.dashCharges++
                if (this.dashCharges < this.maxDashCharges) {
                    this._dashRechargeTimer = this.DASH_RECHARGE_TIME
                }
            }
        }

        // Mémoriser la dernière direction de mouvement (pour le dash)
        this._updateLastMoveDir(inputMap)

        // Touche Espace → Dash
        if (inputMap[' '] && !this._spaceLock) {
            this._spaceLock = true
            this._tryDash()
        }
        if (!inputMap[' ']) this._spaceLock = false

        // Touche E → Capacité active (inputMap normalise en minuscules)
        if (inputMap['e'] && !this._aLock) {
            this._aLock = true
            this._tryActivate()
        }
        if (!inputMap['e']) this._aLock = false
    }

    /**
     * Mémorise la direction de mouvement courante depuis l'inputMap.
     * Conserve la dernière valeur non-nulle pour le cas où le joueur
     * appuie sur Espace sans bouger.
     */
    _updateLastMoveDir(inputMap) {
        const camera = this.scene.activeCamera
        if (!camera) return

        let fi = 0, si = 0
        if (inputMap['ArrowUp'] || inputMap['z']) fi += 1
        if (inputMap['ArrowDown'] || inputMap['s']) fi -= 1
        if (inputMap['ArrowRight'] || inputMap['q']) si += 1
        if (inputMap['ArrowLeft'] || inputMap['d']) si -= 1

        if (fi === 0 && si === 0) return

        const mag = Math.sqrt(fi * fi + si * si)
        fi /= mag
        si /= mag

        const forward = this.player.mesh.position.subtract(camera.position)
        forward.y = 0
        forward.normalize()
        const right = Vector3.Cross(forward, Vector3.Up()).normalize()

        this._lastMoveDir = forward.scale(fi).add(right.scale(si)).normalize()
    }

    /** Fraction de cooldown restant [0..1] pour l'UI */
    getCooldownPercent() {
        return this.cooldownRemaining / this.COOLDOWN
    }

    /** Buff actif ou null pour l'UI */
    getActiveBuff() {
        return this._activeBuff
    }

    /** Fraction de durée restante du buff [0..1] */
    getBuffPercent() {
        if (!this._activeBuff) return 0
        const itemDef = ItemDatabase[this._activeBuff.itemId]
        if (!itemDef || !itemDef.duration) return 0
        return this._activeBuff.remaining / itemDef.duration
    }

    /** Fraction de recharge du dash [0..1] pour l'UI */
    getDashRechargePercent() {
        if (this.dashCharges >= this.maxDashCharges) return 1
        return 1 - (this._dashRechargeTimer / this.DASH_RECHARGE_TIME)
    }

    // ─────────────────────────────────────────────
    //  DASH
    // ─────────────────────────────────────────────

    _tryDash() {
        if (this.dashCharges <= 0) return

        // Brouillage du dash par un BossJammerUnit actif
        if (this.scene.isDashJammed) {
            this.uiSystem?.showNotification('DASH BROUILLÉ', '#ff4400', 1200)
            return
        }

        this.dashCharges--
        if (this.dashCharges < this.maxDashCharges) {
            this._dashRechargeTimer = this.DASH_RECHARGE_TIME
        }

        // Direction : dernier mouvement, sinon la direction du regard du joueur
        let dir
        if (this._lastMoveDir) {
            dir = this._lastMoveDir.clone()
        } else {
            const angle = this.player.mesh.rotation.y
            dir = new Vector3(Math.sin(angle), 0, Math.cos(angle))
        }
        dir.y = 0
        dir.normalize()

        // Inversion du dash si le glitch THE ARCHITECT est actif
        if (this.player._glitchActive) dir.negateInPlace()

        const DASH_DISTANCE = 4.5
        const DASH_DURATION = 0.15 // secondes
        let elapsed = 0

        const obs = this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.scene.getEngine().getDeltaTime() / 1000
            elapsed += dt

            const t = Math.min(elapsed / DASH_DURATION, 1)
            // Easing : fort au départ, ralentit à la fin
            const speed = DASH_DISTANCE / DASH_DURATION * (1 - t) * 2
            this.player.mesh.moveWithCollisions(dir.scale(speed * dt))

            if (elapsed >= DASH_DURATION) {
                this.scene.onBeforeRenderObservable.remove(obs)
            }
        })

        this._playDashSound()
        this._spawnDashVFX(dir)
        if (this.onDash) this.onDash()
    }

    // ─────────────────────────────────────────────
    //  CAPACITÉ ACTIVE (touche A)
    // ─────────────────────────────────────────────

    _tryActivate() {
        if (!this.equippedItem) return
        if (this.cooldownRemaining > 0) return
        if (this._activeBuff) return

        switch (this.equippedItem) {
            case 'grenade':
                this._useGrenade()
                break
            default:
                this._useDataDrivenItem(this.equippedItem)
                break
        }

        const cdr = this.player.cooldownReduction || 0
        this.cooldownRemaining = this.COOLDOWN * (1 - Math.min(cdr, 0.8))
        if (this.onAbilityUsed) this.onAbilityUsed()
    }

    _useDataDrivenItem(itemId) {
        const itemDef = ItemDatabase[itemId]
        if (!itemDef) {
            console.warn(`[ActiveAbilitySystem] Item inconnu : "${itemId}"`)
            return
        }

        const duration = itemDef.duration || 0
        const cooldown = itemDef.cooldown || 10
        this.COOLDOWN = cooldown

        if (duration <= 0 || duration === Infinity) {
            this._applyInstantEffect(itemId, itemDef)
            return
        }

        const modifiers = itemDef.modifiers || {}
        this._activeBuff = { itemId, modifiers, remaining: duration }
        this._buffApplied = true

        for (const [key, value] of Object.entries(modifiers)) {
            if (typeof value === 'boolean') {
                this.player[key] = true
            } else if (typeof value === 'number') {
                this.player[key] = (this.player[key] ?? 0) + value
            }
        }

        console.log(`[ActiveAbilitySystem] Buff "${itemDef.name}" activé pour ${duration}s`)
        if (this.onBuffStart) this.onBuffStart(itemId)
    }

    _endBuff() {
        if (!this._activeBuff || !this._buffApplied) return

        const { itemId, modifiers } = this._activeBuff
        const itemDef = ItemDatabase[itemId]

        for (const [key, value] of Object.entries(modifiers)) {
            if (typeof value === 'boolean') {
                this.player[key] = false
            } else if (typeof value === 'number') {
                this.player[key] = (this.player[key] ?? 0) - value
            }
        }

        console.log(`[ActiveAbilitySystem] Buff "${itemDef?.name || itemId}" terminé`)
        if (this.onBuffEnd) this.onBuffEnd(itemId)

        this._activeBuff = null
        this._buffApplied = false
    }

    _applyInstantEffect(itemId, itemDef) {
        const modifiers = itemDef.modifiers || {}
        for (const [key, value] of Object.entries(modifiers)) {
            if (typeof value === 'boolean') {
                this.player[key] = value
            }
        }
        console.log(`[ActiveAbilitySystem] Effet instantané "${itemDef.name}"`)
    }

    _useGrenade() {
        const explosionRadius = 5
        const damage = 3
        const grenadePos = this.player.mesh.position.clone()
        grenadePos.y = 0

        let hits = 0
        for (const enemy of this.enemies) {
            if (!enemy || !enemy.enemy) continue
            const dist = Vector3.Distance(grenadePos, enemy.enemy.position)
            if (dist <= explosionRadius) {
                enemy.takeDamage(damage)
                hits++
            }
        }

        this._spawnExplosionVFX(grenadePos)
    }

    // ─────────────────────────────────────────────
    //  VFX
    // ─────────────────────────────────────────────

    _spawnHealVFX() {
        const radius = 1.5
        const duration = 600

        for (let i = 0; i < this._healPool.length; i++) {
            const sphere = this._healPool[i]
            const angle = (i / this._healPool.length) * Math.PI * 2
            const pPos = this.player.mesh.position
            sphere.position.set(
                pPos.x + Math.cos(angle) * radius,
                pPos.y + 0.5,
                pPos.z + Math.sin(angle) * radius
            )
            sphere.scaling.set(1, 1, 1)
            sphere.setEnabled(true)

            const startTime = performance.now()
            const obs = this.scene.onBeforeRenderObservable.add(() => {
                const elapsed = performance.now() - startTime
                const t = elapsed / duration
                sphere.position.y = pPos.y + 0.5 + t * 2
                sphere.scaling.scaleInPlace(0.97)
                if (elapsed >= duration) {
                    sphere.setEnabled(false)
                    this.scene.onBeforeRenderObservable.remove(obs)
                }
            })
        }
    }

    _spawnExplosionVFX(position) {
        const sphere = this._explosionMesh
        sphere.position.copyFrom(position)
        sphere.position.y = 1
        sphere.scaling.set(1, 1, 1)
        sphere.setEnabled(true)

        const mat = sphere.material
        mat.diffuseColor.set(1, 0.4, 0)
        mat.emissiveColor.set(1, 0.2, 0)
        mat.alpha = 1

        const maxScale = 12
        const duration = 400
        const startTime = performance.now()

        const obs = this.scene.onBeforeRenderObservable.add(() => {
            const elapsed = performance.now() - startTime
            const t = elapsed / duration

            sphere.scaling.set(t * maxScale, t * maxScale * 0.4, t * maxScale)
            mat.alpha = 1 - t
            mat.emissiveColor.set(1 - t, 0.2 * (1 - t), 0)

            if (elapsed >= duration) {
                sphere.setEnabled(false)
                this.scene.onBeforeRenderObservable.remove(obs)
            }
        })
    }

    _spawnDashVFX(dir) {
        // Trainée de 4 sphères bleues derrière le joueur
        const trailCount = 4
        const pPos = this.player.mesh.position.clone()
        const back = dir.scale(-1)

        for (let i = 0; i < trailCount; i++) {
            const sphere = MeshBuilder.CreateSphere(`dashTrail_${Date.now()}_${i}`, { diameter: 0.25 }, this.scene)
            const mat = new StandardMaterial(`dashTrailMat_${Date.now()}_${i}`, this.scene)
            mat.diffuseColor = new Color3(0.3, 0.6, 1)
            mat.emissiveColor = new Color3(0.2, 0.4, 1)
            mat.alpha = 0.8
            sphere.material = mat

            sphere.position.set(
                pPos.x + back.x * i * 0.5,
                pPos.y + 0.5,
                pPos.z + back.z * i * 0.5
            )

            const duration = 250 + i * 50
            const startTime = performance.now()
            const obs = this.scene.onBeforeRenderObservable.add(() => {
                const t = (performance.now() - startTime) / duration
                mat.alpha = 0.8 * (1 - t)
                sphere.scaling.setAll(1 - t * 0.8)
                if (t >= 1) {
                    sphere.dispose()
                    this.scene.onBeforeRenderObservable.remove(obs)
                }
            })
        }
    }
}
