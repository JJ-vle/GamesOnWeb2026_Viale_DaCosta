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

        // console.log('[ActiveAbilitySystem] Initialisé. Item équipé:', this.equippedItem)
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

        this.cooldownRemaining = this.COOLDOWN
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
        const rings = 8
        const radius = 1.5
        const duration = 600 // ms

        for (let i = 0; i < rings; i++) {
            const angle = (i / rings) * Math.PI * 2
            const sphere = MeshBuilder.CreateSphere(`healVFX_${i}`, { diameter: 0.3 }, this.scene)
            sphere.position = this.player.mesh.position.clone().add(
                new Vector3(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius)
            )
            const mat = new StandardMaterial(`healMat_${i}`, this.scene)
            mat.diffuseColor = new Color3(0, 1, 0.4)
            mat.emissiveColor = new Color3(0, 0.8, 0.3)
            sphere.material = mat

            const startTime = performance.now()
            const obs = this.scene.onBeforeRenderObservable.add(() => {
                const elapsed = performance.now() - startTime
                const t = elapsed / duration
                sphere.position.y = this.player.mesh.position.y + 0.5 + t * 2
                sphere.scaling.scaleInPlace(0.97)
                if (elapsed >= duration) {
                    sphere.dispose()
                    this.scene.onBeforeRenderObservable.remove(obs)
                }
            })
        }
    }

    /**
     * VFX Explosion — sphère rouge qui s'étend puis disparaît
     */
    _spawnExplosionVFX(position) {
        const sphere = MeshBuilder.CreateSphere('explosionVFX', { diameter: 0.5, segments: 6 }, this.scene)
        sphere.position = position.clone()
        sphere.position.y = 1

        const mat = new StandardMaterial('explosionMat', this.scene)
        mat.diffuseColor = new Color3(1, 0.4, 0)
        mat.emissiveColor = new Color3(1, 0.2, 0)
        mat.wireframe = false
        sphere.material = mat

        const maxScale = 12 // diamètre explosion = rayon 5u * 2 = 10u + marge
        const duration = 400 // ms
        const startTime = performance.now()

        const obs = this.scene.onBeforeRenderObservable.add(() => {
            const elapsed = performance.now() - startTime
            const t = elapsed / duration

            const scale = t * maxScale
            sphere.scaling = new Vector3(scale, scale * 0.4, scale)

            // Fade out
            mat.alpha = 1 - t
            mat.emissiveColor = new Color3(1 - t, 0.2 * (1 - t), 0)

            if (elapsed >= duration) {
                sphere.dispose()
                this.scene.onBeforeRenderObservable.remove(obs)
            }
        })
    }
}
