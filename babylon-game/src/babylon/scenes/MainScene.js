// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { SpawnerSystem } from '../systems/SpawnerSystem'
import { Zone } from '../Zone'
import { generateZoneTree } from '../ZoneTree'
import { EnemyProjectile } from '../entities/weapons/EnemyProjectile.js'
import { RoundOrchestrator } from './RoundOrchestrator'
import { WorldBuilder } from './WorldBuilder'
import { EnemySpawnHandler } from './EnemySpawnHandler'
import { MAP, SPAWN, ZONE_TREE } from './GameConfig'
import { clearEnemies } from './EnemySpawnHandler'
import { Vector3 } from '@babylonjs/core'
import { PistolWeapon } from "../entities/weapons/PistolWeapon"
import { WeaponSystem } from "../systems/WeaponSystem"
import { CollisionSystem } from "../systems/CollisionSystem"
import { UISystem } from "../systems/UISystem"
import { ActiveAbilitySystem } from "../systems/ActiveAbilitySystem"
import { BuildSystem } from "../systems/BuildSystem"
import { LootSystem } from "../systems/LootSystem"
import { XPSystem } from "../systems/XPSystem"
import { LootUI } from "../ui/LootUI"
import { PauseUI } from "../ui/PauseUI"
import { XRaySystem } from "../systems/XRaySystem"
import { PerformanceMonitor } from "../systems/PerformanceMonitor"
import { PerceptionSystem } from "../systems/PerceptionSystem"


