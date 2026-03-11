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
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.1 // Un peu plus rapide qu'un VoltStriker
        this.damage = 1

        this.isExplosive = true
        this._pulseModifier = 0
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

        // Clignotement instable constant
        this._pulseModifier += dt * 10
        const flashVal = Math.abs(Math.sin(this._pulseModifier))
        
        // Plus on a peu de PV, plus l'animation est rapide
        const pvRatio = this.life / this.maxLife 
        if (pvRatio < 0.5) this._pulseModifier += dt * 5 // S'accélère

        this.material.emissiveColor = new Color3(1, 0.2 * flashVal, 0)

        // Flash over-ride classique
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) { /* back to pulse logic */ }
            else { this.material.diffuseColor = new Color3(1, 1, 1) } // Blanc quand touché
        } else {
            this.material.diffuseColor = new Color3(1, 0.4, 0)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        const direction = toPlayer.normalize()

        // KAMIKAZE (Explose de lui-même si très proche)
        if (dist <= 3.5) {
            // Trigger Death => Explosion
            this.takeDamage(this.maxLife) // Force trigger du onDeath() -> explosion!
            return
        }

        const separation = this._getFlockingVector(enemies, 2.5, 1.2)
        direction.addInPlace(separation).normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))
        
        this.enemy.position.addInPlace(direction.scale(0.05 * this.speed * slow))
    }

    // Explosion à la destruction si gérée par la scène (via le onDeath)
}
