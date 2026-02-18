import { Zone } from "../Zone.js";
import { Round } from "../Round.js";

export class RoundSystem {
    constructor(scene) {
        this.scene = scene;
        this.zones = []; // List of zones
    }

    addZone(zone) {
        this.zones.push(zone);
    }

    startAllRounds() {
        this.zones.forEach(zone => {
            zone.getRounds().forEach(round => {
                round.startRound();
            });
        });
    }
}