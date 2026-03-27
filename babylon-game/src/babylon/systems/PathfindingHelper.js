import { Vector3, Ray } from '@babylonjs/core';

/**
 * PathfindingHelper: Gère la navigation et le déplacement des ennemis
 * - Utilise NavGrid (A*) pour contourner les obstacles
 * - Séparation avec alliés (flocking)
 * - Suivi de waypoints intelligent
 */
export class PathfindingHelper {
  constructor(scene, navGrid = null) {
    this.scene = scene;
    this.navGrid = navGrid; // NavGrid partagée (injectée depuis MainScene)

    // Waypoints A* pour cet ennemi
    this._currentPath = [];
    this._currentWaypointIndex = 0;
    this._pathTarget = null; // dernière destination pour laquelle on a calculé le path
    this._pathRecalcTimer = 0;
    this._pathRecalcInterval = 0.5; // recalculer le chemin toutes les 0.5s maximum
    
    // ── STUCK DETECTION: Forcer recalc si ennemi bloqué ──
    this._lastPos = null;
    this._stuckFrameCount = 0;
    this._stuckThreshold = 3; // frames avant de forcer recalc (détecte si bloqué contre mur)
  }

  /**
   * Calcule le vecteur de déplacement vers une cible EN UTILISANT A*
   * @param {Vector3} currentPos - position actuelle de l'ennemi
   * @param {Vector3} targetPos - position cible (joueur ou dernière position connue)
   * @param {number} speed - vitesse de déplacement (0-1+)
   * @param {Array<Enemy>} allEnemies - liste des autres ennemis (pour séparation)
   * @param {number} separationDistance - distance de séparation (défaut 3)
   * @param {number} separationForce - force de séparation (défaut 0.5)
   * @returns {Vector3} vecteur de mouvement
   */
  getMovementVector(
    currentPos,
    targetPos,
    speed = 0.1,
    allEnemies = [],
    separationDistance = 3,
    separationForce = 0.5
  ) {
    // Direction de base vers la cible
    let direction = targetPos.subtract(currentPos);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.1) {
      return Vector3.Zero(); // Arrivé
    }

    direction.normalize();

    // ─── PATHFINDING A* ───
    // Si on a une NavGrid, utiliser A* pour trouver le chemin
    if (this.navGrid) {
      const waypointDir = this._getAStarDirection(currentPos, targetPos);
      if (waypointDir) {
        direction = waypointDir;
      }
    }

    // Ajouter la séparation (éviter les alliés)
    const separation = this._getSeparationVector(
      currentPos,
      allEnemies,
      separationDistance,
      separationForce
    );

    const movement = direction.add(separation);
    movement.y = 0;

    // Normaliser si non-zero et appliquer speed
    if (movement.length() > 0.001) {
      movement.normalize();
    }

    // ── STUCK DETECTION: Forcer recalc si ennemi bloqué contre mur ──
    if (this._lastPos) {
      const movedDistance = Vector3.Distance(this._lastPos, currentPos);
      if (movedDistance < 0.01) {
        // N'a pratiquement pas bougé
        this._stuckFrameCount++;
        if (this._stuckFrameCount >= this._stuckThreshold) {
          // Stuck trop longtemps, forcer recalc immédiat
          this._currentPath = [];
          this._stuckFrameCount = 0;
        }
      } else {
        // A bougé, réinitialiser le compteur
        this._stuckFrameCount = 0;
      }
    }
    this._lastPos = currentPos.clone();

