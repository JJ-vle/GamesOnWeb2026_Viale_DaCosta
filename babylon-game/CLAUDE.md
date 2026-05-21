# CLAUDE.md — Babylon Game (GamesOnWeb 2026)

## Projet
Jeu 3D twin-stick shooter / roguelite en Babylon.js v8. Le joueur contrôle un mecha-robot, affronte des vagues d'ennemis par rounds, monte de niveau et choisit des items entre les rounds. Deux modes : **arcade** et **story** (avec dialogues de scénario).

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
  App.vue / main.js                — Racine Vue
  components/
    BabylonScene.vue               — Canvas principal Babylon
    InventoryView.vue              — Inventaire joueur
    ZoneMapView.vue                — Carte des zones
    DialogueView.vue               — Affichage des dialogues scénario
    GameEndView.vue                — Écran fin de partie (victoire / défaite)
    ShopView.vue                   — Interface du marchand
    StoryIntroView.vue             — Intro narrative (wraps DialogueView)
    ModelViewer.vue                — Visualisateur 3D d'item
  stores/
    useGameMode.js                 — mode ('combat'|'map') + gameplayMode ('arcade'|'story')

src/babylon/
  Game.js                          — Point d'entrée, boucle principale
  BabylonService.js                — Init engine/scene
  Round.js                         — Gestion d'un round
  Zone.js / ZoneTree.js            — Zones de la map
  cameras/
    CameraManager.js / IsoCamera.js / TpsCamera.js
  scenes/
    GameConfig.js                  — TOUTES les constantes du jeu — modifier ici, pas inline
    BaseScene.js                   — Classe de base scène
    MainScene.js                   — Scène principale (gameplay, rounds, loot, collisions)
    WorldBuilder.js                — Construction du monde
    RoundOrchestrator.js           — Orchestration des rounds
    EnemySpawnHandler.js           — Spawn des ennemis
  entities/
    Player.js                      — Joueur (mouvement, rotation souris, stats)
    Coin.js                        — Pièces (ramassage, valeur)
    enemies/
      Enemy.js                     — Classe de base (NavGrid AI, FSM, perception, A*)
      SimpleEnemy.js / HeavyEnemy.js / MetroidEnemy.js / SupportEnemy.js
      QUICKSTART_Templates.js      — Template pour créer un nouvel ennemi
      new/                         — 19 ennemis avancés (tous NavGrid sauf SupportEnemy)
        NeonLeviathan.js           — Boss final (2 phases, tourelles, jammers, AOE)
        LeviathanTurret.js         — Tourelles du boss (LEFT/RIGHT)
        BossJammerUnit.js          — Jammers phase 2 (bloquent le dash)
        DashTrigger.js / TitanRam.js / BlastZone.js / BoltSentry.js
        DroneSwarm.js / EchoWraith.js / NeonVector.js / NitroHusk.js
        PyroCaster.js / SludgePhrax.js / ToxicWasp.js / VoltStriker.js
        BastionRed.js / CoreSpawner.js / IronBulwark.js / JammerUnit.js / LinkCommander.js
    items/
      items.js                     — Définitions de tous les items (ItemDatabase)
      ITEM_REFERENCE.js            — Référence rapide items
      PlayerInventory.js           — Application des modifiers sur les stats joueur
    weapons/
      Weapon.js / Projectile.js    — Classes de base
      PistolWeapon.js / PistolProjectile.js
      LaserWeapon.js / LaserProjectile.js
      ActivableWeapon.js / Activable.js / ActivableProjectile.js
      GrenadeActivable.js / GrenadeProjectile.js / HealActivable.js
      EnemyProjectile.js
  systems/
    NavGrid.js                     — Grille de navigation (pathfinding A*)
    EnemyAIFSM.js                  — Machine à états finie ennemis
    PerceptionSystem.js            — Détection du joueur
    PathfindingHelper.js           — Utilitaires pathfinding
    AISystem_README.md             — Doc interne du système IA
    CollisionSystem.js             — Collisions (projectiles, ennemis, joueur)
    BuildSystem.js                 — Équipement chassis (slots corporels)
    LootSystem.js                  — Génération de pool d'items après round
    ShopSystem.js                  — Génération de pool pour le marchand
    WeaponSystem.js                — Gestion des armes joueur
    ActiveAbilitySystem.js         — Capacités actives (dash, etc.)
    XPSystem.js                    — XP, niveaux, levelup
    UISystem.js                    — HUD en jeu
    RoundSystem.js                 — Transitions de rounds
    ScenarioSystem.js              — Dialogues scénario (lit scenarios.json)
    scenarios.json                 — Dialogues par zone/round
    SpawnerSystem.js               — Spawn aléatoire avec zones d'exclusion/inclusion
    EnemyPool.js                   — Pool de réutilisation des ennemis
    LoadingScreen.js               — Écran de chargement
    PerformanceMonitor.js          — Monitor FPS (toggle avec une touche)
    XRaySystem.js                  — Transparence des obstacles
  ui/
    LootUI.js                      — UI choix d'items post-round
    PauseUI.js                     — Menu pause
    ShopUI.js                      — Interface marchand (Babylon GUI)
