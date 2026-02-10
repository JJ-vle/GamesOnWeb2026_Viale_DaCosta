// src/babylon/weapons/LaserWeapon.js
import { Weapon } from "./Weapon"
import { MeshBuilder, StandardMaterial, Color3, Vector3, Space } from "@babylonjs/core"

export class LaserWeapon extends Weapon {
  constructor(scene, player) {
    super(scene, player)

    this.fireDuration = 5
    this.pauseDuration = 2
    this.damagePerSecond = 40

    this.isFiring = true;

    this._fireTimer = 0
    this._pauseTimer = 0
    this.laserMesh = null

    this.size = { width: 0.2, height: 0.2, depth: 40 }
  }

  update(deltaTime, direction) {
    if (!this.isFiring) return

    // pause
    if (this._pauseTimer > 0) {
      this._pauseTimer -= deltaTime
      return
    }

    this._fireTimer += deltaTime

    if (!this.laserMesh) {
      this._createLaser(direction)
    }

    this._updateLaser(direction, deltaTime)

    if (this._fireTimer >= this.fireDuration) {
      this._stopLaser()
      this._pauseTimer = this.pauseDuration
      this._fireTimer = 0
    }
  }

  _createLaser(direction) {


      this.laserMesh = MeshBuilder.CreateBox(
          "laserBeam",
          { width: 0.2, height: 0.2, depth: this.size.depth },
          this.scene
      );

      const mat = new StandardMaterial("laserMat", this.scene);
      mat.emissiveColor = new Color3(1, 0, 0);
      this.laserMesh.material = mat;
  }



  _updateLaser(direction, deltaTime) {
    // Le centre du laser doit être à (this.size.depth / 2) unités du joueur dans la direction du tir
    this.laserMesh.position = this.player.mesh.position.clone();
    this.laserMesh.position.addInPlace(direction.scale(this.size.depth / 2));
    
    // Orienter le laser dans la direction de la souris
    this.laserMesh.setDirection(direction);
  }




  _stopLaser() {
    if (this.laserMesh) {
      this.laserMesh.dispose()
      this.laserMesh = null
    }
  }

  stopFire() {
    super.stopFire()
    this._stopLaser()
  }
}
