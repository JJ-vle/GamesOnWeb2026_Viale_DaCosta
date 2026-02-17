// src/babylon/systems/CollisionSystem.js
export class CollisionSystem {
    constructor() {
      this.player = null
      this.enemies = []
      this.projectiles = []
      this.enemyDamageCooldown = new Map() // Track cooldown per enemy
      this.DAMAGE_COOLDOWN = 1.0 // 1 second cooldown between damage
    }
  
    // enregistrement des objets
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
  
      // --- Atualizar projectiles ---
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) {
          this.projectiles.splice(i, 1)
          continue
        }
        
        const isAlive = proj.update(deltaTime)
        if (!isAlive) {
          proj.dispose()
          this.projectiles.splice(i, 1)
          continue
        }
      }
  
      // --- Projectiles vs Enemies ---
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i]
        if (!proj.mesh) continue
  
        for (let enemy of this.enemies) {
          if (!enemy.enemy) continue
          if (proj.mesh.intersectsMesh(enemy.enemy, false)) {
            // dégâts
            enemy.takeDamage(proj.damage || 1)
            // destruction du projectile
            proj.dispose()
            this.projectiles.splice(i, 1)
            break
          }
          /*if (proj.mesh.intersectsMesh(enemy.enemy, false)) {

            const projectileType = proj.constructor.name
            const damage = proj.damage || 1
            const targetName = enemy.enemy.name || "Enemy"

            console.log("=== COLLISION ===")
            console.log("Projectile:", projectileType)
            console.log("Dégâts:", damage)
            console.log("Cible:", targetName)
            console.log("Vie avant:", enemy.life)

            enemy.takeDamage(damage)

            console.log("Vie après:", enemy.life)
            console.log("=================")

            proj.dispose()
            this.projectiles.splice(i, 1)
            break
          }*/

        }
      }
  
      // --- Player vs Enemies ---
      for (let enemy of this.enemies) {
        if (!enemy.enemy) continue
        if (enemy.enemy.intersectsMesh(this.player.mesh, false)) {
          // Check if cooldown has expired
          const lastDamageTime = this.enemyDamageCooldown.get(enemy) || -Infinity
          const timeSinceLastDamage = this.currentTime - lastDamageTime
          
          if (timeSinceLastDamage >= this.DAMAGE_COOLDOWN) {
            enemy.contact?.() // callback si touche le joueur
            this.enemyDamageCooldown.set(enemy, this.currentTime) // Reset cooldown
          }
        }
      }
  }
  
}
  