import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'
import { VoltStriker } from './VoltStriker' // Le Spawner fabrique des VoltStrikers

/**
 * Core-Spawner : Unité statique ou très lente qui génère périodiquement des Volt-Strikers.
 * 18HP / 1 Dégât / 0.1 Speed / Catégorie 3
 */
export class CoreSpawner extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18, {
            fovDistance: 30,
            fovAngle: 120,
            attackRange: 10,
            retreatThreshold: 0.2,
        })
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.1 // Presque immobile
        this.damage = 1

        this._spawnTimer = 5.0
        this._maxSpawned = 6
        this._spawnedCount = 0

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        // Usine cubique
        const base = MeshBuilder.CreateBox("CoreSpawner", { width: 4, height: 2, depth: 4 }, this.scene)
        base.position = new Vector3(4, 1, 0)
        base.checkCollisions = false

        const mat = new StandardMaterial("spawnerMat", this.scene)
        mat.diffuseColor = new Color3(0.5, 0.4, 0.5) // Gris violacé
        mat.emissiveColor = new Color3(0.2, 0.1, 0.2) // Lueur usine
        base.material = mat

        return base
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        const { onSpawn } = callbacks
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000
        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        // NavGrid AI (quasi-immobile grâce à speed=0.1)
        const result = this.updateNavGridAI(playerMesh, enemies, { separationDist: 6.0 })
        if (result) this.applyRotation(result.scaledMove)

        // Logique de spawn
        if (this._spawnedCount < this._maxSpawned) {
            this._spawnTimer -= dt * slow
            if (this._spawnTimer <= 0) {
                this._spawnTimer = 5.0

                this.material.emissiveColor = new Color3(0.8, 0, 0.8)
                setTimeout(() => { if (this.material) this.material.emissiveColor = new Color3(0.2, 0.1, 0.2) }, 500)

                if (onSpawn) {
                    onSpawn('VoltStriker', this.enemy.position.clone())
                    this._spawnedCount++
                }
            }
        }
    }
}
