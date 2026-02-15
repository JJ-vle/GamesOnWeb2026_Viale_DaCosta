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

        this.maxLife = 10
        this.life = this.maxLife

        this.material = this.enemy.material
        this._hitTimer = 0
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

    
    takeDamage(amount) {
        this.life -= amount

        this.material.diffuseColor = new Color3(1, 0, 0)
        this._hitTimer = 0.1 
        
        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }
    
    destroy() {
        if (this.enemy) {
            this.enemy.dispose()
            this.enemy = null
        }
        if (this.onDeath) this.onDeath()
    }

}