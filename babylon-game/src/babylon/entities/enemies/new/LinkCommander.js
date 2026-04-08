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
        super(scene, contact, 18, {
            fovDistance: 40,
            fovAngle: 120,
            attackRange: 20,
            retreatThreshold: 0.3,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 0

        this.auraRadius = 15
        this._auraScale = 0

        this.xpValue = 10
        this.coinValue = 5
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

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Pulse aura
        this._auraScale += dt * 3
        this.auraMesh.scaling.y = 1 + Math.sin(this._auraScale) * 0.1

        // NavGrid AI
        const result = this.updateNavGridAI(playerMesh, enemies, { separationDist: 4.0 })
        if (result) this.applyRotation(result.scaledMove)

        // BUFF SYSTEM: alliés dans l'aura
        for (const other of enemies) {
            if (other === this || !other.enemy) continue
            const d = Vector3.Distance(this.enemy.position, other.enemy.position)
            if (d <= this.auraRadius) {
                other._buffTimer = 0.2
            }
        }
    }
}
