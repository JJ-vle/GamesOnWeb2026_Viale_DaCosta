import { Vector3, RayHelper, Ray } from '@babylonjs/core';

/**
 * PerceptionSystem: Gère la détection du joueur par les ennemis
 * - Champ de vision (FOV): angle + distance
 * - Ligne de vue (LOS): raycast pour vérifier les obstacles
 * - Mémoire courte: garde la dernière position vue
 */
export class PerceptionSystem {
  constructor(scene) {
    this.scene = scene;
    this.detectionCheckInterval = 0.1; // Check toutes les 100ms
    this._checkTimer = 0;
    
    // ── OPTIMISATION: Cache FOV/Distance checks ──
    // Évite les raycasts répétés toutes les frames
    // Format: Map<enemyId> -> { lastResult, lastTime, lastPlayerPos }
    // ⚠️ AGRESSIF: Augmenter cache duration de 50ms à 150ms
    this._perceptionCache = new Map();
    this._cacheValidityDuration = 0.15; // 150ms cache (valid for ~9 frames à 60fps)
  }

  /**
   * Vérifie si le joueur est détectable par l'ennemi
   * @param {Vector3} enemyPos - position de l'ennemi
   * @param {Vector3} playerPos - position du joueur
   * @param {number} fovDistance - distance max de détection
   * @param {number} fovAngle - angle du champ de vision en degrés (ex: 90)
   * @param {Vector3} enemyForward - vecteur direction de l'ennemi (défaut: Z)
   * @param {boolean} useLineOfSight - vérifier obstacle (raycast)
   * @param {number} enemyId - ID unique pour l'ennemi (pour caching)
   * @returns {boolean} true si visible et à portée
   */
  canSeePlayer(
    enemyPos,
    playerPos,
    fovDistance = 30,
    fovAngle = 90,
    enemyForward = Vector3.Forward(),
    useLineOfSight = true,
    enemyId = null
  ) {
    // ── OPTIMISATION: Vérifier le cache ──
    const now = performance.now();
    if (enemyId !== null && this._perceptionCache.has(enemyId)) {
      const cached = this._perceptionCache.get(enemyId);
      if (now - cached.lastTime < this._cacheValidityDuration * 1000) {
        // Cache valide, retourner le résultat caché
        return cached.lastResult;
      }
    }

    // 1. Distance - critère principal
    const distance = Vector3.Distance(enemyPos, playerPos);
    if (distance > fovDistance) {
      this._cacheResult(enemyId, false, now);
      return false;
    }

    // 2. Angle du champ de vision (FOV) - ignorer pour l'instant
    // TODO: Implémenter l'angle correctement une fois que la direction ennemie sera disponible
    
    // 3. Ligne de vue (raycast pour obstacles)
    let result = true;
    if (useLineOfSight) {
      result = this._hasLineOfSight(enemyPos, playerPos);
    }

    this._cacheResult(enemyId, result, now);
    return result;
  }

  /**
   * Sauvegarde le résultat en cache
   * @private
   */
  _cacheResult(enemyId, result, timestamp) {
    if (enemyId !== null) {
      this._perceptionCache.set(enemyId, {
        lastResult: result,
        lastTime: timestamp
      });
    }
  }

  /**
   * Vide le cache (appeler en fin de round ou si joueur se téléporte)
   */
  clearCache() {
    this._perceptionCache.clear();
  }

  /**
   * Raycast pour vérifier s'il n'y a pas d'obstacle entre ennemi et joueur
   * @private
   */
  _hasLineOfSight(fromPos, toPos) {
    const direction = toPos.subtract(fromPos);
    const distance = direction.length();
    direction.normalize();

    const ray = new Ray(fromPos, direction, distance);

    // Raycast sur toutes les meshes sauf le joueur lui-même et le sol
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      // Ignorer les projectiles, les ennemis, le joueur lui-même, et le sol
      if (!mesh.name || 
          mesh.name.includes('projectile') || 
          mesh.name.includes('enemy') ||
          mesh.name === 'ground' ||
          mesh.name.includes('player')) {
        return false;
      }
      // Inclure les murs/obstacles SAUF obstacles de coin caché (trop restrictif)
      return mesh.name.includes('obstacle');
    });

    // S'il n'y a pas de hit ENTRE l'ennemi et le joueur, c'est bon
    if (!hit || hit.distance > distance) {
      return true; // Ligne de vue dégagée
    }

    return false;
  }

  /**
   * Met à jour les infos de perception: détection + mémoire
   * Retourne l'état actuel de vision du joueur
   * @param {Object} perception - objet { canSee, lastSeenPos, lastSeenTime }
   * @param {boolean} currentlyCanSee - résultat du test canSeePlayer()
   * @param {Vector3} playerPos - position actuelle du joueur
   * @param {number} deltaTime - temps écoulé depuis last frame
   * @param {number} memoryDuration - combien de temps se souvenir (défaut 3s)
   * @returns {Object} perception mise à jour
   */
  updatePerception(
    perception,
    currentlyCanSee,
    playerPos,
    deltaTime,
    memoryDuration = 3
  ) {
    if (currentlyCanSee) {
      // On voit le joueur maintenant
      perception.canSee = true;
      perception.lastSeenPos = playerPos.clone();
      perception.lastSeenTime = 0;
    } else {
      // On ne le voit pas
      perception.canSee = false;

      // Mais on se souvient si c'était récent
      perception.lastSeenTime += deltaTime;
      if (perception.lastSeenTime > memoryDuration) {
        perception.lastSeenPos = null; // Oubli trop vieux
      }
    }

    return perception;
  }

  /**
   * Retourne la position "cible" pour l'ennemi
   * - Si vu maintenant: position réelle du joueur
   * - Si vu récemment: dernière position connue
   * - Sinon: null (patrouille / attente)
   */
  getTargetPos(perception) {
    if (perception.canSee) {
      return perception.lastSeenPos; // Position réelle juste mise à jour
    }
    if (perception.lastSeenPos && perception.lastSeenTime < 3) {
      return perception.lastSeenPos; // Dernière position connue
    }
    return null;
  }

  /**
   * Debug: affiche le FOV et le raycast
   */
  debugDrawRay(fromPos, toPos, color = new BABYLON.Color3(1, 0, 0)) {
    const direction = toPos.subtract(fromPos);
    const distance = direction.length();
    direction.normalize();
    const ray = new BABYLON.Ray(fromPos, direction, distance);
    RayHelper.CreateAndShow(ray, this.scene, color);
  }
}
