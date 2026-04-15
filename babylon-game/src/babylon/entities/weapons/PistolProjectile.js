// src/babylon/entities/weapons/PistolProjectile.js
import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    TrailMesh
  } from "@babylonjs/core"
  
import { Projectile } from "./Projectile"

// ── OPTIMISATION: Matériau partagé par tous les projectiles pistolet ──
let _sharedPistolMat = null

export class PistolProjectile extends Projectile {
  constructor(scene, position, direction, options = {}) {
    super(scene, position, direction)

    // stats
    this.speed = options.speed ?? 18
    this.damage = options.damage ?? 2
    this.lifeTime = options.lifeTime ?? 2
    this.player = options.player ?? null

    // mesh
    this.mesh = MeshBuilder.CreateBox(
      "pistolBullet",
      { width: 0.15, height: 0.15, depth: 0.8 },
      scene
    )

    // â”€â”€ OPTIMISATION: RÃ©utiliser le mÃªme matÃ©riau â”€â”€
    if (!_sharedPistolMat || _sharedPistolMat.getScene() !== scene || !scene.materials.includes(_sharedPistolMat)) {
      _sharedPistolMat = new StandardMaterial("pistolBulletMat_shared", scene)
      _sharedPistolMat.diffuseColor = new Color3(1, 0.8, 0) // Jaune
      _sharedPistolMat.emissiveColor = new Color3(1, 0.5, 0) // Coeur incandescent orange
      _sharedPistolMat.disableLighting = true
    }
    this.mesh.material = _sharedPistolMat

    this.mesh.position.copyFrom(position)
    this.mesh.lookAt(this.mesh.position.add(this.direction))
    
    // Force la mise à jour des matrices "zero" et absolues AVANT de créer le Trail
    this.mesh.computeWorldMatrix(true);

    // Ajout d'une traînée lumineuse pour accentuer l'effet
    // Réduction de la longueur (length: 5 au lieu de 20 pour être très bref)
    // this.trail = new TrailMesh("pistolTrail", this.mesh, scene, 0.08, 4, true)
    // this.trail.start()
    
    // const trailMat = new StandardMaterial("trailMat", scene)
    // trailMat.emissiveColor = new Color3(1, 0.4, 0)
    // trailMat.disableLighting = true
    // trailMat.alpha = 0.5
    // this.trail.material = trailMat
  }
}
