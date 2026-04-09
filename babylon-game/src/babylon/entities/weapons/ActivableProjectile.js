// src/babylon/entities/weapons/ActivableProjectile.js
import * as BABYLON from "@babylonjs/core"
import { Projectile } from "./Projectile"

export class ActivableProjectile extends Projectile {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   * @param {BABYLON.Vector3} direction  // horizontal aiming direction
   * @param {object} options
   *   - speed: horizontal speed
   *   - initialY: initial vertical velocity (positive upwards)
   *   - gravity: gravity (negative) applied to vertical velocity
   *   - damage
   *   - size
   */
  constructor(scene, position, direction, options = {}) {
    super(scene, position, direction)

    this.speed = options.speed || 10
    this.damage = options.damage || 1
    this.gravity = options.gravity !== undefined ? options.gravity : -20
    this.initialY = options.initialY !== undefined ? options.initialY : 8

    // velocity vector includes horizontal component from direction and vertical initialY
    this.velocity = direction.clone().normalize().scale(this.speed)
    this.velocity.y = this.initialY

    // override lifetime if desired (we'll rely on ground detection)
    this.lifeTime = options.lifeTime || 10

    // create a visible mesh if not already created by parent
    const radius = options.size || 0.3
    this.mesh = BABYLON.MeshBuilder.CreateSphere("activableProj", { diameter: radius * 2 }, scene)
    this.mesh.position.copyFrom(this.position)
  }

  update(deltaTime) {
    if (!this.mesh) return false

    // move according to velocity
    const movement = this.velocity.scale(deltaTime)
    this.mesh.position.addInPlace(movement)

    // apply gravity to vertical component
    this.velocity.y += this.gravity * deltaTime

    // synchronize stored position
    this.position.copyFrom(this.mesh.position)

    // check for ground impact (approx y <= 0)
    if (this.mesh.position.y <= 0) {
      try { this.onGroundImpact?.() } catch (e) { console.error("Error in onGroundImpact callback", e) }
      return false
    }

    // lifetime fallback
    this.lifeTime -= deltaTime
    return this.lifeTime > 0
  }
}
