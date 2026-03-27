// src/babylon/systems/CollisionSystem.js
import { Ray } from '@babylonjs/core'

export class CollisionSystem {
    constructor() {
      this.player = null
      this.enemies = []
      this.projectiles = []
      this.enemyDamageCooldown = new Map()
      this.DAMAGE_COOLDOWN = 1.0

      /** Référence au BuildSystem pour déclencher les procs */
      this.buildSystem = null

      // ── OPTIMISATION: Spatial partitioning simple ──
      // Grille 2D pour accélérer collision checks
      this._spatialGrid = new Map(); // Map: cellKey -> [{ entity, mesh }]
      // ⚠️ AGRESSIF: Cellules plus grandes (15 au lieu de 10)
      this._gridCellSize = 15; // Taille des cellules (units)
      
      // ── MEMORY OPTIMIZATION: Track previous grid positions ──
      this._gridCellCache = new Map(); // entity -> lastCell (avoid rebuilding if not moved)
    }
  
    registerPlayer(player) { this.player = player }
    registerEnemy(enemy) { this.enemies.push(enemy) }
    registerProjectile(projectile) { this.projectiles.push(projectile) }
  
    removeEnemy(enemy) {
      this.enemies = this.enemies.filter(e => e !== enemy)
      // ── MEMORY FIX: Clean up cooldown and grid cache ──
      this.enemyDamageCooldown.delete(enemy)
      this._gridCellCache.delete(enemy)
    }
  
    removeProjectile(projectile) {
      this.projectiles = this.projectiles.filter(p => p !== projectile)
    }

    /**
     * Convertit une position world en clé de cellule grille
     * @private
     */
    _getGridCell(pos) {
      const x = Math.floor(pos.x / this._gridCellSize);
      const z = Math.floor(pos.z / this._gridCellSize);
      return `${x},${z}`;
    }

