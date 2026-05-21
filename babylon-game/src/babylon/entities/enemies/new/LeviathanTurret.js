import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
import { Enemy } from '../Enemy'

/**
 * LeviathanTurret : Tourelle statique attachée au NEON-LEVIATHAN.
 * Variant 'LEFT'  → tir FIRE  (projectiles orange, applique brûlure DoT)
 * Variant 'RIGHT' → tir TOXIC (projectiles verts,  applique poison DoT)
 * 80HP / 0 Speed / Catégorie Boss-Sub
 */
export class LeviathanTurret extends Enemy {

    /**
     * @param {BABYLON.Scene} scene
     * @param {Function|null} contact
     * @param {'LEFT'|'RIGHT'} variant
     */
    constructor(scene, contact, variant = 'LEFT') {
        super(scene, contact, 80, false) // pas d'IA navGrid
        this.variant = variant
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0
        this.damage = 0

        this.xpValue = 80
        this.coinValue = 50

        // Cadence de tir (LEFT plus rapide)
        this._fireTimer = variant === 'LEFT' ? 3.0 : 3.5
        this._FIRE_INTERVAL = variant === 'LEFT' ? 3.0 : 3.5

        // Suivi des projectiles actifs (pour nettoyage si tourelle détruite)
        this._activeProjectileObs = []

        // Flash de tir
        this._muzzleFlashTimer = 0
    }

    _createMesh() {
        // Corps cylindrique de la tourelle
        const base = MeshBuilder.CreateCylinder('LeviathanTurret_' + this.variant, {
            diameter: 3,
            height: 3.5,
            tessellation: 8
        }, this.scene)
        base.position = new Vector3(0, 1.75, 0)
        base.checkCollisions = false

        const mat = new StandardMaterial('turretMat_' + this.variant, this.scene)
        if (this.variant === 'LEFT') {
            mat.diffuseColor = new Color3(1.0, 0.3, 0.0)
            mat.emissiveColor = new Color3(0.5, 0.1, 0.0)
        } else {
            mat.diffuseColor = new Color3(0.1, 0.8, 0.1)
            mat.emissiveColor = new Color3(0.0, 0.35, 0.05)
        }
        base.material = mat

        // Canon
        const cannon = MeshBuilder.CreateCylinder('turretCannon_' + this.variant, {
            diameter: 0.9,
            height: 4.0,
            tessellation: 8
        }, this.scene)
        cannon.parent = base
        cannon.position = new Vector3(0, 0.3, 1.8)
        cannon.rotation.x = Math.PI / 2
        cannon.material = mat

        // Anneau d'énergie autour du corps
        const ring = MeshBuilder.CreateTorus('turretRing_' + this.variant, {
            diameter: 3.8,
            thickness: 0.2,
            tessellation: 16
        }, this.scene)
        ring.parent = base
        ring.position.y = 0
        const ringMat = new StandardMaterial('turretRingMat_' + this.variant, this.scene)
        if (this.variant === 'LEFT') {
            ringMat.diffuseColor = new Color3(1, 0.5, 0)
            ringMat.emissiveColor = new Color3(0.8, 0.2, 0)
        } else {
            ringMat.diffuseColor = new Color3(0, 1, 0.2)
            ringMat.emissiveColor = new Color3(0, 0.6, 0.1)
        }
        ringMat.alpha = 0.8
        ring.material = ringMat
        this._ringMesh = ring

        return base
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Rotation de la tourelle vers le joueur
        const dir = playerMesh.position.subtract(this.enemy.position)
        dir.y = 0
        const playerDist = dir.length()
        if (playerDist > 0.5) {
            const targetY = Math.atan2(dir.x, dir.z)
            let diff = targetY - this.enemy.rotation.y
            while (diff < -Math.PI) diff += Math.PI * 2
            while (diff > Math.PI) diff -= Math.PI * 2
            this.enemy.rotation.y += diff * 0.08
        }

        // Animation anneau (rotation continue)
        if (this._ringMesh) {
            this._ringMesh.rotation.y += dt * 2.5
        }

        // Flash de tir
        if (this._muzzleFlashTimer > 0) {
            this._muzzleFlashTimer -= dt
            if (this._muzzleFlashTimer <= 0) {
                // Remettre la couleur normale
                if (this.variant === 'LEFT') {
                    this.material.emissiveColor.set(0.5, 0.1, 0.0)
                } else {
                    this.material.emissiveColor.set(0.0, 0.35, 0.05)
                }
            }
        }

        // Timer de tir
        this._fireTimer -= dt
        if (this._fireTimer <= 0) {
            this._fireTimer = this._FIRE_INTERVAL
            if (playerDist < 60) { // ne tire que si le joueur est à portée raisonnable
                this._fireProjectile(playerMesh, callbacks)
            }
        }
    }

