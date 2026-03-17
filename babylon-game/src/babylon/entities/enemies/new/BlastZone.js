import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial,
    Animation
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Blast-Zone : Déploie une attaque de zone (AOE) massive.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class BlastZone extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this.state = 'APPROACH' // APPROACH, WARNING, EXPLODING, COOLDOWN
        this.stateTimer = 0
        this.aoeRadius = 8
        this._warningMesh = null

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const root = MeshBuilder.CreateBox("BlastZone", { width: 1.5, height: 1.5, depth: 1.5 }, this.scene)
        root.position = new Vector3(4, 0.75, 0)
        root.checkCollisions = false

        const mat = new StandardMaterial("blastZoneMat", this.scene)
        mat.diffuseColor = new Color3(0.8, 0.2, 0.2)
        mat.emissiveColor = new Color3(0.2, 0, 0)
        root.material = mat

        return root
    }

    _createWarningZone() {
        const warning = MeshBuilder.CreateDisc("warningZone", { radius: this.aoeRadius, tessellation: 32 }, this.scene)
        warning.position = this.enemy.position.clone()
        warning.position.y = 0.1 // Just above ground
        warning.rotation.x = Math.PI / 2
        
        const mat = new StandardMaterial("warningMat", this.scene)
        mat.diffuseColor = new Color3(1, 0, 0)
        mat.emissiveColor = new Color3(1, 0, 0)
        mat.alpha = 0.3
        warning.material = mat
        
        this._warningMesh = warning
    }

    _clearWarningZone() {
        if (this._warningMesh) {
            this._warningMesh.dispose()
            this._warningMesh = null
        }
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        const { onExplode } = callbacks
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.8, 0.2, 0.2)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()

        if (this.state === 'APPROACH') {
            if (dist < this.aoeRadius - 2) {
                this.state = 'WARNING'
                this.stateTimer = 2.0 // 2 seconds warning
                this._createWarningZone()
                this.material.emissiveColor = new Color3(0.8, 0, 0)
            } else {
                const direction = toPlayer.normalize()
                const separation = this._getFlockingVector(enemies, 3.5, 1.2)
                direction.addInPlace(separation).normalize()

                this.enemy.lookAt(this.enemy.position.add(direction))
                this.enemy.position.addInPlace(direction.scale(0.04 * this.speed * slow))
            }
        } else if (this.state === 'WARNING') {
            this.stateTimer -= dt
            if (this.stateTimer <= 0) {
                this.state = 'EXPLODING'
                this.stateTimer = 0.5
                // Trigger explosion callback
                if (onExplode) onExplode(this._warningMesh.position.clone(), this.aoeRadius)
                this._clearWarningZone()
                this.material.emissiveColor = new Color3(0, 0, 0)
            } else {
                // Pulse warning zone
                if (this._warningMesh) {
                    this._warningMesh.material.alpha = 0.3 + Math.abs(Math.sin(this.stateTimer * 8)) * 0.4
                }
            }
        } else if (this.state === 'EXPLODING') {
            this.stateTimer -= dt
            if (this.stateTimer <= 0) {
                this.state = 'COOLDOWN'
                this.stateTimer = 3.0
            }
        } else if (this.state === 'COOLDOWN') {
            this.stateTimer -= dt
            
            // Fuit le joueur pendant le CD
            const direction = toPlayer.normalize()
            this.enemy.lookAt(this.enemy.position.add(direction))
            this.enemy.position.addInPlace(direction.scale(-0.02 * this.speed * slow)) // recule

            if (this.stateTimer <= 0) {
                this.state = 'APPROACH'
            }
        }
    }

    destroy() {
        this._clearWarningZone()
        super.destroy()
    }
}
