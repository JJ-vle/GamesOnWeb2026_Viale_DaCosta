// src/babylon/cameras/TpsCamera.js
import { ArcRotateCamera } from "@babylonjs/core"

export class TpsCamera {
  constructor(scene, target) {
    this.scene = scene

    this.camera = new ArcRotateCamera(
      "tpsCamera",
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      target,
      scene
    )
  }

  attach() {
    this.camera.attachControl(
      this.scene.getEngine().getRenderingCanvas(),
      true
    )
  }

  detach() {
    this.camera.detachControl()
  }
}
