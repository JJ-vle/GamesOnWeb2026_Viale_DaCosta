import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
import { Enemy } from '../Enemy'

/**
 * BossJammerUnit : Version statique du Jammer invoquée par NeonLeviathan en Phase 2.
 * Contrairement au JammerUnit mobile, celui-ci reste sur place et bloque le dash
 * tant qu'il est en vie (géré directement via scene.isDashJammed par le boss).
 * 40HP / 0 Speed / Catégorie Boss-Sub
 */
export class BossJammerUnit extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 40, false) // pas d'IA navGrid
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0
        this.damage = 0

        this.xpValue = 25
        this.coinValue = 15

        this._ringScale = 0
    }

    _createMesh() {
        const root = MeshBuilder.CreateBox('BossJammerUnit', { width: 1.8, height: 2.5, depth: 1.8 }, this.scene)
        root.position = new Vector3(0, 1.25, 0)
        root.checkCollisions = false

        const mat = new StandardMaterial('bossJammerMat', this.scene)
        mat.diffuseColor = new Color3(0.6, 0.0, 0.8) // violet foncé (distinctif du jammer rouge)
        mat.emissiveColor = new Color3(0.3, 0.0, 0.5)
        root.material = mat

        // Anneau de brouillage plus grand et violet
        const ring = MeshBuilder.CreateTorus('BossJamRing', {
            diameter: 20,
            thickness: 0.15,
            tessellation: 24
        }, this.scene)
        ring.parent = root
        ring.position.y = -0.9
        const ringMat = new StandardMaterial('bossRingMat', this.scene)
        ringMat.diffuseColor = new Color3(0.8, 0.0, 1.0)
        ringMat.emissiveColor = new Color3(0.4, 0.0, 0.6)
        ringMat.alpha = 0.6
        ring.material = ringMat
        this.ringMesh = ring

        // Antenne centrale (indication visuelle "brouilleur")
        const antenna = MeshBuilder.CreateCylinder('BossJamAntenna', {
            diameter: 0.3,
            height: 3.5,
            tessellation: 6
        }, this.scene)
        antenna.parent = root
        antenna.position.y = 1.5
        antenna.material = mat

        return root
    }

    update(playerMesh, projectiles = [], enemies = [], callbacks = {}) {
        if (!this.enemy) return

        this.updateHitFlash()

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Animation de l'anneau (pulse)
        this._ringScale += dt * 5
        const pulse = 0.7 + Math.abs(Math.sin(this._ringScale)) * 0.4
        this.ringMesh.scaling.x = pulse
        this.ringMesh.scaling.z = pulse

        // Lueur pulsante sur le corps
        const glow = 0.2 + Math.abs(Math.sin(this._ringScale * 0.8)) * 0.4
        this.material.emissiveColor.set(0.2 + glow * 0.5, 0, 0.3 + glow)
    }
}
