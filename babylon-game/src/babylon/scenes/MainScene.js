// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import {
  Vector3,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Color3
} from '@babylonjs/core'

export class MainScene extends BaseScene {
  constructor(engine) {
    super(engine)

    this._createCamera()
    this._createLights()
    this._createWorld()
  }

  _createCamera() {
    this.camera = new FreeCamera('camera', new Vector3(0, 5, -10), this.scene)
    this.camera.setTarget(Vector3.Zero())
    this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true)
  }

  _createLights() {
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)
    light.intensity = 0.3
  }

  _createWorld() {
    this.sphere = MeshBuilder.CreateSphere('mySphere', { diameter: 2, segments: 32 }, this.scene)
    this.sphere.position.y = 1

    MeshBuilder.CreateGround('myGround', { width: 60, height: 60 }, this.scene)
    this.scene.clearColor = new Color3(1, 0, 0)
  }

  update() {
    // logique frame par frame, ex: rotation de la sphère
    this.sphere.rotation.y += 0.01
  }
}
