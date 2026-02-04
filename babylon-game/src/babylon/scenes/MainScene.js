// src/babylon/scenes/MainScene.js
import { BaseScene } from './BaseScene'
import { Player } from '../entities/Player'
import { Coin } from '../entities/Coin'
import { Enemy } from '../entities/Enemy'
import {
  Vector3,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  ArcRotateCamera,
  Color3,
  StandardMaterial
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock, Control } from '@babylonjs/gui'

export class MainScene extends BaseScene {
  constructor(engine) {
    super(engine)

    this._createLights()
    this._createWorld()
    this._createUI()
    this.player = this.playerEntry.mesh;
    this._createCamera()
    this.verticalVelocity = 0;
    this.score = 0;
    this.coin = this.coinEntry.mesh;
    this.enemy = this.enemyEntry.mesh;

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

  _createCamera() {
    this.camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, this.player, this.scene);
    this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true)
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

  }
}
