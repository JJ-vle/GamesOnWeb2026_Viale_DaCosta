/**
 * REFERENCE ITEMS — Ce fichier n'est PAS importe par le jeu.
 *
 * Structure d'un item dans items.js :
 *
 *   "mon_item": {
 *       type:       "Passif" | "Actif",
 *       name:       "Nom Affiche",
 *       bonus:      "Description courte",
 *       modifiers:  { ... },
 *       pool:       "chest" | "shop" | "fusion",
 *       target:     "self" | "on damage" | "on kill" | "zone" | "other",
 *       slot:       "none" | "head" | "body" | "arm" | "leg" | "active",
 *       rarity:     1 | 2 | 3 | 4,
 *       price:      number,          // optionnel, pour pool "shop"
 *       cooldown:   number,          // optionnel, pour type "Actif"
 *       duration:   number,          // optionnel, duree en secondes
 *       extraInfo:  "Tooltip",       // optionnel
 *   }
 */

// ═══════════════════════════════════════════════════
//  LISTE DES MODIFIERS UTILISABLES DANS items.js
// ═══════════════════════════════════════════════════

export const MODIFIERS_REFERENCE = {

    // ── Stats additives (player.stat += value) ──
    damage:                 0.2,    // Force (degats)
    speed:                  0.1,    // Vitesse de deplacement
    fireRate:               0.2,    // Cadence de tir
    luck:                   0.5,    // Chance
    healthRegen:            0.1,    // Regeneration HP/s

    // ── Multiplicateur permanent (scale avec les futurs bonus) ──
    damageMultiplier:       1.5,    // x degats au calcul du tir

    // ── Snapshot (multiplie la stat actuelle, une seule fois) ──
    flatDamageDouble:       2,      // x strength a l'equipement

    // ── Flags booleens ──
    homingProjectiles:      true,   // Projectiles a tete chercheuse
    invulnerable:           true,   // Invulnerabilite
    preventStatDecrease:    true,   // Bloque les malus de stats
    poisonToHeal:           true,   // Poison -> soin
    restartWithItems:       true,   // Restart en gardant les items

    // ── Extensions de slots ──
    armSlots:               1,      // +N emplacements bras
    legSlots:               1,      // +N emplacements jambe
    headSlots:              1,      // +N emplacements tete
    bodySlots:              1,      // +N emplacements corps

    // ── Projectiles ──
    additionalProjectiles:  1,      // +N projectiles en cone
    projectileMultiplier:   2,      // xN projectiles en parallele

    // ── On-hit: brulure ──
    burnDamage:             2,      // Degats/s de brulure
    burnProc:               0.2,    // Chance de proc (0-1)

    // ── On-hit: ralentissement ──
    slowEffect:             0.5,    // Reduction vitesse ennemi (0.5 = -50%)
    slowProc:               0.2,    // Chance de proc (0-1)

    // ── On-hit: explosion ──
    explosionRadius:        3,      // Rayon AoE
    explosionDamage:        7.5,    // Degats AoE
    explosionProc:          0.25,   // Chance de proc (0-1)

    // ── On-hit: divers ──
    knockback:              1,      // Force de recul
    chainDamageCount:       5,      // Chaine de degats (N ennemis)

    // ── Passifs continus ──
    dotDamage:              0.2,    // Degats/s autour du joueur
    enemySlowRadius:        5,      // Rayon de slow autour du joueur
    contactDamage:          10,     // Degats au contact joueur-ennemi
    areaDamage:             1,      // Degats de zone au mouvement

    // ── Speciaux ──
    cooldownReduction:      0.05,   // Reduction des cooldowns
    rerollToken:            1,      // Token de reroll shop
    respawnCount:           1,      // Vies supplementaires
    conversionChance:       0.1,    // Chance de convertir un ennemi
    orbitingProjectiles:    3,      // Projectiles en orbite
    itemEffectMultiplier:   2,      // xN effets des futurs items
    damageTakenMultiplier:  2,      // xN degats recus
    iframes:                0,      // Duree i-frames (0 = supprime)
    aoeDamage:              5,      // Degats AoE periodique
};
