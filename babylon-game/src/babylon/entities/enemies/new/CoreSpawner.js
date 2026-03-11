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
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.1 // Presque immobile
        this.damage = 1

        this._spawnTimer = 5.0 // Spawn un VoltStriker toutes les 5s
        this._maxSpawned = 6 // Limite de mobs engendrés si on ne tue pas le spawner
        this._spawnedCount = 0
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

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.5, 0.4, 0.5)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1

        // Ne bouge quasiment pas (Se tourne juste lentement vers le joueur pour la forme)
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const dist = toPlayer.length()
        
        let direction = new Vector3(0,0,0)
        if (dist > 5) {
            direction = toPlayer.normalize()
            this.enemy.lookAt(this.enemy.position.add(direction))
        }

        const separation = this._getFlockingVector(enemies, 6.0, 1.0)
        direction.addInPlace(separation).normalize()

        this.enemy.position.addInPlace(direction.scale(0.02 * this.speed * slow))

        // Logique de spawn
        if (this._spawnedCount < this._maxSpawned) {
            this._spawnTimer -= dt * slow
            if (this._spawnTimer <= 0) {
                this._spawnTimer = 5.0 // reset

                // Animation visuelle de spawn
                this.material.emissiveColor = new Color3(0.8, 0, 0.8)
                setTimeout(() => { if (this.material) this.material.emissiveColor = new Color3(0.2, 0.1, 0.2) }, 500)

                // Indique à la scène de faire pop un VoltStriker à cette position
                if (onSpawn) {
                    onSpawn('VoltStriker', this.enemy.position.clone())
                    this._spawnedCount++
                }
            }
        }
    }
}
