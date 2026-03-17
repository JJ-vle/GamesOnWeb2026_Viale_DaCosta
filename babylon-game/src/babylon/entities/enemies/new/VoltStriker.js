import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Volt-Striker : Unité standard qui fonce directement sur le joueur.
 * 6HP / 1 Dégât / 1 Speed / Catégorie 1
 */
export class VoltStriker extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 6) // maxLife = 6
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0 // Base speed reference
        this.damage = 1

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("VoltStriker", { diameter: 1.5 }, this.scene)
        enemy.position = new Vector3(4, 0.75, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("voltStrikerMat", this.scene)
        mat.diffuseColor = new Color3(0.9, 0.9, 0.9) // Blanc
        mat.emissiveColor = new Color3(0.2, 0.2, 0.2)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash rouge au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0.9, 0.9, 0.9)
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        // Direction vers le joueur
        const direction = playerMesh.position.subtract(this.enemy.position)
        direction.y = 0
        direction.normalize()

        // Intelligence: Séparation
        const separation = this._getFlockingVector(enemies, 2.5, 1.2)
        direction.addInPlace(separation).normalize()

        // Scaling speed for game feel (1.0 = 0.05 units per update)
        this.enemy.position.addInPlace(direction.scale(0.05 * this.speed * slow))
    }
}
