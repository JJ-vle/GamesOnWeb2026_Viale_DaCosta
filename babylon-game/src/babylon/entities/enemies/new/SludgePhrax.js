import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Sludge-Phrax : Laisse des zones au sol (Simplifié : Tir ralenti par exemple)
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class SludgePhrax extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18, {
            fovDistance: 35,
            fovAngle: 120,
            attackRange: 12,
            retreatThreshold: 0.2,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this._sludgeTimer = 0

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("SludgePhrax", { width: 1.8, height: 1.5, depth: 2.2 }, this.scene)
        enemy.position = new Vector3(4, 0.75, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("sludgeMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 0.8, 0.1) // Vert gluant
        mat.emissiveColor = new Color3(0.1, 0.3, 0)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        this.updateHitFlash()

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)
    }
}
