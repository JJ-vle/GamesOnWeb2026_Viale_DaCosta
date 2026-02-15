// src/babylon/entities/weapons/PistolProjectile.js
import {
    MeshBuilder,
    StandardMaterial,
    Color3
  } from "@babylonjs/core"
  
import { Projectile } from "./Projectile"

export class PistolProjectile extends Projectile {
  constructor(scene, position, direction, options = {}) {
    super(scene, position, direction)

    // stats
    this.speed = options.speed ?? 18
    this.damage = options.damage ?? 2 //60
    this.lifeTime = options.lifeTime ?? 2

    // mesh
    this.mesh = MeshBuilder.CreateBox(
      "pistolBullet",
      { size: options.size ?? 0.25 },
      scene
    )

    const mat = new StandardMaterial("pistolBulletMat", scene)
    mat.diffuseColor = Color3.Black()
    this.mesh.material = mat

    this.mesh.position.copyFrom(position)
    this.mesh.lookAt(this.mesh.position.add(this.direction))
  }
}

