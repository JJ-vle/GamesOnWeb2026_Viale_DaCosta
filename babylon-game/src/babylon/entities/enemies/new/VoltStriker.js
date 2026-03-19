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
 * Comportement IA moderne:
 * - Détection FOV: 40m, angle 120° (large péripérique)
 * - Pas d'obstacle? LOS raycast détecte
 * - Vu le joueur? Fonce direct (FSM: Chase → Attack)
 * - Perdu de vue? Poursuite 2-3s sur dernière position
 * - <15% HP? Fuite rare (presque jamais)
 * - Séparation avec alliés automatique
 * 
 * = Comportement "ennemi de base" agressif prêt à l'emploi
 */
export class VoltStriker extends Enemy {

    constructor(scene, contact) {
        // Config agressif: FOV modéré, wide angle, little retreat
        super(scene, contact, 6, {
            fovDistance: 25,        // Détection modérée (25 units max)
            fovAngle: 120,          // Angle vision large (120°)
            attackRange: 3,         // Attaque rapprochée au corps-à-corps
            retreatThreshold: 0.15, // Ne fuit que <15% HP (très rarement)
        })
        
        this.enemy = this._createMesh()
        this.material = this.enemy.material
        this.speed = 1.0 // Base speed reference
        this.damage = 1

        this.xpValue = 10
        this.coinValue = 5

        this._lastDirection = new Vector3(0, 0, 1) // Pour wander smooth
        this._debugLogged = false // Flag pour log une fois only
        this._frameCount = 0 // Counter pour logs périodiques
        this._avoidanceTarget = null // Position temporaire pour contourner un obstacle
        this._avoidanceTimer = 0 // Temps avant d'abandonner le contournement
        this._debugAvoidance = false // Debug flag pour logs
    }

