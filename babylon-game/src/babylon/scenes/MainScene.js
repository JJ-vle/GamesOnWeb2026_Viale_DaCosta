// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { SpawnerSystem } from '../systems/SpawnerSystem'
import { Zone } from '../Zone'
import { Round } from '../Round'
import { generateZoneTree } from '../ZoneTree'
import { EnemyProjectile } from '../entities/weapons/EnemyProjectile.js'
import { VoltStriker } from '../entities/enemies/new/VoltStriker.js'
import { NeonVector } from '../entities/enemies/new/NeonVector.js'
import { BastionRed } from '../entities/enemies/new/BastionRed.js'

import { DashTrigger } from '../entities/enemies/new/DashTrigger.js'
import { BoltSentry } from '../entities/enemies/new/BoltSentry.js'
import { SludgePhrax } from '../entities/enemies/new/SludgePhrax.js'
import { BlastZone } from '../entities/enemies/new/BlastZone.js'
import { IronBulwark } from '../entities/enemies/new/IronBulwark.js'
import { DroneSwarm } from '../entities/enemies/new/DroneSwarm.js'
import { ToxicWasp } from '../entities/enemies/new/ToxicWasp.js'
import { PyroCaster } from '../entities/enemies/new/PyroCaster.js'
import { JammerUnit } from '../entities/enemies/new/JammerUnit.js'
import { NitroHusk } from '../entities/enemies/new/NitroHusk.js'

import { EchoWraith } from '../entities/enemies/new/EchoWraith.js'
import { TitanRam } from '../entities/enemies/new/TitanRam.js'
import { LinkCommander } from '../entities/enemies/new/LinkCommander.js'
import { CoreSpawner } from '../entities/enemies/new/CoreSpawner.js'
import {
  Vector3, HemisphericLight, MeshBuilder,
  Color3, StandardMaterial, SceneLoader
} from '@babylonjs/core'
import "@babylonjs/loaders"
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
import { NavGrid } from "../systems/NavGrid"
import { XRaySystem } from "../systems/XRaySystem"
import { PerformanceMonitor } from "../systems/PerformanceMonitor"
import { LoadingScreen } from "../systems/LoadingScreen"
import { PerceptionSystem } from "../systems/PerceptionSystem"


export class MainScene extends BaseScene {
  constructor(engine) {
    super(engine)

    this._createLights()
    this._createWorld()

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
      const tree = generateZoneTree({ minDepth: 7, maxDepth: 8 })
      this.zone.tree = tree
      console.log('[ZoneTree] Generated tree depth', tree.depth)
      console.log('[ZoneTree] Nodes:', JSON.stringify(tree.nodes, null, 2))
      // Afficher la représentation DOT pour usage externe (Graphviz, mermaid, etc.)
      console.log('[ZoneTree] DOT:\n' + tree.dot)
      // Préparer l'overlay carte (sera rendu à la demande)
      this._createMapOverlay()
    } catch (e) {
      console.error('[ZoneTree] Error generating tree', e)
    }

    // Créer le système de spawn aléatoire
    this.spawnerSystem = new SpawnerSystem(this.scene, 130, 110, 5);

    // Le joueur spawn en 0, 0, 0. On veut protéger un carré autour de lui (ex: de -20 à +20)
    // (Vector3 point_1, Vector3 point_2)
    this.spawnerSystem.addExclusionZone(new Vector3(-6.3, 0, 8.1), new Vector3(-16.1, 0, 22.0));

    this.spawnerSystem.addExclusionZone(new Vector3(8.1, 0, 6.6), new Vector3(31.2, 0, 30.4));
    this.spawnerSystem.addExclusionZone(new Vector3(-20.9, 0, 7.0), new Vector3(-31.7, 0, 31.0));
    this.spawnerSystem.addExclusionZone(new Vector3(8.3, 0, -16.6), new Vector3(16.6, 0, -32.2));
    this.spawnerSystem.addExclusionZone(new Vector3(20.9, 0, -23.6), new Vector3(31.4, 0, -31.9));

    this.spawnerSystem.addInclusionZone(new Vector3(-45.1, 0, 41.3), new Vector3(44.5, 0, -46.6)
    )

    this.zone.addSpawner(this.spawnerSystem);