    return movement.scale(speed);
  }

  /**
   * Utilise le NavGrid A* pour obtenir la direction vers le prochain waypoint
   * @returns {Vector3|null} direction normalisée ou null si pas de chemin
   */
  _getAStarDirection(currentPos, targetPos) {
    if (!this.navGrid) return null;

    // Recalculer le chemin si la cible a changé significativement
    const needRecalc = this._needsPathRecalc(targetPos);
    
    if (needRecalc) {
      const path = this.navGrid.findPath(currentPos, targetPos);
      if (path.length > 0) {
        this._currentPath = path;
        this._currentWaypointIndex = 0;
        this._pathTarget = targetPos.clone();
        // ── STUCK DETECTION: Reset counter on successful recalc ──
        this._stuckFrameCount = 0;
      } else {
        // Pas de chemin → direction directe
        this._currentPath = [];
        return null;
      }
    }

    // Si pas de chemin, direction directe
    if (this._currentPath.length === 0) {
      return null;
    }

    // Trouver le prochain waypoint à atteindre
    // Avancer dans le chemin si on est assez proche du waypoint courant
    while (this._currentWaypointIndex < this._currentPath.length - 1) {
      const wp = this._currentPath[this._currentWaypointIndex];
      const distToWp = Vector3.Distance(
        new Vector3(currentPos.x, 0, currentPos.z),
        new Vector3(wp.x, 0, wp.z)
      );

      if (distToWp < this.navGrid.cellSize * 1.5) {
        this._currentWaypointIndex++;
      } else {
        break;
      }
    }

    // Direction vers le waypoint courant
    const targetWp = this._currentPath[Math.min(this._currentWaypointIndex, this._currentPath.length - 1)];
    const dir = targetWp.subtract(currentPos);
    dir.y = 0;

    if (dir.length() < 0.1) {
      return null;
    }

    dir.normalize();
    return dir;
  }

  /**
   * Vérifie si le chemin doit être recalculé
   */
  _needsPathRecalc(targetPos) {
    // Si pas de chemin existant
    if (this._currentPath.length === 0) return true;

    // ── RÉACTIVITÉ: Si la cible a bougé significativement (>1 unit) ──
    // Ancien: 3 units (réactifs trop lent quand joueur tourne autour)
    // Nouveau: 1 unit (ennemis s'adaptent rapidement aux mouvements)
    if (!this._pathTarget) return true;
    const targetMoved = Vector3.Distance(this._pathTarget, targetPos);
    if (targetMoved > 1) return true;

    // Si on a atteint la fin du chemin
    if (this._currentWaypointIndex >= this._currentPath.length) return true;

    return false;
  }

  /**
   * Calcule un vecteur de séparation pour éviter les allies
   * @private
   */
  _getSeparationVector(
    pos,
    allEnemies,
    separationDistance,
    separationForce
  ) {
    let sep = Vector3.Zero();
    let count = 0;

    for (const other of allEnemies) {
      if (!other.enemy && !other.mesh) continue;

      const otherPos = other.enemy?.position || other.mesh?.position;
      if (!otherPos) continue;

      const dist = Vector3.Distance(pos, otherPos);
      if (dist < separationDistance && dist > 0.001) {
        const away = pos.subtract(otherPos);
        away.y = 0;
        away.normalize();
        sep.addInPlace(away.scale(separationDistance - dist));
        count++;
      }
    }

    if (count > 0) {
      sep.scaleInPlace(separationForce / count);
    }

    sep.y = 0;
    return sep;
  }

  /**
   * Vérifie s'il y a un obstacle DROIT DEVANT et bloque le mouvement si oui
   * @returns {boolean} true si chemin libre, false si obstacle
   */
  isPathClear(pos, direction, distance = 1.5) {
    const dirCopy = direction.clone();
    dirCopy.normalize();
    
    const ray = new Ray(pos, dirCopy, distance);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      if (!mesh.name || mesh.name.includes('enemy') || mesh.name.includes('projectile')) {
        return false;
      }
      return true;
    });

    return !hit || hit.distance > 0.3;
  }

  /**
   * Vérifie s'il y a collision directe avec obstacles
   */
  canMoveTo(fromPos, toPos, enemyMesh) {
    const direction = toPos.subtract(fromPos);
    const distance = direction.length();
    
    if (distance < 0.001) return true;
    
    direction.normalize();
    const ray = new Ray(fromPos, direction, distance + 0.2);
    
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      if (mesh === enemyMesh || 
          !mesh.name || 
          mesh.name.includes('projectile') ||
          mesh.name === 'ground' ||
          mesh.name.includes('player') ||
          mesh.name.includes('wall_')) {
        return false;
      }
      if (mesh.name.includes('obstacle')) {
        return true;
      }
      return false;
    });

    return !hit || hit.distance > 0.2;
  }

  /**
   * Ajoute une composante "aléatoire" pour éviter les bots robotiques
   */
  getWanderVector(randomness = 0.3) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomness;
    return new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }

  /**
   * Fait un petit raycast forward pour détecter obstacles tout proches
   * Retourne un vecteur de contournement minimal si obstacle détecté
   */
  getLocalAvoidanceVector(
    pos,
    forward,
    checkDistance = 2,
    rayAngle = 45
  ) {
    forward.y = 0;
    forward.normalize();

    const rayCount = 5;
    const angleStep = rayAngle / (rayCount - 1);

    for (let i = 0; i < rayCount; i++) {
      const angle = (i - (rayCount - 1) / 2) * (angleStep * Math.PI / 180);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const rayDir = new Vector3(
        forward.x * cosA - forward.z * sinA,
        0,
        forward.x * sinA + forward.z * cosA
      );

      const ray = new Ray(pos, rayDir, checkDistance);
      const hit = this.scene.pickWithRay(ray, (mesh) => {
        if (!mesh.name || mesh.name.includes('enemy') || mesh.name.includes('projectile')) {
          return false;
        }
        return true;
      });

      if (hit && hit.distance < checkDistance) {
        const perpendicular = new Vector3(-rayDir.z, 0, rayDir.x);
        perpendicular.normalize();
        return perpendicular.scale(2.0);
      }
    }

    return Vector3.Zero();
  }

  /**
   * Retourne une position de patrouille aléatoire
   */
  getRandomPatrolPoint(centerPos, patrolRadius = 10) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * patrolRadius;
    return new Vector3(
      centerPos.x + Math.cos(angle) * distance,
      centerPos.y,
      centerPos.z + Math.sin(angle) * distance
    );
  }

  /**
   * Interpole smoothly vers une position cible
   */
  moveToClamped(current, target, maxDistance) {
    const diff = target.subtract(current);
    if (diff.length() <= maxDistance) {
      return target;
    }
    diff.normalize();
    return current.add(diff.scale(maxDistance));
  }
}
