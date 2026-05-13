import { ItemDatabase } from '../entities/items/items.js'

/**
 * ShopSystem — Génère des pools d'items pour le shop du marchand.
 *
 * Contraintes :
 *   - 4 items pour la vente
 *   - Au moins 1 item de rareté 2 ou plus
 *   - Probabilité de rareté 3 et 4 augmentée de 50%
 *   - Prix basé sur la rareté : 1=50, 2=100, 3=200, 4=400
 *
 * Usage :
 *   const shopSystem = new ShopSystem()
 *   const pool = shopSystem.generatePool(player.money)
 */
export class ShopSystem {

    constructor() {
        /** Poids de rareté modifiés pour le shop (50% boost sur 3 et 4) */
        this.rarityWeights = [48, 20, 18, 12];  // Augmenté 3 et 4 de 50%

        /** Catalogue complet */
        this.catalog = this._buildCatalog();

        /** Mapping rareté -> prix */
        this.priceMap = { 1: 50, 2: 100, 3: 200, 4: 400 };
    }

    _buildCatalog() {
        return Object.entries(ItemDatabase).map(([id, data]) => ({ id, ...data }));
    }

    /**
     * Génère un pool de 4 items pour le shop.
     * Contrainte : AU MOINS 1 item de rareté 2 ou plus
     * @param {number} [playerMoney=0]  argent du joueur (pour filtrer items trop chers)
     * @param {Set<string>} [occupiedSlots=new Set()]  slots occupés (optional)
     * @returns {Object[]}  4 items avec champs `id`, `price` (basé sur rareté)
     */
    generatePool(playerMoney = 0, occupiedSlots = new Set()) {
        const pool = [];
        const usedIds = new Set();

        // Phase 1 : Assurer au moins 1 item de rareté 2+
        let hasMinRarity2 = false;
        let tries = 0;
        while (!hasMinRarity2 && tries < 50) {
            tries++;
            const rarity = this._rollRarity();
            if (rarity >= 2) {
                const item = this._pickRandomItem(rarity, usedIds, occupiedSlots);
                if (item) {
                    item.price = this.priceMap[item.rarity];
                    pool.push(item);
                    usedIds.add(item.id);
                    hasMinRarity2 = true;
                }
            }
        }

        // Phase 2 : Remplir jusqu'à 4 items
        tries = 0;
        while (pool.length < 4 && tries < 100) {
            tries++;
            const rarity = this._rollRarity();
            const item = this._pickRandomItem(rarity, usedIds, occupiedSlots);
            if (item) {
                item.price = this.priceMap[item.rarity];
                pool.push(item);
                usedIds.add(item.id);
            }
        }

        return pool;
    }

    /**
     * Tire une rareté selon les poids du shop.
     * @returns {1|2|3|4}
     */
    _rollRarity() {
        const total = this.rarityWeights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < this.rarityWeights.length; i++) {
            r -= this.rarityWeights[i];
            if (r <= 0) return i + 1;
        }
        return 1;
    }

    /**
     * Choisit un item aléatoire d'une rareté donnée
     * @param {number} rarity
     * @param {Set} usedIds   ids déjà utilisés
     * @param {Set} occupiedSlots
     * @returns {Object|null}
     */
    _pickRandomItem(rarity, usedIds, occupiedSlots) {
        const candidates = this.catalog.filter(i => {
            if (i.rarity !== rarity) return false;
            if (usedIds.has(i.id)) return false;
            if (i.pool !== 'chest' && i.pool !== 'shop') return false;
            // Auto-ban : exclure les items châssis (3-4★) dont le slot est occupé
            if (i.rarity >= 3 && occupiedSlots.has(i.slot)) return false;
            return true;
        });

        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
}
