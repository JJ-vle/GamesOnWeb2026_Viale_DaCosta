// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { Coin } from '../entities/Coin'
import { EnemySpawner } from '../entities/EnemySpawner'
import { Zone } from '../Zone'
import { Round } from '../Round'
import { SimpleEnemy } from '../entities/enemies/SimpleEnemy'
import {
  Vector3, FreeCamera,
  HemisphericLight, MeshBuilder,
  ArcRotateCamera, Color3,
  StandardMaterial, Camera
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle } from '@babylonjs/gui'
import { PistolWeapon } from "../entities/weapons/PistolWeapon"
import { LaserWeapon } from "../entities/weapons/LaserWeapon"
import { WeaponSystem } from "../systems/WeaponSystem"
import { CollisionSystem } from "../systems/CollisionSystem"
import { UISystem } from "../systems/UISystem"


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

    // Créer les spawners et les ajouter à la zone
    const spawner1 = new EnemySpawner(this.scene, new Vector3(25, 1, 25), 4);
    const spawner2 = new EnemySpawner(this.scene, new Vector3(-25, 1, -25), 4);
    const spawner3 = new EnemySpawner(this.scene, new Vector3(25, 1, -25), 4);
    
    this.zone.addSpawner(spawner1);
    this.zone.addSpawner(spawner2);
    this.zone.addSpawner(spawner3);

    // Configurer les callbacks pour tous les spawners
    [spawner1, spawner2, spawner3].forEach(spawner => {
      spawner.onEnemySpawned = (enemy) => {
        enemy.contact = () => {
          this.playerEntry.takeDamage(5);
          this.score = 0;
          this.scoreText.text = "Score: " + this.score;
        };
        this.enemies.push(enemy);
        this.collisionSystem.registerEnemy(enemy);
      };
    });

    // Créer un round et l'ajouter à la zone
    this.currentRound = new Round(this.scene, this.zone);
    this.currentRound.addMob({ type: SimpleEnemy, count: 5, spawnInterval: 2 });
    this.zone.addRound(this.currentRound);

    // When round ends, remove remaining enemies
    this.currentRound.onRoundEnd = () => {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!enemy) continue;
        // destroy enemy mesh and trigger its onDeath
        try { enemy.destroy(); } catch (e) { /* ignore */ }
        // remove from collision system
        try { this.collisionSystem.removeEnemy(enemy); } catch (e) { /* ignore */ }
        // remove from local list
        this.enemies.splice(i, 1);
      }
    };

    // Démarrer le premier round
    this.currentRound.startRound();

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.playerEntry,
      this.weapon,
      this.collisionSystem
    );

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

  /*
  _createUI() {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Score text (top)
    const textBlock = new TextBlock();
    textBlock.text = "Score: 0";
    textBlock.color = "white";
    textBlock.fontSize = 24;
    textBlock.top = "-45%";
    advancedTexture.addControl(textBlock);
    this.scoreText = textBlock;

    // Round info (top-left)
    const roundText = new TextBlock();
    roundText.text = "Round: 0/0";
    roundText.color = "white";
    roundText.fontSize = 20;
    roundText.leftInPixels = 10;
    roundText.topInPixels = 10;
    roundText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    roundText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(roundText);
    this.roundText = roundText;

    // Timer (top-right)
    const roundTimer = new TextBlock();
    roundTimer.text = "00:00";
    roundTimer.color = "white";
    roundTimer.fontSize = 22;
    roundTimer.topInPixels = 10;
    roundTimer.left = "45%";
    roundTimer.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    roundTimer.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(roundTimer);
    this.roundTimer = roundTimer;

    // Life bar background (bottom left)
    const lifeBarBg = new Rectangle();
    lifeBarBg.width = "300px";
    lifeBarBg.height = "40px";
    lifeBarBg.top = "-30px";
    lifeBarBg.leftInPixels = 30;
    lifeBarBg.bottomInPixels = 60;
    lifeBarBg.background = "black";
    lifeBarBg.thickness = 4;
    lifeBarBg.borderColor = "white";
    lifeBarBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    lifeBarBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(lifeBarBg);

    // Life bar fill
    const lifeBarFill = new Rectangle();
    lifeBarFill.width = "100%";
    lifeBarFill.height = "100%";
    lifeBarFill.background = "green";
    lifeBarFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    lifeBarBg.addControl(lifeBarFill);
    this.lifeBarFill = lifeBarFill;

    // Debug Text
    const debugText = new TextBlock();
    debugText.text = "Debug";
    debugText.color = "yellow";
    debugText.fontSize = 18;
    debugText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    debugText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    debugText.left = "10px";
    debugText.top = "50px";
    advancedTexture.addControl(debugText);
    this.debugText = debugText;
  }
    */



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

    // mouvement en vue iso
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000 // ms to secondes

    // update spawners de la zone
    const spawners = this.zone.getSpawners();
    spawners.forEach(spawner => spawner.update(deltaTime));

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

    this.uiSystem.updateRound(
      currentIndex,
      rounds.length,
      this.currentRound.state,
      this.currentRound.remainingTime || this.currentRound.remainingBefore
    );

  }
}