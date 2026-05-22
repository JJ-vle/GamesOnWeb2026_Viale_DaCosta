// src/babylon/scenes/EnemySpawnHandler.js
import { Vector3, Color3 } from '@babylonjs/core'
import { VoltStriker } from '../entities/enemies/new/VoltStriker.js'
import { LeviathanTurret } from '../entities/enemies/new/LeviathanTurret.js'
import { BossJammerUnit } from '../entities/enemies/new/BossJammerUnit.js'
import { NeonVector } from '../entities/enemies/new/NeonVector.js'
import { BastionRed } from '../entities/enemies/new/BastionRed.js'
import { DashTrigger } from '../entities/enemies/new/DashTrigger.js'
import { BoltSentry } from '../entities/enemies/new/BoltSentry.js'
import { NitroHusk } from '../entities/enemies/new/NitroHusk.js'
import { SludgePhrax } from '../entities/enemies/new/SludgePhrax.js'
import { SPAWN } from './GameConfig'

// Pool d'ennemis pouvant être "glitchés" par THE ARCHITECT
const GLITCH_POOL = [VoltStriker, NeonVector, BastionRed, DashTrigger, BoltSentry, NitroHusk, SludgePhrax]

export function clearEnemies(enemies, collisionSystem) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]
    if (!enemy) continue
    enemy.onDeath = null
    try { enemy.destroy() } catch (e) {}
    try { collisionSystem.removeEnemy(enemy) } catch (e) {}
    enemies.splice(i, 1)
  }
}

export function applyEnemyScaling(enemy) {
  if (!enemy.enemy) return
  enemy.enemy.scaling = new Vector3(SPAWN.ENEMY_SCALE, SPAWN.ENEMY_SCALE, SPAWN.ENEMY_SCALE)
  if (enemy.enemy.ellipsoid && !enemy.enemy._hasBeenScaled) {
    enemy.enemy.ellipsoid = enemy.enemy.ellipsoid.scale(SPAWN.ENEMY_SCALE)
    enemy.enemy._hasBeenScaled = true
  }
}

export class EnemySpawnHandler {
  /**
   * @param {object} scene
   * @param {object} deps - {
   *   getNavGrid: () => NavGrid,
   *   perceptionSystem,
   *   playerEntry,
   *   uiSystem,
   *   enemies: Enemy[],
   *   collisionSystem,
   *   spawnerSystem,
   *   getCurrentRound: () => Round,
   *   onEnemyKilled: (enemy) => void,  // XP + coins + UI (full kill)
   *   onKillOnly: () => void            // kills++ uniquement (CoreSpawner children)
   * }
   */
  constructor(scene, deps) {
    this.scene = scene
    this.d = deps
  }

  _scaleEnemy(enemy) { applyEnemyScaling(enemy) }

  /** Callback pour spawnerSystem.onEnemySpawned */
  makeSpawnCallback() {
    const d = this.d
    return (enemy) => {
      if (enemy.setNavGrid) enemy.setNavGrid(d.getNavGrid())
      if (enemy.setPerceptionSystem) enemy.setPerceptionSystem(d.perceptionSystem)
      this._scaleEnemy(enemy)

      const dmg = enemy.contactDamage || 1
      enemy.contact = () => {
        d.playerEntry.takeDamage(dmg)
        d.uiSystem?.updateLife(d.playerEntry.life, d.playerEntry.maxLife)
      }

      enemy.onDeath = () => {
        d.onEnemyKilled(enemy)
        const idx = d.enemies.indexOf(enemy)
        if (idx !== -1) d.enemies.splice(idx, 1)
        d.collisionSystem.removeEnemy(enemy)
        d.spawnerSystem?.recycleEnemy(enemy)
        d.getCurrentRound()?.notifyEnemyKilled()
      }

      d.enemies.push(enemy)
      d.collisionSystem.registerEnemy(enemy)
      d.getCurrentRound()?.notifyEnemySpawned()
    }
  }

