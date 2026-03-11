import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Link-Commander : Soutien : Émet un signal buffant Vitesse et Dégâts aux alliés
 * 18HP / 0 Dégât / 1 Speed / Catégorie 3
 */
export class LinkCommander extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 0 // Ne combat pas vraiment
        
        this.auraRadius = 15
        this._auraScale = 0
    }

    _createMesh() {
        // Antenne de comm/radar
        const enemy = MeshBuilder.CreateCylinder("LinkCommander", { diameterTop: 1.5, diameterBottom: 0.5, height: 3, tessellation: 8 }, this.scene)
        enemy.position = new Vector3(4, 1.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("commanderMat", this.scene)
        mat.diffuseColor = new Color3(0.8, 0.4, 0.9) // Violet command
        mat.emissiveColor = new Color3(0.2, 0.1, 0.3)
        enemy.material = mat

        // Aura visuelle (cercle au sol)
        const aura = MeshBuilder.CreateTorus("Aura", { diameter: this.auraRadius * 2, thickness: 0.1, tessellation: 32 }, this.scene)
        aura.parent = enemy
        aura.position.y = -1.4 // au ras du sol
        const auraMat = new StandardMaterial("auraMat", this.scene)
        auraMat.diffuseColor = new Color3(0.8, 0.4, 0.9)
        auraMat.emissiveColor = new Color3(0.8, 0.4, 0.9)
        auraMat.alpha = 0.4
        aura.material = auraMat

        this.auraMesh = aura

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.8, 0.4, 0.9)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        // Pulse the aura visually
        this._auraScale += dt * 3
        this.auraMesh.scaling.y = 1 + Math.sin(this._auraScale) * 0.1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        
        // Maintient la distance au maximum pour buff tout le monde
        let moveDir = new Vector3()
        const direction = toPlayer.normalize()

        if (dist > 25) moveDir = direction.clone()
        else if (dist < 20) moveDir = direction.scale(-1)
        else {
            const rot = new Vector3(-direction.z, 0, direction.x)
            moveDir = rot.scale(1)
        }

        const separation = this._getFlockingVector(enemies, 4.0, 1.0)
        moveDir.addInPlace(separation).normalize()

        this.enemy.lookAt(this.enemy.position.add(direction))
        
        if (moveDir.length() > 0) {
            this.enemy.position.addInPlace(moveDir.scale(0.04 * this.speed * slow))
        }

        // --- BUFF SYSTEM ---
        // Cherche les alliés dans l'AuraRadius et leur donne un flag temporaire.
        // Ce système n'est pleinement effectif que si implémenté dans SimpleEnemy/HeavyEnemy (ex: read _buffTimer).
        for (const other of enemies) {
            if (other === this || !other.enemy) continue
            const d = Vector3.Distance(this.enemy.position, other.enemy.position)
            if (d <= this.auraRadius) {
                // Signal temporaire sur Other
                other._buffTimer = 0.2 // Très court pce qu'il est mis à jour chaque frame.
                // Visually: others could glow purple slightly via main loop or their update.
            }
        }
    }
}
