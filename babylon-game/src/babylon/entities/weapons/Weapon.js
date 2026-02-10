// src/babylon/weapons/Weapon.js
export class Weapon {
  constructor(scene, player) {
    this.scene = scene
    this.player = player

    this.cooldown = 0
    this._cooldownTimer = 0
    this.isFiring = false
  }

  startFire() {
    this.isFiring = true
  }

  stopFire() {
    this.isFiring = false
  }

  update(deltaTime, direction) {
    this._cooldownTimer -= deltaTime
    if (this._cooldownTimer < 0) this._cooldownTimer = 0
  }

  canFire() {
    return this._cooldownTimer === 0
  }

  _resetCooldown() {
    this._cooldownTimer = this.cooldown
  }
}
