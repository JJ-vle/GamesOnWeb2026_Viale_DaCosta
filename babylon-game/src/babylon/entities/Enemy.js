import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
export class Enemy {

    constructor(scene, contact) {
        this.scene = scene;
        this.enemy = this._createMesh();
        this.verticalVelocity = 0;
        this.contact = contact;
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("Enemy", { size: 2 }, this.scene);
        enemy.position = new Vector3(4, 1, 0);

        const mat = new StandardMaterial("enemyMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        enemy.material = mat;

        return enemy;
    }

    update(playerMesh) {
        if (this.enemy.intersectsMesh(playerMesh, false)) {
            if (this.contact) {
                this.contact();
            }
        }
        // La bonne façon :
        let direction = playerMesh.position.subtract(this.enemy.position);
        direction.normalize();
        this.enemy.position.addInPlace(direction.scale(0.05));
    }


}