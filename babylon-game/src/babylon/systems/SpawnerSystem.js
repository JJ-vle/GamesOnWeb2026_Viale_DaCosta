import { Vector3 } from '@babylonjs/core';
import { EnemyPool } from './EnemyPool.js';

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
    this.enemyTypeSequence = null;  // tableau cyclique de types
    this._sequenceIndex = 0;
    this.isSpawning = false;
    this._timer = 0;
    this.onEnemySpawned = null;
    this.minSpawnDistance = 15;
    this.maxSpawns = null;
    this.spawnedCount = 0;
    
    // Zones d'exclusion (safe zones rectangulaires) où aucun ennemi ne peut apparaître
    this.exclusionZones = []; // [{ minX, maxX, minZ, maxZ }]

    // Zones d'inclusion (spawn zones restrictives) où les ennemis DOIVENT apparaître
    this.inclusionZones = []; // [{ minX, maxX, minZ, maxZ }]

    // ── OPTIMISATION: Mesh Instancing ──
    // Stocke les templates de mesh par type d'ennemi
    // Clé: EnemyClass.name, Valeur: première instance (template pour createInstance)
    this.enemyTemplates = new Map();
    this.enemyInstances = new Map(); // Map de EnemyClass.name -> Array<mesh instances>

    // ── OPTIMISATION: Object Pooling ──
    this.enemyPool = new EnemyPool();

    // ── OPTIMISATION: Lazy Loading ──
    // Trace quels types d'ennemis ont été chargés
    this.loadedEnemyTypes = new Set();
    this.onEnemyTypeFirstLoaded = null; // Callback pour le premier load d'un type
  }

  /**
   * Ajoute une zone rectangulaire où les ennemis ne peuvent pas apparaître
   * @param {Vector3} pointA - Premier coin de la zone (ex: coin en bas à gauche)
   * @param {Vector3} pointB - Coin opposé de la zone (ex: coin en haut à droite)
   */
  addExclusionZone(pointA, pointB) {
    this.exclusionZones.push({
      minX: Math.min(pointA.x, pointB.x),
      maxX: Math.max(pointA.x, pointB.x),
      minZ: Math.min(pointA.z, pointB.z),
      maxZ: Math.max(pointA.z, pointB.z)
    });
  }

  /**
   * Restreint l'apparition des ennemis à cette zone rectangulaire spécifique.
   * On peut ajouter plusieurs zones d'inclusion.
   * @param {Vector3} pointA - Premier coin de la zone
   * @param {Vector3} pointB - Coin opposé de la zone
   */
  addInclusionZone(pointA, pointB) {
    this.inclusionZones.push({
      minX: Math.min(pointA.x, pointB.x),
      maxX: Math.max(pointA.x, pointB.x),
      minZ: Math.min(pointA.z, pointB.z),
      maxZ: Math.max(pointA.z, pointB.z)
    });
  }

  /**
   * Configure le type d'ennemi et l'intervalle de spawn
   * @param {Object} config - { enemyType, spawnInterval }
   */
  configure(config) {
    if (config.enemyTypeSequence) {
      this.enemyTypeSequence = config.enemyTypeSequence;
      this.enemyType = config.enemyTypeSequence[0];
      this._sequenceIndex = 0;
    } else if (config.enemyType) {
      this.enemyType = config.enemyType;
      this.enemyTypeSequence = null;
    }
    if (config.spawnInterval) this.spawnInterval = config.spawnInterval;
    if (config.maxSpawns != null) this.maxSpawns = config.maxSpawns;
    this.spawnedCount = 0;
    this._sequenceIndex = 0;
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
      if (this.inclusionZones && this.inclusionZones.length > 0) {
        // Option A : Apparition restreinte à nos zones spécifiques
        const zone = this.inclusionZones[Math.floor(Math.random() * this.inclusionZones.length)];
        x = zone.minX + Math.random() * (zone.maxX - zone.minX);
        z = zone.minZ + Math.random() * (zone.maxZ - zone.minZ);
      } else {
        // Option B : Apparition par défaut n'importe où sur la carte
        x = (Math.random() - 0.5) * (this.groundWidth - margin * 2);
        z = (Math.random() - 0.5) * (this.groundHeight - margin * 2);
      }
      attempts++;
    } while (!this._isValidSpawnPosition(x, z) && attempts < maxAttempts);

    // Si on a trouvé une position valide
    if (attempts < maxAttempts) {
      return new Vector3(x, 1, z);
    }

    // Fallback: retourner une position au centre d'une zone d'inclusion si possible
    if (this.inclusionZones && this.inclusionZones.length > 0) {
      const zone = this.inclusionZones[0];
      return new Vector3(zone.minX + (zone.maxX - zone.minX) / 2, 1, zone.minZ + (zone.maxZ - zone.minZ) / 2);
    }

    // Fallback normal
    return new Vector3(
      (Math.random() - 0.5) * (this.groundWidth - margin * 2),
      1,
      (Math.random() - 0.5) * (this.groundHeight - margin * 2)
    );
  }

  /**
   * Vérifie si la position de spawn est autorisée (loin des murs et hors zones d'exclusion)
   */
  _isValidSpawnPosition(x, z) {
    // 1. Vérifier la bordure des murs
    const margin = this.borderThickness;
    const halfW = this.groundWidth / 2;
    const halfH = this.groundHeight / 2;

    if (Math.abs(x) > halfW - margin || Math.abs(z) > halfH - margin) {
      return false; // Trop proche des murs
    }

    // 2. Vérifier les zones d'exclusion personnalisées (rectangles 2D)
    for (const zone of this.exclusionZones) {
      if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
        return false; // À l'intérieur d'une zone d'exclusion !
      }
    }

    return true; // Position autorisée
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

    // Sélectionner le type selon la séquence ou le type unique
    let EnemyClass;
    if (this.enemyTypeSequence && this.enemyTypeSequence.length > 0) {
      EnemyClass = this.enemyTypeSequence[this._sequenceIndex % this.enemyTypeSequence.length];
      this._sequenceIndex++;
    } else {
      EnemyClass = this.enemyType;
    }
    if (!EnemyClass) return;

    // ── OPTIMISATION: Lazy Loading ──
    // Charger le pool seulement la première fois qu'un type d'ennemi est spawné
    const enemyClassName = EnemyClass.name;
    if (!this.loadedEnemyTypes.has(enemyClassName)) {
      this.loadedEnemyTypes.add(enemyClassName);
      // Initialiser le pool avec pré-allocation (5 instances)
      this.enemyPool.registerPool(EnemyClass, 5, this.scene);
      
      // Callback optionnel pour tracking du UI/monitoring
      if (this.onEnemyTypeFirstLoaded) {
        this.onEnemyTypeFirstLoaded(enemyClassName);
      }
    }

    // ── OPTIMISATION: Object Pooling ──
    // Récupérer un ennemi du pool (réutilisé ou nouvellement créé)
    const enemy = this.enemyPool.get(EnemyClass, this.scene);
    
    // Positionner l'ennemi spawn
    if (enemy.enemy && enemy.enemy.position) {
      enemy.enemy.position = spawnPos;
    } else if (enemy.position) {
      enemy.position = spawnPos;
    }

    this.spawnedCount++;
    if (this.onEnemySpawned) this.onEnemySpawned(enemy);
  }

  /**
   * Prépare un type d'ennemi en arrière-plan (pré-allocate des instances)
   * Optionnel: appeler avant le round si besoin de réduire lag au premier spawn
   * @param {Function} EnemyClass - La classe d'ennemi
   * @param {number} count - Nombre d'instances à pré-allouer
   */
  preWarmPool(EnemyClass, count = 5) {
    const enemyClassName = EnemyClass.name;
    if (!this.loadedEnemyTypes.has(enemyClassName)) {
      this.loadedEnemyTypes.add(enemyClassName);
      this.enemyPool.registerPool(EnemyClass, count, this.scene);
    }
  }

  /**
   * Retourne un ennemi au pool pour réutilisation
   * Appelé lors de la mort d'un ennemi
   * @param {Object} enemy - L'instance d'ennemi à recycler
   */
  recycleEnemy(enemy) {
    if (enemy) {
      this.enemyPool.return(enemy);
    }
  }

  /**
   * Récupère les stats du pool (debug/monitoring)
   * @returns {Object} Stats du pool
   */
  getPoolStats() {
    return this.enemyPool.getStats();
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
