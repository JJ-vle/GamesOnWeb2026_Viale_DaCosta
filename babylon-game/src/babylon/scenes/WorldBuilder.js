// src/babylon/scenes/WorldBuilder.js
import {
  Vector3, HemisphericLight, PointLight, GlowLayer, MeshBuilder,
  Color3, StandardMaterial, SceneLoader
} from '@babylonjs/core'
import '@babylonjs/loaders'
import { Player } from '../entities/Player'
import { NavGrid } from '../systems/NavGrid'
import { LoadingScreen } from '../systems/LoadingScreen'

export class WorldBuilder {
  constructor(scene) {
    this.scene = scene
    this.navGrid = null
  }

  createLights() {
    const ambient = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene)
    ambient.intensity = 0.5
    ambient.diffuse = new Color3(0.5, 0.35, 0.7)
    ambient.groundColor = new Color3(0.2, 0.1, 0.4)

    const neonCyan = new PointLight('neonCyan', new Vector3(-30, 10, 30), this.scene)
    neonCyan.diffuse = new Color3(0.0, 1.0, 1.0)
    neonCyan.intensity = 5.0
    neonCyan.range = 120

    const neonPink = new PointLight('neonPink', new Vector3(30, 10, -30), this.scene)
    neonPink.diffuse = new Color3(1.0, 0.0, 1.0)
    neonPink.intensity = 5.0
    neonPink.range = 120

    const neonBlue = new PointLight('neonBlue', new Vector3(0, 15, 0), this.scene)
    neonBlue.diffuse = new Color3(0.2, 0.5, 1.0)
    neonBlue.intensity = 4.0
    neonBlue.range = 150

    const gl = new GlowLayer('neonGlow', this.scene)
    gl.intensity = 0.8
  }

  /**
   * Construit le monde (sol, bordures, obstacles, navGrid, chargement GLB, joueur).
   * @param {{ onMapLoaded?: (navGrid: NavGrid) => void }} options
   * @returns {{ playerEntry: Player, navGrid: NavGrid }}
   */
  build({ onMapLoaded } = {}) {
    const loadingScreen = new LoadingScreen()
    loadingScreen.setProgress(5, 'Loading assets...')

    const ground = MeshBuilder.CreateGround('ground', { width: 130, height: 110, subdivisions: 1 }, this.scene)
    ground.checkCollisions = true
    const groundMat = new StandardMaterial('groundMat', this.scene)
    groundMat.diffuseColor = new Color3(0.15, 0.15, 0.2)
    groundMat.specularColor = new Color3(0.2, 0.2, 0.4)
    ground.material = groundMat
    loadingScreen.setProgress(15, 'Creating ground...')

    loadingScreen.setProgress(25, 'Creating borders...')
    this._createBorders(130, 110)

    loadingScreen.setProgress(40, 'Creating obstacles...')
    this._createObstacles()

    this.navGrid = new NavGrid(130, 110, 1)
    this.navGrid.buildFromScene(this.scene)

    const mapLoadStart = performance.now()
    SceneLoader.ImportMeshAsync('', '/assets/models/', 'map_1.glb', this.scene).then((result) => {
      result.meshes.forEach(m => {
        if (m.material) {
          m.material.transparencyMode = 1
          if (m.material.albedoTexture) m.material.useAlphaFromAlbedoTexture = true
          if (m.material.diffuseTexture) m.material.useAlphaFromDiffuseTexture = true
          m.material.backFaceCulling = true
          m.material.freeze()
        }
        m.checkCollisions = true
        m.freezeWorldMatrix()
      })
      const mapLoadTime = Math.round(performance.now() - mapLoadStart)
      console.log(`[Loading] Map loaded in ${mapLoadTime}ms`)
      loadingScreen.setProgress(55, `Map assets loaded (${mapLoadTime}ms)`)

      console.log('[NavGrid] Rebuilding NavGrid after map loaded...')
      this.navGrid.buildFromScene(this.scene)
      onMapLoaded?.(this.navGrid)

      setTimeout(() => { loadingScreen.setProgress(100, 'Ready!'); loadingScreen.hide(500) }, 800)
    }).catch(err => {
      console.error('Erreur de chargement de map_1.glb', err)
      loadingScreen.setProgress(55, 'Map load skipped (error)')
      setTimeout(() => { loadingScreen.setProgress(100, 'Ready!'); loadingScreen.hide(500) }, 800)
    })
    loadingScreen.setProgress(60, 'Loading map...')

    loadingScreen.setProgress(80, 'Initializing player...')
    const playerEntry = new Player(this.scene)
    this.scene.clearColor = new Color3(0.02, 0.02, 0.05)
    loadingScreen.setProgress(85, 'Setting up callbacks...')

    return { playerEntry, navGrid: this.navGrid }
  }

  _createBorders(width, height) {
    const wallHeight = 10
    const thickness = 1
    const borders = [
      { name: 'wall_N', w: width,     h: wallHeight, d: thickness, pos: new Vector3(0,          wallHeight / 2,  height / 2) },
      { name: 'wall_S', w: width,     h: wallHeight, d: thickness, pos: new Vector3(0,          wallHeight / 2, -height / 2) },
      { name: 'wall_E', w: thickness, h: wallHeight, d: height,    pos: new Vector3( width / 2, wallHeight / 2,  0) },
      { name: 'wall_W', w: thickness, h: wallHeight, d: height,    pos: new Vector3(-width / 2, wallHeight / 2,  0) },
    ]
    borders.forEach(b => {
      const wall = MeshBuilder.CreateBox(b.name, { width: b.w, height: b.h, depth: b.d }, this.scene)
      wall.position = b.pos
      wall.isVisible = false
      wall.checkCollisions = true
    })
  }

  _createObstacles() {
    const obstacles = []
    obstacles.forEach(o => {
      const wall = MeshBuilder.CreateBox(o.name, { width: o.w, height: o.h, depth: o.d }, this.scene)
      wall.position = o.pos
      wall.checkCollisions = true
      wall.isPickable = true
      const mat = new StandardMaterial(`mat_${o.name}`, this.scene)
      mat.diffuseColor = new Color3(1, 0.2, 0.2)
      mat.alpha = 0.3
      wall.material = mat
    })
  }
}
