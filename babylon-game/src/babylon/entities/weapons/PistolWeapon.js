// src/babylon/weapons/PistolWeapon.js
import { Weapon } from "./Weapon"
import { PistolProjectile } from "./PistolProjectile"

export class PistolWeapon extends Weapon {
  constructor(scene, player) {
    super(scene, player)

    this.cooldown = 0.25
    this._cooldownTimer = 0
    this.damage = 2

    this.isFiring = true;
  }

    update(deltaTime, direction) {
      this._cooldownTimer -= deltaTime
      if (this._cooldownTimer < 0) this._cooldownTimer = 0

      if (!this.isFiring || this._cooldownTimer > 0) return

      this._shoot(direction)
      this._cooldownTimer = this.cooldown
    }


  _shoot(direction) {
    if (!direction) return

    const start = this.player.mesh.position.add(direction.scale(2))

    const projectile = new PistolProjectile(
      this.scene,
      start,
      direction,
      {
        speed: 40,
        size: 0.3,
        damage: this.damage
      }
    )

    this._notifyProjectile(projectile)
  }


}
