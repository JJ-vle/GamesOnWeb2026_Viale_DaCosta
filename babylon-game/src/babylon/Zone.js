export class Zone {
    constructor(scene) {
        this.scene = scene;
        this.rounds = []; // List of rounds in this zone
        this.spawners = []; // Stocke les EnemySpawner de la zone (points de spawn)
    }

    addSpawner(spawner) {
        this.spawners.push(spawner);
    }

    getSpawners() {
        return this.spawners;
    }

    addRound(round) {
        this.rounds.push(round);
    }

    getRounds() {
        return this.rounds;
    }

    // Configure le round courant avec les spawners de la zone
    configureRound(roundIndex) {
        const round = this.rounds[roundIndex];
        if (round) {
            // On transmet la configuration des spawners de la zone au round
            round.spawners = [...this.spawners];
        }
    }
}