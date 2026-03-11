import { Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core'
import { Projectile } from './Projectile.js'

export class EnemyProjectile extends Projectile {
    constructor(scene, position, direction, options = {}) {
        super(scene, position, direction)
        
        this.speed = options.speed || 15
        this.damage = options.damage || 1
        this.lifeTime = options.lifeTime || 3
        this.type = options.type || 'NORMAL' // 'NORMAL', 'FIRE', etc.
        this.isEnemy = true // pour différencier dans les collisions

        this.mesh = this._createMesh()
    }

    _createMesh() {
        // Sphère rouge basique pour les tirs ennemis
        const mesh = MeshBuilder.CreateSphere("enemyProj", { diameter: 0.8 }, this.scene)
        mesh.position = this.position.clone()

        const mat = new StandardMaterial("enemyProjMat", this.scene)
        if (this.type === 'FIRE') {
            mat.diffuseColor = new Color3(1, 0.4, 0) // Orange feu
            mat.emissiveColor = new Color3(0.6, 0.2, 0)
        } else {
            mat.diffuseColor = new Color3(1, 0, 0) // Rouge brique
            mat.emissiveColor = new Color3(0.5, 0, 0)
        }
        mesh.material = mat

        return mesh
    }

    // `update(deltaTime)` et `dispose()` sont héritées de Projectile
}
