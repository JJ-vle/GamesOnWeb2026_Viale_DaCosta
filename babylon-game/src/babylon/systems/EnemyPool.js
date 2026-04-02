/**
 * EnemyPool: Gestion des instances d'ennemis avec recyclage mémoire
 * - Réutilise les ennemis disposés au lieu de les créer/détruire
 * - Réduit les allocations mémoire et les garbage collection pauses
 * - Chaque type d'ennemi a son propre pool
 */
export class EnemyPool {
  constructor() {
    // Map: EnemyClass.name -> { available: [], inUse: Set }
    this.pools = new Map();
    // Map: enemy -> EnemyClass pour retrouver le pool d'un ennemi
    this.enemyToClassMap = new Map();
  }

  /**
   * Enregistre un pool pour un type d'ennemi
   * @param {Function} EnemyClass - La classe d'ennemi
   * @param {number} initialSize - Nombre initial d'instances à pré-allouer
   * @param {BABYLON.Scene} scene - La scène Babylon
   */
  registerPool(EnemyClass, initialSize = 5, scene) {
    const className = EnemyClass.name;
    if (this.pools.has(className)) return; // Déjà enregistré

    const pool = {
      available: [],
      inUse: new Set(),
      EnemyClass,
      scene
    };

    // Pré-allouer les instances initiales
    for (let i = 0; i < initialSize; i++) {
      const enemy = new EnemyClass(scene);
      if (enemy.enemy) {
        enemy.enemy.setEnabled(false); // Invisible au départ
      }
      pool.available.push(enemy);
      this.enemyToClassMap.set(enemy, EnemyClass);
    }

    this.pools.set(className, pool);
  }

  /**
   * Récupère un ennemi du pool (crée si nécessaire)
   * @param {Function} EnemyClass - La classe d'ennemi
   * @param {BABYLON.Scene} scene - La scène (pour création si besoin)
   * @returns {Object} Instance d'ennemi
   */
  get(EnemyClass, scene) {
    const className = EnemyClass.name;
    if (!this.pools.has(className)) {
      this.registerPool(EnemyClass, 5, scene);
    }

    const pool = this.pools.get(className);
    let enemy;

    if (pool.available.length > 0) {
      // Réutiliser une instance existante
      enemy = pool.available.pop();
      if (enemy.enemy) {
        enemy.enemy.setEnabled(true);
      }
    } else {
      // Créer une nouvelle instance si pool vide
      enemy = new EnemyClass(scene);
      this.enemyToClassMap.set(enemy, EnemyClass);
    }

    pool.inUse.add(enemy);
    return enemy;
  }

  /**
   * Retourne un ennemi au pool pour réutilisation
   * @param {Object} enemy - L'instance d'ennemi à recycler
   */
  return(enemy) {
    if (!enemy) return;

    const EnemyClass = this.enemyToClassMap.get(enemy);
    if (!EnemyClass) {
      // Ennemi pas connu du pool, le disposer
      this._disposeEnemy(enemy);
      return;
    }

    const className = EnemyClass.name;
    const pool = this.pools.get(className);
    if (!pool) return;

    // Retirer de "en cours d'utilisation"
    pool.inUse.delete(enemy);

    // Réinitialiser l'ennemi avant le stockage
    this._resetEnemy(enemy);

    // Ajouter au pool disponible
    pool.available.push(enemy);
  }

  /**
   * Réinitialise complètement un ennemi pour réutilisation
   * Utilise la méthode reset() de Enemy qui gère proprement xstate, perception, etc.
   * @private
   */
  _resetEnemy(enemy) {
    // ── OPTIMISATION: Déléguer au Enemy.reset() qui gère tout ──
    if (enemy.reset) {
      enemy.reset();
    } else {
      // Fallback pour les ennemis sans reset()
      if (enemy.enemy) {
        enemy.enemy.setEnabled(false);
        enemy.enemy.position.set(0, -1000, 0);
      }
    }
    
    // Arrêter les animations
    if (enemy.animationGroup) {
      enemy.animationGroup.stop();
    }
  }

  /**
   * Dispose un ennemi complètement (libère la mémoire GPU)
   * @private
   */
  _disposeEnemy(enemy) {
    // ── OPTIMISATION: Utiliser disposeFull() qui nettoie mesh + matériau + AI ──
    if (enemy.disposeFull) {
      enemy.disposeFull();
    } else {
      if (enemy.enemy && enemy.enemy.dispose) {
        enemy.enemy.dispose();
      }
      if (enemy.animationGroup && enemy.animationGroup.dispose) {
        enemy.animationGroup.dispose();
      }
    }
  }

  /**
   * Vide complètement un type d'ennemi du pool
   * @param {Function} EnemyClass - La classe d'ennemi à vider
   */
  clearPool(EnemyClass) {
    const className = EnemyClass.name;
    const pool = this.pools.get(className);
    if (!pool) return;

    // Disposer tous les ennemis
    for (const enemy of pool.available) {
      this._disposeEnemy(enemy);
    }
    for (const enemy of pool.inUse) {
      this._disposeEnemy(enemy);
    }

    // Réinitialiser le pool
    pool.available = [];
    pool.inUse.clear();
  }

  /**
   * Vide tous les pools
   */
  clearAll() {
    for (const [className, pool] of this.pools) {
      for (const enemy of pool.available) {
        this._disposeEnemy(enemy);
      }
      for (const enemy of pool.inUse) {
        this._disposeEnemy(enemy);
      }
    }
    this.pools.clear();
    this.enemyToClassMap.clear();
  }

  /**
   * Retourne des stats sur l'utilisation du pool
   * @returns {Object} Stats: { totalAllocated, inUse, available }
   */
  getStats() {
    const stats = {};
    for (const [className, pool] of this.pools) {
      stats[className] = {
        inUse: pool.inUse.size,
        available: pool.available.length,
        total: pool.inUse.size + pool.available.length
      };
    }
    return stats;
  }
}
