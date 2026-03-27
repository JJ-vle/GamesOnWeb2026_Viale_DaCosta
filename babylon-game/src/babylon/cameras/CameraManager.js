// src/babylon/cameras/CameraManager.js
import { TpsCamera } from "./TpsCamera"
import { IsoCamera } from "./IsoCamera"

export class CameraManager {
  constructor(scene, target) {
    this.scene = scene

    this.tps = new TpsCamera(scene, target)
    this.iso = new IsoCamera(scene, target)

    this.active = this.iso
    this.scene.activeCamera = this.active.camera
    this.active.attach()
  }

  toggle() {
    this.active.detach()

    this.active = this.active === this.tps ? this.iso : this.tps
    this.scene.activeCamera = this.active.camera

    this.active.attach()
  }

  isIso() {
    return this.active === this.iso
  }

  get camera() {
    return this.active.camera
  }

  dispose() {
    // ── MEMORY FIX: Clean up observers ──
    if (this.iso.dispose) this.iso.dispose()
    if (this.tps.dispose) this.tps.dispose()
  }
}
