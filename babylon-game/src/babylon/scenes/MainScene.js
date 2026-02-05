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
  StandardMaterial,
  Camera
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

  /*
  _createCamera() {
    this.camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, this.player, this.scene);
    this.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true)
  }
  */

  _createCamera() {
    this._createCameraTPS()
    this._createCameraIso()

    // caméra active au départ
    this.scene.activeCamera = this.tpsCamera
  }


  _createCameraTPS() {
    this.tpsCamera = new ArcRotateCamera(
      "tpsCamera",
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      this.player,
      this.scene
    )
    this.tpsCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true)
  }

  _createCameraIso() {
    const camera = new ArcRotateCamera(
      "isoCamera",
      Math.PI / 4,
      Math.PI / 3,
      20,
      this.player,
      this.scene
    )

    camera.mode = Camera.ORTHOGRAPHIC_CAMERA

    const engine = this.scene.getEngine()
    const ratio = engine.getRenderWidth() / engine.getRenderHeight()

    const size = 15
    const yOffset = 5

    camera.orthoTop = size + yOffset
    camera.orthoBottom = -size + yOffset
    camera.orthoRight = size * ratio
    camera.orthoLeft = -size * ratio

    // verrouillage propre
    camera.lowerRadiusLimit = camera.radius
    camera.upperRadiusLimit = camera.radius
    camera.allowUpsideDown = false

    this.isoCamera = camera
  }


  update() {
    this.playerEntry.update(this.inputMap);
    this.coinEntry.update(this.player);
    this.enemyEntry.update(this.player);

    const isIso = this.scene.activeCamera === this.isoCamera

    if (this.inputMap["c"] && !this._cameraSwitchLock) {
      this._cameraSwitchLock = true

      // détache toujours l'ancienne caméra
      if (this.scene.activeCamera) {
        this.scene.activeCamera.detachControl()
      }

      if (this.scene.activeCamera === this.tpsCamera) {
        this.scene.activeCamera = this.isoCamera
      } else {
        this.scene.activeCamera = this.tpsCamera
        this.tpsCamera.attachControl(
          this.scene.getEngine().getRenderingCanvas(),
          true
        )
      }
    }

    if (this.scene.activeCamera === this.isoCamera) {
      const dir = this._getIsoMovementDirection()
      this.player.moveWithCollisions(dir.scale(0.2))
    }


    if (!this.inputMap["c"]) {
      this._cameraSwitchLock = false
    }
  }

  
  _getIsoMovementDirection() {
    const cam = this.isoCamera

    // directions caméra projetées au sol
    const forward = cam.getForwardRay().direction
    forward.y = 0
    forward.normalize()

    const right = Vector3.Cross(Vector3.Up(), forward)
    right.normalize()

    let move = Vector3.Zero()

    if (this.inputMap["z"]) move.addInPlace(forward)
    if (this.inputMap["s"]) move.subtractInPlace(forward)
    if (this.inputMap["d"]) move.addInPlace(right)
    if (this.inputMap["q"]) move.subtractInPlace(right)

    return move.normalize()
  }


}

