import { Item } from '../entities/items/Item.js'

/**
 * LootSystem — Génère des pools d'items aléatoires selon les raretés.
 *
 * Poids de rareté par défaut (modifiables) :
 *   ⭐ 1  (USB Keys)       : 60%
 *   ⭐⭐ 2 (Modules)        : 25%
 *   ⭐⭐⭐ 3 (Modules MK2)  : 12%
 *   ⭐⭐⭐⭐ 4 (Master Cores): 3%
 *
 * Usage :
 *   const loot = new LootSystem()
 *   const pool = loot.generatePool(3)   // tableau de 3 Items
 */
export class LootSystem {

    constructor() {
        /** Poids de rareté [r1, r2, r3, r4] — somme = 100 */
        this.rarityWeights = [60, 20, 8, 1];

        /** Catalogue complet de tous les items */
        this.catalog = this._buildCatalog();
    }

    // ════════════════════════════════════════════════════
    // CATALOGUE D'ITEMS
    // ════════════════════════════════════════════════════
    _buildCatalog() {
        return [

            // ── ⭐ 1 — USB Keys (boosts de stats purs) ──────────────
            new Item({
                id: 'usb_damage',
                name: 'Câble Acier',
                description: '+0.2 Dégâts',
                icon: '🔌',
                rarity: 1,
                slot: 'arms',
                onEquip: p => { p.strength += 0.2; },
                onRemove: p => { p.strength -= 0.2; },
            }),
            new Item({
                id: 'usb_speed',
                name: 'Moteur Turbo',
                description: '+0.15 Vitesse',
                icon: '⚡',
                rarity: 1,
                slot: 'legs',
                onEquip: p => { p.speed += 0.15; },
                onRemove: p => { p.speed -= 0.15; },
            }),
            new Item({
                id: 'usb_luck',
                name: 'Puce Aléatoire',
                description: '+0.2 Chance',
                icon: '🎲',
                rarity: 1,
                slot: 'head',
                onEquip: p => { p.luck += 0.2; },
                onRemove: p => { p.luck -= 0.2; },
            }),
            new Item({
                id: 'usb_armor',
                name: 'Blindage Léger',
                description: '+0.5 Armure',
                icon: '🛡️',
                rarity: 1,
                slot: 'body',
                onEquip: p => { p.armor += 0.5; },
                onRemove: p => { p.armor -= 0.5; },
            }),
            new Item({
                id: 'usb_firerate',
                name: 'Condensateur USB',
                description: '+0.1 Cadence de tir',
                icon: '💾',
                rarity: 1,
                slot: 'arms',
                onEquip: p => { p.speedshot += 0.1; },
                onRemove: p => { p.speedshot -= 0.1; },
            }),

            // ── ⭐⭐ 2 — Modules élémentaires ───────────────────────
            new Item({
                id: 'fire_module',
                name: 'Module Ignis',
                description: '20% : Brûlure (1HP/s, 2s)',
                icon: '🔥',
                rarity: 2,
                slot: 'arms',
                procChance: 0.20,
                onEquip: p => { p._hasFireModule = true; },
                onRemove: p => { p._hasFireModule = false; },
                onProc: (enemy) => {
                    if (!enemy || !enemy.enemy) return;
                    // Burn DoT : -1HP/s pendant 2s
                    if (enemy._burnTimer > 0) return; // déjà en feu
                    enemy._burnTimer = 2.0;
                    enemy._burnDps = 1;
                },
            }),
            new Item({
                id: 'ice_module',
                name: 'Module Glacies',
                description: '20% : Ralentit -50% (1.5s)',
                icon: '❄️',
                rarity: 2,
                slot: 'arms',
                procChance: 0.20,
                onEquip: p => { p._hasIceModule = true; },
                onRemove: p => { p._hasIceModule = false; },
                onProc: (enemy) => {
                    if (!enemy || !enemy.enemy) return;
                    enemy._slowTimer = 1.5;
                    enemy._slowFactor = 0.5;
                },
            }),

            // ── ⭐⭐⭐ 3 — Modules MK2 ───────────────────────────────
            new Item({
                id: 'fire_mk2',
                name: 'Module Ignis MK2',
                description: '30% : Brûlure (2HP/s, 3s)',
                icon: '🌋',
                rarity: 3,
                slot: 'arms',
                procChance: 0.30,
                onEquip: p => { p._hasFireMK2 = true; },
                onRemove: p => { p._hasFireMK2 = false; },
                onProc: (enemy) => {
                    if (!enemy || !enemy.enemy) return;
                    enemy._burnTimer = 3.0;
                    enemy._burnDps = 2;
                },
            }),
            new Item({
                id: 'ice_mk2',
                name: 'Module Glacies MK2',
                description: '30% : Gel total (2s)',
                icon: '🧊',
                rarity: 3,
                slot: 'arms',
                procChance: 0.30,
                onEquip: p => { p._hasIceMK2 = true; },
                onRemove: p => { p._hasIceMK2 = false; },
                onProc: (enemy) => {
                    if (!enemy || !enemy.enemy) return;
                    enemy._slowTimer = 2.0;
                    enemy._slowFactor = 0; // gel complet
                },
            }),
            new Item({
                id: 'pierce_module',
                name: 'Module Perçant',
                description: '+0.4 Dégâts (armure ignorée)',
                icon: '🗡️',
                rarity: 3,
                slot: 'arms',
                onEquip: p => { p.strength += 0.4; p._piercingDamage = (p._piercingDamage || 0) + 1; },
                onRemove: p => { p.strength -= 0.4; p._piercingDamage = Math.max(0, (p._piercingDamage || 1) - 1); },
            }),

            // ── ⭐⭐⭐⭐ 4 — Master Cores ─────────────────────────────
            new Item({
                id: 'regen_core',
                name: 'Cœur Régénérant',
                description: '+2 HP/s régénération',
                icon: '💚',
                rarity: 4,
                slot: 'body',
                onEquip: p => { p.regen += 2; },
                onRemove: p => { p.regen -= 2; },
            }),
            new Item({
                id: 'damage_mult',
                name: 'Surcharge Quantum',
                description: 'Dégâts ×1.5',
                icon: '⚛️',
                rarity: 4,
                slot: 'body',
                onEquip: p => { p.strength *= 1.5; },
                onRemove: p => { p.strength /= 1.5; },
            }),
            new Item({
                id: 'lucky_core',
                name: 'Processeur Fortune',
                description: 'Chance ×2',
                icon: '🍀',
                rarity: 4,
                slot: 'head',
                onEquip: p => { p.luck *= 2; },
                onRemove: p => { p.luck /= 2; },
            }),
            new Item({
                id: 'slot_plus_arms',
                name: 'Bras Modulaire',
                description: '+1 Slot Bras',
                icon: '🦾',
                rarity: 4,
                slot: 'arms',
                onEquip: (p, buildSystem) => {
                    if (buildSystem) buildSystem.addSlot('arms');
                },
                onRemove: () => { },
            }),
        ];
    }

