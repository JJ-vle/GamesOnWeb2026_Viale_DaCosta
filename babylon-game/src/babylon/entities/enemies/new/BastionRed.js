import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Bastion-Red : Gros tank rouge très lent et très résistant (Catégorie 1 - Corps à corps lent)
 * 24HP / 1 Dégât / 0.6 Speed / Catégorie 1
 */
export class BastionRed extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 24)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.6 // TRES Lent
        this.damage = 1

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("BastionRed", { width: 3, height: 3.5, depth: 3 }, this.scene)
        enemy.position = new Vector3(4, 1.75, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("bastionMat", this.scene)
        mat.diffuseColor = new Color3(0.9, 0.1, 0.1) // Très Rouge
        mat.emissiveColor = new Color3(0.2, 0, 0)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.9, 0.1, 0.1)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const direction = toPlayer.normalize()

        const separation = this._getFlockingVector(enemies, 4.0, 1.5)
        direction.addInPlace(separation).normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))
        
        // Lent
        this.enemy.position.addInPlace(direction.scale(0.05 * this.speed * slow))
    }
}
