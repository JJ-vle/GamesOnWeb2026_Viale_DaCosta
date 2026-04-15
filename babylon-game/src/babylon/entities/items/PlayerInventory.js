import { ItemDatabase } from './items.js';

/**
 * Mapping modifier key → stat joueur.
 *
 * type 'additive'  : player[prop] += value
 * type 'boolean'   : player[prop] = true
 * type 'slot'      : augmente la capacité du slot ciblé
 *
 * Ajouter ici tout nouveau modifier défini dans items.js.
 */
const MODIFIER_MAP = {
    // ── Stats numériques additives ──
    speed:              { prop: 'speed',     type: 'additive' },
    damage:             { prop: 'strength',  type: 'additive' },
    fireRate:           { prop: 'speedshot', type: 'additive' },
    luck:               { prop: 'luck',      type: 'additive' },
    healthRegen:        { prop: 'regen',     type: 'additive' },

    // ── Multiplicateurs (appliqués au calcul, pas à la stat de base) ──
    damageMultiplier:   { prop: 'damageMultiplier',   type: 'multiply' },

    // ── Snapshot: multiplie la stat courante une fois à l'équipement ──
    flatDamageDouble:   { prop: 'strength',  type: 'snapshot_multiply' },

    // ── Flags booléens stockés sur le joueur ──
    homingProjectiles:  { prop: 'homingProjectiles',   type: 'boolean' },
    invulnerable:       { prop: 'invulnerableItem',    type: 'boolean' },
    preventStatDecrease:{ prop: 'preventStatDecrease', type: 'boolean' },
    poisonToHeal:       { prop: 'poisonToHeal',        type: 'boolean' },
    restartWithItems:   { prop: 'restartWithItems',    type: 'boolean' },

    // ── Extensions de slots (augmentent la capacité du slot) ──
    armSlots:           { slot: 'arm',    type: 'slot' },
    legSlots:           { slot: 'leg',    type: 'slot' },
    headSlots:          { slot: 'head',   type: 'slot' },
    bodySlots:          { slot: 'body',   type: 'slot' },
};

/**
 * PlayerInventory — Gestion data-driven de l'inventaire et des stats.
 *
 * Instancié par le Player. Prend la référence du joueur
 * pour modifier ses stats directement via addItem().
 *
 * Slots disponibles (tirés de items.js) :
 *   none   → capacité infinie
 *   head, arm, leg, body, active → 1 par défaut, extensibles via les modifiers *Slots
 */
export class PlayerInventory {

    /** Capacités par défaut des slots (hors 'none' = infini) */
    static DEFAULT_SLOT_CAPACITY = {
        head:   1,
        arm:    1,
        leg:    1,
        body:   1,
        active: 1,
    };

    /**
     * @param {import('../Player.js').Player} player
     */
    constructor(player) {
        this.player = player;

        /** Items possédés sous forme [{ id, item }] */
        this.items = [];

        /** Compteur d'occupation par slot */
        this.slotCount = { head: 0, arm: 0, leg: 0, body: 0, active: 0 };

        /** Capacité max par slot (extensible par les modifiers *Slots) */
        this.slotCapacity = { ...PlayerInventory.DEFAULT_SLOT_CAPACITY };

        /** Callback appelé lorsqu'un item est équipé */
        this.onItemEquipped = null;

        /** Callback appelé lorsqu'un item est retiré */
        this.onItemRemoved = null;
    }

    // ─────────────────────────────────────────────
    // API PUBLIQUE
    // ─────────────────────────────────────────────

    /**
     * Tente d'ajouter un item à l'inventaire.
     *
     * 1. Vérifie que l'item existe dans ItemDatabase.
     * 2. Vérifie qu'un slot est disponible.
     * 3. Boucle sur modifiers pour appliquer/stocker les stats.
     *
     * @param {string} itemId  — clé dans ItemDatabase (ex: 'plume')
     * @returns {boolean} true si l'item a été ajouté, false sinon
     */
    addItem(itemId) {
        const item = ItemDatabase[itemId];
        if (!item) {
            console.warn(`[PlayerInventory] Item inconnu : "${itemId}"`);
            return false;
        }

        if (!this._hasSlotAvailable(item.slot)) {
            console.warn(`[PlayerInventory] Slot "${item.slot}" plein pour l'item "${item.name}"`);
            return false;
        }

        this._occupySlot(item.slot);
        this.items.push({ id: itemId, item });

        this._applyModifiers(item.modifiers);

        console.log(`[PlayerInventory] "${item.name}" équipé (slot: ${item.slot})`);
        
        if (this.onItemEquipped) {
            this.onItemEquipped(item);
        }

        return true;
    }

    /**
     * Tente de retirer un item de l'inventaire.
     *
     * 1. Cherche l'item via son ID.
     * 2. Retire l'item du tableau.
     * 3. Libère l'espace dans le slot.
     * 4. Retire les statistiques (modifiers) accordées.
     *
     * @param {string} itemId
     * @returns {boolean}
     */
    removeItem(itemId) {
        const index = this.items.findIndex(i => i.id === itemId);
        if (index === -1) {
            console.warn(`[PlayerInventory] Item non possédé : "${itemId}"`);
            return false;
        }

        const removedData = this.items.splice(index, 1)[0];
        const item = removedData.item;

        this._freeSlot(item.slot);
        this._unapplyModifiers(item.modifiers);

        console.log(`[PlayerInventory] "${item.name}" déséquipé (slot: ${item.slot})`);

        if (this.onItemRemoved) {
            this.onItemRemoved(item);
        }

        return true;
    }