    /**
     * Retourne les cellules adjacentes à une position (3x3 grid)
     * @private
     */
    _getAdjacentCells(pos) {
      const cells = [];
      const cx = Math.floor(pos.x / this._gridCellSize);
      const cz = Math.floor(pos.z / this._gridCellSize);
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          cells.push(`${cx + dx},${cz + dz}`);
        }
      }
      return cells;
    }

    /**
     * Reconstruit la grille spatiale SEULEMENT si des entités ont changé de cellule
     * @private
     */
    _rebuildSpatialGrid() {
      let needsRebuild = false;

      // ── OPTIMIZATION: Check if any entity moved to a different cell ──
      // Player check
      if (this.player && this.player.mesh) {
        const newCell = this._getGridCell(this.player.mesh.position);
        const oldCell = this._gridCellCache.get(this.player);
        if (oldCell !== newCell) {
          needsRebuild = true;
          this._gridCellCache.set(this.player, newCell);
        }
      }

      // Enemy check
      for (const enemy of this.enemies) {
        if (!enemy || !enemy.enemy) continue;
        const newCell = this._getGridCell(enemy.enemy.position);
        const oldCell = this._gridCellCache.get(enemy);
        if (oldCell !== newCell) {
          needsRebuild = true;
          this._gridCellCache.set(enemy, newCell);
        }
      }

      // Only rebuild if something moved
      if (!needsRebuild) return;

      this._spatialGrid.clear();

      // Ajouter tous les ennemis
      for (const enemy of this.enemies) {
        if (!enemy || !enemy.enemy) continue;
        const cell = this._getGridCell(enemy.enemy.position);
        if (!this._spatialGrid.has(cell)) {
          this._spatialGrid.set(cell, []);
        }
        this._spatialGrid.get(cell).push({ entity: enemy, type: 'enemy' });
      }

      // Ajouter le joueur
      if (this.player && this.player.mesh) {
        const cell = this._getGridCell(this.player.mesh.position);
        if (!this._spatialGrid.has(cell)) {
          this._spatialGrid.set(cell, []);
        }
        this._spatialGrid.get(cell).push({ entity: this.player, type: 'player' });
      }
    }
  
    update(deltaTime) {
      if (!this.player) return

      this.currentTime = (this.currentTime || 0) + deltaTime
  
      // Prépare un set des IDs d'ennemis pour les ignorer dans le raycast des murs
      const enemyMeshIds = new Set()
      for (const enemy of this.enemies) {
        if (enemy.enemy) {
          enemyMeshIds.add(enemy.enemy.uniqueId)
          enemy.enemy.getChildMeshes(false).forEach(m => enemyMeshIds.add(m.uniqueId))
        }
      }

      // ── Projectiles (mise à jour + collisions murs) ──
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) { this.projectiles.splice(i, 1); continue }

        // Raycast pour vérifier le mur
        const dist = proj.speed * deltaTime
        const ray = new Ray(proj.mesh.position, proj.direction, dist)
        const scene = proj.mesh.getScene()
        
        const hit = scene.pickWithRay(ray, (mesh) => {
          // CheckCollisions doit être true pour un mur
          if (!mesh.checkCollisions) return false
          
          // Ignorer sol, joueur, autres projectiles
          if (mesh.name === 'ground' || mesh.name.startsWith('player')) return false
          if (mesh.name.includes('projectile') || mesh.name.includes('bullet') || mesh.name.includes('grenade')) return false
          
          // Ignorer les ennemis (le système normal s'en occupe en dessous)
          if (enemyMeshIds.has(mesh.uniqueId)) return false
          
          return true
        })

        if (hit && hit.hit) {
          // A touché un mur !
          proj.dispose()
          this.projectiles.splice(i, 1)
          continue
        }

        const isAlive = proj.update(deltaTime)
        if (!isAlive) { proj.dispose(); this.projectiles.splice(i, 1); continue }
      }
  
      // ── OPTIMISATION: Projectiles vs Enemies avec spatial partitioning ──
      // Reconstruire la grille spatiale chaque frame (O(n) mais rapide)
      this._rebuildSpatialGrid();

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) continue
  
        // Au lieu de tester contre TOUS les ennemis, tester seulement les proches
        const adjacentCells = this._getAdjacentCells(proj.mesh.position);
        const nearbyEnemies = new Set();
        
        for (const cellKey of adjacentCells) {
          const cellContents = this._spatialGrid.get(cellKey) || [];
          for (const entry of cellContents) {
            if (entry.type === 'enemy') {
              nearbyEnemies.add(entry.entity);
            }
          }
        }

        // Tester collisions seulement avec ennemis proches
        let projHit = false;
        for (let enemy of nearbyEnemies) {
          if (!enemy.enemy) continue
          
          // Distance check avant intersection (optimisation supplémentaire)
          // ⚠️ AGRESSIF: Augmenté de 5 à 8 pour skip plus d'ennemis loin
          const dist = proj.mesh.position.subtract(enemy.enemy.position).length();
          if (dist > 8) continue; // Trop loin, skip
          
          if (proj.mesh.intersectsMesh(enemy.enemy, false)) {
            enemy.takeDamage(proj.damage || 1)
            // Déclencher les procs d'items du joueur
            this._triggerProcs(enemy)
            proj.dispose()
            this.projectiles.splice(i, 1)
            projHit = true;
            break
          }
        }
        
        if (projHit) continue;
      }
  
      // ── Player vs Enemies (contact) ──
      // Récupérer ennemis proches via grille spatiale
      const playerCells = this._getAdjacentCells(this.player.mesh.position);
      const nearbyEnemies = new Set();
      
      for (const cellKey of playerCells) {
        const cellContents = this._spatialGrid.get(cellKey) || [];
        for (const entry of cellContents) {
          if (entry.type === 'enemy') {
            nearbyEnemies.add(entry.entity);
          }
        }
      }

      for (let enemy of nearbyEnemies) {
        if (!enemy.enemy) continue
        if (enemy.enemy.intersectsMesh(this.player.mesh, false)) {
          const lastDamageTime = this.enemyDamageCooldown.get(enemy) || -Infinity
          if (this.currentTime - lastDamageTime >= this.DAMAGE_COOLDOWN) {
            enemy.contact?.()
            this.enemyDamageCooldown.set(enemy, this.currentTime)
          }
        }
      }

      // ── Effets de statut (brûlure, ralentissement) ──
      this._tickStatusEffects(deltaTime)
    }

    /** Déclenche les procs des items équipés */
    _triggerProcs(enemy) {
      if (!this.buildSystem) return
      const procItems = this.buildSystem.getProcItems()
      for (const item of procItems) {
        if (item.rollProc(this.player.luck)) {
          item.onProc(enemy, this.player)
        }
      }
    }

    /** Tick des effets de statut sur les ennemis */
    _tickStatusEffects(deltaTime) {
      for (const enemy of this.enemies) {
        if (!enemy.enemy) continue

        // ── Brûlure (DoT) ──
        if (enemy._burnTimer > 0) {
          enemy._burnTimer -= deltaTime
          enemy._burnDpsAccum = (enemy._burnDpsAccum || 0) + (enemy._burnDps || 1) * deltaTime
          if (enemy._burnDpsAccum >= 1) {
            const dmg = Math.floor(enemy._burnDpsAccum)
            enemy._burnDpsAccum -= dmg
            if (enemy.life > 0) enemy.takeDamage(dmg)
          }
          // ── OPTIMIZATION: Only update material if burn state changed ──
          if (!enemy._isBurning) {
            enemy._isBurning = true;
            if (enemy.material?.emissiveColor) {
              enemy.material.emissiveColor.r = 0.5;
              enemy.material.emissiveColor.g = 0.15;
              enemy.material.emissiveColor.b = 0;
            }
          }
          if (enemy._burnTimer <= 0) {
            enemy._burnTimer = 0
            enemy._burnDpsAccum = 0
            enemy._isBurning = false;
            if (enemy.material?.emissiveColor) {
              enemy.material.emissiveColor.r = 0;
              enemy.material.emissiveColor.g = 0;
              enemy.material.emissiveColor.b = 0;
            }
          }
        }

        // ── Ralentissement / gel ──
        if ((enemy._slowTimer || 0) > 0) {
          enemy._slowTimer -= deltaTime
          if (enemy._slowTimer <= 0) {
            enemy._slowTimer = 0
            enemy._slowFactor = 1
          }
          // Teinte bleue
          if (enemy.material?.emissiveColor && enemy._burnTimer <= 0) {
            enemy.material.emissiveColor.r = 0;
            enemy.material.emissiveColor.g = 0.1;
            enemy.material.emissiveColor.b = 0.5;
          }
        }
      }
    }
}