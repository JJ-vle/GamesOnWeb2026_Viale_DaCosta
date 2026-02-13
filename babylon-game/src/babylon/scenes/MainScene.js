// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { CameraManager } from "../cameras/CameraManager"
import { Player } from '../entities/Player'
import { Coin } from '../entities/Coin'
import { Enemy } from '../entities/Enemy'
import {
  Vector3, FreeCamera,
  HemisphericLight, MeshBuilder,
  ArcRotateCamera, Color3,
  StandardMaterial, Camera
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock, Control } from '@babylonjs/gui'
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
    this.player = this.playerEntry.mesh;
    this.cameraManager = new CameraManager(this.scene, this.player)
    this.verticalVelocity = 0;
    this.score = 0;
    this.coin = this.coinEntry.mesh;
    this.enemy = this.enemyEntry.mesh;
        
    this.collisionSystem = new CollisionSystem()

    this.weapon = new PistolWeapon(this.scene, this.playerEntry)
    //this.weapon = new LaserWeapon(this.scene, this.playerEntry)

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.playerEntry,
      this.weapon,
      this.collisionSystem
    )

    this.collisionSystem.registerPlayer(this.playerEntry)
    this.collisionSystem.registerEnemy(this.enemyEntry)

    this.scene.getEngine().onResizeObservable.add(() => {
      if (this.scene.activeCamera === this.isoCamera) {
        this._updateIsoFrustum()
      }
    })

  }

  _createLights() {
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)
    light.intensity = 0.7
  }

  _createWorld() {
    // Sol
    MeshBuilder.CreateGround('myGround', { width: 60, height: 60 }, this.scene)
    this.verticalVelocity = 0;

    this.playerEntry = new Player(this.scene);
    this.coinEntry = new Coin(this.scene, () => {
      // Cette fonction sera exécutée quand la pièce est touchée
      this.score++;
      this.scoreText.text = "Score: " + this.score;
    });
    this.enemyEntry = new Enemy(this.scene, () => {
      // Cette fonction sera exécutée quand la pièce est touchée
      this.score = 0;
      this.scoreText.text = "Score: " + this.score;
    });

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
    const textBlock = new TextBlock();
    textBlock.text = "Score: 0";
    textBlock.color = "white";
    textBlock.fontSize = 24;
    textBlock.top = "-45%";
    advancedTexture.addControl(textBlock);
    this.scoreText = textBlock;

  }

  update() {
    this.playerEntry.update(this.inputMap);
    this.coinEntry.update(this.player);
    this.enemyEntry.update(this.player);

    // toggle caméra
    if (this.inputMap["c"] && !this._cameraSwitchLock) {
      this._cameraSwitchLock = true;
      this.cameraManager.toggle();
    }

    if (!this.inputMap["c"]) {
      this._cameraSwitchLock = false;
    }

    // mouvement en vue iso
    if (this.cameraManager.isIso()) {
      const dir = this._getIsoMovementDirection();
      this.player.moveWithCollisions(dir.scale(0.2));
    }

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000 // ms to secondes
    this.weaponSystem.update(deltaTime)

    // --- collisions ---
    this.collisionSystem.update()

  }
  
  _getIsoMovementDirection() {
    const camera = this.scene.activeCamera
    if (!camera) return Vector3.Zero()
  
    // direction caméra -> joueur
    let forward = this.player.position.subtract(camera.position)
    forward.y = 0
    forward.normalize()
  
    // droite écran (perpendiculaire)
    let right = Vector3.Cross(forward, Vector3.Up()).normalize()
  
    let move = Vector3.Zero()
  
    if (this.inputMap["z"]) move.addInPlace(forward)
    if (this.inputMap["s"]) move.addInPlace(forward.scale(-1))
    if (this.inputMap["d"]) move.addInPlace(right.scale(-1))
    if (this.inputMap["q"]) move.addInPlace(right)
  
    if (move.lengthSquared() > 0) {
      move.normalize()
    }
  
    return move
  }
  
  

}