// src/babylon/scenes/RoundOrchestrator.js
import { Round } from '../Round'
import { Zone } from '../Zone'
import { ROUND } from './GameConfig'
import { clearEnemies } from './EnemySpawnHandler'
import { VoltStriker } from '../entities/enemies/new/VoltStriker.js'
import { NeonVector } from '../entities/enemies/new/NeonVector.js'
import { BastionRed } from '../entities/enemies/new/BastionRed.js'
import { DashTrigger } from '../entities/enemies/new/DashTrigger.js'
import { BoltSentry } from '../entities/enemies/new/BoltSentry.js'
import { SludgePhrax } from '../entities/enemies/new/SludgePhrax.js'
import { BlastZone } from '../entities/enemies/new/BlastZone.js'
import { IronBulwark } from '../entities/enemies/new/IronBulwark.js'
import { DroneSwarm } from '../entities/enemies/new/DroneSwarm.js'
import { ToxicWasp } from '../entities/enemies/new/ToxicWasp.js'
import { PyroCaster } from '../entities/enemies/new/PyroCaster.js'
import { JammerUnit } from '../entities/enemies/new/JammerUnit.js'
import { NitroHusk } from '../entities/enemies/new/NitroHusk.js'
import { EchoWraith } from '../entities/enemies/new/EchoWraith.js'
import { TitanRam } from '../entities/enemies/new/TitanRam.js'
import { LinkCommander } from '../entities/enemies/new/LinkCommander.js'
import { CoreSpawner } from '../entities/enemies/new/CoreSpawner.js'

const CAT1 = [VoltStriker, NeonVector, BastionRed]
const CAT2 = [DashTrigger, BoltSentry, SludgePhrax, BlastZone, IronBulwark, DroneSwarm, ToxicWasp, PyroCaster, JammerUnit, NitroHusk]
const CAT3 = [EchoWraith, TitanRam, LinkCommander, CoreSpawner]

const pickRandom = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, arr.length))

/**
 * Peuple un Round avec des mobs selon la progression (index de round r, départ à 0).
 */
function populateRound(round, r) {
  const totalMobs = ROUND.MOBS_BASE + r * ROUND.MOBS_STEP
  const types1 = pickRandom(CAT1, 2)
  const c1 = Math.ceil(totalMobs * ROUND.FRAC_CAT1 / Math.max(1, types1.length))
  types1.forEach(T => round.addMob({ type: T, count: c1, spawnInterval: ROUND.INTERVAL_CAT1 }))

  if (r >= 1) {
    const types2 = pickRandom(CAT2, 2)
    const c2 = Math.ceil(totalMobs * ROUND.FRAC_CAT2 / Math.max(1, types2.length))
    types2.forEach(T => round.addMob({ type: T, count: c2, spawnInterval: ROUND.INTERVAL_CAT2 }))
  }
  if (r >= 3) {
    pickRandom(CAT3, 1).forEach(T => round.addMob({ type: T, count: 1, spawnInterval: ROUND.INTERVAL_CAT3 }))
  }
}

export class RoundOrchestrator {
  /**
   * @param {object} scene  - Babylon scene
   * @param {object} deps   - { spawnerSystem, collisionSystem, enemies, xpSystem,
   *                           uiSystem, showLootScreen }
   */
  constructor(scene, deps) {
    this.scene = scene
    this.deps = deps
    this.roundNumber = 1
    this.currentRound = null
    this.zone = null
  }

  /**
   * Handler de fin de round : purge les ennemis, ouvre la carte si dernier round,
   * affiche l'écran de loot.
   */
  _attachRoundEndHandler(round) {
    const { spawnerSystem, collisionSystem, enemies, showLootScreen } = this.deps
    round.onRoundEnd = () => {
      if (spawnerSystem) spawnerSystem.stop()

      clearEnemies(enemies, collisionSystem)

      const rounds = this.zone?.getRounds() ?? []
      const idx = rounds.indexOf(round)
      const isLast = idx >= 0 ? idx === rounds.length - 1 : true

      if (isLast && this.zone && !this.zone.allowInfiniteRounds) {
        try { window.dispatchEvent(new CustomEvent('openZoneMap', { detail: { nodeId: this.currentZoneNodeId } })) } catch (e) {}
      }

      const shouldStartNext = !isLast || (this.zone?.allowInfiniteRounds ?? false)
      setTimeout(() => showLootScreen({ startNextRoundAfterPick: shouldStartNext }), 800)
    }
  }

