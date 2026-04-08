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
        super(scene, contact, 6, {
            fovDistance: 50,
            fovAngle: 120,
            attackRange: 3,
            retreatThreshold: 0.15,
        })
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

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // NavGrid AI pour le mouvement intelligent
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (!result || !result.moved) return

        // Strafing erratique par-dessus le mouvement NavGrid
        this._erraticTimer -= dt
        if (this._erraticTimer <= 0) {
            this._erraticTimer = 0.5 + Math.random() * 0.5
            this._strafingDir = (Math.random() < 0.5) ? 1 : -1
        }

        const dist = Vector3.Distance(this.enemy.position, playerMesh.position)
        if (dist < 20) {
            const forward = playerMesh.position.subtract(this.enemy.position)
            forward.y = 0
            forward.normalize()
            const right = new Vector3(-forward.z, 0, forward.x)
            const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
            this.enemy.position.addInPlace(right.scale(this._strafingDir * 0.03 * this.speed * slow))
        }

        this.applyRotation(result.scaledMove)
    }
}
