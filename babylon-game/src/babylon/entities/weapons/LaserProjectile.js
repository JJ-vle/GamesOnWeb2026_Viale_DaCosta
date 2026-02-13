import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from "@babylonjs/core"
import { Projectile } from "./Projectile"

export class LaserProjectile extends Projectile {
  constructor(scene, player, getDirection, options = {}) {
    super(scene, player.mesh.position)

    this.player = player
    this.getDirection = getDirection // fonction renvoyant Vector3
    this.damagePerSecond = options.damagePerSecond ?? 40
    this.size = options.size ?? { width: 0.2, height: 0.2, depth: 40 }

    // créer le mesh
    this._createMesh()

    // attacher l’update à l’observable après création du mesh
    this._observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000
      this.update(dt)
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
    if (!this.mesh) return

    const dirRaw = this.getDirection()
    if (!dirRaw) return

    const direction = dirRaw.normalize()

    // positionner laser correctement : extrémité sur joueur
    const startPos = this.player.mesh.position
    this.mesh.position.copyFrom(
      startPos.add(direction.scale(this.size.depth / 2))
    )

    // orienter vers la souris
    this.mesh.setDirection(direction)
  }

  dispose() {
    if (this._observer) {
      this.scene.onBeforeRenderObservable.remove(this._observer)
      this._observer = null
    }

    if (this.mesh) {
      this.mesh.dispose()
      this.mesh = null
    }
  }


}
