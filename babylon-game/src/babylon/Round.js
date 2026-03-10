import { Enemy } from "./entities/enemies/Enemy.js";

export class Round {
    /**
     * @param {BABYLON.Scene} scene
     * @param {Zone} zone - la zone à laquelle ce round appartient
     * @param {Object} [options]
     * @param {number} [options.timelimit=60] - Durée du round en secondes
     * @param {number} [options.timebefore=5] - Temps d'attente avant le round
     */
    constructor(scene, zone, options = {}) {
        this.scene = scene;
        this.zone = zone;

        this.timelimit = options.timelimit ?? 60;
        this.timebefore = options.timebefore ?? 5;

        this.moblimit = null;
        this.mobs = []; // [{ type: EnemyClass, count: number, spawnInterval?: number }]

        this.remainingBefore = this.timebefore;
        this.remainingTime = this.timelimit;
        this.state = "idle"; // 'idle' | 'waiting' | 'running' | 'finished'

        // Kill tracking — victoire si tous les mobs spawnés sont morts
        this._totalSpawned = 0;
        this._totalKilled = 0;
        this._maxSpawnCount = 0; // total de mobs à spawner ce round

        // Callbacks
        this.onRoundEnd = null;   // appelé quand le round se termine (les 2 conditions)
        this.onVictory = null;    // appelé si victoire (tous morts OU survie)
        this.onDefeat = null;     // réservé pour extension future
    }

    // ─────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────

    addMob(mob) {
        this.mobs.push(mob);
    }

    getMobs() {
        return this.mobs;
    }

    /**
     * Appelé par le SpawnerSystem ou MainScene quand un ennemi est spawné
     */
    notifyEnemySpawned() {
        this._totalSpawned++;
    }

    /**
     * Appelé par MainScene quand un ennemi meurt
     */
    notifyEnemyKilled() {
        this._totalKilled++;
        this._checkAllEnemiesDead();
    }

    // ─────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────

    configureSpawners() {
        if (!this.zone || !this.zone.getSpawners) return;
        const spawners = this.zone.getSpawners();
        if (spawners.length > 0 && this.mobs.length > 0) {
            const mob = this.mobs[0];
            const spawner = spawners[0];
            this._maxSpawnCount = mob.count ?? Infinity;
            spawner.configure({
                enemyType: mob.type,
                spawnInterval: mob.spawnInterval || 2,
                maxSpawns: mob.count,
            });
        }
    }

    startRound() {
        if (!this.zone || !this.zone.getSpawners) return;
        this.configureSpawners();
        const spawners = this.zone.getSpawners();

        // Reset compteurs
        this._totalSpawned = 0;
        this._totalKilled = 0;

        this.remainingBefore = this.timebefore;
        this.remainingTime = this.timelimit;
        this.state = this.timebefore > 0 ? "waiting" : "running";

        spawners.forEach(spawner => {
            spawner.stop();
            spawner._timer = 0;
        });
    }

    stopRound() {
        if (!this.zone || !this.zone.getSpawners) return;
        const spawners = this.zone.getSpawners();
        spawners.forEach(spawner => spawner.stop());
        this.state = "finished";
        if (this.onRoundEnd) this.onRoundEnd();
        if (this.onVictory) this.onVictory();
    }

    // ─────────────────────────────────────────────
    // Update
    // ─────────────────────────────────────────────

    update(deltaTime) {
        if (this.state === "finished" || this.state === "idle") return;

        if (this.state === "waiting") {
            this.remainingBefore -= deltaTime;
            if (this.remainingBefore <= 0) {
                const spawners = this.zone.getSpawners();
                spawners.forEach(spawner => {
                    spawner.start();
                    spawner._timer = 0;
                });
                this.state = "running";
            }
            return;
        }

        if (this.state === "running") {
            this.remainingTime -= deltaTime;

            // Condition 1 : timer écoulé → victoire par survie
            if (this.remainingTime <= 0) {
                console.log('[Round] Victoire par survie (timer écoulé)');
                this.stopRound();
                return;
            }

            // Condition 2 : tous les mobs du round sont morts → victoire rapide
            // (vérifiée aussi dans _checkAllEnemiesDead au moment du kill)
        }
    }

    // ─────────────────────────────────────────────
    // Condition de victoire : tous les mobs morts
    // ─────────────────────────────────────────────

    /**
     * Vérifie si tous les mobs spawnés sont morts.
     * Déclenche stopRound() si c'est le cas ET que le spawn est terminé.
     */
    _checkAllEnemiesDead() {
        if (this.state !== "running") return;

        const spawnerDone = this._isSpawnerDone();
        if (spawnerDone && this._totalKilled >= this._totalSpawned) {
            console.log(`[Round] Victoire ! Tous les mobs éliminés (${this._totalKilled}/${this._totalSpawned})`);
            this.stopRound();
        }
    }

    /**
     * Retourne true si le spawner a fini de générer tous ses mobs
     */
    _isSpawnerDone() {
        if (!this.zone || !this.zone.getSpawners) return false;
        const spawners = this.zone.getSpawners();
        if (spawners.length === 0) return true;
        const spawner = spawners[0];
        // Le spawner a un maxSpawns optionnel ; si non défini → jamais "done" sauf timer
        if (spawner.maxSpawns == null) return false;
        return spawner.spawnedCount >= spawner.maxSpawns;
    }
}