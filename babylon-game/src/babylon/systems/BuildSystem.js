/**
 * BuildSystem — Gère les slots de modules du robot et l'application des effets.
 *
 * Structure initiale : 1 slot par partie du corps (Tête/Corps/Bras/Jambes).
 * Évolution : addSlot(part) pour débloquer un slot supplémentaire (via Master Core 4★).
 *
 * Usage :
 *   const build = new BuildSystem(player)
 *   build.equipItem(item)            // equipe dans le bon slot
 *   build.getEquippedItems()         // retourne tous les items équipés
 *   build.getProcItems()             // items ayant un onProc (pour CollisionSystem)
 */
export class BuildSystem {

    /**
     * @param {Player} player
     */
    constructor(player) {
        this.player = player;

        /** Slots par partie du corps — tableau de taille variable */
        this.slots = {
            head: [null],
            body: [null],
            arms: [null],
            legs: [null],
        };

        /** Historique des items équipés (pour l'affichage) */
        this.equippedHistory = [];

        // Callbacks
        this.onItemEquipped = null; // (item) => void
    }

    // ─────────────────────────────────────────────
    // GESTION DES SLOTS
    // ─────────────────────────────────────────────

    /**
     * Ajoute un slot supplémentaire à une partie du corps.
     * @param {'head'|'body'|'arms'|'legs'} part
     */
    addSlot(part) {
        if (!this.slots[part]) return;
        this.slots[part].push(null);
        // console.log(`[BuildSystem] +1 slot ${part} → ${this.slots[part].length} slots`);
    }

    /**
     * Retourne le nombre de slots libres pour une partie.
     * @param {'head'|'body'|'arms'|'legs'} part
     */
    freeSlots(part) {
        return this.slots[part]?.filter(s => s === null).length ?? 0;
    }

    /**
     * Retourne le nombre total de slots pour une partie.
     */
    totalSlots(part) {
        return this.slots[part]?.length ?? 0;
    }

    // ─────────────────────────────────────────────
    // ÉQUIPEMENT
    // ─────────────────────────────────────────────

    /**
     * Équipe un item dans le bon slot.
     * Si le slot est plein, remplace l'item le plus ancien.
     * @param {Item} item
     */
    equipItem(item) {
        const part = item.slot;
        if (!this.slots[part]) {
            console.warn(`[BuildSystem] Slot inconnu: ${part}`);
            return false;
        }

        const freeIdx = this.slots[part].indexOf(null);

        if (freeIdx !== -1) {
            // Slot libre → on équipe directement
            this.slots[part][freeIdx] = item;
        } else {
            // Pas de slot libre → on étend la taille des slots et on l'ajoute !
            this.slots[part].push(item);
            // console.log(`[BuildSystem] Accumulation: Nouveau module ajouté (${this.slots[part].length} dans ${part})`);
        }

        // Appliquer l'effet (passer buildSystem pour les Master Cores qui ajoutent des slots)
        item.equip(this.player, this);
        this.equippedHistory.push(item);

        // console.log(`[BuildSystem] Équipé: ${item.rarityStars} ${item.name} (${part})`);
        if (this.onItemEquipped) this.onItemEquipped(item);
        return true;
    }

    // ─────────────────────────────────────────────
    // GETTERS
    // ─────────────────────────────────────────────

    /** Retourne tous les items actuellement équipés (non null) */
    getEquippedItems() {
        return Object.values(this.slots)
            .flat()
            .filter(Boolean);
    }

    /** Retourne les items qui ont un effet onProc */
    getProcItems() {
        return this.getEquippedItems().filter(i => i.onProc !== null);
    }

    /** Résumé texte pour le debug */
    getSummary() {
        const lines = [];
        for (const [part, items] of Object.entries(this.slots)) {
            const filled = items.map(i => i ? `${i.icon}${i.name}` : '[ vide ]').join(' | ');
            lines.push(`${part.padEnd(5)}: ${filled}`);
        }
        return lines.join('\n');
    }
}
