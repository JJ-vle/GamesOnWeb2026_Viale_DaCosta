import { Vector3 } from '@babylonjs/core';

/**
 * SpawnerSystem: gère le spawn aléatoire d'ennemis sur la surface disponible
 * Évite les obstacles (murs) et génère des positions valides
 */
export class SpawnerSystem {
  /**
   * @param {BABYLON.Scene} scene
   * @param {number} groundWidth - largeur du terrain
   * @param {number} groundHeight - hauteur du terrain
   * @param {number} borderThickness - épaisseur des murs (pour éviter de spawnner juste contre)
   */
  constructor(scene, groundWidth = 130, groundHeight = 110, borderThickness = 5) {
    this.scene = scene;
    this.groundWidth = groundWidth;
    this.groundHeight = groundHeight;
    this.borderThickness = borderThickness;
    this.spawnInterval = 2;
    this.enemyType = null;
    this.isSpawning = false;
    this._timer = 0;
    this.onEnemySpawned = null;
    this.minSpawnDistance = 15;
    this.maxSpawns = null;    // null = illimité
    this.spawnedCount = 0;    // combien ont été spawnés ce round
  }

  /**
   * Configure le type d'ennemi et l'intervalle de spawn
   * @param {Object} config - { enemyType, spawnInterval }
   */
  configure(config) {
    if (config.enemyType) this.enemyType = config.enemyType;
    if (config.spawnInterval) this.spawnInterval = config.spawnInterval;
    if (config.maxSpawns != null) this.maxSpawns = config.maxSpawns;
    this.spawnedCount = 0; // reset au configure
  }

  /**
   * Génère une position aléatoire valide sur la surface libre
   * Évite les zones près des murs et les positions invalides
   * @returns {Vector3} position de spawn valide
   */
  _generateRandomSpawnPosition() {
    const half = Math.max(this.groundWidth, this.groundHeight) / 2;
    const margin = this.borderThickness + 2; // marge additionnelle pour éviter les murs

    let x, z;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Générer une position aléatoire dans les limites
      x = (Math.random() - 0.5) * (this.groundWidth - margin * 2);
      z = (Math.random() - 0.5) * (this.groundHeight - margin * 2);
      attempts++;
    } while (this._isPositionTooCloseToWalls(x, z) && attempts < maxAttempts);

    // Si on a trouvé une position valide
    if (attempts < maxAttempts) {
      return new Vector3(x, 1, z);
    }

    // Fallback: retourner une position aléatoire même si proche des murs
    return new Vector3(
      (Math.random() - 0.5) * (this.groundWidth - margin * 2),
      1,
      (Math.random() - 0.5) * (this.groundHeight - margin * 2)
    );
  }

  /**
   * Vérifie si la position est trop proche des murs
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  _isPositionTooCloseToWalls(x, z) {
    const margin = this.borderThickness;
    const halfW = this.groundWidth / 2;
    const halfH = this.groundHeight / 2;

    // Vérifier distance aux 4 murs
    if (Math.abs(x) > halfW - margin || Math.abs(z) > halfH - margin) {
      return true;
    }

    return false;
  }

  /**
   * Update le système de spawn
   * @param {number} deltaTime - temps en secondes
   * @param {Vector3} playerPosition - position du joueur (optionnel, pour vérifier distance min)
   */
  update(deltaTime, playerPosition = null) {
    if (this.isSpawning && this.enemyType) {
      // Arrêter si on a atteint le maximum
      if (this.maxSpawns != null && this.spawnedCount >= this.maxSpawns) {
        this.stop();
        return;
      }
      this._timer += deltaTime;
      if (this._timer >= this.spawnInterval) {
        this._timer = 0;
        this.spawnEnemy(playerPosition);
      }
    }
  }

  /**
   * Crée un ennemi à une position aléatoire valide
   * @param {Vector3} playerPosition - position du joueur (optionnel)
   */
  spawnEnemy(playerPosition = null) {
    if (!this.enemyType) return;

    let spawnPos;
    let attempts = 0;
    const maxAttempts = 5;

    // Générer une position qui n'est pas trop proche du joueur
    do {
      spawnPos = this._generateRandomSpawnPosition();
      attempts++;

      if (playerPosition && spawnPos.subtract(playerPosition).length() < this.minSpawnDistance) {
        // Position trop proche du joueur, réessayer
        continue;
      }
      break;
    } while (attempts < maxAttempts);

    // Créer l'ennemi
    const enemy = new this.enemyType(this.scene);
    if (enemy.enemy && enemy.enemy.position) {
      enemy.enemy.position = spawnPos;
    } else if (enemy.position) {
      enemy.position = spawnPos;
    }

    this.spawnedCount++;

    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy);
    }
  }

  /**
   * Démarre le spawn
   */
  start() {
    this.isSpawning = true;
    this._timer = 0;
    // Ne pas réinitialiser spawnedCount ici (géré par configure)
  }

  /**
   * Arrête le spawn
   */
  stop() {
    this.isSpawning = false;
    this._timer = 0;
  }
}
