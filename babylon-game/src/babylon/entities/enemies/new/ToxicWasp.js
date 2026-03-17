import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Toxic-Wasp : Injecte du poison.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 * Note: Effet poison sur le joueur à faire dans l'interface de collision
 */
export class ToxicWasp extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1
        
        this.hasPoison = true // Tag checked by collisions

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        // Guêpe robotique jaune/verte
        const enemy = MeshBuilder.CreateCylinder("ToxicWasp", { diameterTop: 0.1, diameterBottom: 1.5, height: 1.5, tessellation: 6 }, this.scene)
        enemy.position = new Vector3(4, 1.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("waspMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 1, 0) // Vert toxique
        mat.emissiveColor = new Color3(0.1, 0.4, 0)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.5, 1, 0)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const direction = toPlayer.normalize()

        // Strafe zigzag 
        const right = new Vector3(-direction.z, 0, direction.x)
        const lateral = Math.sin(performance.now() / 400) * 0.8
        direction.addInPlace(right.scale(lateral)).normalize()

        const separation = this._getFlockingVector(enemies, 3.0, 1.5)
        direction.addInPlace(separation).normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))
        
        // Vitesse fluctuante pour simuler un vol capricieux
        const speedVar = 0.8 + Math.cos(performance.now() / 300) * 0.4
        
        this.enemy.position.addInPlace(direction.scale(0.06 * this.speed * slow * speedVar))
    }
}
