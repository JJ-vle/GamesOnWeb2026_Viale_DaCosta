// src/babylon/weapons/PistolWeapon.js
import { Vector3 } from "@babylonjs/core"
import { Weapon } from "./Weapon"
import { PistolProjectile } from "./PistolProjectile"

export class PistolWeapon extends Weapon {
  constructor(scene, player) {
    super(scene, player)

    this.baseCooldown = 0.25   // secondes entre chaque tir (base)
    this.cooldown = 0.25
    this._cooldownTimer = 0
    this.baseDamage = 2        // dégâts de base avant strength

    this.isFiring = true;
  }

  update(deltaTime, direction) {
    // Cadence modulée par player.speedshot
    const effectiveCooldown = this.baseCooldown / (this.player.speedshot || 1)

    this._cooldownTimer -= deltaTime
    if (this._cooldownTimer < 0) this._cooldownTimer = 0

    if (!this.isFiring || this._cooldownTimer > 0) return

    this._shoot(direction)
    this._cooldownTimer = effectiveCooldown
  }

  _shoot(direction) {
    if (!direction) return

    // Croix vectorielle pour trouver la "droite" du personnage
    const rightVec = Vector3.Cross(Vector3.Up(), direction).normalize()
    
    // Position du point de tir : 0.8 en face et 0.4 vers la droite (l'arme)
    const offset = direction.scale(0.8).addInPlace(rightVec.scale(0.4))
    const start = this.player.mesh.position.add(offset)
    
    // On lève un tout petit peu le tir pour être au niveau de l'arme (torse = y+0.1)
    start.y += 0.1

    // Dégâts effectifs = base × player.strength
    const effectiveDamage = this.baseDamage * (this.player.strength || 1)

    const projectile = new PistolProjectile(
      this.scene,
      start,
      direction,
      {
        speed: 40,
        size: 0.3, // taille réduite pour correspondre au nouveau scale du joueur
        damage: effectiveDamage,
        player: this.player,  // référence pour les procs d'items
      }
    )

    this._notifyProjectile(projectile)
  }
}