    /** Retourne tous les items possédés */
    getItems() {
        return this.items;
    }

    getOccupiedSlots() {
    return new Set(
        Object.entries(this.slotCount)
            .filter(([slot, count]) => count >= this.slotCapacity[slot])
            .map(([slot]) => slot)
    );
    }

    /** Retourne l'occupation actuelle des slots */
    getSlotStatus() {
        return {
            ...Object.fromEntries(
                Object.entries(this.slotCount).map(([s, count]) => [
                    s,
                    `${count}/${this.slotCapacity[s]}`
                ])
            ),
            none: '∞/∞'
        };
    }

    // ─────────────────────────────────────────────
    // LOGIQUE INTERNE
    // ─────────────────────────────────────────────

    /** Vérifie si un slot a de la place */
    _hasSlotAvailable(slot) {
        if (slot === 'none') return true;
        if (!(slot in this.slotCount)) {
            console.warn(`[PlayerInventory] Slot inconnu dans la DB : "${slot}"`);
            return false;
        }
        return this.slotCount[slot] < this.slotCapacity[slot];
    }

    /** Incrémente le compteur du slot (no-op pour 'none') */
    _occupySlot(slot) {
        if (slot !== 'none') this.slotCount[slot]++;
    }

    /** Décrémente le compteur du slot */
    _freeSlot(slot) {
        if (slot !== 'none' && this.slotCount[slot] > 0) {
            this.slotCount[slot]--;
        }
    }

    /**
     * Boucle dynamique sur les modifiers et applique chaque effet.
     *
     * Exemples d'entrées :
     *   { speed: 0.1 }                    → player.speed += 0.1
     *   { homingProjectiles: true }        → player.homingProjectiles = true
     *   { armSlots: 1 }                    → this.slotCapacity.arm += 1
     *   { damage: 0.5, speed: -0.2 }       → multi-stat
     *
     * @param {Object} modifiers
     */
    _applyModifiers(modifiers) {
        if (!modifiers) return;

        for (const [mod, value] of Object.entries(modifiers)) {
            const mapping = MODIFIER_MAP[mod];

            if (!mapping) {
                // Wind Up: bloquer les modifiers négatifs si preventStatDecrease est actif
                if (this.player.preventStatDecrease && typeof value === 'number' && value < 0) {
                    console.info(`[PlayerInventory] Wind Up: modifier négatif "${mod}" (${value}) bloqué`);
                    continue;
                }
                // Modifier non mappé : stocké brut sur le joueur pour usage futur
                this.player[mod] = (this.player[mod] ?? 0) + value;
                console.info(`[PlayerInventory] Modifier non mappé "${mod}" stocké brut sur le joueur (valeur: ${value})`);
                continue;
            }

            switch (mapping.type) {
                case 'additive':
                    // Wind Up: bloquer les modifiers négatifs si preventStatDecrease est actif
                    if (this.player.preventStatDecrease && value < 0) {
                        console.info(`[PlayerInventory] Wind Up: stat decrease "${mapping.prop}" (${value}) bloquée`);
                        break;
                    }
                    this.player[mapping.prop] = (this.player[mapping.prop] ?? 0) + value;
                    break;

                case 'multiply':
                    // Multiplicateur persistant (appliqué au calcul, pas à la stat)
                    // Plusieurs items se cumulent : x1.5 puis x2 → total x3
                    this.player[mapping.prop] = (this.player[mapping.prop] ?? 1) * value;
                    break;

                case 'snapshot_multiply':
                    // Multiplie la stat courante une seule fois à l'équipement
                    // Ex: strength=3, flatDamageDouble=2 → strength=6
                    this.player[mapping.prop] = (this.player[mapping.prop] ?? 1) * value;
                    break;

                case 'boolean':
                    if (value === true) this.player[mapping.prop] = true;
                    break;

                case 'slot':
                    this.slotCapacity[mapping.slot] = (this.slotCapacity[mapping.slot] ?? 1) + value;
                    break;
            }
        }
    }

    /**
     * Retire les effets d'un item.
     *
     * @param {Object} modifiers
     */
    _unapplyModifiers(modifiers) {
        if (!modifiers) return;

        for (const [mod, value] of Object.entries(modifiers)) {
            const mapping = MODIFIER_MAP[mod];

            if (!mapping) {
                this.player[mod] = (this.player[mod] ?? 0) - value;
                continue;
            }

            switch (mapping.type) {
                case 'additive':
                    this.player[mapping.prop] = (this.player[mapping.prop] ?? 0) - value;
                    break;

                case 'multiply':
                    // Inverse du multiplicateur
                    this.player[mapping.prop] = (this.player[mapping.prop] ?? 1) / value;
                    break;

                case 'snapshot_multiply':
                    // Inverse du snapshot (divise la stat courante)
                    this.player[mapping.prop] = (this.player[mapping.prop] ?? 1) / value;
                    break;

                case 'boolean':
                    this.player[mapping.prop] = this.items.some(
                        i => i.item.modifiers && i.item.modifiers[mod] === true
                    );
                    break;

                case 'slot':
                    this.slotCapacity[mapping.slot] = (this.slotCapacity[mapping.slot] ?? 1) - value;
                    break;
            }
        }
    }
}
