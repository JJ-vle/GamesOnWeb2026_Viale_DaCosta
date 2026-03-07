// src/babylon/entities/weapons/GrenadeProjectile.js
import * as BABYLON from "@babylonjs/core"
import { ActivableProjectile } from "./ActivableProjectile"

export class GrenadeProjectile extends ActivableProjectile {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   * @param {BABYLON.Vector3} direction
   * @param {CollisionSystem} collisionSystem
   * @param {object} options
   *   - explosionRadius
   *   - explosionDamage
   *   - any options supported by ActivableProjectile
   */
  constructor(scene, position, direction, collisionSystem, options = {}) {
    super(scene, position, direction, options)
    this.collisionSystem = collisionSystem
    this.explosionRadius = options.explosionRadius || 5
    this.explosionDamage = options.explosionDamage || 10

    // appearance adjust: make grenade black
    if (this.mesh) {
      const mat = new BABYLON.StandardMaterial("grenadeMat", this.scene)
      mat.diffuseColor = new BABYLON.Color3(0, 0, 0)
      mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)
      this.mesh.material = mat
    }

    // when ground is hit, explode
    this.onGroundImpact = this._explode.bind(this)
  }

  _explode() {
    // simple visual effect: scale sphere and fade
    const explosion = BABYLON.MeshBuilder.CreateSphere("explosion", { diameter: this.explosionRadius * 2 }, this.scene)
    explosion.position.copyFrom(this.mesh.position)
    const mat = new BABYLON.StandardMaterial("explMat", this.scene)
    mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0)
    mat.alpha = 0.6
    explosion.material = mat

    // scale animation
    const anim = new BABYLON.Animation("expScale", "scaling", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT)
    const keys = []
    keys.push({ frame: 0, value: explosion.scaling.clone() })
    keys.push({ frame: 15, value: explosion.scaling.multiplyByFloats(1.5, 1.5, 1.5) })
    anim.setKeys(keys)
    explosion.animations = [anim]
    this.scene.beginAnimation(explosion, 0, 15, false, 1, () => explosion.dispose())

    // damage nearby enemies via collision system helper method
    if (this.collisionSystem && typeof this.collisionSystem.damageEnemiesInRadius === 'function') {
      this.collisionSystem.damageEnemiesInRadius(this.mesh.position, this.explosionRadius, this.explosionDamage)
    } else if (this.collisionSystem) {
      // fallback manual
      for (let enemy of this.collisionSystem.enemies) {
        if (!enemy.enemy) continue
        const dist = enemy.enemy.position.subtract(this.mesh.position).length()
        if (dist <= this.explosionRadius) {
          enemy.takeDamage(this.explosionDamage)
        }
      }
    }
  }
}