```

## Fichiers à ignorer
- `MainScene_backup.js` — ancienne version, ne pas toucher

## État actuel
- **Terminé** : IA ennemis (NavGrid + FSM), système d'équipement, loot/items, XP/levelup, armes, pièces/shop, scénario/dialogues, boss NeonLeviathan (2 phases), écran fin de partie, intro story,Écran d’accueil
- **À faire** : *(à compléter)*
-Boss
-Scénario (système de fait)
-Model 3D ennemis
-Music
-Rest Area / Random Encounter
-Model 3D maps
-Optimisation Lag
-Améliorer la map
-Refaire me menu items inventaire (“I”)
-Détailler ce que font les objets
-Particules
-Shaders


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

## Boss NeonLeviathan

Implémenté dans `entities/enemies/new/NeonLeviathan.js`.

- **Phase 1 (Artillerie)** : quasi-invulnérable (5% des dégâts). Spawn 2 tourelles `LeviathanTurret` (LEFT/RIGHT). Passage en Phase 2 quand les 2 tourelles sont détruites.
- **Phase 2 (Overheat)** : vulnérable à 100%. Spawn 4 `BossJammerUnit` → `scene.isDashJammed = true`. Cycle AOE : 12s avertissement (disc rouge pulsant) → 3s AOE active (10 DPS, rayon 25u) → 15s cooldown, puis boucle.
- **Stats** : 500 HP, 0 speed, 500 XP, 300 coins.

## Système d'équipement

- **Standard (1-2 étoiles)** : consommables, pas de limite → `BuildSystem.consumables[]`
- **Chassis (3-4 étoiles)** : un par slot corporel → `BuildSystem.chassisSlots{}`
- **6 slots** : `head`, `body`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`
- **Auto-ban** : quand un slot est occupé, les items chassis pour ce slot sont exclus du pool (`LootSystem.generatePool()` reçoit `occupiedSlots` depuis `BuildSystem.getOccupiedSlots()`)

**Stats joueur** : `strength`, `speed`, `speedshot`, `luck`, `regen`, `lifesteal`, `armor`, `damageMultiplier`, `homingProjectiles`, `invulnerableItem`, `poisonToHeal`, `restartWithItems`

## Shop (marchand)
`ShopSystem.generatePool(playerMoney, occupiedSlots)` — 4 items, au moins 1 rareté 2+, boost 50% sur raretés 3-4. Prix : rareté 1=50, 2=100, 3=200, 4=400 coins.

## Scénario / Dialogues
- `ScenarioSystem` lit `scenarios.json` (dialogues indexés par `zoneId` + `round`)
- Déclenché via `startDialogueSequence(zoneId, roundNumber)` — joué une seule fois par clé `zone_round`
- Avancement via `window.scenarioNext()` exposé globalement
- Rendu via `DialogueView.vue`

## Modes de jeu
`useGameMode.js` expose deux états :
- `mode` : `'combat'` | `'map'` — overlay UI actif pendant la session
- `gameplayMode` : `'arcade'` | `'story'` | `null` — choisi au menu principal

## Pièges connus
- La rotation joueur utilise `Math.atan2(-dx, -dz)` — l'inversion est intentionnelle (fix souris)
- `map_1.glb` (~50MB) est le principal goulot de perf — optimiser dans Blender
- Toutes les constantes de gameplay sont dans `GameConfig.js` — ne pas les mettre inline
- `SpawnerSystem` supporte des `exclusionZones` et `inclusionZones` rectangulaires pour contrôler les zones de spawn
