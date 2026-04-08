import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Jammer-Unit : Émet une zone de brouillage qui empêche la capacité Espace.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class JammerUnit extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18, {
            fovDistance: 35,
            fovAngle: 120,
            attackRange: 10,
            retreatThreshold: 0.2,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this.jamRadius = 12
        this._ringScale = 0

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const root = MeshBuilder.CreateBox("JammerUnit", { width: 1.5, height: 2, depth: 1.5 }, this.scene)
        root.position = new Vector3(4, 1, 0)
        root.checkCollisions = false

        const mat = new StandardMaterial("jammerMat", this.scene)
        mat.diffuseColor = new Color3(0.2, 0.2, 0.2) // Sombre
        root.material = mat

        // Visuel de zone de brouillage (grésillement suggéré par l'alpha)
        const ring = MeshBuilder.CreateTorus("JamRing", { diameter: this.jamRadius * 2, thickness: 0.1, tessellation: 20 }, this.scene)
        ring.parent = root
        ring.position.y = -0.9
        const ringMat = new StandardMaterial("ringMat", this.scene)
        ringMat.diffuseColor = new Color3(1, 0, 0)
        ringMat.emissiveColor = new Color3(0.5, 0, 0)
        ringMat.alpha = 0.5
        ring.material = ringMat
        this.ringMesh = ring

        return root
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        const { onJam } = callbacks
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)

        // Animation de l'onde
        this._ringScale += dt * 4
        this.ringMesh.scaling.x = 0.8 + Math.abs(Math.sin(this._ringScale)) * 0.2
        this.ringMesh.scaling.z = 0.8 + Math.abs(Math.sin(this._ringScale)) * 0.2

        // Brouillage actif
        const dist = Vector3.Distance(this.enemy.position, playerMesh.position)
        if (dist <= this.jamRadius) {
            if (onJam) onJam(true)
        }
    }
}
