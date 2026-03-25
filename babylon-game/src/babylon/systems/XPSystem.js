/**
 * XPSystem — Gère l'expérience et les niveaux du joueur.
 *
 * Gains d'XP par mob :
 *   SimpleEnemy  : 10 XP
 *   HeavyEnemy   : 25 XP
 *   MetroidEnemy : 20 XP
 *
 * Formule de niveau :
 *   level = floor(sqrt(totalXP / 50))
 *
 * Usage :
 *   const xp = new XPSystem()
 *   xp.addXP(10)       → peut déclencher onLevelUp(newLevel)
 *   xp.level           → niveau actuel
 *   xp.progressToNext  → fraction [0..1] vers le prochain niveau
 */
export class XPSystem {

    // NOTE: Les valeurs d'XP et de pièces sont maintenant définies sur chaque
    // instance d'ennemi (`xpValue`, `coinValue`). Les tables globales ont été
    // supprimées pour forcer l'utilisation des propriétés par-enemy.

    constructor() {
        this.totalXP = 0;
        this.level = 1;

        /** Appelé quand le joueur monte de niveau : (newLevel) => void */
        this.onLevelUp = null;
    }

    // ─────────────────────────────────────────────
    // XP & Niveaux
    // ─────────────────────────────────────────────

    /**
     * Ajoute de l'XP et vérifie la montée de niveau.
     * @param {number} amount
     */
    addXP(amount) {
        this.totalXP += amount;
        const newLevel = this._computeLevel(this.totalXP);
        if (newLevel > this.level) {
            this.level = newLevel;
            // console.log(`[XPSystem] ⬆ Niveau ${this.level} ! (${this.totalXP} XP total)`);
            if (this.onLevelUp) this.onLevelUp(this.level);
        }
    }

    /**
     * Ajoute l'XP correspondant à un type d'ennemi.
     * @param {string} enemyClassName  ex: 'SimpleEnemy'
     */
    addXPForEnemy(enemyClassName) {
        // Deprecated: conserver pour compatibilité silencieuse mais ne doit
        // plus être utilisé. Retourne 0 et n'ajoute rien.
        return 0;
    }

    /**
     * Retourne le nombre de pièces à donner pour un type d'ennemi.
     * @param {string} enemyClassName
     */
    coinsForEnemy(enemyClassName) {
        // Deprecated: ne doit plus être utilisé.
        return 0;
    }

    /**
     * Calcule le niveau à partir de l'XP totale.
     * level = floor(sqrt(totalXP / 50)) + 1
     */
    _computeLevel(xp) {
        return Math.floor(Math.sqrt(xp / 50)) + 1;
    }

    /**
     * Retourne l'XP nécessaire pour atteindre le niveau N.
     * (inverse de la formule : xp = (level-1)² × 50)
     */
    xpForLevel(level) {
        return Math.pow(level - 1, 2) * 50;
    }

    /**
     * Fraction de progression vers le prochain niveau [0..1].
     */
    get progressToNext() {
        const current = this.xpForLevel(this.level);
        const next = this.xpForLevel(this.level + 1);
        if (next <= current) return 1;
        return (this.totalXP - current) / (next - current);
    }

    /**
     * XP restante pour le prochain niveau.
     */
    get xpToNextLevel() {
        return Math.max(0, this.xpForLevel(this.level + 1) - this.totalXP);
    }
}
