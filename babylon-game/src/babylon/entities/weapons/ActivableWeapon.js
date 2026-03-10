// src/babylon/entities/weapons/ActivableWeapon.js
import { Activable } from "./Activable"
import { ActivableProjectile } from "./ActivableProjectile"

export class ActivableWeapon extends Activable {
  /**
   * @param {BABYLON.Scene} scene
   * @param {object} player
   * @param {CollisionSystem} collisionSystem (optional) to register projectiles automatically
   * @param {object} options
   *    - cooldown
   *    - projectileOptions (see ActivableProjectile)
   */
  constructor(scene, player, collisionSystem, options = {}) {
    super(scene, player)
    this.collisionSystem = collisionSystem
    this.cooldown = options.cooldown || 1.0
    this._cooldownTimer = 0
    this.projectileOptions = options.projectileOptions || {}
  }

  /**
   * reduce cooldown timer each frame; inherits the base behaviour
   * @param {number} deltaTime
   */
  update(deltaTime) {
    super.update(deltaTime)
  }

  /**
   * direction should be a normalized horizontal vector
   */
  activate(direction) {
    if (!this.canActivate()) return null
    if (!direction) return null

    const start = this.player.mesh.position.add(direction.scale(2))
    const proj = new ActivableProjectile(this.scene, start, direction, this.projectileOptions)

    // notify and maybe register
    this._notifyActivated(proj)
    if (this.collisionSystem) {
      this.collisionSystem.registerProjectile(proj)
    }

    this._resetCooldown()
    return proj
  }
}
