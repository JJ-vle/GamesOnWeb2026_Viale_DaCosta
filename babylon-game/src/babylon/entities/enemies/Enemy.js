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
        this._hasSeenPlayer = false

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
        this.perception = {
            canSee: false,
            lastSeenPos: null,
            lastSeenTime: Infinity,
        }

        // ── OPTIMISATION: PerceptionSystem partagé (injecté par MainScene) ──
        // N'instancie plus un PerceptionSystem par ennemi
        this.perceptionSystem = null

        this.fsm = new EnemyAIFSM({
            fovDistance: 50,
            fovAngle: 90,
            attackRange: 5,
            retreatThreshold: 0.3,
            ...(aiConfig || {}),
        })

        // NavGrid partagée (sera injectée depuis MainScene)
        const navGrid = (aiConfig && aiConfig.navGrid) || null
        this.pathfinding = new PathfindingHelper(this.scene, navGrid)
    }

    /**
     * Injecte un PerceptionSystem partagé (1 seule instance pour tous les ennemis)
     */
    setPerceptionSystem(perceptionSystem) {
        this.perceptionSystem = perceptionSystem
    }

    /**
     * Injecte la NavGrid partagée dans le pathfinding de cet ennemi 
     * (appelé par MainScene après spawn)
     */
    setNavGrid(navGrid) {
        if (this.pathfinding) {
            this.pathfinding.navGrid = navGrid
        }
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
        
        // Mettre à jour perception de manière permanente
        perception.canSee = playerVisible
        if (playerVisible) {
            perception.lastSeenPos = playerMesh.position.clone()
            perception.lastSeenTime = 0
            this._hasSeenPlayer = true // L'ennemi se souviendra toujours
        } else if (this._hasSeenPlayer) {
            // Toujours continuer à pister le joueur s'il a été vu
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
            // ── OPTIMISATION: Filter ennemis proches pour séparation (éviter O(N²)) ──
            // Ne passer que les ennemis à moins de 10 units (séparation + margin)
            const nearbyEnemies = enemies.filter(e => {
                if (!e || !e.enemy) return false
                const dist = Vector3.Distance(this.enemy.position, e.enemy.position)
                return dist < 10
            })

            const moveVec = this.pathfinding.getMovementVector(
                this.enemy.position,
                targetPos,
                speed,
                nearbyEnemies,
                3.5,
                1.5
            )
            this.enemy.position.addInPlace(moveVec)
        }
    }

    
    takeDamage(amount) {
        this.life -= amount

        if (this.material) this.material.diffuseColor = new Color3(1, 0, 0)
        this._hitTimer = 0.1 

        // AGGRO IMMÉDIAT: être touché → forcer la poursuite du joueur
        this._hasSeenPlayer = true
        if (this.fsm) {
            this.fsm.send({ type: 'PLAYER_SPOTTED' })
        }
        
        if (this.life <= 0) {
            this.life = 0
            this.destroy()
        }
    }
    
    // ── OPTIMISATION: Vecteur réutilisable de séparation ──
    static _sepVec = new Vector3(0, 0, 0)
    static _awayVec = new Vector3(0, 0, 0)
    
    _getFlockingVector(enemiesArray, separationDistance = 3, separationForce = 0.5) {
        const sep = Enemy._sepVec
        sep.set(0, 0, 0)
        if (!this.enemy || !enemiesArray) return sep
        
        let count = 0
        for (const other of enemiesArray) {
            if (other === this || !other.enemy) continue
            const dist = Vector3.Distance(this.enemy.position, other.enemy.position)
            if (dist < separationDistance && dist > 0.001) {
                const away = Enemy._awayVec
                this.enemy.position.subtractToRef(other.enemy.position, away)
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

    /**
     * ── POOL: Réinitialise complètement l'ennemi pour réutilisation ──
     * Appelé par EnemyPool au lieu de destroy() quand on veut recycler.
     */
    reset() {
        this.life = this.maxLife
        this._hitTimer = 0
        this._hasSeenPlayer = false
        this.onDeath = null
        this.contact = null

        // Reset AI state
        if (this.perception) {
            this.perception.canSee = false
            this.perception.lastSeenPos = null
            this.perception.lastSeenTime = Infinity
        }
        if (this.fsm) {
            // Arrêter le service xstate actuel et en recréer un propre
            this.fsm.dispose()
            this.fsm = new EnemyAIFSM(this.fsm.config)
        }
        if (this.pathfinding) {
            this.pathfinding._currentPath = []
            this.pathfinding._currentWaypointIndex = 0
            this.pathfinding._pathTarget = null
            this.pathfinding._stuckFrameCount = 0
            this.pathfinding._lastPos = null
        }

        // Reset mesh visual
        if (this.enemy) {
            this.enemy.position.set(0, -1000, 0)
            this.enemy.setEnabled(false)
        }
    }
    
    destroy() {
        // Appeler onDeath AVANT de disposer quoi que ce soit
        const deathCallback = this.onDeath
        this.onDeath = null // Empêcher double-call

        // Nettoyer systèmes IA
        if (this.fsm) {
            this.fsm.dispose()
            this.fsm = null
        }
        this.perception = null
        this.pathfinding = null

        // NE PAS disposer le mesh si l'ennemi sera recyclé par le pool
        // Le mesh sera caché par reset() et réutilisé
        // destroy() est maintenant réservé au nettoyage final (quand on quitte la scène)
        if (this.enemy) {
            this.enemy.setEnabled(false)
            this.enemy.position.set(0, -1000, 0)
        }

        if (deathCallback) deathCallback()
    }

    /**
     * Dispose DÉFINITIVEMENT l'ennemi (mesh inclus).
     * Utilisé uniquement quand on veut vraiment libérer la mémoire GPU.
     */
    disposeFull() {
        if (this.fsm) {
            this.fsm.dispose()
            this.fsm = null
        }
        this.perception = null
        this.pathfinding = null
        this.perceptionSystem = null

        if (this.enemy) {
            this.enemy.dispose()
            this.enemy = null
        }
    }

}