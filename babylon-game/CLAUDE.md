# CLAUDE.md — Babylon Game (GamesOnWeb 2026)

## Projet
Jeu 3D type twin-stick shooter / roguelite en Babylon.js v8. Le joueur contrôle un mecha-robot, affronte des vagues d'ennemis par rounds, monte de niveau et choisit des items entre les rounds.

## Stack
- **Engine** : Babylon.js 8 (`@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`)
- **UI & App** : Vue 3 (Composition API)
- **Build** : Vite (`npm run dev` / `npm run build`)
- **Langage** : JavaScript ES modules — pas de TypeScript
- **Assets** : GLB dans `public/assets/models/`, map dans `public/assets/map_1.glb` (~50MB, goulot de performance)

## Commandes
```bash
npm run dev      # Dev server (Vite)
npm run build    # Build production
npm run preview  # Preview build
```

## Architecture
```
src/
  App.vue / main.js          — Racine Vue
  components/                — BabylonScene.vue, InventoryView.vue, ZoneMapView.vue
  stores/useGameMode.js      — Mode actif (combat / map)

src/babylon/
  Game.js                    — Point d'entrée, boucle principale
  BabylonService.js          — Init engine/scene
  Round.js                   — Gestion d'un round
  Zone.js / ZoneTree.js      — Zones de la map
  scenes/
    GameConfig.js            — TOUTES les constantes du jeu (MAP, LIGHTS, etc.) — modifier ici, pas inline
    MainScene.js             — Scène principale (gameplay, rounds, loot, collisions)
    WorldBuilder.js          — Construction du monde
    RoundOrchestrator.js     — Orchestration des rounds
    EnemySpawnHandler.js     — Spawn des ennemis
  entities/
    Player.js                — Joueur (mouvement, rotation souris, stats)
    enemies/
      Enemy.js               — Classe de base (NavGrid AI, FSM, perception, pathfinding A*)
      new/                   — Ennemis avancés (tous sur NavGrid AI)
    items/
      items.js               — Définitions de tous les items
      Item.js                — Classe de base item
    weapons/                 — Armes joueur + projectiles
  systems/                   — NavGrid, EnemyAIFSM, CollisionSystem, LootSystem, BuildSystem,
                               XPSystem, UISystem, WeaponSystem, ActiveAbilitySystem, etc.
  cameras/                   — CameraManager, TpsCamera, IsoCamera
  ui/                        — LootUI, PauseUI
```

## État actuel
- **Terminé** : IA ennemis (NavGrid + FSM), système d'équipement, loot/items, XP/levelup, armes
- **WIP** : Écran d'accueil (`6898056`)
- **À faire** : *(à compléter)*
- **Fichier à ignorer** : `MainScene_backup.js` — ancienne version

## Système d'IA ennemis (NavGrid)

Toute la logique est dans `Enemy.js` via 3 méthodes composables :

1. **`updateHitFlash()`** — flash visuel quand touché
2. **`updateNavGridAI(playerMesh, enemies, options)`** — pipeline complet (perception → FSM → A* → mouvement)
3. **`applyRotation(moveVec, lerpFactor)`** — rotation lissée vers la direction de mouvement

**Patterns d'utilisation :**
```js
// Chase pur (minimal)
update(playerMesh, projectiles, enemies) {
    this.updateHitFlash()
    const result = this.updateNavGridAI(playerMesh, enemies)
    if (result) this.applyRotation(result.scaledMove)
}

// Mouvement additif (zigzag, orbit, strafe)
const result = this.updateNavGridAI(playerMesh, enemies)
if (result?.moved) {
    this.enemy.position.addInPlace(lateralOffset)
    this.applyRotation(result.scaledMove)
}

// FSM custom (DashTrigger, TitanRam, BlastZone)
if (this.state === 'APPROACH') {
    const result = this.updateNavGridAI(playerMesh, enemies)
} else if (this.state === 'DASHING') {
    // Logique custom, pas de NavGrid
}
```

**Template pour nouvel ennemi** : voir `entities/enemies/QUICKSTART_Templates.js`

**Attention vitesses** : NavGrid multiplie `action.speed * this.speed` — les vitesses ne sont PAS les mêmes qu'avant la migration. Ex : HeavyEnemy `0.028 → 0.5`, MetroidEnemy `0.055 → 1.0`.

**Exception** : `SupportEnemy.js` a son propre pathfinding custom, NON migré vers NavGrid.

## Système d'équipement

- **Standard (1-2 étoiles)** : consommables, pas de limite → `BuildSystem.consumables[]`
- **Chassis (3-4 étoiles)** : un par slot corporel → `BuildSystem.chassisSlots{}`
- **6 slots** : `head`, `body`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`
- **Auto-ban** : quand un slot est occupé, les items chassis pour ce slot sont exclus du pool (`LootSystem.generatePool()` reçoit `occupiedSlots` depuis `BuildSystem.getOccupiedSlots()`)

**Stats joueur** : `strength`, `speed`, `speedshot`, `luck`, `regen`, `lifesteal`, `armor`

## Pièges connus
- La rotation joueur utilise `Math.atan2(-dx, -dz)` — l'inversion est intentionnelle (fix souris)
- `map_1.glb` (~50MB) est le principal goulot de perf — optimiser dans Blender
- Toutes les constantes de gameplay sont dans `GameConfig.js` — ne pas les mettre inline