export class MainScene extends BaseScene {
  constructor(engine) {
    super(engine)

    // ID du noeud de zone actuellement chargé (utile pour demander l'ouverture de la map)
    this.currentZoneNodeId = null

    const _wb = new WorldBuilder(this.scene)
    _wb.createLights()
    const { playerEntry, navGrid } = _wb.build({
      onMapLoaded: (updatedNavGrid) => {
        for (const enemy of this.enemies) {
          if (enemy.setNavGrid) enemy.setNavGrid(updatedNavGrid)
        }
        console.log(`[NavGrid] NavGrid rebuilt and injected into ${this.enemies.length} existing enemies`)
      }
    })
    this.playerEntry = playerEntry
    this.navGrid = navGrid

    this.uiSystem = new UISystem(this.scene)

    this.player = this.playerEntry
    this.cameraManager = new CameraManager(this.scene, this.player.mesh)
    this.score = 0
    this.kills = 0
    this.projectiles = []

    this.collisionSystem = new CollisionSystem()

    // ── Build System ──
    this.buildSystem = new BuildSystem(this.playerEntry)
    this.lootSystem = new LootSystem()
    this.xpSystem = new XPSystem()
    this.lootUI = new LootUI(this.scene)
    this.pauseUI = new PauseUI(this.scene)
    this._isGamePausedForLoot = false
    this._isGamePaused = false  // ── PAUSE: Game pause flag ──
    this._pauseSwitchLock = false  // ── PAUSE: Prevent spamming ──
    this._pendingLevelUpLootLevel = null

    this.buildSystem.onItemEquipped = (item) => {
      this.uiSystem.showNotification(`${item.icon} ${item.name} équipé!`, item.rarityColor, 2000)
      this.uiSystem.updateItems(this.buildSystem.getEquippedItems())
    }

    // LevelUp → afficher l'écran de loot
    this.xpSystem.onLevelUp = (level) => {
      this.uiSystem.showNotification(`⬆ NIVEAU ${level} !`, '#ffcc00', 2000)
      // On queue le loot de level-up pour éviter les collisions avec la fin de round.
      this._pendingLevelUpLootLevel = level
    }

    // Arme : pistolet par défaut
    this.weapon = new PistolWeapon(this.scene, this.playerEntry)
    this.weapon.onProjectileCreated = (projectile) => {
      this.projectiles.push(projectile)
    }

    this.enemies = []

    // ── OPTIMISATION: PerceptionSystem partagé (1 seul pour tous les ennemis) ──
    this.sharedPerceptionSystem = new PerceptionSystem(this.scene)

    // --- Initialiser le système de Zone et Round ---
    this.zone = new Zone(this.scene);

    // Générer l'arbre de zones et l'attacher à la zone pour debug/itération
    try {
      const tree = generateZoneTree(ZONE_TREE)
      this.zone.tree = tree
      // Set current zone node to the real starting node (depth 1)
      const startNode = tree.nodes.find(n => n.depth === 1)
      this.currentZoneNodeId = startNode ? startNode.id : tree.root
      console.log('[ZoneTree] Generated tree depth', tree.depth)
      console.log('[ZoneTree] Nodes:', JSON.stringify(tree.nodes, null, 2))
      // Afficher la représentation DOT pour usage externe (Graphviz, mermaid, etc.)
      console.log('[ZoneTree] DOT:\n' + tree.dot)
      // Zone tree generated; UI map handled by ZoneMapView component
    } catch (e) {
      console.error('[ZoneTree] Error generating tree', e)
    }

    // Créer le système de spawn aléatoire
    this.spawnerSystem = new SpawnerSystem(this.scene, MAP.WIDTH, MAP.HEIGHT, SPAWN.MIN_DIST_FROM_PLAYER);

    // Le joueur spawn en 0, 0, 0. On veut protéger un carré autour de lui (ex: de -20 à +20)
    // (Vector3 point_1, Vector3 point_2)
    SPAWN.EXCLUSION_ZONES.forEach(([a, b]) =>
      this.spawnerSystem.addExclusionZone(new Vector3(...a), new Vector3(...b))
    )
    this.spawnerSystem.addInclusionZone(new Vector3(...SPAWN.INCLUSION_ZONE[0]), new Vector3(...SPAWN.INCLUSION_ZONE[1]))

    this.zone.addSpawner(this.spawnerSystem);

    // Callback ennemi spawné
    const spawnHandler = new EnemySpawnHandler(this.scene, {
      getNavGrid: () => this.navGrid,
      perceptionSystem: this.sharedPerceptionSystem,
      playerEntry: this.playerEntry,
      uiSystem: this.uiSystem,
      enemies: this.enemies,
      collisionSystem: this.collisionSystem,
      spawnerSystem: this.spawnerSystem,
      getCurrentRound: () => this.currentRound,
      onEnemyKilled: (enemy) => {
        this.kills++
        this.xpSystem.addXP(enemy.xpValue)
        this.score += enemy.coinValue
        this.uiSystem?.updateKills(this.kills)
        this.uiSystem?.updateGears(this.score)
        this.uiSystem?.updateXP(this.xpSystem.progressToNext, this.xpSystem.level)
      },
      onKillOnly: () => { this.kills++ }
    })
    this.spawnerSystem.onEnemySpawned = spawnHandler.makeSpawnCallback()

    // ── OPTIMISATION: Initialiser le Performance Monitor ──
    this.performanceMonitor = new PerformanceMonitor(this.scene, this.spawnerSystem)

    this.roundOrchestrator = new RoundOrchestrator(this.scene, {
      spawnerSystem: this.spawnerSystem,
      collisionSystem: this.collisionSystem,
      enemies: this.enemies,
      uiSystem: this.uiSystem,
      showLootScreen: (opts) => this._showLootScreen(this.xpSystem.level, opts)
    })
    this.roundOrchestrator.currentZoneNodeId = this.currentZoneNodeId
    this._roundNumber = 1
    this.currentRound = this.roundOrchestrator.buildInitialZone(this.zone)
    this.currentRound.startRound()

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.playerEntry,
      this.weapon,
      this.collisionSystem
    );

    this._isGameOver = false

    this.collisionSystem.registerPlayer(this.playerEntry)
    // Injecter le buildSystem dans le collisionSystem pour les procs
    this.collisionSystem.buildSystem = this.buildSystem

