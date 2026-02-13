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
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("Enemy", { size: 2 }, this.scene);
        enemy.position = new Vector3(4, 1, 0);

        const mat = new StandardMaterial("enemyMat", this.scene);
        mat.diffuseColor = new Color3(1, 1, 1);
        enemy.material = mat;

        return enemy;
    }

    /*
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
    }*/

    
    update(playerMesh, projectiles = []) {
        if (!this.enemy) return

        // Collision avec le joueur
        if (this.enemy.intersectsMesh(playerMesh, false)) {
            if (this.contact) this.contact()
        }

        // Collision avec les projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i]
            if (!proj.mesh) continue

            if (this.enemy.intersectsMesh(proj.mesh, false)) {
                this.takeDamage(proj.damage || 1)
                proj.dispose() // détruire le projectile après impact
                projectiles.splice(i, 1) // enlever le projectile du tableau
            }
        }

        // Déplacement vers le joueur
        const direction = playerMesh.position.subtract(this.enemy.position).normalize()
        this.enemy.position.addInPlace(direction.scale(0.05))
    }

    
    takeDamage(amount) {
        this.life -= amount
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