  /** Callbacks passés à enemy.update() (CoreSpawner, JammerUnit, NeonLeviathan…) */
  makeEnemyCallbacks() {
    const d = this.d
    const scene = this.scene

    return {
      onShoot: () => {},
      onExplode: () => {},

      /**
       * Spawn d'une sous-entité.
       * Types supportés : 'VoltStriker', 'LeviathanTurretLeft', 'LeviathanTurretRight', 'BossJammer'
       * @param {string} type
       * @param {Vector3} pos
       * @param {object} extra - { boss: NeonLeviathan } pour les sous-entités boss
       */
      onSpawn: (type, pos, extra = {}) => {
        let entity = null

        if (type === 'LeviathanTurretLeft') {
          entity = new LeviathanTurret(scene, null, 'LEFT')
        } else if (type === 'LeviathanTurretRight') {
          entity = new LeviathanTurret(scene, null, 'RIGHT')
        } else if (type === 'BossJammer') {
          entity = new BossJammerUnit(scene, null)
        } else if (type === 'ArchitectGlitch') {
          // Version glitchée d'un ennemi normal : type aléatoire, HP/2, speed x1.5, teinte cyan
          const GlitchType = GLITCH_POOL[Math.floor(Math.random() * GLITCH_POOL.length)]
          const glitch = new GlitchType(scene, null)

          // Stats glitch
          glitch.maxLife = Math.ceil(glitch.maxLife * 0.5)
          glitch.life = glitch.maxLife
          glitch.speed = (glitch.speed || 1) * 1.5
          glitch.xpValue = 0
          glitch.coinValue = 0

          // Teinte holographique cyan pour signaler le statut glitch
          if (glitch.material) {
            glitch.material.diffuseColor = new Color3(0.0, 0.8, 1.0)
            glitch.material.emissiveColor = new Color3(0.0, 0.4, 0.9)
            glitch.material.alpha = 0.85
            glitch._originalDiffuseColor = glitch.material.diffuseColor.clone()
          }

          if (glitch.setNavGrid) glitch.setNavGrid(d.getNavGrid())
          if (glitch.setPerceptionSystem) glitch.setPerceptionSystem(d.perceptionSystem)
          if (glitch.enemy) {
            glitch.enemy.position.copyFrom(pos)
            this._scaleEnemy(glitch)
          }
          glitch.contact = () => {
            d.playerEntry.takeDamage(glitch.contactDamage || 1)
            d.uiSystem?.updateLife(d.playerEntry.life, d.playerEntry.maxLife)
          }
          const architectBoss = extra.boss
          glitch.onDeath = () => {
            d.onEnemyKilled(glitch)
            // Chaque Glitch tué inflige 1% des HP max au boss
            if (architectBoss && architectBoss.life > 0) {
              architectBoss.takeDamage(architectBoss.maxLife * 0.01)
            }
            const idx = d.enemies.indexOf(glitch)
            if (idx !== -1) d.enemies.splice(idx, 1)
            d.collisionSystem.removeEnemy(glitch)
          }
          d.enemies.push(glitch)
          d.collisionSystem.registerEnemy(glitch)
          return
        } else {
          // Default : VoltStriker (comportement original)
          entity = new VoltStriker(scene)
          if (entity.setNavGrid) entity.setNavGrid(d.getNavGrid())
          if (entity.setPerceptionSystem) entity.setPerceptionSystem(d.perceptionSystem)
          if (entity.enemy) {
            entity.enemy.position.copyFrom(pos)
            this._scaleEnemy(entity)
          }
          entity.contact = () => {
            d.playerEntry.takeDamage(entity.contactDamage || 1)
            d.uiSystem?.updateLife(d.playerEntry.life, d.playerEntry.maxLife)
          }
          d.enemies.push(entity)
          d.collisionSystem.registerEnemy(entity)
          entity.onDeath = () => {
            d.onKillOnly()
            const idx = d.enemies.indexOf(entity)
            if (idx !== -1) d.enemies.splice(idx, 1)
            d.collisionSystem.removeEnemy(entity)
          }
          return
        }

        // Injection NavGrid pour les entités qui en ont besoin
        if (entity.setNavGrid) entity.setNavGrid(d.getNavGrid())

        // Positionnement
        if (entity.enemy) {
          entity.enemy.position.copyFrom(pos)
          this._scaleEnemy(entity)
        }

        // Enregistrement collisions
        d.enemies.push(entity)
        d.collisionSystem.registerEnemy(entity)

        // onDeath spécifique aux sous-entités boss
        const boss = extra.boss
        entity.onDeath = () => {
          if (boss) {
            if (type === 'LeviathanTurretLeft' || type === 'LeviathanTurretRight') {
              boss.notifyTurretDeath()
            } else if (type === 'BossJammer') {
              boss.notifyJammerDeath()
            }
          }
          d.onEnemyKilled(entity)
          const idx = d.enemies.indexOf(entity)
          if (idx !== -1) d.enemies.splice(idx, 1)
          d.collisionSystem.removeEnemy(entity)
          d.spawnerSystem?.recycleEnemy(entity)
          // Pas de notifyEnemyKilled() — les sous-entités ne comptent pas pour la fin de round
        }
      },

      /** Appelé par JammerUnit quand le joueur est dans son rayon de brouillage. */
      onJam: (active) => {
        scene.isDashJammed = !!active
      },

      /** Dégâts directs au joueur (AOE boss, etc.) */
      onDamagePlayer: (amount) => {
        d.playerEntry.takeDamage(amount)
        d.uiSystem?.updateLife(d.playerEntry.life, d.playerEntry.maxLife)
      },

      /** Poison DoT sur le joueur (projectile TOXIC des tourelles). */
      onPoisonPlayer: (dps, duration) => {
        d.playerEntry.applyPoison(dps, duration)
      },

      /** Brûlure DoT sur le joueur (projectile FIRE des tourelles). */
      onBurnPlayer: (dps, duration) => {
        // Réutilise le mécanisme poison du joueur (même résultat : DoT)
        d.playerEntry.applyPoison(dps, duration)
      },

      /** Affiche une notification via UISystem (utilisé par le boss pour ses annonces). */
      onShowNotification: (text, color = '#ff4400', duration = 3000) => {
        d.uiSystem?.showNotification(text, color, duration)
      },

      /** Inverse les contrôles du joueur (The Architect — The Glitch). */
      onGlitchPlayer: (duration) => {
        d.playerEntry.applyGlitchEffect?.(duration)
      },
    }
  }
}
