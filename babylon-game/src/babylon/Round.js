import { Enemy } from "./entities/enemies/Enemy.js";
import { EnemySpawner } from "./entities/EnemySpawner.js";

export class Round {
    /**
     * @param {BABYLON.Scene} scene
     * @param {Zone} zone - la zone à laquelle ce round appartient
     */
    constructor(scene, zone) {
        this.scene = scene;
        this.zone = zone; // référence à la zone pour récupérer les spawners
        this.moblimit = null; // par défaut on en met pas
        this.timelimit = 60; // Durée du round en secondes
        this.timebefore = 10; // Temps avant le début du round (en secondes)
        this.mobs = []; // [{ type: EnemyClass, count: number, spawnInterval?: number }]
        this.remainingBefore = this.timebefore;
        this.remainingTime = this.timelimit;
        this.state = "idle"; // 'idle' | 'waiting' | 'running' | 'finished'
        this.onRoundEnd = null; // callback when round ends
    }

    // Ajoute un type d'ennemi à faire spawn
    // ex: { type: SimpleEnemy, count: 5, spawnInterval: 2 }
    addMob(mob) {
        this.mobs.push(mob);
    }
    
    getMobs() {
        return this.mobs;
    }

    // Configure les spawners de la zone pour ce round (type d'ennemi, intervalle, etc.)
    configureSpawners() {
        if (!this.zone || !this.zone.getSpawners) return;
        const spawners = this.zone.getSpawners();
        for (let i = 0; i < spawners.length; i++) {
            const mob = this.mobs[i % this.mobs.length];
            const spawner = spawners[i];
            spawner.configure({
                enemyType: mob.type,
                spawnInterval: mob.spawnInterval || 2
            });
        }
    }

    // Démarre la manche : configure les spawners de la zone et active le spawn
    startRound() {
        if (!this.zone || !this.zone.getSpawners) return;
        this.configureSpawners();
        const spawners = this.zone.getSpawners();
        // enter waiting state first (timebefore)
        this.remainingBefore = this.timebefore;
        this.remainingTime = this.timelimit;
        this.state = this.timebefore > 0 ? "waiting" : "running";
        spawners.forEach(spawner => {
            spawner.isSpawning = false;
            spawner._timer = 0;
        });
    }

    // Arrête tous les spawners de la zone
    stopRound() {
        if (!this.zone || !this.zone.getSpawners) return;
        const spawners = this.zone.getSpawners();
        spawners.forEach(spawner => {
            spawner.isSpawning = false;
        });
        this.state = "finished";
        if (this.onRoundEnd) this.onRoundEnd();
    }

    // Met à jour le timer du round. deltaTime en secondes.
    update(deltaTime) {
        if (this.state === "finished" || this.state === "idle") return;

        if (this.state === "waiting") {
            this.remainingBefore -= deltaTime;
            if (this.remainingBefore <= 0) {
                // start spawning
                const spawners = this.zone.getSpawners();
                spawners.forEach(spawner => {
                    spawner.isSpawning = true;
                    spawner._timer = 0;
                });
                this.state = "running";
            }
            return;
        }

        if (this.state === "running") {
            this.remainingTime -= deltaTime;
            if (this.remainingTime <= 0) {
                this.stopRound();
            }
        }
    }
}