import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Toxic-Wasp : Injecte du poison.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 * Note: Effet poison sur le joueur à faire dans l'interface de collision
 */
export class ToxicWasp extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18, {
            fovDistance: 45,
            fovAngle: 120,
            attackRange: 3,
            retreatThreshold: 0.15,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this.hasPoison = true
        this._zigzagSide = (Math.random() < 0.5) ? 1 : -1
        this._zigzagTimer = 0

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        // Guêpe robotique jaune/verte
        const enemy = MeshBuilder.CreateCylinder("ToxicWasp", { diameterTop: 0.1, diameterBottom: 1.5, height: 1.5, tessellation: 6 }, this.scene)
        enemy.position = new Vector3(4, 1.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("waspMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 1, 0) // Vert toxique
        mat.emissiveColor = new Color3(0.1, 0.4, 0)
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

        // Zigzag capricieux par-dessus le NavGrid
        this._zigzagTimer += dt
        if (this._zigzagTimer > 0.4) {
            this._zigzagTimer = 0
            this._zigzagSide *= -1
        }
        const forward = playerMesh.position.subtract(this.enemy.position)
        forward.y = 0
        forward.normalize()
        const right = new Vector3(-forward.z, 0, forward.x)
        const slow = this._slow
        this.enemy.position.addInPlace(right.scale(this._zigzagSide * 0.04 * this.speed * slow))

        this.applyRotation(result.scaledMove)
    }
}
