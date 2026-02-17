// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { Coin } from '../entities/Coin'
import { Enemy } from '../entities/Enemy'
import { EnemySpawner } from '../entities/EnemySpawner'
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


export class MainScene extends BaseScene {
  constructor(engine) {
    super(engine)

    this._createLights()
    this._createWorld()
    this._createUI()
    //this.player = this.playerEntry.mesh;
    this.player = this.playerEntry;
    this.cameraManager = new CameraManager(this.scene, this.player.mesh)
    this.verticalVelocity = 0;
    this.score = 0;
    this.coin = this.coinEntry.mesh;
    //this.enemy = this.enemyEntry.mesh;
    this.projectiles = []

    this.collisionSystem = new CollisionSystem()

    this.weapon = new PistolWeapon(this.scene, this.playerEntry)
    //this.weapon = new LaserWeapon(this.scene, this.playerEntry)
    this.weapon.onProjectileCreated = (projectile) => {
      this.projectiles.push(projectile)
    }

    this.enemies = []

    // spawn en haut à droite du sol (sol = 60x60)
    this.spawner = new EnemySpawner(
      this.scene,
      new Vector3(25, 1, 25), // haut droite
      10 // toutes les 10 secondes
    )

    this.spawner.onEnemySpawned = (enemy) => {

      enemy.contact = () => {
        this.playerEntry.takeDamage(5);
        this.score = 0
        this.scoreText.text = "Score: " + this.score
      }

      this.enemies.push(enemy)
      this.collisionSystem.registerEnemy(enemy)
    }

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.playerEntry,
      this.weapon,
      this.collisionSystem
    )

    this.collisionSystem.registerPlayer(this.playerEntry)
    //this.collisionSystem.registerEnemy(this.enemyEntry)

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
      this.scoreText.text = "Score: " + this.score;
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

    // update spawner
    this.spawner.update(deltaTime)

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

    // --- Update life bar ---
    const lifePercent = this.playerEntry.life / this.playerEntry.maxLife;
    this.lifeBarFill.width = (lifePercent * 100) + "%";

    // Change color based on health
    if (lifePercent > 0.5) {
      this.lifeBarFill.background = "green";
    } else if (lifePercent > 0.2) {
      this.lifeBarFill.background = "orange";
    } else {
      this.lifeBarFill.background = "red";
    }
  }
}