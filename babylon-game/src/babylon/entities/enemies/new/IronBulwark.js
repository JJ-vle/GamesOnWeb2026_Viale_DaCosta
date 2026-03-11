import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Iron-Bulwark : Robot équipé d'un bouclier bloquant les tirs de face.
 * 18HP / 1 Dégât / 1 Speed / Catégorie 2
 */
export class IronBulwark extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 18)
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0
        this.damage = 1

        this.isShieldedFront = true
    }

    _createMesh() {
        const root = MeshBuilder.CreateBox("IronBulwarkBase", { width: 2, height: 2, depth: 2 }, this.scene)
        root.position = new Vector3(4, 1, 0)
        root.checkCollisions = false

        const mat = new StandardMaterial("ironBaseMat", this.scene)
        mat.diffuseColor = new Color3(0.3, 0.3, 0.4) // Gris foncé mat
        root.material = mat

        // Bouclier énergétique visible devant
        const shield = MeshBuilder.CreatePlane("IBShield", { width: 3, height: 2.5 }, this.scene)
        shield.parent = root
        shield.position.z = 1.2
        
        const shieldMat = new StandardMaterial("shieldMat", this.scene)
        shieldMat.diffuseColor = new Color3(0, 0.5, 1) // Bleu energie
        shieldMat.alpha = 0.5
        shieldMat.emissiveColor = new Color3(0, 0.3, 0.8)
        shield.material = shieldMat

        this.shieldMesh = shield

        return root
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash au hit (si le bouclier ne l'a pas bloqué)
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) this.material.diffuseColor = new Color3(0.3, 0.3, 0.4)
        }

        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        
        const toPlayer = playerMesh.position.subtract(this.enemy.position)
        toPlayer.y = 0
        const direction = toPlayer.normalize()

        // Regarde toujours le joueur (pour garder le bouclier face à lui)
        this.enemy.lookAt(this.enemy.position.add(direction))

        const separation = this._getFlockingVector(enemies, 3.5, 1.2)
        let moveDir = direction.clone()
        moveDir.addInPlace(separation).normalize()

        // Avance inexorablement mais doucement
        this.enemy.position.addInPlace(moveDir.scale(0.04 * this.speed * slow))
    }

    takeDamage(amount, directionOfHit = null) {
        // Redéfinition du takeDamage standard pour intégrer le blocage frontal
        if (directionOfHit && this.enemy && this.isShieldedFront) {
            const forward = this.enemy.forward
            // Si l'angle est très proche (dot product > 0 par exemple, ou plus restrictif)
            const dot = Vector3.Dot(forward, directionOfHit)
            
            // Si le projectile vient de face (il va dans la direction "vers la face")
            // dirOfHit et forward sont opposés. Si dot < -0.3 c'est dans un cône avant.
            if (dot < -0.3) {
                // Bloqué! 
                // Petit effet visuel sur le bouclier
                this.shieldMesh.scaling.x = 1.2
                this.shieldMesh.scaling.y = 1.2
                setTimeout(() => { if (this.shieldMesh) this.shieldMesh.scaling = new Vector3(1,1,1) }, 100)
                
                return // PAS DE DEGATS !
            }
        }

        // Damage normal sur le dos/côtés
        this.life -= amount
        this.material.diffuseColor = new Color3(1, 0, 0)
        this._hitTimer = 0.1 
        
        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }
}
