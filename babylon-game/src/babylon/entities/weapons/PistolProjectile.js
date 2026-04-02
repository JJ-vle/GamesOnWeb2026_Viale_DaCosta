// src/babylon/entities/weapons/PistolProjectile.js
import {
    MeshBuilder,
    StandardMaterial,
    Color3
  } from "@babylonjs/core"
  
import { Projectile } from "./Projectile"

// ── OPTIMISATION: Matériau partagé par tous les projectiles pistolet ──
let _sharedPistolMat = null

export class PistolProjectile extends Projectile {
  constructor(scene, position, direction, options = {}) {
    super(scene, position, direction)

    // stats
    this.speed = options.speed ?? 18
    this.damage = options.damage ?? 2
    this.lifeTime = options.lifeTime ?? 2

    // mesh
    this.mesh = MeshBuilder.CreateBox(
      "pistolBullet",
      { size: options.size ?? 0.25 },
      scene
    )

    // ── OPTIMISATION: Réutiliser le même matériau ──
    if (!_sharedPistolMat || _sharedPistolMat.isDisposed()) {
      _sharedPistolMat = new StandardMaterial("pistolBulletMat_shared", scene)
      _sharedPistolMat.diffuseColor = Color3.Black()
    }
    this.mesh.material = _sharedPistolMat

    this.mesh.position.copyFrom(position)
    this.mesh.lookAt(this.mesh.position.add(this.direction))
  }
}
