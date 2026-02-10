// src/babylon/entities/weapons/Projectile.js
import {
  MeshBuilder,
  StandardMaterial,
  Color3
} from "@babylonjs/core"

export class Projectile {
  constructor(scene, position, direction, options) {
    this.scene = scene
    this.direction = direction.normalize()
    this.speed = options.speed
    this.damage = options.damage
    this.lifeTime = 2 // secondes

    this.mesh = MeshBuilder.CreateBox(
      "bullet",
      { size: options.size },
      scene
    )

    const mat = new StandardMaterial("bulletMat", scene)
    mat.diffuseColor =
      options.color === "black"
        ? Color3.Black()
        : Color3.White()

    this.mesh.material = mat
    this.mesh.position.copyFrom(position)
    this.mesh.lookAt(this.mesh.position.add(this.direction))
    
    // Auto-update chaque frame pour que le projectile se déplace et se détruise
    this._observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000
      const alive = this.update(dt)
      if (!alive) {
        this.scene.onBeforeRenderObservable.remove(this._observer)
      }
    })
  }

  update(deltaTime) {
    this.mesh.position.addInPlace(
      this.direction.scale(this.speed * deltaTime)
    )

    this.lifeTime -= deltaTime

    if (this.lifeTime <= 0) {
      this.mesh.dispose()
      return false
    }

    return true
  }

}
