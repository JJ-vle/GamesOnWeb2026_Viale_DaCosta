import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from './Enemy'

/**
 * HeavyEnemy — Gros robot lent et résistant.
 * - Inflige -2 HP au contact
 * - 25 HP, se déplace plus lentement
 * - Plus gros visuellement
 */
export class HeavyEnemy extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 25, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 4,
            retreatThreshold: 0.1,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.5
        this.damage = 2
        this.xpValue = 25
        this.coinValue = 15
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("HeavyEnemy", { width: 2.5, height: 2.5, depth: 2.5 }, this.scene)
        enemy.position = new Vector3(4, 1.25, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("heavyEnemyMat", this.scene)
        mat.diffuseColor = new Color3(0.8, 0.2, 0.1) // Rouge foncé
        mat.emissiveColor = new Color3(0.1, 0, 0)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        this.updateHitFlash()

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies, { separationDist: 4.5 })
        if (result) this.applyRotation(result.scaledMove)
    }

    takeDamage(amount) {
        this.life -= amount

        // Flash rouge vif au hit
        this.material.diffuseColor = new Color3(1, 1, 0) // Flash jaune vif
        this._hitTimer = 0.15

        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }
}
