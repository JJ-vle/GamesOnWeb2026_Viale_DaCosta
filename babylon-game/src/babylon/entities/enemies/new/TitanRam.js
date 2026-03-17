import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Titan-Ram : Robot massif qui fonce en ligne droite.
 * 32HP / 3 Dégât / 1 Speed / Catégorie 3
 */
export class TitanRam extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 32)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 3
        
        this.state = 'IDLE' // IDLE, LOCKING, RAMMING, STUNNED
        this.stateTimer = 0
        this.ramDirection = new Vector3()

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("TitanRam", { width: 3, height: 3, depth: 3.5 }, this.scene)
        enemy.position = new Vector3(4, 1.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("titanMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 0.5, 0.5) // Acier/Gris
        mat.emissiveColor = new Color3(0, 0, 0)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.5, 0.5, 0.5)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()

        if (this.state === 'IDLE') {
            this.stateTimer -= dt
            let dir = toPlayer.normalize()
            this.enemy.lookAt(this.enemy.position.add(dir))

            if (this.stateTimer <= 0 && dist < 20) {
                this.state = 'LOCKING'
                this.stateTimer = 1.5 // 1.5s warning
                this.material.emissiveColor = new Color3(1, 0, 0) // Yeux rouges !
            } else {
                // Avance très lentement
                const separation = this._getFlockingVector(enemies, 4.0, 1.0)
                dir.addInPlace(separation).normalize()
                this.enemy.position.addInPlace(dir.scale(0.02 * this.speed * slow))
            }
        } 
        else if (this.state === 'LOCKING') {
            this.stateTimer -= dt
            this.enemy.lookAt(this.enemy.position.add(toPlayer.normalize()))

            if (this.stateTimer <= 0) {
                this.state = 'RAMMING'
                this.ramDirection = toPlayer.normalize()
                this.material.emissiveColor = new Color3(2, 0.5, 0)
            }
        }
        else if (this.state === 'RAMMING') {
            // Unstoppable object (presque insensible au slow)
            this.enemy.position.addInPlace(this.ramDirection.scale(0.4 * (slow * 0.5 + 0.5)))
            
            // Simplification: Il s'arrête au bout d'un certain temps (ou distance)
            // Dans une vraie release on vérifierait via un Raycast s'il touche un mur `zone.groundWidth`
            
            // Fake mur / distance stop :
            const w = 130/2 - 2
            const h = 110/2 - 2
            const pos = this.enemy.position
            
            if (Math.abs(pos.x) > w || Math.abs(pos.z) > h) {
                // Touche bordure
                this.state = 'STUNNED'
                this.stateTimer = 2.5
                this.material.emissiveColor = new Color3(0, 0, 0)
            }
        }
        else if (this.state === 'STUNNED') {
            this.stateTimer -= dt
            if (this.stateTimer <= 0) {
                this.state = 'IDLE'
                this.stateTimer = 1.0
            }
        }
    }
}
