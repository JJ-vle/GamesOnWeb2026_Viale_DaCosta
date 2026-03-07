// src/babylon/entities/weapons/GrenadeActivable.js
import { ActivableWeapon } from "./ActivableWeapon"
import { GrenadeProjectile } from "./GrenadeProjectile"

export class GrenadeActivable extends ActivableWeapon {
  /**
   * @param {BABYLON.Scene} scene
   * @param {object} player
   * @param {CollisionSystem} collisionSystem
   * @param {object} options
   *    - explosionRadius
   *    - explosionDamage
   *    - any options for ActivableWeapon/projectileOptions
   */
  constructor(scene, player, collisionSystem, options = {}) {
    super(scene, player, collisionSystem, options)

    this.explosionRadius = options.explosionRadius || 5
    this.explosionDamage = options.explosionDamage || 10

    // extend projectile options defaults if provided
    this.projectileOptions = this.projectileOptions || {}
    // maybe set some defaults for grenade
    this.projectileOptions.speed = this.projectileOptions.speed || 15
    this.projectileOptions.initialY = this.projectileOptions.initialY || 8
    this.projectileOptions.gravity = this.projectileOptions.gravity || -20
  }

  activate(direction) {
    if (!this.canActivate()) return null
    if (!direction) return null

    const start = this.player.mesh.position.add(direction.scale(2))
    const proj = new GrenadeProjectile(this.scene, start, direction, this.collisionSystem, {
      ...this.projectileOptions,
      explosionRadius: this.explosionRadius,
      explosionDamage: this.explosionDamage
    })

    this._notifyActivated(proj)
    if (this.collisionSystem) {
      this.collisionSystem.registerProjectile(proj)
    }
    this._resetCooldown()
    return proj
  }
}
