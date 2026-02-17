import {
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3
} from '@babylonjs/core'

import { SimpleEnemy } from './enemies/SimpleEnemy'

export class EnemySpawner {

    constructor(scene, position, spawnInterval = 10) {
        this.scene = scene
        this.position = position
        this.spawnInterval = spawnInterval

        this._timer = 0

        this.mesh = this._createMesh()

        // callback appelé quand un enemy est créé
        this.onEnemySpawned = null
    }

    _createMesh() {
        const box = MeshBuilder.CreateBox("Spawner", { size: 2 }, this.scene)
        box.position = this.position.clone()

        const mat = new StandardMaterial("spawnerMat", this.scene)
        mat.diffuseColor = new Color3(0, 0, 1)
        box.material = mat

        return box
    }

    update(deltaTime) {
        this._timer += deltaTime

        if (this._timer >= this.spawnInterval) {
            this._timer = 0
            this.spawnEnemy()
        }
    }

    spawnEnemy() {
        const enemy = new SimpleEnemy(this.scene)
        enemy.enemy.position = this.position.clone()

        if (this.onEnemySpawned) {
            this.onEnemySpawned(enemy)
        }
    }
}
