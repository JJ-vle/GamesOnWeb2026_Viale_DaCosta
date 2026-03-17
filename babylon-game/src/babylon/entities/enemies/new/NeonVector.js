import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Neon-Vector : Robot léger extrêmement rapide. Esquiive par sa vitesse.
 * 6HP / 1 Dégât / 1.5 Speed / Catégorie 1
 */
export class NeonVector extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 6) // maxLife = 6
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.5 // Fast!
        this.damage = 1
        
        // Timer for slight erratic movement
        this._erraticTimer = 0
        this._strafingDir = (Math.random() < 0.5) ? 1 : -1

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateCylinder("NeonVector", { diameterTop: 0, diameterBottom: 1.2, height: 2, tessellation: 4 }, this.scene)
        enemy.position = new Vector3(4, 1, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("neonVectorMat", this.scene)
        mat.diffuseColor = new Color3(0, 1, 0.8) // Cyan / Neon
        mat.emissiveColor = new Color3(0, 0.4, 0.3)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0, 1, 0.8)
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        // Direction vers le joueur
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        if (dist === 0) return
        
        const forward = toPlayer.normalize()

        // Change evasive direction periodically
        this._erraticTimer -= dt
        if (this._erraticTimer <= 0) {
            this._erraticTimer = 0.5 + Math.random() * 0.5
            this._strafingDir = (Math.random() < 0.5) ? 1 : -1
        }

        // Add strafing (dodge) behavior especially when close to projectiles (simplified via wandering)
        const right = new Vector3(-forward.z, 0, forward.x)
        const evasionStrength = dist < 20 ? 0.6 : 0 // Evade more when closer
        
        let direction = forward.add(right.scale(this._strafingDir * evasionStrength)).normalize()

        // Intelligence: Séparation
        const separation = this._getFlockingVector(enemies, 3.0, 1.0)
        direction.addInPlace(separation).normalize()

        // Facing
        this.enemy.lookAt(this.enemy.position.add(direction))

        this.enemy.position.addInPlace(direction.scale(0.05 * this.speed * slow))
    }
}
