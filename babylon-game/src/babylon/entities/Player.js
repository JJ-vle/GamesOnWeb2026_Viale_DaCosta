import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
export class Player {

    constructor(scene) {
        this.scene = scene;
        this.mesh = this._createMesh();
        this.verticalVelocity = 0;
        this.maxLife = 100;
        this.life = this.maxLife;
    }

    _createMesh() {
        const box = MeshBuilder.CreateBox("player", { size: 2 }, this.scene);
        box.position = new Vector3(4, 1, 0);

        const mat = new StandardMaterial("playerMat", this.scene);
        mat.diffuseColor = new Color3(1, 0, 0);
        box.material = mat;

        // Configuration des collisions
        box.checkCollisions = true;
        box.ellipsoid = new Vector3(1, 1, 1); // Taille de la "bulle" de collision

        return box;
    }

    getForwardDirection() {
        // direction "devant" le joueur
        return new Vector3(0, 0, 1)
    }

    update(inputMap) {
        const speed = 0.1
        let moveDir = new Vector3(0, 0, 0);

        if (inputMap["ArrowUp"] || inputMap["z"] || inputMap["w"]) {
            moveDir.z += speed;
        }
        if (inputMap["ArrowDown"] || inputMap["s"]) {
            moveDir.z -= speed;
        }
        if (inputMap["ArrowLeft"] || inputMap["q"] || inputMap["a"]) {
            moveDir.x -= speed;
        }
        if (inputMap["ArrowRight"] || inputMap["d"]) {
            moveDir.x += speed;
        }

        if (moveDir.length() > 0) {
            this.mesh.moveWithCollisions(moveDir);
        }

        // Saut (Impulsion)
        if (inputMap[" "] && this.mesh.position.y <= 1.1) {
            this.verticalVelocity = 0.15;

        }
        // Appliquer la gravité
        this.verticalVelocity -= 0.005; // C'est un nombre, pas un vecteur, donc pas de .y
        this.mesh.position.y += this.verticalVelocity;

        // Collision avec le sol
        if (this.mesh.position.y < 1) {
            this.mesh.position.y = 1; // On ne modifie que l'axe Y, pas tout l'objet position
            this.verticalVelocity = 0;
        }

    }

    takeDamage(amount) {
        this.life -= amount;
        if (this.life < 0) {
            this.life = 0;
        }
    }

    heal(amount) {
        this.life += amount;
        if (this.life > this.maxLife) {
            this.life = this.maxLife;
        }
    }
}