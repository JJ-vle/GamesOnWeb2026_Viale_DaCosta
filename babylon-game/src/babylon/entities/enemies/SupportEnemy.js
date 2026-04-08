import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from './Enemy'

/**
 * SupportEnemy: Archetype d'ennemi qui maintient une distance optimale
 * - Ne rush pas le joueur
 * - Se positionne à une distance cible (ex: 12-18m)
 * - Attaque de loin / supporte alliés
 * - Kite si trop proche
 * - Fuit si menacé
 */
export class SupportEnemy extends Enemy {

    constructor(scene, contact) {
        super(scene, contact, 15, {
            fovDistance: 35,      // Vision plus loin pour anticiper
            fovAngle: 100,        // Champ de vision large
            attackRange: 10,      // Attaque à distance
            retreatThreshold: 0.4, // Fuit plus tôt
        })

        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.xpValue = 20
        this.coinValue = 10

        // Paramètres spécifiques au support
        this.optimalDistance = 15      // Distance idéale au joueur
        this.optimalDistanceRange = 3  // Tolérance (12-18m)
        this.repositionCooldown = 0
        this.repositionInterval = 1.5  // Recalculer position toutes les 1.5s

        // Actions de support
        this.supportAction = null
        this.lastAttackTime = 0
        this.attackCooldown = 2
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateCylinder("SupportEnemy", { height: 2, diameter: 1.5 }, this.scene)
        enemy.position = new Vector3(4, 1, 0)

        const mat = new StandardMaterial("supportMat", this.scene)
        mat.diffuseColor = new Color3(0.2, 0.8, 1) // Cyan clair

        enemy.material = mat
        return enemy
    }

    /**
     * Override updateAI pour comportement support spécifique
     */
    updateAI(playerMesh, enemies = []) {
        if (!this.fsm || !this.perception || !this.pathfinding) return

        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000
        const perception = this.perception

        // 1. PERCEPTION
        const playerDistance = Vector3.Distance(this.enemy.position, playerMesh.position)
        const playerVisible = playerDistance < this.fsm.config.fovDistance

        perception.canSee = playerVisible
        if (playerVisible) {
            if (perception.lastSeenPos) perception.lastSeenPos.copyFrom(playerMesh.position); else perception.lastSeenPos = playerMesh.position.clone()
            perception.lastSeenTime = 0
        } else {
            perception.lastSeenTime += deltaTime
        }

        // 2. Logique SUPPORT: Déterminer position optimale
        this.repositionCooldown -= deltaTime
        let targetPos = this.enemy.position

        if (playerVisible) {
            // Calculer position cible: cercle autour du joueur à distance optimale
            targetPos = this._getOptimalSupportPosition(playerMesh.position, enemies)

            // Si repositionCooldown expiré, chercher meilleure position
            if (this.repositionCooldown <= 0) {
                targetPos = this._findBestSupportPosition(playerMesh.position, enemies)
                this.repositionCooldown = this.repositionInterval
            }
        } else if (perception.lastSeenPos && perception.lastSeenTime < 2) {
            // Dernière position connue, continuer la patrouille
            targetPos = perception.lastSeenPos
        }

        // 3. DÉPLACEMENT vers position optimale
        const distanceToTarget = Vector3.Distance(this.enemy.position, targetPos)
        let speed = 0.08

        // Kite: si trop proche du joueur, s'éloigner
        if (playerDistance < this.optimalDistance - this.optimalDistanceRange) {
            const awayVec = this.enemy.position.subtract(playerMesh.position)
            awayVec.y = 0
            awayVec.normalize()
            targetPos = this.enemy.position.add(awayVec.scale(3))
            speed = 0.1
        }
        // Si trop loin, se rapprocher
        else if (playerDistance > this.optimalDistance + this.optimalDistanceRange) {
            speed = 0.12
        }

        const moveVec = this.pathfinding.getMovementVector(
            this.enemy.position,
            targetPos,
            speed,
            enemies.filter(e => {
                if (!e || !e.enemy) return false
                const dist = Vector3.Distance(this.enemy.position, e.enemy.position)
                return dist < 10
            }),
            3.5,
            1.5
        )
        this.enemy.position.addInPlace(moveVec)

        // 4. Actions spécifiques: attaques à distance / support
        if (playerVisible) {
            this._performSupportAction(playerMesh, enemies, deltaTime)
        }

        // 5. Fuite d'urgence
        if (this.life / this.maxLife < this.fsm.config.retreatThreshold) {
            const away = this.enemy.position.subtract(playerMesh.position)
            away.y = 0
            away.normalize()
            this.enemy.position.addInPlace(away.scale(0.15))
        }
    }

