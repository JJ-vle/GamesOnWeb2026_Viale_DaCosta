import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Titan-Ram : Robot massif qui fonce en ligne droite.
 * 32HP / 3 Dégât / 1 Speed / Catégorie 3
 */
export class TitanRam extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 32, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 5,
            retreatThreshold: 0.1,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.5
        this.damage = 3

        this.state = 'IDLE' // IDLE, LOCKING, RAMMING, STUNNED
        this.stateTimer = 0
        this.ramDirection = new Vector3()

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("TitanRam", { width: 3, height: 3, depth: 3.5 }, this.scene)
        enemy.position = new Vector3(4, 1.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("titanMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 0.5, 0.5) // Acier/Gris
        mat.emissiveColor = new Color3(0, 0, 0)
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

        if (this.state === 'IDLE') {
            this.stateTimer -= dt

            // NavGrid AI pour l'approche lente
            const result = this.updateNavGridAI(playerMesh, enemies)
            if (result) this.applyRotation(result.scaledMove)

            if (this.stateTimer <= 0 && dist < 20) {
                this.state = 'LOCKING'
                this.stateTimer = 1.5
                this.material.emissiveColor = new Color3(1, 0, 0)
            }
        }
        else if (this.state === 'LOCKING') {
            this.stateTimer -= dt
            const direction = toPlayer.normalize()
            this.applyRotation(direction)

            if (this.stateTimer <= 0) {
                this.state = 'RAMMING'
                this.ramDirection = toPlayer.normalize()
                this.material.emissiveColor = new Color3(2, 0.5, 0)
            }
        }
        else if (this.state === 'RAMMING') {
            this.enemy.position.addInPlace(this.ramDirection.scale(0.4 * (slow * 0.5 + 0.5)))

            const w = 130/2 - 2
            const h = 110/2 - 2
            const pos = this.enemy.position

            if (Math.abs(pos.x) > w || Math.abs(pos.z) > h) {
                this.state = 'STUNNED'
                this.stateTimer = 2.5
                this.material.emissiveColor = new Color3(0, 0, 0)
            }
        }
        else if (this.state === 'STUNNED') {
            this.stateTimer -= dt
            if (this.stateTimer <= 0) {
                this.state = 'IDLE'
                this.stateTimer = 1.0
            }
        }
    }
}
