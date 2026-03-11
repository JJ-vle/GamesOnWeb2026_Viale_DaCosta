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
        this.onDeath = null // callback() quand l'ennemi meurt
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
    
    _getFlockingVector(enemiesArray, separationDistance = 3, separationForce = 0.5) {
        let sep = new Vector3(0, 0, 0)
        if (!this.enemy || !enemiesArray) return sep
        
        let count = 0
        for (const other of enemiesArray) {
            if (other === this || !other.enemy) continue
            const dist = Vector3.Distance(this.enemy.position, other.enemy.position)
            if (dist < separationDistance && dist > 0.001) {
                const away = this.enemy.position.subtract(other.enemy.position)
                away.y = 0
                away.normalize()
                sep.addInPlace(away.scale(separationDistance - dist))
                count++
            }
        }
        if (count > 0) {
            sep.scaleInPlace(separationForce / count)
        }
        sep.y = 0
        return sep
    }
    
    destroy() {
        if (this.enemy) {
            this.enemy.dispose()
            this.enemy = null
        }
        if (this.onDeath) this.onDeath()
    }

}