import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
export class Coin {

    constructor(scene, onePickupCallBack) {
        this.scene = scene;
        this.mesh = this._createMesh();
        this.verticalVelocity = 0;
        this.onePickup = onePickupCallBack;
    }

    _createMesh() {

        this.coin = MeshBuilder.CreateCylinder("coin", { diameter: 1, height: 0.1 }, this.scene);
        this.coin.position = new Vector3(2, 1, 3);

        const coinMaterial = new StandardMaterial("coinMat", this.scene);
        coinMaterial.diffuseColor = new Color3(1, 1, 0); // jaune
        this.coin.material = coinMaterial;
    }
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    update(playerMesh) {
        this.coin.rotation.y += 0.05;
        if (this.coin.intersectsMesh(playerMesh, false)) {
            if (this.onePickup) {
                this.onePickup();
            }
            this.coin.position.z = this.getRandomInt(1, 10);
            this.coin.position.x = this.getRandomInt(1, 10);
        }

    }
}