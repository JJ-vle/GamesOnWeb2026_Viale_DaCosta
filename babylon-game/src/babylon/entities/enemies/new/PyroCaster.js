import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Pyro-Caster : Utilise des munitions thermiques qui appliquent une brûlure (Tire)
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class PyroCaster extends Enemy {

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

        this._fireTimer = 2.5 // Tirs plus lents
        this._preferredDistance = 12
        this.hasFireProjectiles = true // checked by main loop

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const base = MeshBuilder.CreateCylinder("PyroCaster", { diameter: 1.5, height: 1.8 }, this.scene)
        base.position = new Vector3(4, 0.9, 0)
        base.checkCollisions = false

        const mat = new StandardMaterial("pyroMat", this.scene)
        mat.diffuseColor = new Color3(1.0, 0.2, 0.0) // Rouge/Orange feu
        mat.emissiveColor = new Color3(0.4, 0.1, 0.0)
        base.material = mat

        return base
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        const { onShoot } = callbacks
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000
        const slow = this._slow

        // IA NavGrid pour le mouvement
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (result) this.applyRotation(result.scaledMove)

        // Tir (brûlure)
        this._fireTimer -= dt * slow
        if (this._fireTimer <= 0) {
            this._fireTimer = 2.5
            if (onShoot) {
                const dir = playerMesh.position.subtract(this.enemy.position)
                dir.y = 0
                dir.normalize()
                onShoot(this.enemy.position.clone(), dir, 'FIRE')
            }
        }
    }
}
