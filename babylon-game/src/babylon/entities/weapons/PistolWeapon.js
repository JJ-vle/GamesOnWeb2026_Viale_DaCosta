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
    // Cadence modulée par player.speedshot puis réduite par cooldownReduction
    let effectiveCooldown = this.baseCooldown / (this.player.speedshot || 1)
    const cdr = this.player.cooldownReduction || 0
    if (cdr > 0) effectiveCooldown *= (1 - Math.min(cdr, 0.8))

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

    // Dégâts effectifs = base × strength × damageMultiplier
    const effectiveDamage = this.baseDamage * (this.player.strength || 1) * (this.player.damageMultiplier || 1)

    // ── Projectiles supplémentaires ──
    const additional = this.player.additionalProjectiles || 0
    const multiplier = this.player.projectileMultiplier || 1

    // 1) Tir central (toujours présent)
    this._spawnProjectile(start.clone(), direction, effectiveDamage)

    // 2) Défragmenteur: projectiles supplémentaires en éventail (cône)
    if (additional > 0) {
      const spreadAngle = Math.PI / 12 // 15° entre chaque
      for (let i = 1; i <= additional; i++) {
        // Alterner +angle / -angle
        for (const sign of [-1, 1]) {
          if (i * 2 - (sign === 1 ? 0 : 1) > additional) break
          const angle = sign * i * spreadAngle
          const cos = Math.cos(angle)
          const sin = Math.sin(angle)
          const rotDir = new Vector3(
            direction.x * cos + direction.z * sin,
            direction.y,
            -direction.x * sin + direction.z * cos
          ).normalize()
          this._spawnProjectile(start.clone(), rotDir, effectiveDamage)
        }
      }
    }

    // 3) Ace: double chaque projectile en parallèle (même direction, offset latéral)
    if (multiplier > 1) {
      const extraCopies = Math.round(multiplier) - 1
      const lateralOffset = 0.4 // écart latéral entre les projectiles parallèles
      for (let c = 0; c < extraCopies; c++) {
        const offsetDir = rightVec.scale(-lateralOffset * (c + 1))
        // Dupliquer le tir central
        this._spawnProjectile(start.clone().addInPlace(offsetDir), direction, effectiveDamage)
        // Dupliquer aussi les tirs en éventail du Défragmenteur
        if (additional > 0) {
          const spreadAngle = Math.PI / 12
          for (let i = 1; i <= additional; i++) {
            for (const sign of [-1, 1]) {
              if (i * 2 - (sign === 1 ? 0 : 1) > additional) break
              const angle = sign * i * spreadAngle
              const cos = Math.cos(angle)
              const sin = Math.sin(angle)
              const rotDir = new Vector3(
                direction.x * cos + direction.z * sin,
                direction.y,
                -direction.x * sin + direction.z * cos
              ).normalize()
              this._spawnProjectile(start.clone().addInPlace(offsetDir.clone()), rotDir, effectiveDamage)
            }
          }
        }
      }
    }
  }

  /** Crée un projectile unique et notifie le système */
  _spawnProjectile(start, direction, damage) {
    const projectile = new PistolProjectile(
      this.scene,
      start,
      direction,
      {
        speed: 40,
        size: 0.3,
        damage: damage,
        player: this.player,
      }
    )
    this._notifyProjectile(projectile)
  }
}
