/**
 * Item.js — Classe de base pour tous les items du jeu.
 *
 * Chaque item possède :
 *  - id, name, description, icon (emoji)
 *  - rarity : 1 (USB) | 2 (Module) | 3 (Module MK2) | 4 (Master Core)
 *  - slot   : 'head' | 'body' | 'arms' | 'legs'
 *  - onEquip(player)  : applique l'effet permanent
 *  - onRemove(player) : retire l'effet (pour futurs swaps)
 *  - onProc(enemy, player) : effet déclenché par chance lors d'un tir (peut être null)
 *  - procChance : probabilité de base (0→1) avant multiplication par player.luck
 */
export class Item {
    /**
     * @param {Object} config
     * @param {string} config.id
     * @param {string} config.name
     * @param {string} config.description
     * @param {string} config.icon  emoji
     * @param {1|2|3|4} config.rarity
     * @param {'head'|'body'|'arms'|'legs'} config.slot
     * @param {function(player):void} config.onEquip
     * @param {function(player):void} [config.onRemove]
     * @param {function(enemy, player):void} [config.onProc]
     * @param {number} [config.procChance=0]  base proc chance 0→1
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon ?? '📦';
        this.rarity = config.rarity ?? 1;
        this.slot = config.slot ?? 'body';
        this._onEquip = config.onEquip ?? (() => {});
        this._onRemove = config.onRemove ?? (() => {});
        this.onProc = config.onProc ?? null;
        this.procChance = config.procChance ?? 0;
    }

    /** Applique les effets permanents de l'item au joueur */
    equip(player) {
        this._onEquip(player);
    }

    /** Retire les effets permanents de l'item du joueur */
    remove(player) {
        this._onRemove(player);
    }

    /**
     * Calcule la chance de proc effective selon le luck du joueur.
     * @param {number} luck  player.luck
     * @returns {boolean}  true si proc déclenché
     */
    rollProc(luck = 1) {
        if (!this.procChance) return false;
        const effectiveChance = Math.min(1, this.procChance * luck);
        return Math.random() < effectiveChance;
    }

    /** Libellé des étoiles selon la rareté */
    get rarityStars() {
        return '⭐'.repeat(this.rarity);
    }

    /** Couleur CSS/hex associée à la rareté */
    get rarityColor() {
        switch (this.rarity) {
            case 1: return '#aaaaaa'; // Gris — USB
            case 2: return '#44cc44'; // Vert — Module
            case 3: return '#4488ff'; // Bleu — MK2
            case 4: return '#ff9900'; // Or   — Master Core
            default: return '#ffffff';
        }
    }
}
