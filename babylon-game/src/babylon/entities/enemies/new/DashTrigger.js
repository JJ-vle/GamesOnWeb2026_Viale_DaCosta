import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Dash-Trigger : S'arrête à mi-distance, verrouille, puis dash.
 * 18HP / 2 Dégâts / 1 Speed / Catégorie 2
 */
export class DashTrigger extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18) // maxLife = 18
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 2
        
        this.state = 'APPROACH' // APPROACH, CHARGING, DASHING, COOLDOWN
        this.stateTimer = 0
        this.dashDirection = new Vector3(0,0,0)
    }

    _createMesh() {
        // Forme agressive, pointe vers l'avant
        const enemy = MeshBuilder.CreateCylinder("DashTrigger", { diameterTop: 0.2, diameterBottom: 1.8, height: 2, tessellation: 3 }, this.scene)
        enemy.position = new Vector3(4, 1, 0)
        enemy.rotation.x = Math.PI / 2 // pointe vers Z
        enemy.checkCollisions = false

        const mat = new StandardMaterial("dashTriggerMat", this.scene)
        mat.diffuseColor = new Color3(1, 0.5, 0) // Orange
        mat.emissiveColor = new Color3(0.2, 0.1, 0)
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
                // Return to normal color based on state
                this.material.diffuseColor = this.state === 'CHARGING' ? new Color3(1, 1, 1) : new Color3(1, 0.5, 0)
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()

        if (this.state === 'APPROACH') {
            if (dist < 15) {
                this.state = 'CHARGING'
                this.stateTimer = 1.0 // 1s to charge
                this.material.diffuseColor = new Color3(1, 1, 1) // White flash charge
                this.material.emissiveColor = new Color3(0.8, 0.8, 0) // bright yellow
            } else {
                let direction = toPlayer.normalize()
                const separation = this._getFlockingVector(enemies, 3.5, 1.0)
                direction.addInPlace(separation).normalize()
                
                this.enemy.lookAt(this.enemy.position.add(direction))
                this.enemy.position.addInPlace(direction.scale(0.05 * this.speed * slow))
            }
        } 
        else if (this.state === 'CHARGING') {
            this.stateTimer -= dt
            // Track player slowly while charging
            let direction = toPlayer.normalize()
            this.enemy.lookAt(this.enemy.position.add(direction))

            if (this.stateTimer <= 0) {
                this.state = 'DASHING'
                this.stateTimer = 0.5 // Dash duration
                this.dashDirection = direction.clone()
                this.material.diffuseColor = new Color3(1, 0.2, 0) // Deep red during dash
                this.material.emissiveColor = new Color3(0.5, 0, 0)
            }
        }
        else if (this.state === 'DASHING') {
            this.stateTimer -= dt
            // Dash extreme speed (ignores slow mostly, or is impacted normally)
            this.enemy.position.addInPlace(this.dashDirection.scale(0.35 * slow))
            
            if (this.stateTimer <= 0) {
                this.state = 'COOLDOWN'
                this.stateTimer = 1.5 // Rest time
                this.material.diffuseColor = new Color3(0.5, 0.25, 0) // Dim
                this.material.emissiveColor = new Color3(0, 0, 0)
            }
        }
        else if (this.state === 'COOLDOWN') {
            this.stateTimer -= dt
            if (this.stateTimer <= 0) {
                this.state = 'APPROACH'
                this.material.diffuseColor = new Color3(1, 0.5, 0)
            }
        }
    }
}