    // Callback ennemi spawné
    this.spawnerSystem.onEnemySpawned = (enemy) => {
      // Injecter la NavGrid A* pour le pathfinding intelligent
      if (enemy.setNavGrid) {
        enemy.setNavGrid(this.navGrid)
      }

      // ── OPTIMISATION: Injecter le PerceptionSystem partagé ──
      if (enemy.setPerceptionSystem) {
        enemy.setPerceptionSystem(this.sharedPerceptionSystem)
      }

      // Appliquer une réduction de taille de 50%
      if (enemy.enemy) {
        enemy.enemy.scaling = new Vector3(0.5, 0.5, 0.5);
        if (enemy.enemy.ellipsoid) {
          enemy.enemy.ellipsoid = enemy.enemy.ellipsoid.scale(0.5);
        }
      }

      // Dégâts au contact selon le type
      const dmg = enemy.contactDamage || 1
      enemy.contact = () => {
        this.playerEntry.takeDamage(dmg)
        if (this.uiSystem) {
          this.uiSystem.updateLife(this.playerEntry.life, this.playerEntry.maxLife)
        }
      }
      // Callback mort ennemi → notifier le round
      enemy.onDeath = () => {
        this.kills++
        // XP et pièces : utilisation obligatoire des propriétés de l'ennemi
        const xpGained = enemy.xpValue
        this.xpSystem.addXP(xpGained)
        const coinsGained = enemy.coinValue
        this.score += coinsGained
        this.uiSystem?.updateKills(this.kills)
        this.uiSystem?.updateGears(this.score)
        this.uiSystem?.updateXP(this.xpSystem.progressToNext, this.xpSystem.level)
        if (this.currentRound) this.currentRound.notifyEnemyKilled()
        const idx = this.enemies.indexOf(enemy)
        if (idx !== -1) this.enemies.splice(idx, 1)
        this.collisionSystem.removeEnemy(enemy)
        
        // ── OPTIMISATION: Recycler l'ennemi au pool ──
        if (this.spawnerSystem) this.spawnerSystem.recycleEnemy(enemy)
      }

      this.enemies.push(enemy)
      this.collisionSystem.registerEnemy(enemy)
      if (this.currentRound) this.currentRound.notifyEnemySpawned()
    }

    // ── OPTIMISATION: Initialiser le Performance Monitor ──
    this.performanceMonitor = new PerformanceMonitor(this.scene, this.spawnerSystem)

    // Créer un round et l'ajouter à la zone
    this._roundNumber = 1
    this.currentRound = new Round(this.scene, this.zone, { timelimit: 120, timebefore: 5 })
    this.currentRound.addMob({ type: VoltStriker, count: 5, spawnInterval: 2 })
    this.zone.addRound(this.currentRound)