    // ── ActiveAbilitySystem (Espace) ──
    this.activeAbilitySystem = new ActiveAbilitySystem(
      this.scene,
      this.playerEntry,
      this.enemies
    )
    this.activeAbilitySystem.equip('heal') // Item de départ

    this.activeAbilitySystem.onAbilityUsed = () => {
      const item = this.activeAbilitySystem.equippedItem
      if (item === 'heal') {
        this.uiSystem.showNotification('+5 HP', '#00ff88', 1200)
      } else if (item === 'grenade') {
        this.uiSystem.showNotification('💥 GRENADE !', '#ff8800', 1200)
      }
    }

    // Resize
    this.scene.getEngine().onResizeObservable.add(() => {
      if (this.scene.activeCamera === this.isoCamera) {
        this._updateIsoFrustum()
      }
    })

    // DEBUG MAP: Clic Gauche pour afficher les coordonnées X,Z dans la console (F12)
    this.scene.onPointerDown = (evt, pickResult) => {
      if (pickResult.hit && evt.button === 0) {
        // console.log(`[DEBUG MAP] Clic aux coordonnées : new Vector3(${pickResult.pickedPoint.x.toFixed(1)}, 0, ${pickResult.pickedPoint.z.toFixed(1)})`);
      }
    };

    this.scene.collisionsEnabled = true

    // ── X-Ray System (voir le joueur derrière les obstacles) ──
    this.xraySystem = new XRaySystem(this.scene, this.playerEntry)
    // Ignorer le sol
    const groundMesh = this.scene.getMeshByName('ground')
    if (groundMesh) this.xraySystem.ignoreMesh(groundMesh)
    // Ignorer les murs invisibles (bordures)
    this.scene.meshes.forEach(m => {
      if (m.name && m.name.startsWith('wall_') && !m.isVisible) {
        this.xraySystem.ignoreMesh(m)
      }
    })

