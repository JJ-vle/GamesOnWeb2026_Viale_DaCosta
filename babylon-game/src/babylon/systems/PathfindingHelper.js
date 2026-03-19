import { Vector3, Ray } from '@babylonjs/core';

/**
 * PathfindingHelper: Gère la navigation et le déplacement des ennemis
 * - Déplacement vers cibles
 * - Évitement simple (séparation avec alliés)
 * - Petits raycasts pour éviter obstacles locaux
 */
export class PathfindingHelper {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Calcule le vecteur de déplacement vers une cible
   * @param {Vector3} currentPos - position actuelle de l'ennemi
   * @param {Vector3} targetPos - position cible
   * @param {number} speed - vitesse de déplacement (0-1+)
   * @param {Array<Enemy>} allEnemies - liste des autres ennemis (pour séparation)
   * @param {number} separationDistance - distance de séparation (défaut 3)
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
    // Direction vers la cible
    const direction = targetPos.subtract(currentPos);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.1) {
      return Vector3.Zero(); // Arrivé
    }

    direction.normalize();

    // Ajouter la séparation (éviter les allies)
    const separation = this._getSeparationVector(
      currentPos,
      allEnemies,
      separationDistance,
      separationForce
    );

    // Ajouter l'évitement d'obstacles (raycast local)
    const avoidance = this.getLocalAvoidanceVector(
      currentPos,
      direction,
      15.0,  // checkDistance TRÈS augmentée (détecte très loin)
      180   // rayAngle MAX (couverture complète)
    );

    const movement = direction.add(separation).add(avoidance);
    movement.y = 0;

    // Normaliser si non-zero et appliquer speed
    if (movement.length() > 0.001) {
      movement.normalize();
    }

    return movement.scale(speed);
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
      if (!other.enemy || !other.mesh) continue;

      const dist = Vector3.Distance(pos, other.enemy?.position || other.mesh.position);
      if (dist < separationDistance && dist > 0.001) {
        const away = pos.subtract(other.enemy?.position || other.mesh.position);
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
    // Créer une copie normalisée de la direction (important: ne pas modifier l'original)
    const dirCopy = direction.clone();
    dirCopy.normalize();
    
    const ray = new Ray(pos, dirCopy, distance);
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      // Ignorer les ennemis et projectiles
      if (!mesh.name || mesh.name.includes('enemy') || mesh.name.includes('projectile')) {
        return false;
      }
      return true; // Inclure murs/obstacles
    });

    // Path is clear si pas de hit ou hit très proche (pas grave)
    return !hit || hit.distance > 0.3;
  }

  /**
   * Vérifie s'il y a collision directe avec obstacles
   * @returns {boolean} true si mouvement sûr, false si collision
   */
  canMoveTo(fromPos, toPos, enemyMesh) {
    // Raycast direct pour vérifier collision
    const direction = toPos.subtract(fromPos);
    const distance = direction.length();
    
    if (distance < 0.001) return true;
    
    direction.normalize();
    const ray = new Ray(fromPos, direction, distance + 0.2); // Buffer petit (0.2 units)
    
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      // Ignorer l'ennemi lui-même, son mesh, les projectiles, et le sol
      if (mesh === enemyMesh || 
          !mesh.name || 
          mesh.name.includes('projectile') ||
          mesh.name === 'ground' ||
          mesh.name.includes('player') ||
          mesh.name.includes('wall_')) {  // Ignorer les murs de bordure
        return false;
      }
      // Vérifier que c'est un obstacle (nommé 'obstacle_*')
      if (mesh.name.includes('obstacle')) {
        return true;
      }
      return false;
    });

    // Si collision obstacles détectée très proche, bloquer
    return !hit || hit.distance > 0.2;
  }

  /**
   * Ajoute une composante "aléatoire" pour éviter les bots robotiques
   * Utile pour patrouille ou wandering
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

    const rayCount = 13; // Énormément de raycasts pour détection maximale
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
        // Ignorer les ennemis et projectiles
        if (!mesh.name || mesh.name.includes('enemy') || mesh.name.includes('projectile')) {
          return false;
        }
        return true; // Inclure murs/obstacles
      });

      if (hit && hit.distance < checkDistance) {
        // Obstacle détecté, retourner vecteur perpendiculaire très fort
        const perpendicular = new Vector3(-rayDir.z, 0, rayDir.x);
        perpendicular.normalize();
        return perpendicular.scale(10.0);  // Force EXTRÊMEMENT augmentée pour contourner
      }
    }

    return Vector3.Zero();
  }

  /**
   * Retourne une position de patrouille aléatoire
   * (utile pour les ennemis en idle/patrol)
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
   * Utile pour les movements fluides
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