    _createMesh() {
        const enemy = MeshBuilder.CreateSphere("VoltStriker", { diameter: 1.5 }, this.scene)
        enemy.position = new Vector3(4, 0.75, 0)
        enemy.checkCollisions = true  // Activer collisions

        const mat = new StandardMaterial("voltStrikerMat", this.scene)
        mat.diffuseColor = new Color3(0.9, 0.9, 0.9) // Blanc
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

        // ─────────────────────────────────────────────────────────────
        // LOGIQUE IA: Détection simple + FSM + Mouvement
        // ─────────────────────────────────────────────────────────────
        
        // Vérifications de sécurité
        if (!this.fsm || !this.perception || !this.pathfinding || !this.perceptionSystem) {
            if (!this._debugLogged) {
                console.error('[VoltStriker] ❌ FSM/Perception/Pathfinding NON initialisé!', {
                    fsm: !!this.fsm,
                    perception: !!this.perception,
                    pathfinding: !!this.pathfinding,
                    perceptionSystem: !!this.perceptionSystem
                });
                this._debugLogged = true;
            }
            return;
        }

        // Log une fois pour confirmer initialisation
        if (!this._debugLogged) {
            console.log('[VoltStriker] ✅ Initialisation OK - FSM/Perception/Pathfinding présents');
            this._debugLogged = true;
        }

        // 1) PERCEPTION: FOV simple (distance) - raycast LOS désactivé car trop strict
        const fovDistance = this.fsm.config.fovDistance || 25
        const fovAngle = this.fsm.config.fovAngle || 120
        
        // Utiliser PerceptionSystem SANS raycast pour l'instant (raycast bloque trop)
        const playerVisible = this.perceptionSystem.canSeePlayer(
            this.enemy.position,
            playerMesh.position,
            fovDistance,
            fovAngle,
            Vector3.Forward(),
            false  // Désactivé: raycast LOS trop strict, bloque vision partout
        )

        // Mettre à jour perception
        this.perception.canSee = playerVisible
        if (playerVisible) {
            this.perception.lastSeenPos = playerMesh.position.clone()
            this.perception.lastSeenTime = 0
        } else {
            this.perception.lastSeenTime += dt
        }

        // 2) FSM: Déterminer action (state + speed + targetPos)
        const action = this.fsm.getAction({
            health: this.life,
            maxHealth: this.maxLife,
            position: this.enemy.position,
            playerPos: playerVisible ? playerMesh.position : null,
            targetPos: this.perception.lastSeenPos,
        })

        // ──── DEBUG FRAME PAR FRAME ────
        this._frameCount++;
        if (this._frameCount % 30 === 0) {  // Log tous les 30 frames (~0.5s)
            const distToPlayer = Vector3.Distance(this.enemy.position, playerMesh.position);
            console.log(`[VS] Frame ${this._frameCount}:`, {
                distToPlayer: distToPlayer.toFixed(1),
                playerVisible,
                perception_canSee: this.perception.canSee,
                perception_lastSeenPos: this.perception.lastSeenPos ? 'EXISTS' : 'NULL',
                action_state: action.state,
                action_action: action.action,
                action_targetPos: action.targetPos ? `[${action.targetPos.x.toFixed(1)}, ${action.targetPos.y.toFixed(1)}, ${action.targetPos.z.toFixed(1)}]` : 'NULL',
                action_speed: action.speed,
                this_enemy_pos: `[${this.enemy.position.x.toFixed(1)}, ${this.enemy.position.y.toFixed(1)}, ${this.enemy.position.z.toFixed(1)}]`
            });
        }

        // 3) MOUVEMENT: Appliquer direction FSM + séparation
        let targetPos = action.targetPos
        
        // Si pas de cible (ni joueur vu ni dernière position), ne pas bouger
        if (!targetPos) {
            return
        }
        
        // Si inactif (idle/dead), ne pas bouger
        if (action.action === 'idle' || action.action === 'dead') {
            return
        }

        // ──── GESTION AVOIDANCE SIMPLIFIÉE ────
        // Si joueur redevenu visible directement (pas de mur), abandon du contournement
        if (playerVisible) {
            if (this._avoidanceTarget) {
                if (this._frameCount % 30 === 0) {
                    console.log(`[VS] ✅ JOUEUR VISIBLE DIRECTEMENT - Abandon du contournement`);
                }
            }
            this._avoidanceTarget = null;
            this._avoidanceTimer = 0;
        }

        // Utiliser le point de contournement s'il existe, sinon viser la cible normale
        let movementTarget = targetPos;
        if (this._avoidanceTarget) {
            movementTarget = this._avoidanceTarget;
            const distToAvoid = Vector3.Distance(this.enemy.position, this._avoidanceTarget);
            
            // Si on est très proche du point de contournement (< 2 units), on l'abandonne
            if (distToAvoid < 2.0) {
                console.log(`[VS] 🎯 Point de contournement atteint! Retour à la poursuite`);
                this._avoidanceTarget = null;
                this._avoidanceTimer = 0;
                movementTarget = targetPos;
            } else if (this._frameCount % 30 === 0) {
                console.log(`[VS] ➜ Contournement EN COURS (${distToAvoid.toFixed(1)}u vers (${movementTarget.x.toFixed(1)}, ${movementTarget.z.toFixed(1)}))`);
            }
        }

        // ──── DÉTECTION D'OBSTACLE DIRECTE (avant de calculer le mouvement) ────
        // SEULEMENT si on n'a pas déjà un point de contournement en cours
        if (!this._avoidanceTarget) {
            const dirToTarget = movementTarget.subtract(this.enemy.position);
            if (dirToTarget.length() > 0.1) {
                dirToTarget.normalize();
                
                // Appeler getLocalAvoidanceVector pour détecter l'obstacle
                const avoidanceVec = this.pathfinding.getLocalAvoidanceVector(
                    this.enemy.position,
                    dirToTarget,
                    8.0,    // Distance de vérification
                    120     // Angle de scan
                );
                
                // Si getLocalAvoidanceVector retourne non-zero, c'est qu'il y a un obstacle!
                if (avoidanceVec.length() > 0.5) {
                    // Créer un point de contournement latéral intelligent
                    const perpRight = new Vector3(-dirToTarget.z, 0, dirToTarget.x);
                    const perpLeft = new Vector3(dirToTarget.z, 0, -dirToTarget.x);
                    perpRight.normalize();
                    perpLeft.normalize();
                    
                    const avoidDist = 8;
                    const rightPos = this.enemy.position.add(perpRight.scale(avoidDist));
                    const leftPos = this.enemy.position.add(perpLeft.scale(avoidDist));
                    
                    const distRight = Vector3.Distance(rightPos, targetPos);
                    const distLeft = Vector3.Distance(leftPos, targetPos);
                    
                    const chosen = distRight < distLeft ? rightPos : leftPos;
                    const side = distRight < distLeft ? "DROITE" : "GAUCHE";
                    
                    this._avoidanceTarget = chosen;
                    console.log(`[VS] 🚧 OBSTACLE DÉTECTÉ! Contournement ${side} vers (${chosen.x.toFixed(1)}, ${chosen.z.toFixed(1)})`);
                }
            }
        }

        // Récupérer vecteur mouvement avec séparation alliés (qui inclut aussi getLocalAvoidanceVector)
        let moveVec = this.pathfinding.getMovementVector(
            this.enemy.position,
            movementTarget,
            action.speed * this.speed,  // FSM speed × this.speed
            enemies,
            2.5,    // separationDistance
            1.2     // separationForce
        )

        // Afficher le moveVec si c'est zero
        if (moveVec.length() < 0.001) {
            console.warn(`[VoltStriker] ⚠️  moveVec est ZERO! action=${action.action}, targetPos=(${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)}), speed=${action.speed}`);
        }

        // Appliquer slow (stun, ralenti, debuff)
        const slow = (this._slowFactor !== undefined && this._slowFactor >= 0) ? this._slowFactor : 1
        const scaledMove = moveVec.scale(slow);

        // Tracker la position AVANT mouvement pour détecter si on est bloqué
        const posBeforeMove = this.enemy.position.clone();

        // Utiliser moveWithCollisions de Babylon pour gérer les collisions physiques
        this.enemy.moveWithCollisions(scaledMove);

        // Vérifier si on a été bloqué par une collision
        const actualMovement = Vector3.Distance(posBeforeMove, this.enemy.position);
        const intendedDistance = scaledMove.length();

        // Log mouvement si pas zéro
        if (moveVec.length() > 0.001 && this._frameCount % 30 === 0) {
            console.log(`[VS-MOVE] moveVec=${moveVec.length().toFixed(3)}, avoidTarget=${this._avoidanceTarget ? 'ACTIVE' : 'none'}`);
        }
    }
}
