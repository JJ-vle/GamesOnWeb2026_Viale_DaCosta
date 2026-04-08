import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from './Enemy'

export class SimpleEnemy extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 10, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 3,
            retreatThreshold: 0.15,
        })
        this.enemy = this._createMesh();
        this.material = this.enemy.material
        this.speed = 1.0
        this.xpValue = 10
        this.coinValue = 5
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

        this.updateHitFlash()

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)
    }

}