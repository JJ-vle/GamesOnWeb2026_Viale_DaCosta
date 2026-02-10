import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from "@babylonjs/core"
import { Projectile } from "./Projectile"

export class LaserProjectile extends Projectile {
  constructor(scene, player, getDirection, options = {}) {
    // pas de direction dans le super, on gère dans update
    super(scene, player.mesh.position)

    this.player = player
    this.getDirection = getDirection // fonction renvoyant Vector3
    this.damagePerSecond = options.damagePerSecond ?? 40
    this.lifeTime = options.duration ?? 5
    this.size = options.size ?? { width: 0.2, height: 0.2, depth: 40 }

    // créer le mesh
    this._createMesh()

    // attacher l’update à l’observable après création du mesh
    this._observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000
      const alive = this.update(dt)
      if (!alive) {
        this.scene.onBeforeRenderObservable.remove(this._observer)
      }
    })
  }

  _createMesh() {
    this.mesh = MeshBuilder.CreateBox(
      "laserBeam",
      this.size,
      this.scene
    )

    const mat = new StandardMaterial("laserMat", this.scene)
    mat.emissiveColor = new Color3(1, 0, 0)
    this.mesh.material = mat
  }

  update(deltaTime) {
    if (!this.mesh) return true

    const dirRaw = this.getDirection()
    if (!dirRaw) return true
    const direction = dirRaw.normalize()

    // positionner laser correctement : extrémité sur joueur
    this.mesh.position.copyFrom(this.player.mesh.position.add(direction.scale(this.size.depth / 2)))

    // orienter vers la souris
    this.mesh.setDirection(direction)

    this.lifeTime -= deltaTime
    if (this.lifeTime <= 0) {
      this.dispose()
      return false
    }

    return true
  }
}
