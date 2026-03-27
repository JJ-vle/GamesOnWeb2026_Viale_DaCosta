// src/babylon/cameras/IsoCamera.js
import { ArcRotateCamera, Camera } from "@babylonjs/core"

export class IsoCamera {
  constructor(scene, target) {
    this.scene = scene
    this._resizeObserver = null  // ── MEMORY FIX: Store resize observer reference ──
    this._wheelObserver = null   // ── ZOOM: Store wheel event listener ──
    this._zoomSpeed = 0.1        // Sensibilité du zoom (0-1 range)
    this._zoomMin = 5            // Zoom min (valeur ortho)
    this._zoomMax = 20           // Zoom max (valeur ortho)

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
      Math.PI / 2.9,
      150, // Beaucoup plus loin pour éviter que la caméra ne rentre dans les toits et "coupe" les bâtiments
      target,
      scene
    )

    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA
    this._updateFrustum()

    // verrouillages
    this.camera.lowerRadiusLimit = this.camera.radius
    this.camera.upperRadiusLimit = this.camera.radius
    this.camera.allowUpsideDown = false

    // ── MEMORY FIX: Store observer for cleanup ──
    this._resizeObserver = scene.getEngine().onResizeObservable.add(() => {
      this._updateFrustum()
    })
  }

  attach() {
    // ── ZOOM: Ajouter le listener de molette pour zoom ──
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;
    
    this._wheelObserver = (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 1 : -1; // Molette down = zoom out, up = zoom in
      this._zoom(-delta);
    };
    
    canvas.addEventListener('wheel', this._wheelObserver, { passive: false });
  }

  detach() {
    // ── ZOOM: Retirer le listener de molette ──
    if (this._wheelObserver) {
      const canvas = this.scene.getEngine().getRenderingCanvas();
      if (canvas) {
        canvas.removeEventListener('wheel', this._wheelObserver);
      }
      this._wheelObserver = null;
    }
  }

  dispose() {
    // ── MEMORY FIX: Remove resize observer ──
    if (this._resizeObserver) {
      try {
        this.scene.getEngine().onResizeObservable.remove(this._resizeObserver);
      } catch (e) { /* ignore */ }
    }
    // ── ZOOM: Clean up wheel listener ──
    if (this._wheelObserver) {
      const canvas = this.scene.getEngine().getRenderingCanvas();
      if (canvas) {
        canvas.removeEventListener('wheel', this._wheelObserver);
      }
      this._wheelObserver = null;
    }
  }

  _updateFrustum() {
    const engine = this.scene.getEngine()
    const ratio = engine.getRenderWidth() / engine.getRenderHeight()

    const size = 10
    const yOffset = 2  // ── Centrer le perso (réduit de 5 à -2) ──

    this.camera.orthoTop = size + yOffset
    this.camera.orthoBottom = -size + yOffset
    this.camera.orthoRight = size * ratio
    this.camera.orthoLeft = -size * ratio
  }

  /**
   * Zoom via molette souris
   * @param {number} direction - 1 pour zoom in, -1 pour zoom out
   */
  _zoom(direction) {
    const engine = this.scene.getEngine()
    const ratio = engine.getRenderWidth() / engine.getRenderHeight()
    
    // Calculer la nouveau taille ortho (plus petit = zoom in)
    let currentSize = Math.abs(this.camera.orthoTop - this.camera.orthoBottom) / 2;
    const newSize = Math.max(this._zoomMin, Math.min(this._zoomMax, currentSize - direction * this._zoomSpeed));
    
    const yOffset = 2;  // ── Same offset as _updateFrustum() ──
    
    this.camera.orthoTop = newSize + yOffset;
    this.camera.orthoBottom = -newSize + yOffset;
    this.camera.orthoRight = newSize * ratio;
    this.camera.orthoLeft = -newSize * ratio;
  }
}
