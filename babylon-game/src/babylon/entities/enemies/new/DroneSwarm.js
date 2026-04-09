import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Drone-Swarm : Groupe compact (nuée), PV très faibles. Encerclent.
 * 4HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class DroneSwarm extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 4, {
            fovDistance: 50,
            fovAngle: 120,
            attackRange: 3,
            retreatThreshold: 0.1,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.2 // Vif
        this.damage = 1

        this._orbitOffsetTimer = Math.random() * Math.PI * 2

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("DroneSwarm", { diameter: 0.8, segments: 4 }, this.scene)
        enemy.position = new Vector3(4, 0.5, 0)
        enemy.checkCollisions = false

        const mat = new StandardMaterial("droneMat", this.scene)
        mat.diffuseColor = new Color3(0.4, 0.4, 0.8) // Bleu terne
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // NavGrid AI pour le mouvement intelligent
        const result = this.updateNavGridAI(playerMesh, enemies, {
            separationDist: 1.5,
            separationForce: 2.5,
        })
        if (!result || !result.moved) return

        // Orbite autour du joueur par-dessus le mouvement NavGrid
        this._orbitOffsetTimer += dt * 2
        const slow = this._slow
        const orbitOffset = new Vector3(
            Math.cos(this._orbitOffsetTimer) * 0.03 * this.speed * slow,
            0,
            Math.sin(this._orbitOffsetTimer) * 0.03 * this.speed * slow
        )
        this.enemy.position.addInPlace(orbitOffset)

        this.applyRotation(result.scaledMove)
    }
}
