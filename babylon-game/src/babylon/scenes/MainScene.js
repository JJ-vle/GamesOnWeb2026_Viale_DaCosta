// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { Coin } from '../entities/Coin'
import { SpawnerSystem } from '../systems/SpawnerSystem'
import { Zone } from '../Zone'
import { Round } from '../Round'
import { SimpleEnemy } from '../entities/enemies/SimpleEnemy'
import {
  Vector3, FreeCamera, HemisphericLight, MeshBuilder,
  ArcRotateCamera, Color3, StandardMaterial, Camera
} from '@babylonjs/core'
import { PistolWeapon } from "../entities/weapons/PistolWeapon"
import { LaserWeapon } from "../entities/weapons/LaserWeapon"
import { WeaponSystem } from "../systems/WeaponSystem"
import { CollisionSystem } from "../systems/CollisionSystem"
import { UISystem } from "../systems/UISystem"

// secondary / activable items
import { GrenadeActivable } from "../entities/weapons/GrenadeActivable"


export class MainScene extends BaseScene {
  constructor(engine) {
    super(engine)

    this._createLights()
    this._createWorld()
    //this._createUI()
    this.uiSystem = new UISystem(this.scene);

    this.player = this.playerEntry;
    this.cameraManager = new CameraManager(this.scene, this.player.mesh);
    this.verticalVelocity = 0;
    this.score = 0;
    this.coin = this.coinEntry.mesh;
    this.projectiles = [];

    this.collisionSystem = new CollisionSystem();

    this.weapon = new PistolWeapon(this.scene, this.playerEntry);
    this.weapon.onProjectileCreated = (projectile) => {
      this.projectiles.push(projectile);
    };

    this.enemies = [];

    // --- Initialiser le système de Zone et Round ---
    this.zone = new Zone(this.scene);
    this.currentRoundIndex = 0;               // track which round is active

    // Créer le système de spawn aléatoire
    this.spawnerSystem = new SpawnerSystem(this.scene, 130, 110, 5);
    
    this.zone.addSpawner(this.spawnerSystem);

    // Configurer le callback pour les ennemis spawned
    this.spawnerSystem.onEnemySpawned = (enemy) => {
      enemy.contact = () => {
        this.playerEntry.takeDamage(5);
        this.score = 0;
        if (this.uiSystem && typeof this.uiSystem.updateScore === 'function') {
          this.uiSystem.updateScore(this.score);
        }
      };
      this.enemies.push(enemy);
      this.collisionSystem.registerEnemy(enemy);
    };

    // Construire la liste des rounds puis ajouter à la zone
    const round1 = new Round(this.scene, this.zone);
    round1.addMob({ type: SimpleEnemy, count: 5, spawnInterval: 2 });
    this.zone.addRound(round1);

    const round2 = new Round(this.scene, this.zone);
    round2.addMob({ type: SimpleEnemy, count: 13, spawnInterval: 4 });
    this.zone.addRound(round2);

    // Référence vers le round actif
    this.currentRound = this.zone.getRounds()[this.currentRoundIndex];

    // gestionnaire commun de fin de round (avance vers le suivant)
    this._handleRoundEnd = () => {
      // purge des ennemis restants
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!enemy) continue;
        try { enemy.destroy(); } catch (e) { /* ignore */ }
        try { this.collisionSystem.removeEnemy(enemy); } catch (e) { /* ignore */ }
        this.enemies.splice(i, 1);
      }

