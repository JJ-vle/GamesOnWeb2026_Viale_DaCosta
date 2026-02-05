// src/babylon/scenes/BaseScene.js
import { Scene } from '@babylonjs/core'

export class BaseScene {
  constructor(engine) {
    this.scene = new Scene(engine)
  }

  update() {
    // logique frame par frame
  }

  render() {
    this.scene.render()
  }

  dispose() {
    this.scene.dispose()
  }

}
