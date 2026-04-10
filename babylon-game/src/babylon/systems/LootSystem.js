import { ItemDatabase } from '../entities/items/items.js'

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
 *   const pool = loot.generatePool(3)   // tableau de 3 plain-objects depuis ItemDatabase
 */
export class LootSystem {

    constructor() {
        /** Poids de rareté [r1, r2, r3, r4] — somme = 100 */
        this.rarityWeights = [60, 20, 8, 1];

        /** Catalogue complet de tous les items (plain objects avec id injecté) */
        this.catalog = this._buildCatalog();
    }

    // ════════════════════════════════════════════════════
    // CATALOGUE D'ITEMS
    // ════════════════════════════════════════════════════

    /** Construit le catalogue à partir de ItemDatabase (Data-Driven). */
    _buildCatalog() {
        return Object.entries(ItemDatabase).map(([id, data]) => ({ id, ...data }));
    }

    // ════════════════════════════════════════════════════
    // GÉNÉRATION DU POOL DE LOOT
    // ════════════════════════════════════════════════════

    /**
     * Génère un pool de N items distincts selon les poids de rareté.
     * Les items de châssis (3-4★) dont le slot est déjà occupé sont exclus (auto-ban).
     * @param {number} [count=3]
     * @param {number} [luckBonus=1]  player.luck pour biaiser vers le haut
     * @param {Set<string>} [occupiedSlots=new Set()]  slots déjà pris
     * @returns {Object[]}  plain-objects depuis ItemDatabase (avec champ `id`)
     */
    generatePool(count = 3, luckBonus = 1, occupiedSlots = new Set()) {
        const pool = [];
        const usedIds = new Set();

        let tries = 0;
        while (pool.length < count && tries < 100) {
            tries++;
            const rarity = this._rollRarity(luckBonus);
            const candidates = this.catalog.filter(i => {
                if (i.rarity !== rarity) return false;
                if (usedIds.has(i.id)) return false;
                // Auto-ban : exclure les items châssis (3-4★) dont le slot est occupé
                if (i.rarity >= 3 && occupiedSlots.has(i.slot)) return false;
                return true;
            });
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
