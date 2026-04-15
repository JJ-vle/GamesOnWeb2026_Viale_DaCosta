// src/babylon/entities/weapons/Projectile.js
import { Vector3 } from '@babylonjs/core'

export class Projectile {
  constructor(scene, position, direction) {
    this.scene = scene
    this.position = position.clone()
    this.direction = direction.clone().normalize()
    this.lifeTime = 2
    this.speed = 10
    this.damage = 1
    this.mesh = null
    this.trail = null
    this.player = null
    /** Injecté par CollisionSystem.registerProjectile() */
    this._collisionEnemies = null
    this._homingSearchSkip = 0
    this._homingTarget = null
  }

  update(deltaTime) {
    if (!this.mesh) return false

    // ── Homing: déviation douce vers l'ennemi le plus proche ──
    if (this.player?.homingProjectiles && this._collisionEnemies) {
      this._updateHoming(deltaTime)
    }

    // déplacement avant
    const movement = this.direction.scale(this.speed * deltaTime)
    this.mesh.position.addInPlace(movement)

    // Orienter le mesh vers la direction de vol
    if (this.player?.homingProjectiles) {
      this.mesh.lookAt(this.mesh.position.add(this.direction))
    }

    // décrémente le temps de vie
    this.lifeTime -= deltaTime

    return this.lifeTime > 0
  }

  /**
   * Dévie la direction du projectile vers l'ennemi le plus proche.
   * Recherche throttlée (1 frame sur 5) pour la perf.
   */
  _updateHoming(deltaTime) {
    // Chercher une cible toutes les 5 frames
    this._homingSearchSkip++
    if (this._homingSearchSkip >= 5 || !this._homingTarget) {
      this._homingSearchSkip = 0
      let closestDist = 25 // rayon max de détection
      let closest = null
      const pos = this.mesh.position
      for (const enemy of this._collisionEnemies) {
        if (!enemy.enemy || enemy.life <= 0 || enemy._isAlly) continue
        const dx = enemy.enemy.position.x - pos.x
        const dz = enemy.enemy.position.z - pos.z
        const d = Math.sqrt(dx * dx + dz * dz)
        if (d < closestDist) {
          closestDist = d
          closest = enemy
        }
      }
      this._homingTarget = closest
    }

    // Déviation douce vers la cible
    if (this._homingTarget?.enemy) {
      const toTarget = this._homingTarget.enemy.position.subtract(this.mesh.position)
      toTarget.y = 0
      const len = toTarget.length()
      if (len > 0.1) {
        toTarget.scaleInPlace(1 / len) // normaliser
        // Interpolation: tourner de 3-5% par frame vers la cible
        const lerpFactor = 3.0 * deltaTime // ~3 rad/s de correction
        this.direction.x += (toTarget.x - this.direction.x) * lerpFactor
        this.direction.z += (toTarget.z - this.direction.z) * lerpFactor
        this.direction.normalize()
      }
    }
  }

  dispose() {
    if (this.trail) {
      this.trail.dispose()
      this.trail = null
    }
    if (this.mesh) {
      this.mesh.dispose()
      this.mesh = null
    }
  }
}