    this.enemyCallbacks = spawnHandler.makeEnemyCallbacks()
    this._setupInputs()
    this._setupDebugCommands()
  }

  /**
   * Load a zone by its tree node id: rebuild Zone, create rounds and teleport player
   * @param {number} nodeId
   */
  loadZoneByNodeId(nodeId) {
    if (!this.zone || !this.zone.tree) {
      console.warn('[MainScene] No zone tree available to load node', nodeId)
      return
    }
    const nodes = this.zone.tree.nodes || []
    const node = nodes.find(n => n.id === nodeId)
    if (!node) {
      console.warn('[MainScene] Zone node not found:', nodeId)
      return
    }

    console.log('[MainScene] Loading zone node', nodeId, node)

    // Debug: log rounds/mobs and reset spawner counters to avoid stale state
    console.log('[MainScene] Node rounds:', node.nbrounds)
    if (this.spawnerSystem) {
      console.log('[MainScene] SpawnerSystem before load: isSpawning=', this.spawnerSystem.isSpawning, 'spawnedCount=', this.spawnerSystem.spawnedCount, 'maxSpawns=', this.spawnerSystem.maxSpawns)
      try { this.spawnerSystem.stop() } catch (e) {}
      this.spawnerSystem.spawnedCount = 0
      this.spawnerSystem.maxSpawns = null
    }

    // Mémoriser l'id du noeud chargé
    this.currentZoneNodeId = nodeId

    // Purge existing enemies and stop spawner
    if (this.spawnerSystem) this.spawnerSystem.stop()
    clearEnemies(this.enemies, this.collisionSystem)

    this.roundOrchestrator.currentZoneNodeId = nodeId
    const newZone = this.roundOrchestrator.buildZoneForNode(node, this.zone.tree)

    // Replace zone and set current round to first
    this.zone = newZone
    this.roundOrchestrator.zone = newZone
    this._roundNumber = 1
    this.currentRound = this.zone.getRounds()[0]
    console.debug('[MainScene] zone loaded — rounds=', this.zone.getRounds().length, 'currentRoundIndex=0 assigned')
    if (this.currentRound) {
      try {
        this._pendingLevelUpLootLevel = null
        this._isGamePausedForLoot = false
        if (this.spawnerSystem) {
          this.spawnerSystem.stop()
          this.spawnerSystem.spawnedCount = 0
          this.spawnerSystem.maxSpawns = null
          this.spawnerSystem._timer = 0
        }
      } catch (e) { /* ignore */ }

      this.currentRound.startRound()
    }

    // Teleport player to center of zone map
    try {
      if (this.playerEntry && this.playerEntry.mesh) {
        this.playerEntry.mesh.position = new Vector3(0, 1, 0)
        // reset camera follow if available
        if (this.cameraManager && this.cameraManager.active && this.cameraManager.active.camera) {
          try { this.scene.activeCamera = this.cameraManager.active.camera } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[MainScene] Error teleporting player', e)
    }

    this.uiSystem && this.uiSystem.showNotification(`Chargé: zone ${nodeId} (${node.type})`, '#88ccff', 2000)
  }

  _setupInputs() {
    this.inputMap = {}
    this._spaceLock = false // prevent repeated activations while holding space

    this.scene.onKeyboardObservable.add((kbInfo) => {
      const type = kbInfo.type
      if (!kbInfo || !kbInfo.event) return
      let key = kbInfo.event.key
      // normalize single-character keys to lowercase so AZERTY/QWERTY differences don't break mapping
      if (typeof key === 'string' && key.length === 1) key = key.toLowerCase()

      if (type === 1) {
        this.inputMap[key] = true
        
        // ── PAUSE: Check for Escape key ──
        if (key === 'Escape' && !this._pauseSwitchLock) {
          this._pauseSwitchLock = true
          if (this._isGamePaused) {
            // Resume
            this._isGamePaused = false
            this.pauseUI.hide()
          } else if (!this._isGamePausedForLoot) {
            // Pause (but not if already in loot menu)
            this._isGamePaused = true
            this.pauseUI.show(() => {
              // Resume callback
              this._isGamePaused = false
            })
          }
        }
      } else if (type === 2) {
        this.inputMap[key] = false
        
        // ── PAUSE: Release lock ──
        if (key === 'Escape') {
          this._pauseSwitchLock = false
        }
      }
    })
  }

  // ── MEMORY FIX: Dispose method to clean up observers ──
  dispose() {
    // Clean up camera observers
    if (this.cameraManager && this.cameraManager.dispose) {
      this.cameraManager.dispose()
    }
    // Clean up loot UI observers
    if (this.lootUI && this.lootUI.dispose) {
      this.lootUI.dispose()
    }
    // Clean up pause UI observers
    if (this.pauseUI && this.pauseUI.dispose) {
      this.pauseUI.dispose()
    }
    // Call parent dispose
    super.dispose()
  }



  // 📝 Outils de triche pour F12
  _setupDebugCommands() {
    // 1. setStat('strength', 15) pour les dégâts, setStat('speed', 3) pour la vitesse...
    window.setStat = (statName, value) => {
      if (this.playerEntry && this.playerEntry[statName] !== undefined) {
        this.playerEntry[statName] = value
        // console.log(`[Cheat] Statistique du joueur '${statName}' modifiée à ${value} !`)
      } else {
        console.warn(`[Cheat] Impossible de trouver la statistique '${statName}' sur le joueur. Les stats standards sont: life, maxLife, speed, strength, speedshot, luck, armor, regen`)
      }
    }

    // 2. noCooldown() pour spammer Espace
    window.noCooldown = () => {
      if (this.activeAbilitySystem && this.activeAbilitySystem.activeAbility) {
        this.activeAbilitySystem.activeAbility.baseCooldown = 0
        this.activeAbilitySystem.activeAbility.cooldown = 0
        // console.log("[Cheat] Cooldown de la capacité actif supprimé ! SPAMME !")
      } else {
        console.warn("[Cheat] Aucune capacité active trouvée.")
      }
    }

    // 3. clearEnemies() pour tuer instantanément tout le monde (déclenche la victoire par kill de fin de manche, gagne l'XP, etc)
    window.clearEnemies = () => {
      // console.log(`[Cheat] Frappe Orbitale ! Éradication de ${this.enemies.length} ennemis...`)
      // On boucle à l'envers car la liste se vide au fur et à mesure
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        if (enemy) {
          // Utiliser takeDamage fait pop les XP, augmente le score et alerte la manche
          enemy.takeDamage(99999)
        }
      }
    }

    // 4. help() pour voir comment utiliser les commandes
    window.help = () => {
      console.log(`
%c🛠️ COMMANDES DE TRICHE (Menu Développeur) 🛠️
%c
1. %csetStat(nom, valeur) %c- Modifie une statistique de base du joueur.
   Stats disponibles : 'life', 'maxLife', 'speed', 'strength', 'speedshot', 'luck', 'armor', 'regen'.
   Ex: %csetStat('strength', 20)%c  (Rend tes tirs hyper puissants)
   Ex: %csetStat('luck', 10)%c      (Garantit des loots rares à la fin du round !)

2. %cnoCooldown() %c- Annule complètement le temps de recharge pour l'objet Actif (Espace).
   (Pratique pour spammer des millions de grenades 💥)

3. %cclearEnemies() %c- Lance une frappe orbitale qui tue INSTANTANÉMENT tous les ennemis sur la carte.
   (Tu gagnes tout de même l'XP et le Score pour chaque mort)

4. %chelp() %c- Affiche ce menu.
      `,
        "font-size: 14px; font-weight: bold; color: #ffcc00;", "",
        "color: #00ffaa; font-weight: bold;", "",
        "color: #ff55bb;", "",
        "color: #ff55bb;", "",
        "color: #00ffaa; font-weight: bold;", "",
        "color: #00ffaa; font-weight: bold;", "",
        "color: #00ffaa; font-weight: bold;", ""
      )
    }
  }

  // ─────────────────────────────────────────────
  update() {
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000

    if (this.navGrid) this.navGrid.tick()
    if (this._isGamePausedForLoot || this._isGamePaused) return

    // Level-up loot en attente : ouvrir seulement si le round est encore actif
    if (
      this._pendingLevelUpLootLevel != null &&
      !this.lootUI.isVisible &&
      this.currentRound &&
      this.currentRound.state !== 'finished'
    ) {
      const level = this._pendingLevelUpLootLevel
      this._pendingLevelUpLootLevel = null
      this._showLootScreen(level, { startNextRoundAfterPick: false })
      return
    }

    this._updatePlayer(deltaTime)
    this._updateSubsystems(deltaTime)
    const { activatedEnemies, culledEnemies } = this._updateEnemiesAndCulling()
    this._updateProjectiles(deltaTime)
    this._updateUI(activatedEnemies, culledEnemies)

    if (!this._isGameOver && this.playerEntry && this.playerEntry.life <= 0) {
      this._isGameOver = true
      this._isGamePausedForLoot = true
      if (this.uiSystem && this.uiSystem.showGameOver) this.uiSystem.showGameOver()
      return
    }
  }

  _updatePlayer(deltaTime) {
    this.playerEntry.update(this.inputMap)
    if (this.activeAbilitySystem) this.activeAbilitySystem.update(deltaTime, this.inputMap)
    if (this.inputMap['c'] && !this._cameraSwitchLock) {
      this._cameraSwitchLock = true
      this.cameraManager.toggle()
    }
    if (!this.inputMap['c']) this._cameraSwitchLock = false
  }

  _updateSubsystems(deltaTime) {
    if (this.spawnerSystem) this.spawnerSystem.update(deltaTime, this.player.mesh.position)
    if (this.currentRound) this.currentRound.update(deltaTime)
    this.weaponSystem.update(deltaTime)
    if (this.xraySystem) this.xraySystem.update()
    this.collisionSystem.update(deltaTime)
  }

  _updateEnemiesAndCulling() {
    const ACTIVE_DIST_SQ = SPAWN.ACTIVE_DISTANCE * SPAWN.ACTIVE_DISTANCE
    const playerPos = this.player.mesh.position
    let activatedEnemies = 0
    let culledEnemies = 0

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy || !enemy.enemy) { this.enemies.splice(i, 1); continue }

      const dx = playerPos.x - enemy.enemy.position.x
      const dz = playerPos.z - enemy.enemy.position.z

      if (dx * dx + dz * dz > ACTIVE_DIST_SQ) {
        if (enemy.enemy.isVisible) enemy.enemy.isVisible = false
        culledEnemies++
      } else {
        if (!enemy.enemy.isVisible) enemy.enemy.isVisible = true
        enemy.update(this.player.mesh, this.projectiles, this.enemies, this.enemyCallbacks)
        activatedEnemies++
      }
    }
    return { activatedEnemies, culledEnemies }
  }

  _updateProjectiles(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      if (!p.mesh) { this.projectiles.splice(i, 1); continue }
      const alive = p.update(deltaTime)
      if (!alive) { p.dispose(); this.projectiles.splice(i, 1) }
    }
  }

  _updateUI(activatedEnemies, culledEnemies) {
    this.uiSystem.updateLife(this.playerEntry.life, this.playerEntry.maxLife)
    this.uiSystem.updateGears(this.score)
    this.uiSystem.updateKills(this.kills)
    this.uiSystem.updateStats(this.playerEntry)
    this.uiSystem.updateXP(this.xpSystem.progressToNext, this.xpSystem.level)

    if (this.activeAbilitySystem) {
      this.uiSystem.updateActiveAbility(
        this.activeAbilitySystem.getCooldownPercent(),
        this.activeAbilitySystem.equippedItem,
        this.activeAbilitySystem.cooldownRemaining
      )
    }

    const rounds = this.zone.getRounds()
    const currentIndex = rounds.indexOf(this.currentRound) + 1
    const remaining = this.currentRound.state === 'waiting'
      ? this.currentRound.remainingBefore
      : this.currentRound.remainingTime
    this.uiSystem.updateRound(currentIndex, rounds.length, this.currentRound.state, remaining)

    if (this.performanceMonitor) this.performanceMonitor.update(activatedEnemies, culledEnemies)
  }

  // ─────────────────────────────────────────────
  /**
   * Affiche l'écran de sélection d'item (loot de round)
   * @param {number} level  niveau actuel du joueur
   */
  _showLootScreen(level, options = {}) {
    if (this.lootUI.isVisible) return // déjà ouvert
    const { startNextRoundAfterPick = false } = options

    this._isGamePausedForLoot = true
    const occupiedSlots = this.buildSystem.getOccupiedSlots()
    const pool = this.lootSystem.generatePool(3, this.playerEntry.luck, occupiedSlots)
    this.lootUI.show(pool, this.buildSystem, (item) => {
      // console.log(`[MainScene] Item choisi: ${item.name}`)
      this._isGamePausedForLoot = false
      if (startNextRoundAfterPick) {
        this._startNextRound()
      }
    }, level)
  }

  /**
   * Lance le prochain round avec difficulté croissante.
   * Round N : 5+N*2 SimpleEnemy, + HeavyEnemy si N≥2, + MetroidEnemy si N≥3
   */
  _startNextRound() {
    this.roundOrchestrator.startNextRound(this.currentZoneNodeId)
    this.currentRound = this.roundOrchestrator.currentRound
    this._roundNumber = this.roundOrchestrator.roundNumber
  }
}