// src/babylon/scenes/EnemySpawnHandler.js
import { Vector3 } from '@babylonjs/core'
import { VoltStriker } from '../entities/enemies/new/VoltStriker.js'
import { SPAWN } from './GameConfig'

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

  _scaleEnemy(enemy) {
    if (!enemy.enemy) return
    enemy.enemy.scaling = new Vector3(SPAWN.ENEMY_SCALE, SPAWN.ENEMY_SCALE, SPAWN.ENEMY_SCALE)
    if (enemy.enemy.ellipsoid && !enemy.enemy._hasBeenScaled) {
      enemy.enemy.ellipsoid = enemy.enemy.ellipsoid.scale(SPAWN.ENEMY_SCALE)
      enemy.enemy._hasBeenScaled = true
    }
  }

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

  /** Callbacks passés à enemy.update() (CoreSpawner, JammerUnit…) */
  makeEnemyCallbacks() {
    const d = this.d
    return {
      onShoot: () => {},
      onExplode: () => {},
      onSpawn: (_type, pos) => {
        const v = new VoltStriker(this.scene)
        if (v.setNavGrid) v.setNavGrid(d.getNavGrid())
        if (v.enemy) {
          v.enemy.position = pos
          this._scaleEnemy(v)
        }
        d.enemies.push(v)
        v.onDeath = () => d.onKillOnly()
      },
      onJam: () => {}
    }
  }
}
