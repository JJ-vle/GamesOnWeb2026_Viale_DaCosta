import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
export class Enemy {

    constructor(scene, contact, maxLife) {
        this.scene = scene;
        this.enemy = null; // à créer dans les classes filles
        this.material = null
        this.verticalVelocity = 0;
        this.contact = contact;

        this.maxLife = maxLife
        this.life = this.maxLife

        this._hitTimer = 0
    }

    _createMesh() {
    }
    
    update(playerMesh, projectiles = []) {
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