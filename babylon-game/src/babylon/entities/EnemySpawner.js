import {
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3
} from '@babylonjs/core'

export class EnemySpawner {
    /**
     * @param {BABYLON.Scene} scene
     * @param {Vector3} position - center of the spawner area
     * @param {number} size - length of the square area (default 2)
     */
    constructor(scene, position, size = 2) {
        this.scene = scene;
        this.position = position;
        this.size = size;
        this.spawnInterval = 10;
        this.enemyType = null; // class reference to enemy type
        this.isSpawning = false;
        this._timer = 0;
        this.mesh = this._createMesh();
        this.onEnemySpawned = null;
    }

    _createMesh() {
        const box = MeshBuilder.CreateBox("Spawner", { size: this.size }, this.scene);
        box.position = this.position.clone();
        const mat = new StandardMaterial("spawnerMat", this.scene);
        mat.diffuseColor = new Color3(0, 0, 1);
        box.material = mat;
        return box;
    }

    /**
     * Configure the spawner (called by Round)
     * @param {Object} config - { enemyType, spawnInterval }
     */
    configure(config) {
        if (config.enemyType) this.enemyType = config.enemyType;
        if (config.spawnInterval) this.spawnInterval = config.spawnInterval;
    }

    update(deltaTime) {
        if (this.isSpawning && this.enemyType) {
            this._timer += deltaTime;
            if (this._timer >= this.spawnInterval) {
                this._timer = 0;
                this.spawnEnemy();
            }
        }
    }

    /**
     * Spawn an enemy at a random position within the spawner's area
     */
    spawnEnemy() {
        if (!this.enemyType) return;
        // Random position in square area
        const half = this.size / 2;
        const randX = this.position.x + (Math.random() * this.size - half);
        const randZ = this.position.z + (Math.random() * this.size - half);
        const spawnPos = new Vector3(randX, this.position.y, randZ);
        const enemy = new this.enemyType(this.scene);
        if (enemy.enemy && enemy.enemy.position) {
            enemy.enemy.position = spawnPos;
        } else if (enemy.position) {
            enemy.position = spawnPos;
        }
        if (this.onEnemySpawned) {
            this.onEnemySpawned(enemy);
        }
    }
}
