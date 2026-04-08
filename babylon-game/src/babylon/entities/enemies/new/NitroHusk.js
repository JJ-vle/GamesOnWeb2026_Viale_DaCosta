import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Nitro-Husk : Unité kamikaze instable qui explose quand elle meurt (ou si elle est proche).
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class NitroHusk extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18, {
            fovDistance: 50,
            fovAngle: 120,
            attackRange: 3.5,
            retreatThreshold: 0.0, // Kamikaze, ne fuit jamais
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.1
        this.damage = 1

        this.isExplosive = true
        this._pulseModifier = 0

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        // Forme : un tonneau ou bloc instable
        const enemy = MeshBuilder.CreateTorusKnot("NitroHusk", { radius: 0.6, tube: 0.2, radialSegments: 32 }, this.scene)
        enemy.position = new Vector3(4, 1, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("nitroMat", this.scene)
        mat.diffuseColor = new Color3(1, 0.4, 0) // Orange pétant
        mat.emissiveColor = new Color3(1, 0.2, 0) // Brille de base
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = [], onExplode = null) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Clignotement instable
        this._pulseModifier += dt * 10
        const flashVal = Math.abs(Math.sin(this._pulseModifier))
        const pvRatio = this.life / this.maxLife
        if (pvRatio < 0.5) this._pulseModifier += dt * 5

        this.material.emissiveColor = new Color3(1, 0.2 * flashVal, 0)

        // Flash au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) { /* back to pulse */ }
            else { this.material.diffuseColor = new Color3(1, 1, 1) }
        } else {
            this.material.diffuseColor = new Color3(1, 0.4, 0)
        }

        // KAMIKAZE: explose si très proche
        const dist = Vector3.Distance(this.enemy.position, playerMesh.position)
        if (dist <= 3.5) {
            this.takeDamage(this.maxLife)
            return
        }

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)
    }

    // Explosion à la destruction si gérée par la scène (via le onDeath)
}
