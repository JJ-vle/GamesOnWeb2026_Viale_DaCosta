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
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1
        
        this._sludgeTimer = 0
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

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.5, 0.8, 0.1)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        
        const direction = toPlayer.normalize()
        
        // Maintient une distance moyenne
        let moveDir = new Vector3()
        if (dist > 18) moveDir = direction.clone()
        else if (dist < 12) moveDir = direction.scale(-0.8)
        else {
            const rot = new Vector3(-direction.z, 0, direction.x)
            moveDir = rot.scale(Math.sin(performance.now() / 1500) * 0.5)
        }

        const separation = this._getFlockingVector(enemies, 3.5, 1.2)
        moveDir.addInPlace(separation).normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))
        
        if (moveDir.length() > 0) {
            this.enemy.position.addInPlace(moveDir.scale(0.04 * this.speed * slow))
        }

        // Logic placement zones / attaques visqueuses : à lier dans la scène globale
        // Comme pour BoltSentry, il faudra injecter les projectiles ennemis.
    }
}
