// src/babylon/entities/weapons/Activable.js

/**
 * Base class for any "activable" item (secondary ability, grenade, heal, etc.).
 * Provides cooldown management and a generic activation callback mechanism.
 */
export class Activable {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    // cooldown (seconds) and timer
    this.cooldown = 0;
    this._cooldownTimer = 0;

    // optional callback invoked when activation occurs. Arguments depend on subclass.
    this.onActivated = null;
  }

  /**
   * Must be called each frame to decrement cooldown timer.
   * Subclasses can override but should call super.update.
   */
  update(deltaTime) {
    this._cooldownTimer -= deltaTime;
    if (this._cooldownTimer < 0) this._cooldownTimer = 0;
  }

  canActivate() {
    return this._cooldownTimer === 0;
  }

  _resetCooldown() {
    this._cooldownTimer = this.cooldown;
  }

  /**
   * Helper to notify external listeners that something was activated.
   * @param {any} payload
   */
  _notifyActivated(payload) {
    if (this.onActivated) {
      this.onActivated(payload);
    }
  }
}
