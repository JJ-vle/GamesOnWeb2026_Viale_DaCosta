import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial,
    SceneLoader
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Volt-Striker : Unité standard qui fonce directement sur le joueur.
 * 6HP / 1 Dégât / 1 Speed / Catégorie 1
 */
export class VoltStriker extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 6, {
            fovDistance: 50,
            fovAngle: 120,
            attackRange: 3,
            retreatThreshold: 0.15,
        })

        this.enemy = this._createMesh()
        this.speed = 0.5
        this.damage = 1

        this.xpValue = 10
        this.coinValue = 5
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateBox("VoltStriker", { width: 3.5, height: 1.2, depth: 2.5 }, this.scene)
        enemy.position = new Vector3(4, 0.5, 0)
        enemy.checkCollisions = true
        // Assure que la hitbox ne sera jamais rendue à l'écran
        enemy.isVisible = false 
        enemy.visibility = 0

        enemy.ellipsoid = new Vector3(1.75, 0.6, 1.25)
        enemy.ellipsoidOffset = new Vector3(0, 0.6, 0)

        this.visualMeshes = []
        this.currentAnim = null
        
        SceneLoader.ImportMeshAsync("", "/assets/models/", "Volt-Striker.glb", this.scene).then((result) => {
            const root = result.meshes[0]
            root.parent = enemy
            root.position = new Vector3(0, -0.5, 0) 
            
            // Cacher les carrés/plans indésirables inclus avec le modèle GLB original
            result.meshes.forEach(m => {
                const name = m.name.toLowerCase();
                if (name.includes("cube") || name.includes("carré") || name.includes("plane") || name.includes("square")) {
                    m.isVisible = false;
                }
            })

            this.visualMeshes = result.meshes.filter(m => m.material && m.isVisible !== false)

            // Sauvegarder les couleurs d'origine des sous-meshes pour pouvoir les restaurer après un hit
            this.visualMeshes.forEach(m => {
                if (m.material) {
                    m._originalEmissive = m.material.emissiveColor ? m.material.emissiveColor.clone() : new Color3(0, 0, 0);
                    if (m.material.albedoColor) {
                        m._originalAlbedo = m.material.albedoColor.clone();
                    } else if (m.material.diffuseColor) {
                        m._originalDiffuse = m.material.diffuseColor.clone();
                    }
                }
            });

            this.idleAnim = result.animationGroups.find(a => a.name === "Idle_Static")
            this.leftAnim = result.animationGroups.find(a => a.name === "Lean_Left")
            this.rightAnim = result.animationGroups.find(a => a.name === "Lean_Right")

            result.animationGroups.forEach(ag => ag.stop())
            if (this.idleAnim) {
                this.idleAnim.play(true)
                this.currentAnim = this.idleAnim
            }
        }).catch(err => console.error("Erreur chargement Volt-Striker", err))

        const mat = new StandardMaterial("voltStrikerMat", this.scene)
        enemy.material = mat
        this.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        // Flash rouge sur le modèle GLB (multi-mesh)
        this._updateGLBHitFlash()

        // IA NavGrid (perception → FSM → pathfinding → mouvement)
        const result = this.updateNavGridAI(playerMesh, enemies)
        if (!result || !result.moved) return

        // Rotation smooth + animations lean
        this.applyRotation(result.scaledMove, 0.15)
        this._updateLeanAnimation(result.scaledMove)
    }

    /**
     * Flash rouge spécifique aux modèles GLB (sous-meshes multiples)
     */
    _updateGLBHitFlash() {
        if (this._hitTimer > 0) {
            this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000
            if (this._hitTimer < 0) this._hitTimer = 0
        }

        const isHit = this._hitTimer > 0
        if (!this.visualMeshes) return

        for (const mesh of this.visualMeshes) {
            if (!mesh.material) continue
            if (isHit) {
                mesh.material.emissiveColor = new Color3(1, 0, 0)
                if (mesh.material.albedoColor) mesh.material.albedoColor = new Color3(1, 0, 0)
            } else {
                mesh.material.emissiveColor = mesh._originalEmissive || new Color3(0, 0, 0)
                if (mesh.material.albedoColor && mesh._originalAlbedo) {
                    mesh.material.albedoColor = mesh._originalAlbedo
                } else if (mesh.material.diffuseColor && mesh._originalDiffuse) {
                    mesh.material.diffuseColor = mesh._originalDiffuse
                }
            }
        }
    }

    /**
     * Animation lean gauche/droite basée sur la direction de mouvement
     */
    _updateLeanAnimation(moveVec) {
        if (moveVec.lengthSquared() > 0.0001) {
            const targetY = Math.atan2(moveVec.x, moveVec.z)
            let diff = targetY - this.enemy.rotation.y
            while (diff < -Math.PI) diff += Math.PI * 2
            while (diff > Math.PI) diff -= Math.PI * 2

            let targetAnim = this.idleAnim
            if (diff > 0.1 && this.leftAnim) targetAnim = this.leftAnim
            else if (diff < -0.1 && this.rightAnim) targetAnim = this.rightAnim

            if (this.currentAnim !== targetAnim && targetAnim) {
                if (this.currentAnim) this.currentAnim.stop()
                targetAnim.play(true)
                this.currentAnim = targetAnim
            }
        } else {
            if (this.currentAnim !== this.idleAnim && this.idleAnim) {
                if (this.currentAnim) this.currentAnim.stop()
                this.idleAnim.play(true)
                this.currentAnim = this.idleAnim
            }
        }
    }
}
