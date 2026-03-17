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
        super(scene, contact, 18)
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

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(1.0, 0.2, 0.0)
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        if (dist === 0) return
        const direction = toPlayer.normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))

        let moveDir = new Vector3(0,0,0)
        if (dist > this._preferredDistance + 2) {
            moveDir = direction.clone()
        } else if (dist < this._preferredDistance - 2) {
            moveDir = direction.scale(-1)
        } else {
            const right = new Vector3(-direction.z, 0, direction.x)
            moveDir = right.scale(Math.cos(performance.now() / 1000) * 0.5)
        }

        const separation = this._getFlockingVector(enemies, 3.5, 1.5)
        moveDir.addInPlace(separation)

        if (moveDir.length() > 0) {
            moveDir.normalize()
            this.enemy.position.addInPlace(moveDir.scale(0.04 * this.speed * slow))
        }

        this._fireTimer -= dt * slow
        if (this._fireTimer <= 0) {
            this._fireTimer = 2.5
            
            if (onShoot) {
                // Tire. Ce projectile appliquera brûlure (à gérer dans la scène)
                onShoot(this.enemy.position.clone(), direction, 'FIRE') 
            }
        }
    }
}
