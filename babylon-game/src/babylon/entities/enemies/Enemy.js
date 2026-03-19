import {
    Vector3,
    MeshBuilder,
    Color3,
    StandardMaterial
} from '@babylonjs/core'
import { PerceptionSystem } from '../../systems/PerceptionSystem'
import { PathfindingHelper } from '../../systems/PathfindingHelper'
import { EnemyAIFSM } from '../../systems/EnemyAIFSM'

export class Enemy {

    constructor(scene, contact, maxLife, aiConfig = null) {
        this.scene = scene;
        this.enemy = null; // à créer dans les classes filles
        this.material = null
        this.verticalVelocity = 0;
        this.contact = contact;

        this.maxLife = maxLife
        this.life = this.maxLife

        // Valeurs par défaut — chaque classe fille peut les surcharger
        this.xpValue = 10
        this.coinValue = 5

        this._hitTimer = 0
        this.onDeath = null // callback() quand l'ennemi meurt

        // ──── SYSTÈMES IA ────
        this.perception = null
        this.fsm = null
        this.pathfinding = null
        if (aiConfig !== false) {
            this._initializeAI(aiConfig)
        }
    }

    /**
     * Initialise les systèmes AI (overridable dans les classes filles)
     */
    _initializeAI(aiConfig = null) {
        // État de perception simple
        const perceptionState = {
            canSee: false,
            lastSeenPos: null,
            lastSeenTime: Infinity,
        }

        // Système de perception réel pour raycast/LOS
        const perceptionSystem = new PerceptionSystem(this.scene)
        
        // Wrapper pour garder compatibilité avec l'ancien code
        this.perception = perceptionState
        this.perceptionSystem = perceptionSystem

        this.fsm = new EnemyAIFSM({
            fovDistance: 30,
            fovAngle: 90,
            attackRange: 5,
            retreatThreshold: 0.3,
            ...(aiConfig || {}),
        })

        this.pathfinding = new PathfindingHelper(this.scene)
    }

    _createMesh() {
    }
    
    /**
     * Update principal: IA + déplacement + animations
     * À surcharger dans les classes filles si besoin
     */
    update(playerMesh, projectiles = [], enemies = []) {
        if (!this.enemy) return

        // Flash rouge au hit
        if (this._hitTimer > 0) {
            this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000
            if (this._hitTimer <= 0) {
                this.material.diffuseColor = new Color3(1, 1, 1)
            }
        }

        // Logique IA (si activée par aiConfig)
        if (this.fsm && this.perception) {
            this.updateAI(playerMesh, enemies)
        }
    }

    /**
     * Update IA seule: perception + FSM + mouvement
     * À surcharger pour des comportements spécifiques
     * Les classes filles appelleront super.updateAI() puis ajouteront leur logique
     */
    updateAI(playerMesh, enemies = []) {
        if (!this.fsm || !this.perception || !this.pathfinding) return

        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000
        const perception = this.perception

        // 1. PERCEPTION: Vérifier si joueur visible
        const canSee = this.fsm.machine._machine
            ? false // Fallback si xstate pas init complètement
            : false
        
        // Meilleure approche: créer un simple système de perception si pas de PerceptionSystem
        const playerDistance = Vector3.Distance(this.enemy.position, playerMesh.position)
        const playerVisible = playerDistance < (this.fsm.config.fovDistance || 30)
        
        // Mettre à jour perception
        perception.canSee = playerVisible
        if (playerVisible) {
            perception.lastSeenPos = playerMesh.position.clone()
            perception.lastSeenTime = 0
        } else {
            perception.lastSeenTime += deltaTime
        }

        // 2. FSM: Déterminer action basée sur perception
        const action = this.fsm.getAction({
            health: this.life,
            maxHealth: this.maxLife,
            position: this.enemy.position,
            playerPos: playerVisible ? playerMesh.position : null,
            targetPos: perception.lastSeenPos,
        })

        // 3. DÉPLACEMENT: Appliquer mouvement basé sur action
        const deltaMs = this.scene.getEngine().getDeltaTime()
        const speed = action.speed || 0.1
        const targetPos = action.targetPos || this.enemy.position

        if (action.action !== 'idle' && action.action !== 'dead') {
            const moveVec = this.pathfinding.getMovementVector(
                this.enemy.position,
                targetPos,
                speed,
                enemies,
                3.5,
                1.5
            )
            this.enemy.position.addInPlace(moveVec)
        }
    }

    
    takeDamage(amount) {
        this.life -= amount

        this.material.diffuseColor = new Color3(1, 0, 0)
        this._hitTimer = 0.1 
        
        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }
    
    _getFlockingVector(enemiesArray, separationDistance = 3, separationForce = 0.5) {
        let sep = new Vector3(0, 0, 0)
        if (!this.enemy || !enemiesArray) return sep
        
        let count = 0
        for (const other of enemiesArray) {
            if (other === this || !other.enemy) continue
            const dist = Vector3.Distance(this.enemy.position, other.enemy.position)
            if (dist < separationDistance && dist > 0.001) {
                const away = this.enemy.position.subtract(other.enemy.position)
                away.y = 0
                away.normalize()
                sep.addInPlace(away.scale(separationDistance - dist))
                count++
            }
        }
        if (count > 0) {
            sep.scaleInPlace(separationForce / count)
        }
        sep.y = 0
        return sep
    }
    
    destroy() {
        // Nettoyer systèmes IA
        if (this.fsm) {
            this.fsm.dispose()
            this.fsm = null
        }
        this.perception = null
        this.pathfinding = null

        // Nettoyer mesh
        if (this.enemy) {
            this.enemy.dispose()
            this.enemy = null
        }
        if (this.onDeath) this.onDeath()
    }

}