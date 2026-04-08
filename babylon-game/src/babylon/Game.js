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
    
    // Capper à 60 FPS
    const targetFps = 60
    const frameInterval = 1000 / targetFps
    let lastTime = performance.now()

    this.engine.runRenderLoop(() => {
      const currentTime = performance.now()
      const delta = currentTime - lastTime

      // On attend que le temps écoulé dépasse l'intervalle pour 60fps
      if (delta >= frameInterval) {
        lastTime = currentTime - (delta % frameInterval)
        
        this.scene.update()
        this.scene.render()
      }
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
