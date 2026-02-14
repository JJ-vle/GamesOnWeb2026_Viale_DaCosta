// src/babylon/systems/CollisionSystem.js
export class CollisionSystem {
    constructor() {
      this.player = null
      this.enemies = []
      this.projectiles = []
    }
  
    // enregistrement des objets
    registerPlayer(player) { this.player = player }
    registerEnemy(enemy) { this.enemies.push(enemy) }
    registerProjectile(projectile) { this.projectiles.push(projectile) }
  
    removeEnemy(enemy) {
      this.enemies = this.enemies.filter(e => e !== enemy)
    }
  
    removeProjectile(projectile) {
      this.projectiles = this.projectiles.filter(p => p !== projectile)
    }
  
    update(deltaTime) {
      if (!this.player) return
  
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
        }
      }
  
      // --- Player vs Enemies ---
      for (let enemy of this.enemies) {
        if (!enemy.enemy) continue
        if (enemy.enemy.intersectsMesh(this.player.mesh, false)) {
          enemy.contact?.() // callback si touche le joueur
        }
      }
  }
  
}
  