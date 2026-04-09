import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Echo-Wraith : Unité semi-invisible.
 * 32HP / 1 Dégât / 1 Speed / Catégorie 3
 */
export class EchoWraith extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 32, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 4,
            retreatThreshold: 0.1,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this._blinkTimer = 0

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("EchoWraith", { size: 1.8 }, this.scene)
        enemy.position = new Vector3(4, 1, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("echoWraithMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 0.5, 1) // Light purple/blue
        mat.alpha = 0.1 // Semi-invisible
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Blink visible occasionally
        this._blinkTimer += dt
        this.material.alpha = this._blinkTimer > 3 ? 0.8 : 0.1
        if (this._blinkTimer > 3.5) this._blinkTimer = 0

        // Flash: fully visible when hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0.5, 0.5, 1)
            } else {
                this.material.alpha = 1.0
            }
        }

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)
    }
}
