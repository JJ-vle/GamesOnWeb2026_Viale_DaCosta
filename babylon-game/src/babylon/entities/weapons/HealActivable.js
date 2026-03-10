// src/babylon/entities/weapons/HealActivable.js
import { Activable } from "./Activable"

export class HealActivable extends Activable {
  /**
   * @param {BABYLON.Scene} scene
   * @param {object} player (must have heal(amount) method)
   * @param {object} options
   *    - cooldown (seconds)
   *    - healAmount (how much life to restore)
   */
  constructor(scene, player, options = {}) {
    super(scene, player)
    this.cooldown = options.cooldown || 15.0 // 15 seconds default
    this.healAmount = options.healAmount || 20 // heal 20 life
  }

  /**
   * Activate the heal: restore life to player and start cooldown.
   * No direction needed for heal.
   */
  activate() {
    if (!this.canActivate()) return false

    // heal the player
    if (this.player && typeof this.player.heal === 'function') {
      this.player.heal(this.healAmount)
    }

    // notify if needed (e.g., for UI effects or logging)
    this._notifyActivated({ type: 'heal', amount: this.healAmount })

    this._resetCooldown()
    return true
  }
}