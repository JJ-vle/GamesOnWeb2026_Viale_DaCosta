import { Weapon } from "./Weapon"
import { LaserProjectile } from "./LaserProjectile"
import { Vector3 } from "@babylonjs/core"

export class LaserWeapon extends Weapon {
  constructor(scene, player) {
    super(scene, player)

    this.fireDuration = 5
    this.pauseDuration = 2
    this.damagePerSecond = 40

    this.isFiring = true
    this._fireTimer = 0
    this._pauseTimer = 0
    this.laser = null
  }

  update(deltaTime) {
    if (!this.isFiring) return

    // pause
    if (this._pauseTimer > 0) {
      this._pauseTimer -= deltaTime
      return
    }

    this._fireTimer += deltaTime

    // mettre à jour le laser chaque frame
    if (!this.laser) {
      this._startLaser()
    }

    if (this._fireTimer >= this.fireDuration) {
      this._stopLaser()
      this._pauseTimer = this.pauseDuration
      this._fireTimer = 0
    }
  }


  _startLaser() {
    this.laser = new LaserProjectile(
      this.scene,
      this.player,
      () => this._getAimDirection(),
      {
        duration: this.fireDuration,
        damagePerSecond: this.damagePerSecond,
        size: { width: 0.2, height: 0.2, depth: 40 }
      }
    )
    this._notifyProjectile(this.laser)
  }

  _stopLaser() {
    if (this.laser) {
      this.laser.dispose()
      this.laser = null
    }
  }

  _getAimDirection() {
    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY)
    if (pick.hit) {
      const dir = pick.pickedPoint.subtract(this.player.mesh.position)
      dir.y = 0 // iso/top-down
      return dir
    }
    return new Vector3(0, 0, 1)
  }

  stopFire() {
    super.stopFire()
    this._stopLaser()
  }
}
