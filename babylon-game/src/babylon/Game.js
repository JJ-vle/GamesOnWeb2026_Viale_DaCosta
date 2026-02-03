// src/babylon/Game.js
import { Engine } from '@babylonjs/core'
import { MainScene } from './scenes/MainScene'

export class Game {
  constructor(canvas) {
    this.engine = new Engine(canvas, true)
    this.scene = null
  }

  start() {
    this.scene = new MainScene(this.engine)
    this.engine.runRenderLoop(() => {
      this.scene.update()
      this.scene.render()
    })
  }

  resize() {
    this.engine.resize()
  }

  dispose() {
    this.scene?.dispose()
    this.engine.dispose()
  }
}
