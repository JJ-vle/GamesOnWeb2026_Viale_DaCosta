// src/babylon/systems/CollisionSystem.js
import { Ray } from '@babylonjs/core'

export class CollisionSystem {
    constructor() {
      this.player = null
      this.enemies = []
      this.projectiles = []
      this.enemyDamageCooldown = new Map()
      this.DAMAGE_COOLDOWN = 1.0

      /** Référence à l'inventory pour déclencher les procs */
      this.inventory = null

      // ── OPTIMISATION: Spatial partitioning simple ──
      this._spatialGrid = new Map();
      this._gridCellSize = 15;
      
      // ── MEMORY OPTIMIZATION: Track previous grid positions ──
      this._gridCellCache = new Map();

      // ── OPTIMISATION: Cache des enemy mesh IDs pour raycasts ──
      this._cachedEnemyMeshIds = new Set()
      this._lastEnemyCount = -1  // Détecter changement
    }
  
    registerPlayer(player) { this.player = player }
    registerEnemy(enemy) { this.enemies.push(enemy) }
    registerProjectile(projectile) { this.projectiles.push(projectile) }
  
    removeEnemy(enemy) {
      // ── OPTIMISATION: splice au lieu de filter (pas de nouvel array) ──
      const idx = this.enemies.indexOf(enemy)
      if (idx !== -1) this.enemies.splice(idx, 1)
      this.enemyDamageCooldown.delete(enemy)
      this._gridCellCache.delete(enemy)
      this._lastEnemyCount = -1 // Forcer rebuild du cache meshIds
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
  
      // ── OPTIMISATION: Cacher les enemyMeshIds et les reconstruire seulement si le nombre d'ennemis change ──
      if (this.enemies.length !== this._lastEnemyCount) {
        this._cachedEnemyMeshIds.clear()
        for (const enemy of this.enemies) {
          if (enemy.enemy) {
            this._cachedEnemyMeshIds.add(enemy.enemy.uniqueId)
            const children = enemy.enemy.getChildMeshes(false)
            for (let j = 0; j < children.length; j++) {
              this._cachedEnemyMeshIds.add(children[j].uniqueId)
            }
          }
        }
        this._lastEnemyCount = this.enemies.length
      }
      const enemyMeshIds = this._cachedEnemyMeshIds

      // ── Projectiles vs murs (raycasts) ──
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) { this.projectiles.splice(i, 1); continue }

        // Raycast pour vérifier le mur
        const dist = proj.speed * deltaTime
        const ray = new Ray(proj.mesh.position, proj.direction, dist)
        const scene = proj.mesh.getScene()
        
        const hit = scene.pickWithRay(ray, (mesh) => {
          if (!mesh.checkCollisions) return false
          if (mesh.name === 'ground' || mesh.name.startsWith('player')) return false
          if (mesh.name.includes('projectile') || mesh.name.includes('bullet') || mesh.name.includes('grenade')) return false
          if (enemyMeshIds.has(mesh.uniqueId)) return false
          return true
        })

        if (hit && hit.hit) {
          proj.dispose()
          this.projectiles.splice(i, 1)
          continue
        }
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
          
          // ── OPTIMISATION: Distance-squared check (pas de sqrt) ──
          const dx = proj.mesh.position.x - enemy.enemy.position.x;
          const dz = proj.mesh.position.z - enemy.enemy.position.z;
          const distSq = dx * dx + dz * dz;
          if (distSq > 64) continue; // 8² = 64
          
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
        // Intangibilité : le joueur traverse les ennemis pendant les i-frames
        if (this.player.isInvulnerable) continue
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
      if (!this.inventory) return
      
      // Temporaire: avec la nouvelle db on gérera le rollProc et onProc différemment
      // const procItems = this.inventory.getItems().map(e => e.item).filter(i => i.procChance)
      // On le bypass pour l'instant car les items de on proc n'ont plus la fonction JS (c'est des modifiers purs pour l'instant)
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