// src/babylon/entities/weapons/Projectile.js
export class Projectile {
  constructor(scene, position, direction) {
    this.scene = scene
    this.position = position.clone()
    this.direction = direction.clone().normalize()
    this.lifeTime = 2
    this.speed = 10
    this.damage = 1
    this.mesh = null
  }

  update(deltaTime) {
    if (!this.mesh) return false

    // déplacement avant
    const movement = this.direction.scale(this.speed * deltaTime)
    this.mesh.position.addInPlace(movement)

    // décrémente le temps de vie
    this.lifeTime -= deltaTime

    return this.lifeTime > 0
  }

  dispose() {
    if (this.mesh) {
      this.mesh.dispose()
      this.mesh = null
    }
  }
}
