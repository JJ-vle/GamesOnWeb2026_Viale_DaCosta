// src/babylon/cameras/IsoCamera.js
import { ArcRotateCamera, Camera } from "@babylonjs/core"

export class IsoCamera {
  constructor(scene, target) {
    this.scene = scene

    /*
    this.camera = new ArcRotateCamera(
      "isoCamera",
      Math.PI / 4,
      Math.PI / 3,
      20,
      target,
      scene
    )*/

    this.camera = new ArcRotateCamera(
      "isoCamera",
      -Math.PI / 2, // caméra placée au SUD, regarde vers le NORD (+Z)
      Math.PI / 3,
      20,
      target,
      scene
    )

    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA
    this._updateFrustum()

    // verrouillages
    this.camera.lowerRadiusLimit = this.camera.radius
    this.camera.upperRadiusLimit = this.camera.radius
    this.camera.allowUpsideDown = false

    // resize auto
    scene.getEngine().onResizeObservable.add(() => {
      this._updateFrustum()
    })
  }

  attach() {
    // rien à faire en iso
  }

  detach() {
    // rien à faire en iso
  }

  _updateFrustum() {
    const engine = this.scene.getEngine()
    const ratio = engine.getRenderWidth() / engine.getRenderHeight()

    const size = 15
    const yOffset = 5

    this.camera.orthoTop = size + yOffset
    this.camera.orthoBottom = -size + yOffset
    this.camera.orthoRight = size * ratio
    this.camera.orthoLeft = -size * ratio
  }
}
