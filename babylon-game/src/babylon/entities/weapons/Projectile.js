// src/babylon/entities/weapons/Projectile.js
export class Projectile {
  constructor(scene, position) {
    this.scene = scene
    this.position = position.clone()
    this.lifeTime = 2
    this.speed = 10
    this.damage = 1
    this.mesh = null
  }

  update(deltaTime) {
    return true
  }

  dispose() {
    if (this.mesh) {
      this.mesh.dispose()
      this.mesh = null
    }
  }
}
