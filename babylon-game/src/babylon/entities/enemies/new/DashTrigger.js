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
        super(scene, contact, 18, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 15,
            retreatThreshold: 0.1,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 2

        this.state = 'APPROACH' // APPROACH, CHARGING, DASHING, COOLDOWN
        this.stateTimer = 0
        this.dashDirection = new Vector3(0,0,0)

        this.xpValue = 10
        this.coinValue = 5
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

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000
        const slow = this._slow

        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()

        if (this.state === 'APPROACH') {
            // NavGrid AI pour l'approche intelligente
            const result = this.updateNavGridAI(playerMesh, enemies)
            if (result) this.applyRotation(result.scaledMove)

            if (dist < 15) {
                this.state = 'CHARGING'
                this.stateTimer = 1.0
                this.material.diffuseColor = new Color3(1, 1, 1)
                this.material.emissiveColor = new Color3(0.8, 0.8, 0)
            }
        }
        else if (this.state === 'CHARGING') {
            this.stateTimer -= dt
            const direction = toPlayer.normalize()
            this.applyRotation(direction)

            if (this.stateTimer <= 0) {
                this.state = 'DASHING'
                this.stateTimer = 0.5
                this.dashDirection = direction.clone()
                this.material.diffuseColor = new Color3(1, 0.2, 0)
                this.material.emissiveColor = new Color3(0.5, 0, 0)
            }
        }
        else if (this.state === 'DASHING') {
            this.stateTimer -= dt
            this.enemy.position.addInPlace(this.dashDirection.scale(0.35 * slow))

            if (this.stateTimer <= 0) {
                this.state = 'COOLDOWN'
                this.stateTimer = 1.5
                this.material.diffuseColor = new Color3(0.5, 0.25, 0)
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
