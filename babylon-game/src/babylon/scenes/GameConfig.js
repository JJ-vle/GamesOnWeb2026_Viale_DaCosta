// src/babylon/scenes/GameConfig.js
// Toutes les constantes du jeu regroupées par domaine.

// ── Map ──────────────────────────────────────────────────────────────
export const MAP = {
  WIDTH: 130,
  HEIGHT: 110,
  WALL_HEIGHT: 10,
  WALL_THICKNESS: 1,
  NAV_CELL_SIZE: 1,
  GROUND_SUBDIVISIONS: 1,
  CLEAR_COLOR:      [0.02, 0.02, 0.05],
  GROUND_DIFFUSE:   [0.15, 0.15, 0.2],
  GROUND_SPECULAR:  [0.2,  0.2,  0.4],
}

// ── Lumières ─────────────────────────────────────────────────────────
export const LIGHTS = {
  AMBIENT_INTENSITY: 0.5,
  AMBIENT_DIFFUSE:   [0.5, 0.35, 0.7],
  AMBIENT_GROUND:    [0.2, 0.1,  0.4],

  CYAN_POS:       [-30, 10,  30],
  CYAN_DIFFUSE:   [0,   1,   1],
  CYAN_INTENSITY: 5.0,
  CYAN_RANGE:     120,

  PINK_POS:       [30,  10, -30],
  PINK_DIFFUSE:   [1,   0,   1],
  PINK_INTENSITY: 5.0,
  PINK_RANGE:     120,

  BLUE_POS:       [0,  15,   0],
  BLUE_DIFFUSE:   [0.2, 0.5, 1.0],
  BLUE_INTENSITY: 4.0,
  BLUE_RANGE:     150,

  GLOW_INTENSITY: 0.8,
}

// ── Spawn ennemis ─────────────────────────────────────────────────────
export const SPAWN = {
  ENEMY_SCALE:    0.35,          // scaling appliqué à tout ennemi spawné
  ACTIVE_DISTANCE: 50,           // distance max pour update FSM/pathfinding
  MIN_DIST_FROM_PLAYER: 5,       // rayon d'exclusion autour du joueur

  // Zones d'exclusion de spawn [point_min, point_max] (coordonnées XZ, Y=0)
  EXCLUSION_ZONES: [
    [[-6.3,  0,   8.1], [-16.1, 0,  22.0]],
    [[ 8.1,  0,   6.6], [ 31.2, 0,  30.4]],
    [[-20.9, 0,   7.0], [-31.7, 0,  31.0]],
    [[ 8.3,  0, -16.6], [ 16.6, 0, -32.2]],
    [[20.9,  0, -23.6], [ 31.4, 0, -31.9]],
  ],
  INCLUSION_ZONE: [[-45.1, 0, 41.3], [44.5, 0, -46.6]],
}

// ── Rounds ────────────────────────────────────────────────────────────
export const ROUND = {
  // Round initial (premier niveau)
  INITIAL_TIME_LIMIT:  120,
  INITIAL_TIME_BEFORE: 5,
  INITIAL_VOLT_COUNT:  5,   // nombre de VoltStrikers du round 0

  // Rounds pré-définis (buildZoneForNode)
  TIME_LIMIT_BASE:  90,    // timelimit = TIME_LIMIT_BASE + r * TIME_LIMIT_STEP
  TIME_LIMIT_STEP:  30,
  TIME_BEFORE:      3,

  // Mode infini (startNextRound)
  INFINITE_TIME_BASE:  120,  // timelimit = INFINITE_TIME_BASE + n * INFINITE_TIME_STEP
  INFINITE_TIME_STEP:  20,
  INFINITE_TIME_BEFORE: 5,
  INFINITE_MOBS_BASE:  10,   // totalMobs = INFINITE_MOBS_BASE + n * INFINITE_MOBS_STEP
  INFINITE_MOBS_STEP:  5,

  // Composition des mobs
  MOBS_BASE:       6,      // totalMobs = MOBS_BASE + r * MOBS_STEP
  MOBS_STEP:       4,
  FRAC_CAT1:       0.7,
  FRAC_CAT2:       0.25,

  // Intervalles de spawn par catégorie (secondes)
  INTERVAL_CAT1:   1.5,
  INTERVAL_CAT2:   3.0,
  INTERVAL_CAT3:   6.0,
}

// ── Arbre de zones ────────────────────────────────────────────────────
export const ZONE_TREE = {
  MIN_DEPTH: 7,
  MAX_DEPTH: 8,
}