  /**
   * Crée une Zone avec ses rounds pour un nœud de l'arbre, attache les handlers.
   * @returns {Zone}
   */
  buildZoneForNode(node, existingZoneTree) {
    const { spawnerSystem } = this.deps
    const newZone = new Zone(this.scene)
    newZone.tree = existingZoneTree
    if (spawnerSystem) newZone.addSpawner(spawnerSystem)

    const nb = node.nbrounds || 1
    for (let r = 0; r < nb; r++) {
      const round = new Round(this.scene, newZone, { timelimit: ROUND.TIME_LIMIT_BASE + r * ROUND.TIME_LIMIT_STEP, timebefore: ROUND.TIME_BEFORE })
      populateRound(round, r)
      newZone.addRound(round)
      this._attachRoundEndHandler(round)
    }
    return newZone
  }

  /**
   * Crée la Zone initiale à partir du nœud racine de l'arbre (depth 1).
   * @returns {Round} premier round
   */
  buildInitialZone(existingZone) {
    const tree = existingZone.tree
    const rootNode = tree?.nodes?.find(n => n.depth === 1) ?? { nbrounds: 1 }
    this.currentZoneNodeId = rootNode.id ?? null

    const round = new Round(this.scene, existingZone, { timelimit: ROUND.INITIAL_TIME_LIMIT, timebefore: ROUND.INITIAL_TIME_BEFORE })

    // Le premier niveau ne spawne que des VoltStrikers (fixe)
    round.addMob({ type: VoltStriker, count: ROUND.INITIAL_VOLT_COUNT, spawnInterval: ROUND.INTERVAL_CAT1 })
    
    existingZone.addRound(round)
    this._attachRoundEndHandler(round)

    this.zone = existingZone
    this.currentRound = round
    return this.currentRound
  }

  /**
   * Passe au round suivant (prédéfini ou infini).
   * @param {string} currentZoneNodeId
   */
  startNextRound(currentZoneNodeId) {
    const { uiSystem } = this.deps
    const rounds = this.zone.getRounds()
    const currentIndex = rounds.indexOf(this.currentRound)

    if (currentIndex >= 0 && currentIndex < rounds.length - 1) {
      this.roundNumber = currentIndex + 2
      this.currentRound = rounds[currentIndex + 1]
      this.currentRound.startRound()
      uiSystem.showNotification(`⚡ ROUND ${this.roundNumber} — EN AVANT !`, '#ffcc00', 2500)
      return
    }

    if (!this.zone.allowInfiniteRounds) {
      uiSystem.showNotification('Zone terminée — appuie sur M pour ouvrir la carte', '#88ff88', 3000)
      try { window.dispatchEvent(new CustomEvent('openZoneMap', { detail: { nodeId: currentZoneNodeId } })) } catch (e) {}
      return
    }

    // Mode infini
    this.roundNumber++
    const n = this.roundNumber
    const newRound = new Round(this.scene, this.zone, { timelimit: ROUND.INFINITE_TIME_BASE + n * ROUND.INFINITE_TIME_STEP, timebefore: ROUND.INFINITE_TIME_BEFORE })

    const totalMobs = ROUND.INFINITE_MOBS_BASE + n * ROUND.INFINITE_MOBS_STEP
    const types1 = pickRandom(CAT1, 2)
    const c1 = Math.floor(totalMobs * (n >= 2 ? 0.6 : 1.0))
    if (c1 > 0) types1.forEach(T => newRound.addMob({ type: T, count: Math.ceil(c1 / types1.length), spawnInterval: ROUND.INTERVAL_CAT1 }))

    if (n >= 2) {
      const types2 = pickRandom(CAT2, Math.min(2 + Math.floor(n / 3), CAT2.length))
      const c2 = Math.floor(totalMobs * (n >= 4 ? 0.35 : 0.3))
      if (c2 > 0) types2.forEach(T => newRound.addMob({ type: T, count: Math.ceil(c2 / types2.length), spawnInterval: ROUND.INTERVAL_CAT2 }))

      if (n >= 4) {
        const types3 = pickRandom(CAT3, 1 + Math.floor(n / 4))
        const c3 = totalMobs - c1 - Math.floor(totalMobs * (n >= 4 ? 0.35 : 0.3))
        if (c3 > 0) types3.forEach(T => newRound.addMob({ type: T, count: Math.ceil(c3 / types3.length), spawnInterval: ROUND.INTERVAL_CAT3 }))
      }
    }

    this.zone.addRound(newRound)
    newRound.onRoundEnd = this.currentRound.onRoundEnd
    this.currentRound = newRound
    this.currentRound.startRound()
    uiSystem.showNotification(`⚡ ROUND ${n} — EN AVANT !`, '#ffcc00', 2500)
  }
}
