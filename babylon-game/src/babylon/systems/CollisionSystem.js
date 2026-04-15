// src/babylon/systems/CollisionSystem.js
import { Ray, Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core'

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

      // ── Auras: tracking distance parcourue ──
      this._lastPlayerPos = null
      this._distanceTraveled = 0
      this._sabotsCooldownDist = 0  // distance accumulée pour Sabots d'Acier
    }
  
    registerPlayer(player) {
      this.player = player
      // Injecter la liste d'ennemis pour les orbiting projectiles
      player._collisionEnemies = this.enemies
    }
    registerEnemy(enemy) { this.enemies.push(enemy) }
    registerProjectile(projectile) {
      projectile._collisionEnemies = this.enemies
      this.projectiles.push(projectile)
    }
  
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
          if (!enemy.enemy || enemy._isAlly) continue

          // ── OPTIMISATION: Distance-squared check (pas de sqrt) ──
          const dx = proj.mesh.position.x - enemy.enemy.position.x;
          const dz = proj.mesh.position.z - enemy.enemy.position.z;
          const distSq = dx * dx + dz * dz;
          if (distSq > 64) continue; // 8² = 64
          
          if (proj.mesh.intersectsMesh(enemy.enemy, false)) {
            const dmg = proj.damage || 1
            const impactPos = proj.mesh.position.clone()

            // ── Appropriation Mécanique: conversion avant la mort ──
            const convChance = this.player.conversionChance || 0
            if (convChance > 0 && !enemy._isAlly && enemy.life - dmg <= 0 && this._rollProc(convChance)) {
              // Convertir au lieu de tuer
              enemy.life = 1 // empêcher takeDamage de destroy
              enemy.convertToAlly(15)
            } else {
              enemy.takeDamage(dmg)
            }

            // Déclencher les procs d'items du joueur (passer la position d'impact pour AoE)
            this._triggerProcs(enemy, impactPos)
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
        if (!enemy.enemy || enemy._isAlly) continue
        if (enemy.enemy.intersectsMesh(this.player.mesh, false)) {
          const lastDamageTime = this.enemyDamageCooldown.get(enemy) || -Infinity
          if (this.currentTime - lastDamageTime >= this.DAMAGE_COOLDOWN) {
            // Super Hot: le joueur inflige des dégâts de contact à l'ennemi
            const contactDmg = this.player.contactDamage || 0
            if (contactDmg > 0) {
              enemy.takeDamage(contactDmg)
            }
            // L'ennemi inflige ses dégâts au joueur (sauf si invulnérable)
            if (!this.player.isInvulnerable) {
              enemy.contact?.()
            }
            this.enemyDamageCooldown.set(enemy, this.currentTime)
          }
        }
      }

      // ── Effets de statut (brûlure, ralentissement) ──
      this._tickStatusEffects(deltaTime)

      // ── Auras du joueur (Radioactivitée, Pression, Supersonic, Sabots) ──
      this._tickPlayerAuras(deltaTime)
    }

    /** Roll un proc: retourne true si l'effet se déclenche */
    _rollProc(procChance) {
      return procChance > 0 && Math.random() < procChance
    }

    /**
     * Déclenche les procs des items équipés (lus depuis les modifiers bruts du joueur).
     * Convention: pour chaque effet "xxx", la prob est lue depuis player.xxxProc.
     * Si xxxProc n'existe pas, l'effet se déclenche à 100%.
     */
    _triggerProcs(enemy, impactPos) {
      if (!this.player) return

      // ── Module Ignis: brûlure DoT ──
      const burnDmg = this.player.burnDamage || 0
      if (burnDmg > 0 && this._rollProc(this.player.burnProc ?? 1)) {
        enemy._burnTimer = Math.max(enemy._burnTimer || 0, 2)
        enemy._burnDps = burnDmg
      }

      // ── Module Glacies: ralentissement ──
      const slowVal = this.player.slowEffect || 0
      if (slowVal > 0 && this._rollProc(this.player.slowProc ?? 1)) {
        enemy._slowTimer = Math.max(enemy._slowTimer || 0, 3)
        enemy._slowFactor = 1 - Math.min(slowVal, 0.9)
      }

      // ── Module Explosif: explosion AoE ──
      const explRadius = this.player.explosionRadius || 0
      const explDamage = this.player.explosionDamage || 0
      if (explRadius > 0 && explDamage > 0 && impactPos && this._rollProc(this.player.explosionProc ?? 1)) {
        this._explodeAtPoint(impactPos, explRadius, explDamage, enemy)
      }

      // ── Module Aero: knockback (recul) ──
      const kb = this.player.knockback || 0
      if (kb > 0 && enemy.enemy) {
        const dir = enemy.enemy.position.subtract(impactPos)
        dir.y = 0
        const len = dir.length()
        if (len > 0.001) {
          dir.scaleInPlace(kb / len) // normalise puis scale par la force
          enemy.enemy.position.addInPlace(dir)
        }
      }

      // ── Tazer: chain lightning ──
      const chainCount = this.player.chainDamageCount || 0
      if (chainCount > 0 && enemy.enemy) {
        this._chainLightning(enemy, chainCount, impactPos)
      }
    }

    /**
     * Inflige des dégâts AoE à tous les ennemis dans un rayon autour d'un point.
     * @param {Vector3} center - point d'impact
     * @param {number} radius - rayon d'explosion
     * @param {number} damage - dégâts infligés
     * @param {Enemy|null} alreadyHit - ennemi déjà touché par le projectile (éviter double-hit)
     */
    _explodeAtPoint(center, radius, damage, alreadyHit = null) {
      const radiusSq = radius * radius
      for (const enemy of this.enemies) {
        if (!enemy.enemy || enemy === alreadyHit || enemy.life <= 0) continue
        const dx = enemy.enemy.position.x - center.x
        const dz = enemy.enemy.position.z - center.z
        if (dx * dx + dz * dz <= radiusSq) {
          enemy.takeDamage(damage)
        }
      }
      // Feedback visuel
      this._spawnExplosionVFX(center, radius)
    }

    /**
     * Crée une sphère semi-transparente qui grandit puis disparaît (explosion VFX).
     */
    _spawnExplosionVFX(center, radius) {
      const scene = this.player.mesh.getScene()

      const sphere = MeshBuilder.CreateSphere("explosionVFX", { diameter: 1, segments: 10 }, scene)
      sphere.position.copyFrom(center)
      sphere.scaling.setAll(0.1)
      sphere.isPickable = false

      // Matériau partagé (créé une seule fois)
      if (!CollisionSystem._explosionMat || CollisionSystem._explosionMat.getScene() !== scene) {
        const mat = new StandardMaterial("explosionVFXMat", scene)
        mat.diffuseColor = new Color3(1, 0.4, 0)
        mat.emissiveColor = new Color3(1, 0.3, 0)
        mat.alpha = 0.5
        mat.disableLighting = true
        mat.backFaceCulling = false
        CollisionSystem._explosionMat = mat
      }
      sphere.material = CollisionSystem._explosionMat

      // Animation: expand + fade out sur ~300ms
      const targetDiameter = radius * 2
      const duration = 0.3 // secondes
      let elapsed = 0

      const obs = scene.onBeforeRenderObservable.add(() => {
        elapsed += scene.getEngine().getDeltaTime() / 1000
        const t = Math.min(elapsed / duration, 1)

        // Scale: ease-out (rapide au début, ralentit)
        const scale = targetDiameter * (1 - Math.pow(1 - t, 2))
        sphere.scaling.setAll(scale)

        // Fade out
        sphere.visibility = 1 - t

        if (t >= 1) {
          scene.onBeforeRenderObservable.remove(obs)
          sphere.dispose()
        }
      })
    }

    /**
     * Tazer: l'éclair rebondit sur N ennemis proches.
     * Chaque rebond cherche l'ennemi non-touché le plus proche dans un rayon de 8.
     * Dégâts décroissants: 50% des dégâts de base du joueur par rebond.
     */
    _chainLightning(sourceEnemy, maxBounces, impactPos) {
      const chainRadius = 8
      const chainRadiusSq = chainRadius * chainRadius
      const baseDmg = (this.player.strength || 1) * 2 * 0.5 // 50% du dégât de base
      const hit = new Set()
      hit.add(sourceEnemy)

      let current = sourceEnemy
      const scene = this.player.mesh.getScene()

      for (let bounce = 0; bounce < maxBounces; bounce++) {
        let closest = null
        let closestDistSq = chainRadiusSq

        for (const enemy of this.enemies) {
          if (!enemy.enemy || enemy.life <= 0 || hit.has(enemy) || enemy._isAlly) continue
          const dx = enemy.enemy.position.x - current.enemy.position.x
          const dz = enemy.enemy.position.z - current.enemy.position.z
          const dSq = dx * dx + dz * dz
          if (dSq < closestDistSq) {
            closestDistSq = dSq
            closest = enemy
          }
        }

        if (!closest) break

        hit.add(closest)
        closest.takeDamage(baseDmg)

        // VFX: ligne éclair entre les deux ennemis
        this._spawnChainVFX(scene, current.enemy.position, closest.enemy.position)

        current = closest
      }
    }

    /**
     * VFX éclair entre deux points (ligne cyan qui disparaît rapidement).
     */
    _spawnChainVFX(scene, from, to) {
      const points = [from.clone(), to.clone()]
      // Ajouter 1-2 points intermédiaires avec offset aléatoire pour simuler un éclair
      const mid = Vector3.Lerp(from, to, 0.5)
      mid.x += (Math.random() - 0.5) * 1.5
      mid.y += (Math.random() - 0.5) * 0.5
      mid.z += (Math.random() - 0.5) * 1.5
      const lightningPoints = [from.clone(), mid, to.clone()]

      const line = MeshBuilder.CreateLines("chainVFX", { points: lightningPoints, updatable: false }, scene)
      line.color = new Color3(0.3, 0.8, 1) // cyan électrique
      line.isPickable = false

      // Disparaît après 200ms
      let elapsed = 0
      const obs = scene.onBeforeRenderObservable.add(() => {
        elapsed += scene.getEngine().getDeltaTime() / 1000
        if (elapsed >= 0.2) {
          scene.onBeforeRenderObservable.remove(obs)
          line.dispose()
        }
      })
    }

    /**
     * Auras et effets de mouvement du joueur.
     * Lit les modifiers bruts: dotDamage, enemySlowRadius, areaDamage, aoeDamage
     */
    _tickPlayerAuras(deltaTime) {
      if (!this.player || !this.player.mesh) return
      const pos = this.player.mesh.position

      // ── Calcul de la distance parcourue cette frame ──
      let frameDist = 0
      if (this._lastPlayerPos) {
        const dx = pos.x - this._lastPlayerPos.x
        const dz = pos.z - this._lastPlayerPos.z
        frameDist = Math.sqrt(dx * dx + dz * dz)
        this._distanceTraveled += frameDist
      }
      if (!this._lastPlayerPos) this._lastPlayerPos = pos.clone()
      else { this._lastPlayerPos.x = pos.x; this._lastPlayerPos.y = pos.y; this._lastPlayerPos.z = pos.z }

      // Récupérer les ennemis proches via grille spatiale (réutilise la grille déjà construite)
      const nearby = []
      const cells = this._getAdjacentCells(pos)
      for (const key of cells) {
        const contents = this._spatialGrid.get(key)
        if (!contents) continue
        for (const entry of contents) {
          if (entry.type === 'enemy' && entry.entity.enemy && entry.entity.life > 0) {
            nearby.push(entry.entity)
          }
        }
      }

      // ── Radioactivitée: dégâts continus autour du joueur ──
      const dotDmg = this.player.dotDamage || 0
      if (dotDmg > 0) {
        const dotRadius = 4
        const dotRadiusSq = dotRadius * dotRadius
        for (const enemy of nearby) {
          const dx = enemy.enemy.position.x - pos.x
          const dz = enemy.enemy.position.z - pos.z
          if (dx * dx + dz * dz <= dotRadiusSq) {
            enemy.takeDamage(dotDmg * deltaTime)
          }
        }
      }

      // ── Pression: ralentir les ennemis dans le rayon ──
      const slowRadius = this.player.enemySlowRadius || 0
      if (slowRadius > 0) {
        const slowRadiusSq = slowRadius * slowRadius
        for (const enemy of nearby) {
          const dx = enemy.enemy.position.x - pos.x
          const dz = enemy.enemy.position.z - pos.z
          if (dx * dx + dz * dz <= slowRadiusSq) {
            // Slow persistant tant qu'on est dans la zone (refresh chaque frame)
            enemy._slowTimer = Math.max(enemy._slowTimer || 0, 0.3)
            enemy._slowFactor = 0.4 // -60% vitesse dans l'aura
          }
        }
      }

      // ── Supersonic: dégâts proportionnels au mouvement ──
      const areaDmg = this.player.areaDamage || 0
      if (areaDmg > 0 && frameDist > 0.01) {
        const sonicRadius = 3
        const sonicRadiusSq = sonicRadius * sonicRadius
        // Plus on bouge vite, plus ça fait mal
        const dmg = areaDmg * frameDist
        for (const enemy of nearby) {
          const dx = enemy.enemy.position.x - pos.x
          const dz = enemy.enemy.position.z - pos.z
          if (dx * dx + dz * dz <= sonicRadiusSq) {
            enemy.takeDamage(dmg)
          }
        }
      }

      // ── Sabots d'Acier: AoE tous les 10 unités de distance parcourue ──
      const aoeDmg = this.player.aoeDamage || 0
      if (aoeDmg > 0) {
        this._sabotsCooldownDist += frameDist
        const triggerDist = 10 // déclenche tous les 10 unités
        if (this._sabotsCooldownDist >= triggerDist) {
          this._sabotsCooldownDist -= triggerDist
          // AoE stomp autour du joueur
          const stompRadius = 5
          this._explodeAtPoint(pos.clone(), stompRadius, aoeDmg)
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