import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Bolt-Sentry : Robot sentinelle classique qui maintient ses distances et tire.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class BoltSentry extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this._fireTimer = 2.0 // Tirs toutes les 2s
        this._preferredDistance = 15

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        // Forme tourelle (cylindre avec canon)
        const base = MeshBuilder.CreateCylinder("BoltSentry", { diameter: 1.5, height: 2 }, this.scene)
        base.position = new Vector3(4, 1, 0)
        base.checkCollisions = false

        const mat = new StandardMaterial("sentryMat", this.scene)
        mat.diffuseColor = new Color3(0.7, 0.7, 0.0) // Jaune
        mat.emissiveColor = new Color3(0.2, 0.2, 0.0)
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
                this.material.diffuseColor = new Color3(0.7, 0.7, 0.0)
            }
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        if (dist === 0) return
        const direction = toPlayer.normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))

        // Movement logic: maintain preferred distance
        let moveDir = new Vector3(0,0,0)
        if (dist > this._preferredDistance + 2) {
            moveDir = direction.clone() // Move closer
        } else if (dist < this._preferredDistance - 2) {
            moveDir = direction.scale(-1) // Move away
        } else {
            // Strafe slowly
            const right = new Vector3(-direction.z, 0, direction.x)
            moveDir = right.scale(Math.sin(performance.now() / 1000) * 0.5)
        }

        // Séparation avec autres ennemis
        const separation = this._getFlockingVector(enemies, 3.5, 1.5)
        moveDir.addInPlace(separation)

        if (moveDir.length() > 0) {
            moveDir.normalize()
            this.enemy.position.addInPlace(moveDir.scale(0.04 * this.speed * slow))
        }

        // Tir
        this._fireTimer -= dt * slow
        if (this._fireTimer <= 0) {
            this._fireTimer = 2.0
            
            // NOTE: Pour que ça tire vraiment, il faut qu'on passe un callback `onShootCallback` 
            // ou qu'on pousse un EnemyProjectile dans MainScene.
            // On gèrera ce callback plus tard dans MainScene, mais la structure est là.
            if (onShoot) {
                // Tirer vers le joueur
                onShoot(this.enemy.position.clone(), direction)
            }
        }
    }
}
