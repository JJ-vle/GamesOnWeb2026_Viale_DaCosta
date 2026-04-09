import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Bolt-Sentry : Robot sentinelle classique qui maintient ses distances et tire.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class BoltSentry extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 15,
            retreatThreshold: 0.2,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this._fireTimer = 2.0 // Tirs toutes les 2s
        this._preferredDistance = 15

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        // Forme tourelle (cylindre avec canon)
        const base = MeshBuilder.CreateCylinder("BoltSentry", { diameter: 1.5, height: 2 }, this.scene)
        base.position = new Vector3(4, 1, 0)
        base.checkCollisions = false

        const mat = new StandardMaterial("sentryMat", this.scene)
        mat.diffuseColor = new Color3(0.7, 0.7, 0.0) // Jaune
        mat.emissiveColor = new Color3(0.2, 0.2, 0.0)
        base.material = mat

        return base
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        const { onShoot } = callbacks
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000
        const slow = this._slow

        // IA NavGrid pour le mouvement
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)

        // Tir à distance
        this._fireTimer -= dt * slow
        if (this._fireTimer <= 0) {
            this._fireTimer = 2.0
            if (onShoot) {
                const dir = playerMesh.position.subtract(this.enemy.position)
                dir.y = 0
                dir.normalize()
                onShoot(this.enemy.position.clone(), dir)
            }
        }
    }
}
