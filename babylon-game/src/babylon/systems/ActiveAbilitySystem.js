/**
 * ActiveAbilitySystem — Gère la capacité active du joueur (touche Espace).
 *
 * Slot unique : peut contenir un objet "Heal" ou "Grenade".
 * - Heal : restaure +5 HP immédiatement
 * - Grenade : explosion AoE (rayon 5u, 3 dégâts sur tous ennemis proches)
 * - Cooldown : 10s entre chaque utilisation
 *
 * Usage :
 *   const abilitySystem = new ActiveAbilitySystem(scene, playerEntry, enemies)
 *   // Dans la boucle update :
 *   abilitySystem.update(deltaTime, inputMap)
 *   // Pour changer l'item équipé :
 *   abilitySystem.equip('heal') // ou 'grenade' ou null
 */
import { Vector3, MeshBuilder, StandardMaterial, Color3, ParticleSystem, Texture } from '@babylonjs/core'
import { ItemDatabase } from '../entities/items/items.js'

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

        // Slot d'item équipé : null | 'heal' | 'grenade' | itemId (ex: 'virus', 'immuable')
        this.equippedItem = 'heal' // par défaut : Heal pour le testing

        // Cooldown
        this.COOLDOWN = 10.0        // secondes
        this.cooldownRemaining = 0  // temps restant

        // État de la touche pour éviter le repeat
        this._spaceLock = false

        // ── Buff temporaire (Virus, Immuable, etc.) ──
        this._activeBuff = null     // { itemId, modifiers, remaining }
        this._buffApplied = false   // true si les modifiers sont actuellement appliqués

        // Callbacks optionnels
        this.onAbilityUsed = null    // () => void
        this.onItemChanged = null    // (itemType) => void
        this.onBuffStart = null      // (itemId) => void
        this.onBuffEnd = null        // (itemId) => void

        // Pool VFX — pré-créés et réutilisés
        this._healPool = this._createHealPool(8)
        this._explosionMesh = this._createExplosionMesh()
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
     * Change l'item équipé dans le slot
     * @param {'heal'|'grenade'|null} itemType
     */
    equip(itemType) {
        // Annuler le buff en cours s'il y en a un
        if (this._activeBuff) this._endBuff()

        this.equippedItem = itemType
        this.cooldownRemaining = 0 // Reset cooldown au changement

        // Si c'est un item data-driven, lire son cooldown
        const itemDef = ItemDatabase[itemType]
        if (itemDef && itemDef.cooldown) {
            this.COOLDOWN = itemDef.cooldown
        } else {
            this.COOLDOWN = 10.0 // Défaut pour heal/grenade
        }

        if (this.onItemChanged) this.onItemChanged(itemType)
    }

    /**
     * À appeler dans la boucle update de MainScene
     * @param {number} deltaTime - secondes
     * @param {Object} inputMap - carte des touches pressées
     */
    update(deltaTime, inputMap) {
        // Décrémenter le cooldown
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining -= deltaTime
            if (this.cooldownRemaining < 0) this.cooldownRemaining = 0
        }

        // ── Tick buff temporaire (Virus, Immuable, etc.) ──
        if (this._activeBuff) {
            this._activeBuff.remaining -= deltaTime
            if (this._activeBuff.remaining <= 0) {
                this._endBuff()
            }
        }

        // Détection appui Espace
        if (inputMap[' '] && !this._spaceLock) {
            this._spaceLock = true
            this._tryActivate()
        }
        if (!inputMap[' ']) {
            this._spaceLock = false
        }
    }

    /**
     * Retourne la fraction de cooldown restant [0..1] (pour l'UI)
     */
    getCooldownPercent() {
        return this.cooldownRemaining / this.COOLDOWN
    }

    /** Retourne le buff actif ou null (pour l'UI) */
    getActiveBuff() {
        return this._activeBuff
    }

    /** Retourne la fraction de durée restante du buff [0..1] */
    getBuffPercent() {
        if (!this._activeBuff) return 0
        const itemDef = ItemDatabase[this._activeBuff.itemId]
        if (!itemDef || !itemDef.duration) return 0
        return this._activeBuff.remaining / itemDef.duration
    }

    /**
     * Tente d'activer la capacité si possible
     */
    _tryActivate() {
        if (!this.equippedItem) return
        if (this.cooldownRemaining > 0) return
        // Ne pas activer si un buff est déjà en cours
        if (this._activeBuff) return

        // Items legacy (heal/grenade)
        switch (this.equippedItem) {
            case 'heal':
                this._useHeal()
                break
            case 'grenade':
                this._useGrenade()
                break
            default:
                // Item data-driven depuis ItemDatabase (virus, immuable, etc.)
                this._useDataDrivenItem(this.equippedItem)
                break
        }

        // Watercooling: réduire le cooldown effectif
        const cdr = this.player.cooldownReduction || 0
        this.cooldownRemaining = this.COOLDOWN * (1 - Math.min(cdr, 0.8))
        if (this.onAbilityUsed) this.onAbilityUsed()
    }

    /**
     * Active un item data-driven : applique ses modifiers pendant `duration` secondes.
     * Lit cooldown et duration directement depuis ItemDatabase.
     */
    _useDataDrivenItem(itemId) {
        const itemDef = ItemDatabase[itemId]
        if (!itemDef) {
            console.warn(`[ActiveAbilitySystem] Item inconnu : "${itemId}"`)
            return
        }

        const duration = itemDef.duration || 0
        const cooldown = itemDef.cooldown || 10

        // Mettre à jour le cooldown global depuis l'item
        this.COOLDOWN = cooldown

        if (duration <= 0 || duration === Infinity) {
            // Pas de buff temporaire — effet instantané (ex: reinitialisation)
            this._applyInstantEffect(itemId, itemDef)
            return
        }

        // Appliquer les modifiers temporairement
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

    /**
     * Retire les modifiers du buff temporaire actif.
     */
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

    /**
     * Effet instantané pour items sans durée (ex: réinitialisation).
     */
    _applyInstantEffect(itemId, itemDef) {
        // Pour l'instant, applique juste les modifiers comme des flags permanents
        const modifiers = itemDef.modifiers || {}
        for (const [key, value] of Object.entries(modifiers)) {
            if (typeof value === 'boolean') {
                this.player[key] = value
            }
        }
        console.log(`[ActiveAbilitySystem] Effet instantané "${itemDef.name}"`)
    }

    /**
     * Heal : restaure +5 HP
     */
    _useHeal() {
        const healAmount = 5
        this.player.heal(healAmount)
        // console.log(`[ActiveAbilitySystem] Heal +${healAmount} HP. Vie: ${this.player.life}/${this.player.maxLife}`)
        this._spawnHealVFX()
    }

    /**
     * Grenade : explosion AoE (rayon 5u, 3 dégâts)
     */
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

        // console.log(`[ActiveAbilitySystem] Grenade ! ${hits} ennemis touchés.`)
        this._spawnExplosionVFX(grenadePos)
    }

    /**
     * VFX Heal — anneau vert autour du joueur
     */
    _spawnHealVFX() {
        const radius = 1.5
        const duration = 600 // ms

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

    /**
     * VFX Explosion — sphère rouge qui s'étend puis disparaît
     */
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
        const duration = 400 // ms
        const startTime = performance.now()

        const obs = this.scene.onBeforeRenderObservable.add(() => {
            const elapsed = performance.now() - startTime
            const t = elapsed / duration

            const scale = t * maxScale
            sphere.scaling.set(scale, scale * 0.4, scale)

            mat.alpha = 1 - t
            mat.emissiveColor.set(1 - t, 0.2 * (1 - t), 0)

            if (elapsed >= duration) {
                sphere.setEnabled(false)
                this.scene.onBeforeRenderObservable.remove(obs)
            }
        })
    }
}
