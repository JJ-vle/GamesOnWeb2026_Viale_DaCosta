/**
 * BuildSystem — Gère les slots de modules du robot et l'application des effets.
 *
 * Deux catégories d'items :
 *  - Standard (1-2★) : consommables, pas de limite, stockés dans `consumables`
 *  - Châssis  (3-4★) : un seul item par slot corporel (6 emplacements)
 *
 * Slots corporels : head, body, rightArm, leftArm, rightLeg, leftLeg
 *
 * Usage :
 *   const build = new BuildSystem(player)
 *   build.equipItem(item)            // equipe selon la catégorie
 *   build.getEquippedItems()         // retourne tous les items équipés
 *   build.getProcItems()             // items ayant un onProc (pour CollisionSystem)
 *   build.getOccupiedSlots()         // set des slots chassis occupés (pour auto-ban)
 */
export class BuildSystem {

    /** Liste des 6 slots corporels */
    static SLOT_NAMES = ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];

    /**
     * @param {Player} player
     */
    constructor(player) {
        this.player = player;

        /** Slots châssis (3-4★) — un seul item par slot (null = vide) */
        this.chassisSlots = {
            head: null,
            body: null,
            rightArm: null,
            leftArm: null,
            rightLeg: null,
            leftLeg: null,
        };

        /** Items standard (1-2★) — pas de limite */
        this.consumables = [];

        /** Historique des items équipés (pour l'affichage) */
        this.equippedHistory = [];

        // Callbacks
        this.onItemEquipped = null; // (item) => void
    }

    // ─────────────────────────────────────────────
    // GESTION DES SLOTS CHÂSSIS
    // ─────────────────────────────────────────────

    /**
     * Retourne true si le slot châssis est libre.
     * @param {string} slot
     */
    isSlotFree(slot) {
        return slot in this.chassisSlots && this.chassisSlots[slot] === null;
    }

    /**
     * Retourne le Set des noms de slots actuellement occupés.
     * Utilisé par LootSystem pour l'auto-ban.
     */
    getOccupiedSlots() {
        const occupied = new Set();
        for (const [slot, item] of Object.entries(this.chassisSlots)) {
            if (item !== null) occupied.add(slot);
        }
        return occupied;
    }

    /**
     * Libère un slot châssis et retire l'effet de l'item.
     * @param {string} slot
     * @returns {Item|null} l'item retiré, ou null
     */
    unequipSlot(slot) {
        if (!(slot in this.chassisSlots) || this.chassisSlots[slot] === null) return null;
        const item = this.chassisSlots[slot];
        item.remove(this.player);
        this.chassisSlots[slot] = null;
        return item;
    }

    // ─────────────────────────────────────────────
    // ÉQUIPEMENT
    // ─────────────────────────────────────────────

    /**
     * Équipe un item.
     *  - Standard (1-2★) → ajouté aux consumables (pas de limite)
     *  - Châssis  (3-4★) → placé dans le slot corporel (un seul par slot)
     * @param {Item} item
     */
    equipItem(item) {
        if (item.isChassis) {
            const slot = item.slot;
            if (!(slot in this.chassisSlots)) {
                console.warn(`[BuildSystem] Slot inconnu: ${slot}`);
                return false;
            }
            // Si le slot est déjà occupé, on retire l'ancien
            if (this.chassisSlots[slot] !== null) {
                this.unequipSlot(slot);
            }
            this.chassisSlots[slot] = item;
        } else {
            // Standard (1-2★) → consumables sans limite
            this.consumables.push(item);
        }

        // Appliquer l'effet (passer buildSystem pour les Master Cores qui ajoutent des slots)
        item.equip(this.player, this);
        this.equippedHistory.push(item);

        if (this.onItemEquipped) this.onItemEquipped(item);
        return true;
    }

    // ─────────────────────────────────────────────
    // GETTERS
    // ─────────────────────────────────────────────

    /** Retourne tous les items actuellement équipés (châssis + consumables) */
    getEquippedItems() {
        const chassis = Object.values(this.chassisSlots).filter(Boolean);
        return [...chassis, ...this.consumables];
    }

    /** Retourne les items qui ont un effet onProc */
    getProcItems() {
        return this.getEquippedItems().filter(i => i.onProc !== null);
    }

    /** Résumé texte pour le debug */
    getSummary() {
        const lines = [];
        const slotLabels = {
            head: 'Tête    ',
            body: 'Corps   ',
            rightArm: 'Bras D  ',
            leftArm: 'Bras G  ',
            rightLeg: 'Jambe D ',
            leftLeg: 'Jambe G ',
        };
        for (const [slot, item] of Object.entries(this.chassisSlots)) {
            const label = slotLabels[slot] || slot;
            lines.push(`${label}: ${item ? `${item.icon}${item.name}` : '[ vide ]'}`);
        }
        if (this.consumables.length > 0) {
            lines.push(`Modules : ${this.consumables.map(i => `${i.icon}${i.name}`).join(', ')}`);
        }
        return lines.join('\n');
    }
}
