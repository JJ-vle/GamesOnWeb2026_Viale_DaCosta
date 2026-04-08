import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from './Enemy'

/**
 * MetroidEnemy — Robot flottant style Metroïde.
 * - 15 HP, inflige -1 HP
 * - Se déplace en zigzag vers le joueur
 * - Change de direction latérale périodiquement
 */
export class MetroidEnemy extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 15, {
            fovDistance: 45,
            fovAngle: 120,
            attackRange: 3,
            retreatThreshold: 0.15,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        // Paramètres du zigzag
        this._zigzagTimer = 0
        this._zigzagInterval = 0.8 + Math.random() * 0.6
        this._zigzagSide = (Math.random() < 0.5) ? 1 : -1
        this._zigzagStrength = 0.4 + Math.random() * 0.3

        // Flottement vertical
        this._floatTimer = Math.random() * Math.PI * 2
        this._baseY = 1.5
    }

    _createMesh() {
        // Corps sphérique aplati façon Metroïde
        const enemy = MeshBuilder.CreateSphere("MetroidEnemy", { diameterX: 1.8, diameterY: 1.2, diameterZ: 1.8, segments: 6 }, this.scene)
        enemy.position = new Vector3(4, 1.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("metroidEnemyMat", this.scene)
        mat.diffuseColor = new Color3(0.1, 0.8, 0.6)     // Vert-cyan
        mat.emissiveColor = new Color3(0.0, 0.15, 0.1)
        mat.specularColor = new Color3(1, 1, 1)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (!result || !result.moved) return

        // Zigzag par-dessus le mouvement NavGrid
        this._zigzagTimer += dt
        if (this._zigzagTimer >= this._zigzagInterval) {
            this._zigzagTimer = 0
            this._zigzagSide *= -1
            this._zigzagInterval = 0.8 + Math.random() * 0.6
        }

        const forward = playerMesh.position.subtract(this.enemy.position)
        forward.y = 0
        forward.normalize()
        const right = new Vector3(-forward.z, 0, forward.x)
        const zPct = this._zigzagTimer / this._zigzagInterval
        const lateral = Math.sin(zPct * Math.PI) * this._zigzagSide * this._zigzagStrength
        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        this.enemy.position.addInPlace(right.scale(lateral * 0.04 * slow))

        // Flottement vertical
        this._floatTimer += dt * 2.5
        this.enemy.position.y = this._baseY + Math.sin(this._floatTimer) * 0.3

        this.applyRotation(result.scaledMove)
    }

    takeDamage(amount) {
        this.life -= amount
        this.material.diffuseColor = new Color3(1, 1, 1) // Flash blanc
        this._hitTimer = 0.1

        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }
}
