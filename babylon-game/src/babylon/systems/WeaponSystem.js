// src/babylon/systems/WeaponSystem.js
import * as BABYLON from "@babylonjs/core"

export class WeaponSystem {
  constructor(scene, player, weapon) {
    this.scene = scene
    this.player = player
    this.weapon = weapon
  }

  update(deltaTime) {
    const direction = this._getMouseDirection()
    if (!direction) return

    this.weapon.update(deltaTime, direction)
  }

  startFire() {
    this.weapon.startFire()
  }

  stopFire() {
    this.weapon.stopFire()
  }

  _getMouseDirection() {
    const camera = this.scene.activeCamera
    if (!camera) return null

    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      BABYLON.Matrix.Identity(),
      camera
    )

    const startPos = this.player.mesh.position

    const groundPlane = BABYLON.Plane.FromPositionAndNormal(
      new BABYLON.Vector3(0, startPos.y, 0),
      BABYLON.Vector3.Up()
    )

    const distance = ray.intersectsPlane(groundPlane)
    if (distance === null) return null

    const target = ray.origin.add(ray.direction.scale(distance))

    const dir = target.subtract(startPos)
    dir.y = 0
    return dir.normalize()
  }
}
