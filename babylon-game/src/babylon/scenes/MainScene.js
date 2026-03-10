// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { SpawnerSystem } from '../systems/SpawnerSystem'
import { Zone } from '../Zone'
import { Round } from '../Round'
import { SimpleEnemy } from '../entities/enemies/SimpleEnemy'
import { HeavyEnemy } from '../entities/enemies/HeavyEnemy'
import { MetroidEnemy } from '../entities/enemies/MetroidEnemy'
import {
  Vector3, HemisphericLight,
  MeshBuilder, Color3,
  StandardMaterial, DirectionalLight,
} from '@babylonjs/core'
import { PistolWeapon } from "../entities/weapons/PistolWeapon"
import { WeaponSystem } from "../systems/WeaponSystem"
import { CollisionSystem } from "../systems/CollisionSystem"
import { UISystem } from "../systems/UISystem"
import { ActiveAbilitySystem } from "../systems/ActiveAbilitySystem"


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

    // Arme : pistolet par défaut
    this.weapon = new PistolWeapon(this.scene, this.playerEntry)
    this.weapon.onProjectileCreated = (projectile) => {
      this.projectiles.push(projectile)
    }

    this.enemies = []

    // ── Zone & Round ──
    this.zone = new Zone(this.scene)
    this.spawnerSystem = new SpawnerSystem(this.scene, 130, 110, 5)
    this.zone.addSpawner(this.spawnerSystem)

    // Callback ennemi spawné
    this.spawnerSystem.onEnemySpawned = (enemy) => {
      // Dégâts au contact selon le type
      const dmg = enemy instanceof HeavyEnemy ? 2 : 1
      enemy.contact = () => {
        this.playerEntry.takeDamage(dmg)
        if (this.uiSystem) {
          this.uiSystem.updateLife(this.playerEntry.life, this.playerEntry.maxLife)
        }
      }
      // Callback mort ennemi → notifier le round
      enemy.onDeath = () => {
        this.kills++
        this.score += enemy instanceof HeavyEnemy ? 3 : 1
        this.uiSystem?.updateKills(this.kills)
        this.uiSystem?.updateGears(this.score)
        // Notification au round pour la condition "tous morts"
        if (this.currentRound) this.currentRound.notifyEnemyKilled()
        // Retirer de la liste locale
        const idx = this.enemies.indexOf(enemy)
        if (idx !== -1) this.enemies.splice(idx, 1)
        this.collisionSystem.removeEnemy(enemy)
      }

      this.enemies.push(enemy)
      this.collisionSystem.registerEnemy(enemy)
      if (this.currentRound) this.currentRound.notifyEnemySpawned()
    }

    // ── Round de base ──
    // Round 1 : 5 SimpleEnemy + 2 HeavyEnemy + 2 MetroidEnemy, timer 60s
    this.currentRound = new Round(this.scene, this.zone, { timelimit: 60, timebefore: 5 })
    this.currentRound.addMob({ type: SimpleEnemy, count: 5, spawnInterval: 2 })
    this.zone.addRound(this.currentRound)

    // Victoire round
    this.currentRound.onVictory = () => {
      this.uiSystem.showNotification('⚡ VAGUE TERMINÉE !', '#00ff88', 3000)
      console.log('[MainScene] Round terminé ! Victoire.')
    }

    // Fin de round → purger les ennemis restants
    this.currentRound.onRoundEnd = () => {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        if (!enemy) continue
        try { enemy.destroy() } catch (e) { /* ignore */ }
        try { this.collisionSystem.removeEnemy(enemy) } catch (e) { /* ignore */ }
        this.enemies.splice(i, 1)
      }
    }

    this.currentRound.startRound()

    // ── WeaponSystem ──
    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.playerEntry,
      this.weapon,
      this.collisionSystem
    )

    this.collisionSystem.registerPlayer(this.playerEntry)

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

    this.scene.collisionsEnabled = true
  }

  // ─────────────────────────────────────────────
  _createBorders(width, height) {
    const wallHeight = 10
    const thickness = 1

    const borders = [
      { name: "wall_N", w: width,     h: wallHeight, d: thickness, pos: new Vector3(0, wallHeight / 2, height / 2) },
      { name: "wall_S", w: width,     h: wallHeight, d: thickness, pos: new Vector3(0, wallHeight / 2, -height / 2) },
      { name: "wall_E", w: thickness, h: wallHeight, d: height,    pos: new Vector3(width / 2, wallHeight / 2, 0) },
      { name: "wall_W", w: thickness, h: wallHeight, d: height,    pos: new Vector3(-width / 2, wallHeight / 2, 0) },
    ]

    borders.forEach(b => {
      const wall = MeshBuilder.CreateBox(b.name, { width: b.w, height: b.h, depth: b.d }, this.scene)
      wall.position = b.pos
      wall.isVisible = false
      wall.checkCollisions = true
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
    groundMat.diffuseColor = new Color3(0.05, 0.05, 0.12)
    groundMat.specularColor = new Color3(0, 0, 0)
    ground.material = groundMat

    this._createBorders(130, 110)

    this.playerEntry = new Player(this.scene)
    // Pas de Coin pour l'instant (sera remplacé par le système d'engrenages)
    // this.coinEntry = new Coin(...)

    this.scene.clearColor = new Color3(0.04, 0.04, 0.1)

    this._setupInputs()
  }

  _setupInputs() {
    this.inputMap = {}
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const type = kbInfo.type
      if (type === 1) {
        this.inputMap[kbInfo.event.key] = true
      } else if (type === 2) {
        this.inputMap[kbInfo.event.key] = false
      }
    })
  }

  // ─────────────────────────────────────────────
  update() {
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000

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
      enemy.update(this.player.mesh, this.projectiles)
    }

    // Arme
    this.weaponSystem.update(deltaTime)

    // Projectiles
    this.projectiles = this.projectiles.filter(p => {
      const alive = p.update(deltaTime)
      if (!alive) p.dispose()
      return alive
    })

    // Collisions
    this.collisionSystem.update(deltaTime)

    // ── UI ──
    this.uiSystem.updateLife(this.playerEntry.life, this.playerEntry.maxLife)
    this.uiSystem.updateGears(this.score)
    this.uiSystem.updateKills(this.kills)

    // UI Capacité active
    if (this.activeAbilitySystem) {
      this.uiSystem.updateActiveAbility(
        this.activeAbilitySystem.getCooldownPercent(),
        this.activeAbilitySystem.equippedItem,
        this.activeAbilitySystem.cooldownRemaining
      )
    }

    // UI Round
    const rounds = this.zone.getRounds()
    const currentIndex = rounds.indexOf(this.currentRound) + 1
    const remaining = this.currentRound.state === 'waiting'
      ? this.currentRound.remainingBefore
      : this.currentRound.remainingTime
    this.uiSystem.updateRound(currentIndex, rounds.length, this.currentRound.state, remaining)
  }
}