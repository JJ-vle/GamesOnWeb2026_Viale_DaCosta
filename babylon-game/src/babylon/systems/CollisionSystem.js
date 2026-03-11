// src/babylon/systems/CollisionSystem.js
export class CollisionSystem {
    constructor() {
      this.player = null
      this.enemies = []
      this.projectiles = []
      this.enemyDamageCooldown = new Map()
      this.DAMAGE_COOLDOWN = 1.0

      /** Référence au BuildSystem pour déclencher les procs */
      this.buildSystem = null
    }
  
    registerPlayer(player) { this.player = player }
    registerEnemy(enemy) { this.enemies.push(enemy) }
    registerProjectile(projectile) { this.projectiles.push(projectile) }
  
    removeEnemy(enemy) {
      this.enemies = this.enemies.filter(e => e !== enemy)
      this.enemyDamageCooldown.delete(enemy)
    }
  
    removeProjectile(projectile) {
      this.projectiles = this.projectiles.filter(p => p !== projectile)
    }
  
    update(deltaTime) {
      if (!this.player) return

      this.currentTime = (this.currentTime || 0) + deltaTime
  
      // ── Projectiles (mise à jour) ──
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) { this.projectiles.splice(i, 1); continue }
        const isAlive = proj.update(deltaTime)
        if (!isAlive) { proj.dispose(); this.projectiles.splice(i, 1); continue }
      }
  
      // ── Projectiles vs Enemies ──
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) continue
  
        for (let enemy of this.enemies) {
          if (!enemy.enemy) continue
          if (proj.mesh.intersectsMesh(enemy.enemy, false)) {
            enemy.takeDamage(proj.damage || 1)
            // Déclencher les procs d'items du joueur
            this._triggerProcs(enemy)
            proj.dispose()
            this.projectiles.splice(i, 1)
            break
          }
        }
      }
  
      // ── Player vs Enemies (contact) ──
      for (let enemy of this.enemies) {
        if (!enemy.enemy) continue
        if (enemy.enemy.intersectsMesh(this.player.mesh, false)) {
          const lastDamageTime = this.enemyDamageCooldown.get(enemy) || -Infinity
          if (this.currentTime - lastDamageTime >= this.DAMAGE_COOLDOWN) {
            enemy.contact?.()
            this.enemyDamageCooldown.set(enemy, this.currentTime)
          }
        }
      }

      // ── Effets de statut (brûlure, ralentissement) ──
      this._tickStatusEffects(deltaTime)
    }

    /** Déclenche les procs des items équipés */
    _triggerProcs(enemy) {
      if (!this.buildSystem) return
      const procItems = this.buildSystem.getProcItems()
      for (const item of procItems) {
        if (item.rollProc(this.player.luck)) {
          item.onProc(enemy, this.player)
        }
      }
    }

    /** Tick des effets de statut sur les ennemis */
    _tickStatusEffects(deltaTime) {
      for (const enemy of this.enemies) {
        if (!enemy.enemy) continue

        // ── Brûlure (DoT) ──
        if (enemy._burnTimer > 0) {
          enemy._burnTimer -= deltaTime
          enemy._burnDpsAccum = (enemy._burnDpsAccum || 0) + (enemy._burnDps || 1) * deltaTime
          if (enemy._burnDpsAccum >= 1) {
            const dmg = Math.floor(enemy._burnDpsAccum)
            enemy._burnDpsAccum -= dmg
            if (enemy.life > 0) enemy.takeDamage(dmg)
          }
          if (enemy.material?.emissiveColor) {
            enemy.material.emissiveColor.r = 0.5;
            enemy.material.emissiveColor.g = 0.15;
            enemy.material.emissiveColor.b = 0;
          }
          if (enemy._burnTimer <= 0) {
            enemy._burnTimer = 0
            enemy._burnDpsAccum = 0
            if (enemy.material?.emissiveColor) {
              enemy.material.emissiveColor.r = 0;
              enemy.material.emissiveColor.g = 0;
              enemy.material.emissiveColor.b = 0;
            }
          }
        }

        // ── Ralentissement / gel ──
        if ((enemy._slowTimer || 0) > 0) {
          enemy._slowTimer -= deltaTime
          if (enemy._slowTimer <= 0) {
            enemy._slowTimer = 0
            enemy._slowFactor = 1
          }
          // Teinte bleue
          if (enemy.material?.emissiveColor && enemy._burnTimer <= 0) {
            enemy.material.emissiveColor.r = 0;
            enemy.material.emissiveColor.g = 0.1;
            enemy.material.emissiveColor.b = 0.5;
          }
        }
      }
    }
}