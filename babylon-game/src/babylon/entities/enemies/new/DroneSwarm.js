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
        super(scene, contact, 4) // 4 HP
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.2 // Vif
        this.damage = 1

        this._orbitOffsetTimer = Math.random() * Math.PI * 2
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

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.4, 0.4, 0.8)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()

        // Au lieu de foncer bêtement, les Drones cherchent un point "autour" du joueur
        this._orbitOffsetTimer += dt * 2
        // Point cible à distance = 2, angle variable
        const targetPoint = playerMesh.position.clone()
        targetPoint.x += Math.cos(this._orbitOffsetTimer) * 2.5
        targetPoint.z += Math.sin(this._orbitOffsetTimer) * 2.5

        const toTarget = targetPoint.subtract(this.enemy.position)
        toTarget.y = 0
        const direction = toTarget.normalize()

        // Forte séparation avec les autres drones pour combler le cercle (Swarm)
        const swarmForce = this._getFlockingVector(enemies, 1.5, 2.5) // Séparation proche très forte
        direction.addInPlace(swarmForce).normalize()

        this.enemy.position.addInPlace(direction.scale(0.06 * this.speed * slow))
    }
}
