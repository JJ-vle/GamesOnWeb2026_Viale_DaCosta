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

        // Slot d'item équipé : null | 'heal' | 'grenade'
        this.equippedItem = 'heal' // par défaut : Heal pour le testing

        // Cooldown
        this.COOLDOWN = 10.0        // secondes
        this.cooldownRemaining = 0  // temps restant

        // État de la touche pour éviter le repeat
        this._spaceLock = false

        // Callbacks optionnels
        this.onAbilityUsed = null    // () => void
        this.onItemChanged = null    // (itemType) => void

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
        this.equippedItem = itemType
        this.cooldownRemaining = 0 // Reset cooldown au changement
        if (this.onItemChanged) this.onItemChanged(itemType)
        // console.log('[ActiveAbilitySystem] Item équipé:', itemType)
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

    /**
     * Tente d'activer la capacité si possible
     */
    _tryActivate() {
        if (!this.equippedItem) {
            // console.log('[ActiveAbilitySystem] Pas d\'item équipé.')
            return
        }
        if (this.cooldownRemaining > 0) {
            // console.log(`[ActiveAbilitySystem] Cooldown: ${this.cooldownRemaining.toFixed(1)}s restant`)
            return
        }

        switch (this.equippedItem) {
            case 'heal':
                this._useHeal()
                break
            case 'grenade':
                this._useGrenade()
                break
        }

        // Watercooling: réduire le cooldown effectif
        const cdr = this.player.cooldownReduction || 0
        this.cooldownRemaining = this.COOLDOWN * (1 - Math.min(cdr, 0.8))
        if (this.onAbilityUsed) this.onAbilityUsed()
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
