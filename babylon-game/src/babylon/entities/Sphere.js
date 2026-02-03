// src/babylon/entities/Sphere.js
import { MeshBuilder } from '@babylonjs/core'

export class Sphere {
  constructor(scene) {
    this.mesh = MeshBuilder.CreateSphere('mySphere', { diameter: 2, segments: 32 }, scene)
    this.mesh.position.y = 1
  }

  update() {
    this.mesh.rotation.y += 0.01
  }
}
