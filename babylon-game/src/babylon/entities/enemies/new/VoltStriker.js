import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'

import { Enemy } from '../Enemy'

/**
 * Volt-Striker : Unité standard qui fonce directement sur le joueur.
 * 6HP / 1 Dégât / 1 Speed / Catégorie 1
 * 
 * Comportement IA:
 * - Détection FOV: 25m
 * - Vu le joueur? Fonce via A* pathfinding (contourne les murs!)
 * - Perdu de vue? Poursuite sur dernière position connue
 * - <15% HP? Fuite rare
 * - Séparation avec alliés automatique
 */
export class VoltStriker extends Enemy {

    constructor(scene, contact) {
        // Config agressif: FOV modéré, wide angle, little retreat
        super(scene, contact, 6, {
            fovDistance: 50,        // Détection large (50 units max)
            fovAngle: 120,          // Angle vision large (120°)
            attackRange: 3,         // Attaque rapprochée au corps-à-corps
            retreatThreshold: 0.15, // Ne fuit que <15% HP (très rarement)
        })

        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 0.5 // Base speed reference
        this.damage = 1

        this.xpValue = 10
        this.coinValue = 5

        this._debugLogged = false
        this._frameCount = 0
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("VoltStriker", { diameter: 1.5 }, this.scene)
        enemy.position = new Vector3(4, 0.75, 0)
        enemy.checkCollisions = true  // Filet de sécurité physique

        const mat = new StandardMaterial("voltStrikerMat", this.scene)
        mat.diffuseColor = new Color3(0.9, 0.9, 0.9)
        mat.emissiveColor = new Color3(0.2, 0.2, 0.2)
        enemy.material = mat

        return enemy
    }

    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        const dt = this.scene.getEngine().getDeltaTime() / 1000

        // Flash rouge au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= dt
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(0.9, 0.9, 0.9)
            }
        }

        // Vérifications de sécurité: si les systèmes ne sont pas prêts, ne rien faire
        // Ne pas marquer _debugLogged en erreur : on veut pouvoir logger l'init quand
        // tout sera prêt (évite de masquer le log OK si l'ennemi est créé tôt).
        if (!this.fsm || !this.perception || !this.pathfinding || !this.perceptionSystem) {
            return;
        }

        // Log une fois pour confirmer initialisation
        if (!this._debugLogged) {
            const hasNavGrid = !!this.pathfinding.navGrid;
            console.log('[VoltStriker] ✅ Init OK — systèmes prêts. NavGrid A*:', hasNavGrid ? 'OUI' : 'NON');
            this._debugLogged = true;
        }

        // 1) PERCEPTION: FOV simple (distance-based, pas de raycast bloquant)
        const fovDistance = this.fsm.config.fovDistance || 25
        const fovAngle = this.fsm.config.fovAngle || 120

        const playerVisible = this.perceptionSystem.canSeePlayer(
            this.enemy.position,
            playerMesh.position,
            fovDistance,
            fovAngle,
            Vector3.Forward(),
            false  // Pas de raycast LOS (utiliser A* pour naviguer, pas LOS pour détecter)
        )

        // Mettre à jour perception — mémoire PERMANENTE
        // Une fois le joueur vu, l'ennemi ne l'oublie jamais
        this.perception.canSee = playerVisible
        if (playerVisible) {
            this.perception.lastSeenPos = playerMesh.position.clone()
            this.perception.lastSeenTime = 0
            this._hasSeenPlayer = true  // Flag permanent
        } else if (this._hasSeenPlayer) {
            // Vu au moins une fois → toujours tracker la position du joueur
            this.perception.lastSeenPos = playerMesh.position.clone()
            this.perception.lastSeenTime = 0
        }

        // 2) FSM: Déterminer action (state + speed + targetPos)
        const action = this.fsm.getAction({
            health: this.life,
            maxHealth: this.maxLife,
            position: this.enemy.position,
            playerPos: playerVisible ? playerMesh.position : null,
            targetPos: this.perception.lastSeenPos,
        })

        // Debug périodique
        this._frameCount++;
        if (this._frameCount % 120 === 0) {
            const distToPlayer = Vector3.Distance(this.enemy.position, playerMesh.position);
            const hasPath = this.pathfinding._currentPath?.length > 0;
            const wpIdx = this.pathfinding._currentWaypointIndex || 0;
            // console.log(`[VS] dist=${distToPlayer.toFixed(1)} state=${action.state} path=${hasPath ? this.pathfinding._currentPath.length + 'wp' : 'none'} wp#${wpIdx}`);
        }

        // 3) MOUVEMENT via A* pathfinding
        let targetPos = action.targetPos

        if (!targetPos) return
        if (action.action === 'idle' || action.action === 'dead') return

        // Le PathfindingHelper gère tout: A* + séparation + waypoints
        let moveVec = this.pathfinding.getMovementVector(
            this.enemy.position,
            targetPos,
            action.speed * this.speed,
            enemies.filter(e => {
                if (!e || !e.enemy) return false
                const dist = Vector3.Distance(this.enemy.position, e.enemy.position)
                return dist < 10
            }),
            2.5,    // separationDistance
            1.2     // separationForce
        )

        // Appliquer slow (stun, ralenti, debuff)
        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        const scaledMove = moveVec.scale(slow);

        // Déplacement avec collision physique en filet de sécurité
        // A* guide autour des murs, moveWithCollisions empêche de traverser
        this.enemy.moveWithCollisions(scaledMove);
    }
}