      const rounds = this.zone.getRounds();
      if (this.currentRoundIndex + 1 < rounds.length) {
        // passer au round suivant
        this.currentRoundIndex++;
        this.currentRound = rounds[this.currentRoundIndex];
        this.currentRound.onRoundEnd = this._handleRoundEnd;
        this.currentRound.startRound();
      } else {
        console.log('Tous les rounds sont terminés.');
        // TODO: gérer la fin de partie (score final, etc.)
      }
    };

    // lier le callback et démarrer
    this.currentRound.onRoundEnd = this._handleRoundEnd;
    this.currentRound.startRound();

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.playerEntry,
      this.weapon,
      this.collisionSystem
    );

    // secondary activable weapon (grenade for now)
    // secondary activable (grenade for now, could be heal, etc.)
    this.secondaryActivable = new GrenadeActivable(this.scene, this.playerEntry, this.collisionSystem, {
      cooldown: 10.0,
      explosionRadius: 6,
      explosionDamage: 15,
      projectileOptions: {
        speed: 20,
        initialY: 10,
        gravity: -25,
        size: 0.4
      }
    });
    this.secondaryActivable.onActivated = (proj) => {
      // same behaviour as weapon: keep track of projectiles if any
      this.projectiles.push(proj);
    };

    this.collisionSystem.registerPlayer(this.playerEntry);

    this.scene.getEngine().onResizeObservable.add(() => {
      if (this.scene.activeCamera === this.isoCamera) {
        this._updateIsoFrustum()
      }
    })
    this.scene.collisionsEnabled = true;

  }

  _createBorders(width, height) {
    const wallHeight = 10;
    const thickness = 1;

    const borders = [
      { name: "wall_N", w: width, h: wallHeight, d: thickness, pos: new Vector3(0, wallHeight / 2, height / 2) },
      { name: "wall_S", w: width, h: wallHeight, d: thickness, pos: new Vector3(0, wallHeight / 2, -height / 2) },
      { name: "wall_E", w: thickness, h: wallHeight, d: height, pos: new Vector3(width / 2, wallHeight / 2, 0) },
      { name: "wall_W", w: thickness, h: wallHeight, d: height, pos: new Vector3(-width / 2, wallHeight / 2, 0) },
    ];

    borders.forEach(b => {
      const wall = MeshBuilder.CreateBox(b.name, { width: b.w, height: b.h, depth: b.d }, this.scene);
      wall.position = b.pos;
      wall.isVisible = false; // Rendre invisible
      wall.checkCollisions = true;
    });
  }

  _createLights() {
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)
    light.intensity = 0.7
  }

  _createWorld() {
    // Sol
    const ground = MeshBuilder.CreateGround('myGround', { width: 130, height: 110 }, this.scene)
    ground.checkCollisions = true;

    this._createBorders(130, 110);
    this.verticalVelocity = 0;

    this.playerEntry = new Player(this.scene);
    this.coinEntry = new Coin(this.scene, () => {
      // Cette fonction sera exécutée quand la pièce est touchée
      this.score++;
      this.uiSystem.updateScore(this.score);
    });

    /*
    this.enemyEntry = new Enemy(this.scene, () => {
      // Cette fonction sera exécutée quand la pièce est touchée
      this.score = 0;
      this.scoreText.text = "Score: " + this.score;
    });*/

    this.scene.clearColor = new Color3(0.1, 0.1, 0.2)

    this._setupInputs()
  }

  _setupInputs() {
    this.inputMap = {}
    this._spaceLock = false // prevent repeated activations while holding space

    this.scene.onKeyboardObservable.add((kbInfo) => {
      const type = kbInfo.type
      // 1 = KeyDown, 2 = KeyUp
      if (type === 1) { // KeyDown
        this.inputMap[kbInfo.event.key] = true
      } else if (type === 2) { // KeyUp
        this.inputMap[kbInfo.event.key] = false
      }
    })
  }

  update() {
    if (this.debugText && this.playerEntry) {
      const p = this.playerEntry;
      const idleName = p.idleAnim ? p.idleAnim.name : "None";
      const runName = p.runAnim ? p.runAnim.name : "None";
      this.debugText.text = `State: ${p.currentAnim}\nIdle: ${idleName}\nRun: ${runName}`;
    }

    this.playerEntry.update(this.inputMap);
    this.coinEntry.update(this.player.mesh);
    //this.enemyEntry.update(this.player);

    // toggle caméra
    if (this.inputMap["c"] && !this._cameraSwitchLock) {
      this._cameraSwitchLock = true;
      this.cameraManager.toggle();
    }

    if (!this.inputMap["c"]) {
      this._cameraSwitchLock = false;
    }

    // --- secondary activable launch (espace)
    if (this.inputMap[" "] && !this._spaceLock) {
      const dir = this.weaponSystem._getMouseDirection()
      if (dir && this.secondaryActivable) {
        this.secondaryActivable.activate(dir)
      }
      this._spaceLock = true
    }
    if (!this.inputMap[" "]) {
      this._spaceLock = false
    }

    // mouvement en vue iso
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000 // ms to secondes

    // update spawner system
    if (this.spawnerSystem && typeof this.spawnerSystem.update === 'function') {
      this.spawnerSystem.update(deltaTime, this.player.mesh.position);
    }

    // update round timers
    if (this.currentRound && typeof this.currentRound.update === 'function') {
      this.currentRound.update(deltaTime);
    }

    // update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]

      if (!enemy.enemy) {
        this.enemies.splice(i, 1)
        continue
      }

      enemy.update(this.player.mesh, this.projectiles)
    }


    this.weaponSystem.update(deltaTime)

    // update secondary cooldown
    if (this.secondaryActivable) {
      this.secondaryActivable.update(deltaTime);
      // send cooldown info to UI when available
      if (this.uiSystem && typeof this.uiSystem.updateCooldown === 'function') {
        this.uiSystem.updateCooldown(this.secondaryActivable._cooldownTimer, this.secondaryActivable.cooldown);
      }
    }

    this.projectiles = this.projectiles.filter(p => {
      const alive = p.update(deltaTime)
      if (!alive) p.dispose()
      return alive
    })

    // --- collisions ---
    this.collisionSystem.update(deltaTime)

    // --- Update round UI ---
    this.uiSystem.updateScore(this.score);
    this.uiSystem.updateLife(this.playerEntry.life, this.playerEntry.maxLife);

    const rounds = this.zone.getRounds();
    const currentIndex = rounds.indexOf(this.currentRound) + 1;

    // pass the correct remaining time depending on the round state
    const remaining = this.currentRound.state === 'waiting'
      ? this.currentRound.remainingBefore
      : this.currentRound.remainingTime;

    this.uiSystem.updateRound(
      currentIndex,
      rounds.length,
      this.currentRound.state,
      remaining
    );

  }
}