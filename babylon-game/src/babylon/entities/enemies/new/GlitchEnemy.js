import { Color3 } from '@babylonjs/core'
import { SimpleEnemy } from '../SimpleEnemy'

/**
 * GlitchEnemy — Sous-unité invoquée par THE ARCHITECT (Phase 1).
 * - HP divisés par 2
 * - Vitesse x1.5
 * - Apparence holographique cyan/électrique
 */
export class GlitchEnemy extends SimpleEnemy {

    constructor(scene, contact) {
        super(scene, contact)

        this.maxLife = Math.ceil(this.maxLife * 0.5)
        this.life = this.maxLife
        this.speed = 1.5

        this.xpValue = 0
        this.coinValue = 0

        // Teinte holographique cyan
        if (this.material) {
            this.material.diffuseColor = new Color3(0.0, 0.8, 1.0)
            this.material.emissiveColor = new Color3(0.0, 0.4, 0.9)
            this.material.alpha = 0.85
            this._originalDiffuseColor = this.material.diffuseColor.clone()
        }
    }
}
