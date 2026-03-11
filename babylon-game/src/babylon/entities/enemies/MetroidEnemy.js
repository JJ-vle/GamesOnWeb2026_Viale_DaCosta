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
        super(scene, contact, 15) // maxLife = 15
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.055
        this.damage = 1

        // Paramètres du zigzag
        this._zigzagTimer = 0
        this._zigzagInterval = 0.8 + Math.random() * 0.6 // entre 0.8s et 1.4s
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

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0.1, 0.8, 0.6)
            }
        }

        // Mise à jour du zigzag
        this._zigzagTimer += dt
        if (this._zigzagTimer >= this._zigzagInterval) {
            this._zigzagTimer = 0
            this._zigzagSide *= -1 // inverser la direction latérale
            this._zigzagInterval = 0.8 + Math.random() * 0.6
        }

        // Direction principale vers le joueur (Y ignoré)
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        if (dist < 0.01) return
        const forward = toPlayer.normalize()
        
        // Intelligence: Séparation
        const separation = this._getFlockingVector(enemies, 3.5, 1.0)
        forward.addInPlace(separation).normalize()

        // Vecteur perpendiculaire (strafe)
        const right = new Vector3(-forward.z, 0, forward.x)

        // Combiner forward + zigzag
        const zPct = this._zigzagTimer / this._zigzagInterval // 0→1
        const lateral = Math.sin(zPct * Math.PI) * this._zigzagSide * this._zigzagStrength

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        const moveDir = forward.scale(this.speed * slow).add(right.scale(lateral * 0.04 * slow))
        this.enemy.position.addInPlace(moveDir)

        // Flottement vertical sinusoïdal
        this._floatTimer += dt * 2.5
        this.enemy.position.y = this._baseY + Math.sin(this._floatTimer) * 0.3
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