    /**
     * Crée un projectile auto-géré qui se déplace vers la position actuelle du joueur.
     * Applique un effet de statut au contact (FIRE = brûlure, TOXIC = poison).
     */
    _fireProjectile(playerMesh, callbacks) {
        // Flash visuel au moment du tir
        if (this.variant === 'LEFT') {
            this.material.emissiveColor.set(1, 0.6, 0)
        } else {
            this.material.emissiveColor.set(0, 1, 0.3)
        }
        this._muzzleFlashTimer = 0.12

        // Direction vers le joueur (calculée au moment du tir, pas trackée ensuite)
        const dir = playerMesh.position.subtract(this.enemy.position)
        dir.y = 0
        if (dir.length() < 0.1) return
        dir.normalize()

        // Création du mesh projectile
        const projMesh = MeshBuilder.CreateSphere('levTurretProj_' + this.variant, {
            diameter: 0.7,
            segments: 5
        }, this.scene)
        const startPos = this.enemy.position.clone()
        startPos.y = this.enemy.position.y + 1.8 // hauteur du canon
        projMesh.position.copyFrom(startPos)

        const projMat = new StandardMaterial('levProjMat_' + Date.now(), this.scene)
        if (this.variant === 'LEFT') {
            projMat.diffuseColor = new Color3(1, 0.4, 0)
            projMat.emissiveColor = new Color3(1, 0.2, 0)
        } else {
            projMat.diffuseColor = new Color3(0.1, 1, 0.1)
            projMat.emissiveColor = new Color3(0, 0.7, 0.1)
        }
        projMesh.material = projMat

        const SPEED = 14
        const LIFETIME = 5.0
        const HIT_RADIUS_SQ = 2.25 // 1.5 unités de rayon²
        let elapsed = 0
        let destroyed = false

        const obs = this.scene.onBeforeRenderObservable.add(() => {
            if (destroyed) return

            const dt = this.scene.getEngine().getDeltaTime() / 1000
            elapsed += dt

            // Mouvement
            projMesh.position.addInPlace(dir.scale(SPEED * dt))

            // Légère oscillation verticale (esthétique)
            projMesh.position.y = startPos.y + Math.sin(elapsed * 8) * 0.15

            // Test de collision avec le joueur (distance²)
            const dx = projMesh.position.x - playerMesh.position.x
            const dz = projMesh.position.z - playerMesh.position.z
            const dy = projMesh.position.y - playerMesh.position.y
            const distSq = dx * dx + dz * dz + dy * dy

            if (distSq < HIT_RADIUS_SQ) {
                destroyed = true
                this._applyHitEffect(callbacks)
                projMesh.dispose()
                this.scene.onBeforeRenderObservable.remove(obs)
                const idx = this._activeProjectileObs.indexOf(obs)
                if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
                return
            }

            if (elapsed >= LIFETIME) {
                destroyed = true
                projMesh.dispose()
                this.scene.onBeforeRenderObservable.remove(obs)
                const idx = this._activeProjectileObs.indexOf(obs)
                if (idx !== -1) this._activeProjectileObs.splice(idx, 1)
            }
        })

        this._activeProjectileObs.push(obs)
    }

    /**
     * Applique l'effet de statut sur le joueur selon le variant de la tourelle.
     */
    _applyHitEffect(callbacks) {
        if (!callbacks) return
        if (this.variant === 'LEFT') {
            // FIRE : brûlure DoT (3 DPS pendant 3s)
            callbacks.onBurnPlayer?.(3, 3)
        } else {
            // TOXIC : poison DoT (2 DPS pendant 4s) + dégâts immédiats légers
            callbacks.onDamagePlayer?.(1)
            callbacks.onPoisonPlayer?.(2, 4)
        }
    }

    destroy() {
        // Nettoyer tous les projectiles en vol si la tourelle est détruite
        for (const obs of this._activeProjectileObs) {
            try { this.scene.onBeforeRenderObservable.remove(obs) } catch (e) {}
        }
        this._activeProjectileObs = []
        super.destroy()
    }

    disposeFull() {
        for (const obs of this._activeProjectileObs) {
            try { this.scene.onBeforeRenderObservable.remove(obs) } catch (e) {}
        }
        this._activeProjectileObs = []
        super.disposeFull()
    }
}
