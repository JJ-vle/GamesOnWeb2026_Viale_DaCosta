// src/babylon/systems/XRaySystem.js
import { Vector3, Ray, Quaternion } from '@babylonjs/core'

export class XRaySystem {
  constructor(scene, player) {
    this.scene = scene
    this.player = player
    this._affectedMeshes = new Map()
    this._ignoredMeshIds = new Set()
    this._addIgnored(this.player.mesh)

    this.xrayAlpha = 0.2
    this._raycastInterval = 2
    this._frameCounter = 0
    this._lastBlockingIds = new Set()
    this._hideGracePeriod = 10

    this._setupPlayerRenderOnTop()
  }

  _setupPlayerRenderOnTop() {
    this.player.mesh.renderingGroupId = 1
    this.player.mesh.getChildMeshes(false).forEach(m => { m.renderingGroupId = 1 })
    this.scene.setRenderingAutoClearDepthStencil(1, true, true, false)
  }

  _addIgnored(mesh) {
    if (!mesh) return
    this._ignoredMeshIds.add(mesh.uniqueId)
    mesh.getChildMeshes(false).forEach(c => this._ignoredMeshIds.add(c.uniqueId))
  }

  ignoreMesh(mesh) {
    if (mesh) this._ignoredMeshIds.add(mesh.uniqueId)
  }

  /**
   * Crée un "fantôme" semi-transparent à la place d'une instance cachée.
   */
  _createGhost(mesh) {
    // Trouver la source (pour InstancedMesh) ou le mesh lui-même
    const source = mesh.sourceMesh || mesh

    // Cloner la géométrie du source en tant que Mesh normal
    const ghost = source.clone(`xray_ghost_${mesh.uniqueId}`, null)
    if (!ghost) return null

    ghost.setParent(null)

    // Copier la transformation world de l'instance vers le clone
    const wm = mesh.computeWorldMatrix(true)
    const pos = new Vector3()
    const rot = new Quaternion()
    const scl = new Vector3()
    wm.decompose(scl, rot, pos)

    ghost.position.copyFrom(pos)
    ghost.rotationQuaternion = rot.clone()
    ghost.scaling.copyFrom(scl)

    // Cloner le matériau avec opacité réduite
    if (source.material) {
      const mat = source.material.clone(`xray_mat_${mesh.uniqueId}`)
      mat.transparencyMode = 2 // ALPHA_BLEND
      mat.alpha = this.xrayAlpha
      mat.forceAlphaBlending = true
      mat.backFaceCulling = false
      if (mat.subSurface) mat.subSurface.isRefractionEnabled = false
      ghost.material = mat
    }

    ghost.isPickable = false
    ghost.checkCollisions = false

    // Ignorer le fantôme dans les raycasts futurs
    this._ignoredMeshIds.add(ghost.uniqueId)

    return ghost
  }

  _destroyGhost(ghost) {
    if (!ghost) return
    this._ignoredMeshIds.delete(ghost.uniqueId)
    if (ghost.material) ghost.material.dispose()
    ghost.dispose()
  }

  update() {
    const camera = this.scene.activeCamera
    if (!camera || !this.player || !this.player.mesh) return

    this._frameCounter++
    let blockingMeshIds = new Set()

    if (this._frameCounter % this._raycastInterval === 0) {
      const playerPos = this.player.mesh.position.clone()
      playerPos.y += 0.5
      const cameraPos = camera.position || camera.globalPosition

      // Rendre temporairement visibles les meshes cachés pour le raycast
      for (const [, entry] of this._affectedMeshes) {
        entry.mesh.isVisible = true
      }

      const offsets = [
        new Vector3(0, 0, 0),
        new Vector3(0, 0.6, 0),
        new Vector3(0, -0.3, 0),
        new Vector3(0.4, 0, 0),
        new Vector3(-0.4, 0, 0),
        new Vector3(0.4, 0.6, 0),
        new Vector3(-0.4, 0.6, 0),
      ]

      for (const offset of offsets) {
        const target = playerPos.add(offset)
        const dir = target.subtract(cameraPos)
        const dist = dir.length()
        dir.normalize()

        const ray = new Ray(cameraPos, dir, dist)
        const hit = this.scene.pickWithRay(ray, (m) => {
          if (!m.isVisible) return false
          if (this._ignoredMeshIds.has(m.uniqueId)) return false
          if (m.name === 'ground') return false
          if (m.name && (m.name.startsWith('projectile') || m.name.startsWith('bullet'))) return false
          return m.isPickable
        })

        if (hit && hit.hit && hit.pickedMesh && hit.distance < dist - 0.3) {
          blockingMeshIds.add(hit.pickedMesh.uniqueId)
        }
      }

      // Re-cacher les meshes encore bloquants
      for (const [meshId, entry] of this._affectedMeshes) {
        if (blockingMeshIds.has(meshId) || entry.hideTimer > 0) {
          entry.mesh.isVisible = false
        }
      }

      this._lastBlockingIds = blockingMeshIds
    } else {
      blockingMeshIds = this._lastBlockingIds || new Set()
    }

    // ── Nouveaux bloquants : cacher + créer fantôme ──
    for (const meshId of blockingMeshIds) {
      if (!this._affectedMeshes.has(meshId)) {
        const mesh = this.scene.getMeshByUniqueId(meshId)
        if (!mesh) continue

        mesh.isVisible = false
        const ghost = this._createGhost(mesh)

        this._affectedMeshes.set(meshId, {
          mesh,
          ghost,
          hideTimer: this._hideGracePeriod
        })
      } else {
        this._affectedMeshes.get(meshId).hideTimer = this._hideGracePeriod
      }
    }

    // ── Décrémenter timer + nettoyer ──
    for (const [meshId, entry] of this._affectedMeshes) {
      if (!blockingMeshIds.has(meshId)) {
        entry.hideTimer--
        if (entry.hideTimer <= 0) {
          entry.mesh.isVisible = true
          this._destroyGhost(entry.ghost)
          this._affectedMeshes.delete(meshId)
        }
      }
    }
  }

  dispose() {
    for (const [, entry] of this._affectedMeshes) {
      if (entry.mesh) entry.mesh.isVisible = true
      this._destroyGhost(entry.ghost)
    }
    this._affectedMeshes.clear()
  }
}
