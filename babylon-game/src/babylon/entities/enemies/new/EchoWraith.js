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
        super(scene, contact, 32)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1
        
        this._blinkTimer = 0
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
        if (this._blinkTimer > 3) {
            this.material.alpha = 0.8
            if (this._blinkTimer > 3.5) this._blinkTimer = 0
        } else {
            this.material.alpha = 0.1
        }

        // Flash over-rides alpha momentarily
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0.5, 0.5, 1)
            } else {
                this.material.alpha = 1.0 // Fully visible when hit
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        let direction = playerMesh.position.subtract(this.enemy.position)
        direction.y = 0
        direction.normalize()

        const separation = this._getFlockingVector(enemies, 3.0, 1.0)
        direction.addInPlace(separation).normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))
        this.enemy.position.addInPlace(direction.scale(0.05 * this.speed * slow))
    }
}
