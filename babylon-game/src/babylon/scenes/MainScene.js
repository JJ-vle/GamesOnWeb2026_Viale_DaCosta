// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { SpawnerSystem } from '../systems/SpawnerSystem'
import { Zone } from '../Zone'
import { Round } from '../Round'
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
import { NavGrid } from "../systems/NavGrid"
import { XRaySystem } from "../systems/XRaySystem"


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
    this._isGamePausedForLoot = false
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

    // --- Initialiser le système de Zone et Round ---
    this.zone = new Zone(this.scene);

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
      }

      this.enemies.push(enemy)
      this.collisionSystem.registerEnemy(enemy)
      if (this.currentRound) this.currentRound.notifyEnemySpawned()
    }

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
    // Sol avec matériau sombre style cyberpunk
    const ground = MeshBuilder.CreateGround('ground', { width: 130, height: 110, subdivisions: 1 }, this.scene)
    ground.checkCollisions = true

    const groundMat = new StandardMaterial('groundMat', this.scene)
    groundMat.diffuseColor = new Color3(0.8, 0.8, 0.8)
    groundMat.specularColor = new Color3(0, 0, 0)
    ground.material = groundMat

    // --- Chargement de la map ---
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
      // console.log("Map map_1.glb chargée avec succès !");
    }).catch(err => {
      console.error("Erreur de chargement de map_1.glb", err);
    });

    this._createBorders(130, 110)
    this._createObstacles()

    // ── NavGrid A* ── Construire la grille de navigation APRÈS les obstacles
    this.navGrid = new NavGrid(130, 110, 2)
    this.navGrid.buildFromScene(this.scene)

    this.playerEntry = new Player(this.scene)
    // Pas de Coin pour l'instant (sera remplacé par le système d'engrenages)
    // this.coinEntry = new Coin(...)

    this.scene.clearColor = new Color3(0.1, 0.1, 0.2)

    // Configuration des Callbacks globaux pour les comportements des Boss/Ennemis
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
      if (type === 1) {
        this.inputMap[kbInfo.event.key] = true
      } else if (type === 2) {
        this.inputMap[kbInfo.event.key] = false
      }
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


    // Spawner
    if (this.spawnerSystem) {
      this.spawnerSystem.update(deltaTime, this.player.mesh.position)
    }

    // Round (timer)
    if (this.currentRound) {
      this.currentRound.update(deltaTime)
    }

    // Ennemis
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy || !enemy.enemy) {
        this.enemies.splice(i, 1)
        continue
      }
      enemy.update(this.player.mesh, this.projectiles, this.enemies, this.enemyCallbacks)
    }

    // Arme
    this.weaponSystem.update(deltaTime)


    // Projectiles
    this.projectiles = this.projectiles.filter(p => {
      const alive = p.update(deltaTime)
      if (!alive) p.dispose()
      return alive
    })

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