    /**
     * Calcule la meilleure position autour du joueur à distance optimale
     * @private
     */
    _getOptimalSupportPosition(playerPos, enemies = []) {
        // Position basique circulaire autour du joueur
        const me = this.enemy.position
        const toPlayer = playerPos.subtract(me)
        const distToPlayer = toPlayer.length()

        if (distToPlayer < 0.1) return playerPos

        toPlayer.normalize()

        // Cercle de rayon optimal autour du joueur
        const perpendicular = new Vector3(-toPlayer.z, 0, toPlayer.x)
        perpendicular.normalize()

        // Chercher le meilleur angle (gauche ou droite) basé sur alliés
        const leftPos = playerPos.add(
            toPlayer.scale(-this.optimalDistance)
                .add(perpendicular.scale(2))
        )
        const rightPos = playerPos.add(
            toPlayer.scale(-this.optimalDistance)
                .add(perpendicular.scale(-2))
        )

        // Vérifier quelle position a moins de collisions
        const leftCollisions = this._countNearbyEnemies(leftPos, enemies, 2)
        const rightCollisions = this._countNearbyEnemies(rightPos, enemies, 2)

        return leftCollisions <= rightCollisions ? leftPos : rightPos
    }

    /**
     * Trouve la meilleure position de support
     * (prend en compte alliés, obstacles, etc)
     * @private
     */
    _findBestSupportPosition(playerPos, enemies = []) {
        // Version simple: on boucle quelques angles et on choisit le moins encombré
        const angles = [0, 60, 120, 180, 240, 300]
        let bestPos = this.enemy.position
        let bestScore = -Infinity

        for (const angleDeg of angles) {
            const angleRad = angleDeg * Math.PI / 180
            const offset = new Vector3(
                Math.cos(angleRad) * this.optimalDistance,
                0,
                Math.sin(angleRad) * this.optimalDistance
            )
            const candidatePos = playerPos.add(offset)

            // Score: faveur les positions loin des autres ennemis
            const crowding = this._countNearbyEnemies(candidatePos, enemies, 3)
            const score = -crowding

            if (score > bestScore) {
                bestScore = score
                bestPos = candidatePos
            }
        }

        return bestPos
    }

    /**
     * Compte le nombre d'ennemis trop proches
     * @private
     */
    _countNearbyEnemies(pos, enemies, radius) {
        let count = 0
        for (const enemy of enemies) {
            if (enemy === this || !enemy.enemy) continue
            const dist = Vector3.Distance(pos, enemy.enemy.position)
            if (dist < radius) count++
        }
        return count
    }

    /**
     * Actions de support: attaque à distance, buff alliés, debuff joueur
     * @private
     */
    _performSupportAction(playerMesh, enemies, deltaTime) {
        this.lastAttackTime += deltaTime

        // Logique simple: attaque à distance toutes les 2s si distance OK
        if (this.lastAttackTime >= this.attackCooldown) {
            const dist = Vector3.Distance(this.enemy.position, playerMesh.position)
            if (dist > 5 && dist < 25) {
                // Attaque à distance possible
                // TODO: déclencher projectile support
                // (exemple: poison, débuff, beam lasers, etc)
                this.supportAction = 'RANGED_ATTACK'
                this.lastAttackTime = 0
            }
        }

        // Logique simple: chercher un allié proche pour le buff
        for (const ally of enemies) {
            if (ally === this || !ally.enemy) continue
            const dist = Vector3.Distance(this.enemy.position, ally.enemy.position)
            if (dist < 10 && (ally.life / ally.maxLife) < 0.5) {
                // Allié faible proche, le supporterSupportAction = 'BUFF_ALLY'
                // TODO: appliquer buff
                break
            }
        }
    }

    /**
     * Surcharge update() pour ajouter logique custom
     */
    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        // Flash rouge au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0.2, 0.8, 1) // Cyan
            }
        }

        // Appeler la logique IA principale
        this.updateAI(playerMesh, enemies)
    }
}
