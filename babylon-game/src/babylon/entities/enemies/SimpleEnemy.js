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
    
    update(playerMesh, projectiles = []) {
        if (!this.enemy) return

        // Gestion du flash rouge
        if (this._hitTimer > 0) {
            this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(1, 1, 1)
            }
        }

        // Déplacement vers le joueur
        const direction = playerMesh.position.subtract(this.enemy.position).normalize()
        this.enemy.position.addInPlace(direction.scale(0.05))
    }

}