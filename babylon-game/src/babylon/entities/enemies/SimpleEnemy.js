import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from './Enemy'

export class SimpleEnemy extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 10) //maxlife = 10
        this.enemy = this._createMesh();
        this.material = this.enemy.material
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("Enemy", { size: 2 }, this.scene);
        enemy.position = new Vector3(4, 1, 0);

        const mat = new StandardMaterial("enemyMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        enemy.material = mat;

        return enemy;
    }
    
    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        // Flash rouge au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(1, 1, 1)
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        // Direction vers le joueur
        const direction = playerMesh.position.subtract(this.enemy.position)
        direction.y = 0
        direction.normalize()

        // Intelligence: Séparation pour ne pas faire une boule d'ennemis et contourner
        const separation = this._getFlockingVector(enemies, 3.5, 1.5)
        direction.addInPlace(separation).normalize()

        this.enemy.position.addInPlace(direction.scale(0.05 * slow))
    }

}