    // Purge des ennemis restants et affichage du loot en fin de round
    this.currentRound.onRoundEnd = () => {
      // Stopper le spawner immédiatement
      if (this.spawnerSystem) this.spawnerSystem.stop()

      // Purger les survivants
      const purged = this.enemies.length
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        if (!enemy) continue
        try { enemy.destroy() } catch (e) { /* ignore */ }
        try { this.collisionSystem.removeEnemy(enemy) } catch (e) { /* ignore */ }
        this.enemies.splice(i, 1)
      }
      // console.log(`[MainScene] Fin du round — ${purged} ennemis purgés`)
      // Afficher le loot de fin de round (garanti) après un court délai.
      setTimeout(() => {
        this._showLootScreen(this.xpSystem.level, { startNextRoundAfterPick: true })
      }, 800)
    }

    // Démarrer le premier round
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

    this._setupDebugCommands()
  }

  // ─────────────────────────────────────────────
  _createBorders(width, height) {
    const wallHeight = 10
    const thickness = 1

    const borders = [
      { name: "wall_N", w: width, h: wallHeight, d: thickness, pos: new Vector3(0, wallHeight / 2, height / 2) },
      { name: "wall_S", w: width, h: wallHeight, d: thickness, pos: new Vector3(0, wallHeight / 2, -height / 2) },
      { name: "wall_E", w: thickness, h: wallHeight, d: height, pos: new Vector3(width / 2, wallHeight / 2, 0) },
      { name: "wall_W", w: thickness, h: wallHeight, d: height, pos: new Vector3(-width / 2, wallHeight / 2, 0) },
    ]

    borders.forEach(b => {
      const wall = MeshBuilder.CreateBox(b.name, { width: b.w, height: b.h, depth: b.d }, this.scene)
      wall.position = b.pos
      wall.isVisible = false
      wall.checkCollisions = true
    })
  }

  _createObstacles() {
    const wallHeight = 10
    const thickness = 1

    // Coin caché en bas à droite de la map - entouré de murs
    const hideSpotX = 60  // Décalé vers la droite
    const hideSpotY = -50 // Décalé vers le bas
    const hideSpotSize = 20 // Taille du coin

    const obstacles = []

    obstacles.forEach(o => {
      const wall = MeshBuilder.CreateBox(o.name, { width: o.w, height: o.h, depth: o.d }, this.scene)
      wall.position = o.pos
      wall.checkCollisions = true
      wall.isPickable = true  // Important pour raycast

      // Matériau visible pour debug
      const obstacleMat = new StandardMaterial(`mat_${o.name}`, this.scene)
      obstacleMat.diffuseColor = new Color3(1, 0.2, 0.2) // Rouge
      obstacleMat.alpha = 0.3 // Semi-transparent
      wall.material = obstacleMat
    })
  }

  _createLights() {
    const ambient = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene)
    ambient.intensity = 0.6
    ambient.diffuse = new Color3(0.8, 0.8, 1.0)
    ambient.groundColor = new Color3(0.2, 0.2, 0.3)
  }

  _createWorld() {
    // ── LOADING SCREEN ──
    this.loadingScreen = new LoadingScreen();
    this.loadingScreen.setProgress(5, 'Loading assets...');

    // Sol avec matériau sombre style cyberpunk
    const ground = MeshBuilder.CreateGround('ground', { width: 130, height: 110, subdivisions: 1 }, this.scene)
    ground.checkCollisions = true

    const groundMat = new StandardMaterial('groundMat', this.scene)
    groundMat.diffuseColor = new Color3(0.8, 0.8, 0.8)
    groundMat.specularColor = new Color3(0, 0, 0)
    ground.material = groundMat

    this.loadingScreen.setProgress(15, 'Creating ground...');

    this.loadingScreen.setProgress(25, 'Creating borders...');
    this._createBorders(130, 110)
    
    this.loadingScreen.setProgress(40, 'Creating obstacles...');
    this._createObstacles()

    // ── NavGrid A* ── Créer la grille (vide pour l'instant, sera peuplée après chargement de la map)
    this.navGrid = new NavGrid(130, 110, 1)
    // Build initial avec les obstacles synchrones (murs invisibles, etc.)
    this.navGrid.buildFromScene(this.scene)

    // --- Chargement de la map GLB (ASYNC) ---
    const mapLoadStart = performance.now();
    SceneLoader.ImportMeshAsync("", "/assets/models/", "map_1.glb", this.scene).then((result) => {
      result.meshes.forEach(m => {
        // Activer le mode alpha sur les matériaux
        if (m.material) {
          m.material.transparencyMode = 1;
          if (m.material.albedoTexture) m.material.useAlphaFromAlbedoTexture = true;
          if (m.material.diffuseTexture) m.material.useAlphaFromDiffuseTexture = true;
          m.material.backFaceCulling = false;
        }
        // Mettre en place les collisions si nécessaire
        m.checkCollisions = true;
      });
      const mapLoadTime = Math.round(performance.now() - mapLoadStart);
      console.log(`[Loading] Map loaded in ${mapLoadTime}ms`);
      this.loadingScreen.setProgress(55, `Map assets loaded (${mapLoadTime}ms)`);

      // ══════════════════════════════════════════════════════════════
      // ⚡ REBUILD NAVGRID APRÈS LE CHARGEMENT DE LA MAP GLB
      // Maintenant que les meshes de la map existent, on reconstruit
      // la grille A* pour que les ennemis contournent les vrais murs
      // ══════════════════════════════════════════════════════════════
      console.log('[NavGrid] Rebuilding NavGrid after map loaded...');
      this.navGrid.buildFromScene(this.scene);

      // Réinjecter la NavGrid mise à jour dans tous les ennemis déjà spawnés
      for (const enemy of this.enemies) {
        if (enemy.setNavGrid) {
          enemy.setNavGrid(this.navGrid);
        }
      }
      console.log(`[NavGrid] NavGrid rebuilt and injected into ${this.enemies.length} existing enemies`);
      
      // ── Cacher le loading screen une fois que tout est prêt ──
      setTimeout(() => {
        this.loadingScreen.setProgress(100, 'Ready!');
        this.loadingScreen.hide(500);
      }, 800);
    }).catch(err => {
      console.error("Erreur de chargement de map_1.glb", err);
      this.loadingScreen.setProgress(55, 'Map load skipped (error)');
      
      // ── Cacher le loading screen même en cas d'erreur ──
      setTimeout(() => {
        this.loadingScreen.setProgress(100, 'Ready!');
        this.loadingScreen.hide(500);
      }, 800);
    });
    this.loadingScreen.setProgress(60, 'Loading map...');

    this.loadingScreen.setProgress(80, 'Initializing player...');
    this.playerEntry = new Player(this.scene)
    // Pas de Coin pour l'instant (sera remplacé par le système d'engrenages)
    // this.coinEntry = new Coin(...)

    this.scene.clearColor = new Color3(0.1, 0.1, 0.2)

    // Configuration des Callbacks globaux pour les comportements des Boss/Ennemis
    this.loadingScreen.setProgress(85, 'Setting up callbacks...');
    this.enemyCallbacks = {
      onShoot: (pos, dir, type) => {
        // Crée un projectile rouge qui voyage vite
        // type: FIRE ou normal
        // console.log("Enemy shoots!", pos, dir, type)
      },
      onExplode: (pos, radius) => {
        // Applique les dégats en zone au joueur
        // console.log("BOOM", pos, radius)
      },
      onSpawn: (type, pos) => {
        // Créer l'ennemi en question
        // console.log("Spawn mob", type, pos)
        const v = new VoltStriker(this.scene)
        if (v.setNavGrid) v.setNavGrid(this.navGrid)
        if (v.enemy) {
          v.enemy.position = pos
          // Appliquer une réduction de taille de 50%
          v.enemy.scaling = new Vector3(0.5, 0.5, 0.5);
          if (v.enemy.ellipsoid) {
            v.enemy.ellipsoid = v.enemy.ellipsoid.scale(0.5);
          }
        }
        this.enemies.push(v)
        v.onDeath = () => this.kills++
      },
      onJam: (isJammed) => {
        // Bloque le heal
        if (this.activeAbilitySystem) {
          // Simplification, on pourrait vider le CDR pour simuler le blocage
        }
      }
    }
    this._setupInputs()
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

  // Crée l'overlay DOM pour afficher la carte du graphe (préparée mais cachée)
  _createMapOverlay() {
    if (typeof document === 'undefined') return
    // wrapper
    const overlay = document.createElement('div')
    overlay.id = 'zone-map-overlay'
    Object.assign(overlay.style, {
      position: 'fixed', left: '0', top: '0', right: '0', bottom: '0',
      background: 'rgba(0,0,0,0.6)', display: 'none', zIndex: 9999,
      justifyContent: 'center', alignItems: 'center'
    })
    overlay.style.display = 'none'
    overlay.style.display = 'none'
    overlay.style.pointerEvents = 'auto'

    // container centered
    const container = document.createElement('div')
    container.id = 'zone-map-container'
    Object.assign(container.style, {
      width: '820px', height: '640px', background: 'rgba(10,10,20,0.95)', borderRadius: '8px', padding: '12px',
      boxSizing: 'border-box', position: 'relative', overflow: 'hidden'
    })

    // svg for lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.position = 'absolute'
    svg.style.left = '0'
    svg.style.top = '0'

    // nodes layer
    const nodesLayer = document.createElement('div')
    nodesLayer.style.position = 'absolute'
    nodesLayer.style.left = '0'
    nodesLayer.style.top = '0'
    nodesLayer.style.width = '100%'
    nodesLayer.style.height = '100%'

    // close hint
    const hint = document.createElement('div')
    hint.innerText = 'Appuyez sur M pour fermer la carte'
    Object.assign(hint.style, { position: 'absolute', right: '12px', top: '8px', color: '#ddd', fontSize: '12px' })

    container.appendChild(svg)
    container.appendChild(nodesLayer)
    container.appendChild(hint)
    overlay.appendChild(container)
    document.body.appendChild(overlay)

    this._mapOverlay = overlay
    this._mapContainer = container
    this._mapSvg = svg
    this._mapNodesLayer = nodesLayer
    this._mapVisible = false
    this._mapLock = false
  }

  _showMap() {
    if (!this._mapOverlay) this._createMapOverlay()
    if (!this.zone || !this.zone.tree) return
    this._renderMap()
    this._mapOverlay.style.display = 'flex'
    this._mapVisible = true
  }

  _hideMap() {
    if (!this._mapOverlay) return
    this._mapOverlay.style.display = 'none'
    this._mapVisible = false
  }

  _toggleMap() {
    if (this._mapVisible) this._hideMap()
    else this._showMap()
  }

  _renderMap() {
    const tree = this.zone?.tree
    if (!tree) return
    const nodes = tree.nodes || []
    const depth = tree.depth || 7

    // clear layers
    while (this._mapSvg.firstChild) this._mapSvg.removeChild(this._mapSvg.firstChild)
    while (this._mapNodesLayer.firstChild) this._mapNodesLayer.removeChild(this._mapNodesLayer.firstChild)

    const W = 800, H = 600, M = 40 // map inner dims
    // build map area inside container
    const mapArea = { width: W, height: H, margin: M }

    // group nodes by depth
    const byDepth = {}
    nodes.forEach(n => { byDepth[n.depth] = byDepth[n.depth] || []; byDepth[n.depth].push(n) })

    const positions = {}

    // Layout left-to-right: depth increases from left (start) to right (boss)
    for (let d = 1; d <= depth; d++) {
      const list = byDepth[d] || []
      const x = mapArea.margin + (d - 1) / Math.max(1, depth - 1) * (mapArea.width - 2 * mapArea.margin)
      const count = list.length || 1
      for (let i = 0; i < list.length; i++) {
        const y = mapArea.margin + (i + 1) * (mapArea.height - 2 * mapArea.margin) / (count + 1)
        positions[list[i].id] = { x, y }
      }
    }

    // draw lines
    nodes.forEach(n => {
      const from = positions[n.id]
      if (!from) return
      n.next.forEach(tid => {
        const to = positions[tid]
        if (!to) return
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', from.x)
        line.setAttribute('y1', from.y)
        line.setAttribute('x2', to.x)
        line.setAttribute('y2', to.y)
        line.setAttribute('stroke', '#ffffff')
        line.setAttribute('stroke-width', '2')
        this._mapSvg.appendChild(line)
      })
    })

    // node images
    const imgSize = 48
    const typeToFile = t => {
      const key = (t || '').toLowerCase()
      if (key.includes('mini')) return '/assets/zones/zone_miniboss.png'
      if (key.includes('boss')) return '/assets/zones/zone_boss.png'
      if (key.includes('shop')) return '/assets/zones/zone_shop.png'
      if (key.includes('rest')) return '/assets/zones/zone_heal.png'
      if (key.includes('random')) return '/assets/zones/zone_random.png'
      return '/assets/zones/zone_battle.png'
    }

    nodes.forEach(n => {
      const p = positions[n.id]
      if (!p) return
      const el = document.createElement('div')
      el.style.position = 'absolute'
      el.style.left = `${p.x - imgSize / 2}px`
      el.style.top = `${p.y - imgSize / 2}px`
      el.style.width = `${imgSize}px`
      el.style.height = `${imgSize}px`
      el.style.textAlign = 'center'
      el.title = `${n.type} (#${n.id}) ${n.corrupted ? '[CORRUPTED]' : ''}`

      const img = document.createElement('img')
      // show player icon for root node
      if (n.id === tree.root) img.src = '/assets/zones/zone_player.png'
      else img.src = typeToFile(n.type)
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.filter = n.corrupted ? 'hue-rotate(-20deg) saturate(1.2)' : 'none'

      el.appendChild(img)
      // effect label under node if corrupted
      if (n.effect && n.effect !== 'none') {
        const label = document.createElement('div')
        label.innerText = n.effect
        Object.assign(label.style, { color: '#ff6666', fontSize: '11px', textAlign: 'center', marginTop: '2px', width: '160px', position: 'absolute', left: '-56px' })
        el.appendChild(label)
      }
      this._mapNodesLayer.appendChild(el)
    })
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

    // Tick la NavGrid (cache management)
    if (this.navGrid) this.navGrid.tick()

    // Pause globale pendant le menu de loot: on fige le gameplay.
    if (this._isGamePausedForLoot) {
      return
    }

    // ── PAUSE: Si le jeu est en pause, skip tous les updates ──
    if (this._isGamePaused) {
      return
    }

    // Ouvre le loot de level-up uniquement si le round courant est encore actif.
    // Si le round est déjà fini, on garde en attente et on affichera plus tard.
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

    // Joueur
    this.playerEntry.update(this.inputMap)

    // Capacité active
    if (this.activeAbilitySystem) {
      this.activeAbilitySystem.update(deltaTime, this.inputMap)
    }

    // Toggle caméra (C)
    if (this.inputMap['c'] && !this._cameraSwitchLock) {
      this._cameraSwitchLock = true
      this.cameraManager.toggle()
    }
    if (!this.inputMap['c']) {
      this._cameraSwitchLock = false
    }

    // Toggle map (M)
    if (this.inputMap['m'] && !this._mapLock) {
      this._mapLock = true
      this._toggleMap()
    }
    if (!this.inputMap['m']) {
      this._mapLock = false
    }


    // Spawner
    if (this.spawnerSystem) {
      this.spawnerSystem.update(deltaTime, this.player.mesh.position)
    }

    // Round (timer)
    if (this.currentRound) {
      this.currentRound.update(deltaTime)
    }

    // ── OPTIMISATION: Distance-based & Culling Updates ──
    // Ennemis: met à jour seulement ceux suffisamment proches
    // ⚠️ AGRESSIF: Beaucoup d'ennemis culled = beaucoup meilleure performance
    const ACTIVE_DISTANCE = 50;   // Units - distance max pour update complète (pathfinding + FSM)
    const PASSIVE_DISTANCE = 80;  // Units - distance max pour update cosmétique seule
    
    let activatedEnemies = 0;
    let culledEnemies = 0;

    const playerPos = this.player.mesh.position;
    const ACTIVE_DIST_SQ = ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    const PASSIVE_DIST_SQ = PASSIVE_DISTANCE * PASSIVE_DISTANCE;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy || !enemy.enemy) {
        this.enemies.splice(i, 1)
        continue
      }
      
      // ── OPTIMISATION: Utiliser distanceSquared (pas de sqrt) ──
      const dx = playerPos.x - enemy.enemy.position.x;
      const dz = playerPos.z - enemy.enemy.position.z;
      const distSq = dx * dx + dz * dz;
      
      if (distSq > PASSIVE_DIST_SQ) {
        // Très loin: COMPLÈTEMENT invisible et skip update
        if (enemy.enemy.isVisible) {
          enemy.enemy.isVisible = false;
        }
        culledEnemies++;
      } else if (distSq > ACTIVE_DIST_SQ) {
        // Loin: visible MAIS figé (aucun update = performance max)
        if (!enemy.enemy.isVisible) {
          enemy.enemy.isVisible = true;
        }
      } else {
        // Proche: update COMPLET (FSM + pathfinding + collision)
        if (!enemy.enemy.isVisible) {
          enemy.enemy.isVisible = true;
        }
        enemy.update(this.player.mesh, this.projectiles, this.enemies, this.enemyCallbacks)
        activatedEnemies++;
      }
    }

    // Arme
    this.weaponSystem.update(deltaTime)


    // Projectiles — mise à jour des positions (collision gérée par CollisionSystem)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      if (!p.mesh) {
        this.projectiles.splice(i, 1)
        continue
      }
      const alive = p.update(deltaTime)
      if (!alive) {
        p.dispose()
        this.projectiles.splice(i, 1)
      }
    }

    // X-Ray (voir le joueur derrière les obstacles)
    if (this.xraySystem) this.xraySystem.update()

    // Collisions
    this.collisionSystem.update(deltaTime)

    // ── UI ──
    this.uiSystem.updateLife(this.playerEntry.life, this.playerEntry.maxLife)
    this.uiSystem.updateGears(this.score)
    this.uiSystem.updateKills(this.kills)
    this.uiSystem.updateStats(this.playerEntry)

    // UI Capacité active
    if (this.activeAbilitySystem) {
      this.uiSystem.updateActiveAbility(
        this.activeAbilitySystem.getCooldownPercent(),
        this.activeAbilitySystem.equippedItem,
        this.activeAbilitySystem.cooldownRemaining
      )
    }

    // ── OPTIMISATION: Mettre à jour le monitoring de performance ──
    if (this.performanceMonitor) {
      this.performanceMonitor.update(activatedEnemies, culledEnemies)
    }

    // UI XP
    this.uiSystem.updateXP(this.xpSystem.progressToNext, this.xpSystem.level)

    // UI Round
    const rounds = this.zone.getRounds()
    const currentIndex = rounds.indexOf(this.currentRound) + 1
    const remaining = this.currentRound.state === 'waiting'
      ? this.currentRound.remainingBefore
      : this.currentRound.remainingTime
    this.uiSystem.updateRound(currentIndex, rounds.length, this.currentRound.state, remaining)

    // Vérifier la mort du joueur → écran Game Over
    if (!this._isGameOver && this.playerEntry && this.playerEntry.life <= 0) {
      this._isGameOver = true
      this._isGamePausedForLoot = true
      // console.log('[MainScene] Joueur mort — Game Over')
      if (this.uiSystem && this.uiSystem.showGameOver) this.uiSystem.showGameOver()
      return
    }
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
    const pool = this.lootSystem.generatePool(3, this.playerEntry.luck)
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
    this._roundNumber++
    const n = this._roundNumber

    const newRound = new Round(this.scene, this.zone, {
      timelimit: 120 + n * 20,
      timebefore: 5,
    })

    // Scaling des mobs selon système de raretés
    const cat1 = [VoltStriker, NeonVector, BastionRed]
    const cat2 = [DashTrigger, BoltSentry, SludgePhrax, BlastZone, IronBulwark, DroneSwarm, ToxicWasp, PyroCaster, JammerUnit, NitroHusk]
    const cat3 = [EchoWraith, TitanRam, LinkCommander, CoreSpawner]

    // Plus on avance, plus on a de mobs (10, 15, 20 ...)
    const totalMobs = 10 + n * 5

    // Fonction helper : Tire aléatoirement K types dans un catalogue
    const pickRandom = (arr, count) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    }

    // Sélection des types d'ennemis pour ce round
    const typesCat1 = pickRandom(cat1, 2)
    const countCat1 = Math.floor(totalMobs * (n >= 2 ? 0.6 : 1.0)) // 70% de cat1

    let typesCat2 = []
    let countCat2 = 0
    if (n >= 2) {
      typesCat2 = pickRandom(cat2, Math.min(2 + Math.floor(n / 3), cat2.length))
      countCat2 = Math.floor(totalMobs * (n >= 4 ? 0.35 : 0.3)) // 25-30% de cat2
    }

    let typesCat3 = []
    let countCat3 = 0
    if (n >= 4) {
      typesCat3 = pickRandom(cat3, 1 + Math.floor(n / 4))
      countCat3 = totalMobs - countCat1 - countCat2 // le reste (5%)
    }

    // Ajout effectif
    // On divise le compte équitablement sur les types sélectionnés
    if (countCat1 > 0) {
      const c = Math.ceil(countCat1 / typesCat1.length)
      typesCat1.forEach(T => newRound.addMob({ type: T, count: c, spawnInterval: 1.5 }))
    }
    if (countCat2 > 0) {
      const c = Math.ceil(countCat2 / typesCat2.length)
      typesCat2.forEach(T => newRound.addMob({ type: T, count: c, spawnInterval: 3.0 }))
    }
    if (countCat3 > 0) {
      const c = Math.ceil(countCat3 / typesCat3.length)
      typesCat3.forEach(T => newRound.addMob({ type: T, count: c, spawnInterval: 6.0 }))
    }

    this.zone.addRound(newRound)

    // Recycler le callback de fin de round
    newRound.onRoundEnd = this.currentRound.onRoundEnd

    this.currentRound = newRound
    this.currentRound.startRound()

    this.uiSystem.showNotification(`⚡ ROUND ${n} — EN AVANT !`, '#ffcc00', 2500)
    const catVisibles = n >= 4 ? 3 : (n >= 2 ? 2 : 1)
    // console.log(`[MainScene] Round ${n} démarré avec ${totalMobs} ennemis (Mix de Cat 1 à ${catVisibles})`)
  }
}