    // ════════════════════════════════════════════════════
    // GÉNÉRATION DU POOL DE LOOT
    // ════════════════════════════════════════════════════

    /**
     * Génère un pool de N items distincts selon les poids de rareté.
     * @param {number} [count=3]
     * @param {number} [luckBonus=1]  player.luck pour biaiser vers le haut
     * @returns {Item[]}
     */
    generatePool(count = 3, luckBonus = 1) {
        const pool = [];
        const usedIds = new Set();

        let tries = 0;
        while (pool.length < count && tries < 100) {
            tries++;
            const rarity = this._rollRarity(luckBonus);
            const candidates = this.catalog.filter(i => i.rarity === rarity && !usedIds.has(i.id));
            if (candidates.length === 0) continue;

            const item = candidates[Math.floor(Math.random() * candidates.length)];
            pool.push(item);
            usedIds.add(item.id);
        }
        return pool;
    }

    /**
     * Tire une rareté selon les poids (modifiés par luck).
     * luck > 1 augmente les chances de rareté élevée.
     * @param {number} luckBonus
     * @returns {1|2|3|4}
     */
    _rollRarity(luckBonus = 1) {
        // Appliquer le luck : amplifier les hautes raretés
        const weights = [...this.rarityWeights];
        if (luckBonus > 1) {
            const boost = (luckBonus - 1) * 0.15; // +15% haut par point de luck
            weights[0] = Math.max(5, weights[0] - boost * 30);
            weights[1] = weights[1] + boost * 10;
            weights[2] = weights[2] + boost * 12;
            weights[3] = Math.min(30, weights[3] + boost * 8);
        }
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i + 1;
        }
        return 1;
    }
}
