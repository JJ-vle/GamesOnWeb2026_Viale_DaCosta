# CLAUDE.md — Babylon Game (GamesOnWeb 2026)

## Projet
Jeu 3D type twin-stick shooter / roguelite en Babylon.js (v8). Le joueur controle un mecha-robot, affronte des vagues d'ennemis par rounds, monte de niveau et choisit des items entre les rounds.

## Stack
- **Engine** : Babylon.js 8 (`@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`)
- **Build** : Vite (`npm run dev` / `npm run build`)
- **Langage** : JavaScript ES modules (pas de TypeScript)
- **Modeles 3D** : GLB (mecha01_idle.glb, mecha01_run.glb, etc.) dans `public/assets/models/`
- **Map** : `public/assets/map_1.glb` (~50MB, gros fichier, necessite Blender pour optimiser)

## Architecture src/babylon/

```
Game.js              — Point d'entree, boucle principale
BabylonService.js    — Initialisation engine/scene Babylon
Round.js             — Gestion d'un round (spawns, timer)
Zone.js / ZoneTree.js — Zones de la map

scenes/
  BaseScene.js       — Scene de base
  MainScene.js       — Scene principale (gameplay, rounds, loot, collisions)

entities/
  Player.js          — Joueur (mecha robot, mouvement, rotation souris, stats)
  Coin.js            — Pieces ramassables
  items/
    Item.js           — Classe de base item (rarity, slot, equip/remove/proc)
  weapons/
    Weapon.js / LaserWeapon.js / PistolWeapon.js — Armes du joueur
    Projectile.js / LaserProjectile.js / PistolProjectile.js
    Activable.js / ActivableWeapon.js / GrenadeActivable.js / HealActivable.js
    EnemyProjectile.js — Projectiles ennemis
  enemies/
    Enemy.js          — CLASSE DE BASE (NavGrid AI, FSM, perception, pathfinding A*)
    SimpleEnemy.js    — Ennemi basique (sphere blanche, 10HP)
    HeavyEnemy.js     — Tank lent (cube rouge, 25HP, 2 dmg)
    MetroidEnemy.js   — Flottant zigzag (15HP)
    SupportEnemy.js   — Healer (pathfinding custom, NON migre vers NavGrid)
    new/              — Ennemis avances (tous sur NavGrid AI) :
      VoltStriker.js    — Reference NavGrid (GLB, lean animation)
      BoltSentry.js     — Tourelle tire des projectiles (attackRange: 15)
      PyroCaster.js     — Tire des projectiles feu (attackRange: 12)
      IronBulwark.js    — Bouclier bloquant les degats de face
      DashTrigger.js    — Dash charge vers le joueur (FSM: APPROACH/CHARGING/DASHING/COOLDOWN)
      TitanRam.js       — Ram charge massive (FSM: IDLE/LOCKING/RAMMING/STUNNED)
      NeonVector.js     — Strafing erratique additif
      DroneSwarm.js     — Orbite en essaim (forte separation)
      CoreSpawner.js    — Spawne des VoltStrikers
      EchoWraith.js     — Blink/invisibilite periodique
      BastionRed.js     — Tank lent simple
      NitroHusk.js      — Kamikaze explosion (ne recule jamais)
      SludgePhrax.js    — Distance keeper
      LinkCommander.js  — Buff les allies proches (aura)
      JammerUnit.js     — Brouilleur (ring wave + jamming)
      ToxicWasp.js      — Poison + zigzag
      BlastZone.js      — AOE zone (FSM: APPROACH/WARNING/EXPLODING/COOLDOWN)

systems/
  NavGrid.js            — Grille de navigation (A* pathfinding avec binary heap)
  EnemyAIFSM.js         — Machine a etats (idle/patrol/alert/investigate/chase/attack/retreat/dead)
  PerceptionSystem.js   — Line-of-sight raycasts avec cache
  PathfindingHelper.js  — Vecteur de mouvement A* + separation/flocking
  CollisionSystem.js    — Collisions projectiles/ennemis/joueur
  RoundSystem.js        — Orchestration des rounds
  SpawnerSystem.js      — Spawn des ennemis
  EnemyPool.js          — Object pooling ennemis
  LootSystem.js         — Generation de pools d'items (rarete ponderee, auto-ban slots)
  BuildSystem.js        — Gestion des slots equipement du robot
  WeaponSystem.js       — Gestion des armes
  ActiveAbilitySystem.js
  XPSystem.js           — Experience et niveaux
  UISystem.js           — HUD en jeu
  XRaySystem.js         — Vision X-Ray
  LoadingScreen.js      — Ecran de chargement
  PerformanceMonitor.js — FPS/perf

cameras/
  CameraManager.js / TpsCamera.js / IsoCamera.js

ui/
  LootUI.js    — Ecran selection d'item (3 cartes, animation fade)
  PauseUI.js   — Menu pause
```

## Systeme d'IA des ennemis (NavGrid)

Refactorise depuis VoltStriker vers la classe de base `Enemy.js`. Architecture en composition :

### 3 building blocks dans Enemy.js
1. **`updateHitFlash()`** — Flash visuel quand touche
2. **`updateNavGridAI(playerMesh, enemies, options)`** — Pipeline complet :
   - Perception (line-of-sight ou distance)
   - FSM → action (idle/chase/attack/retreat)
   - Pathfinding A* + separation/flocking
   - Mouvement via `moveWithCollisions()`
   - Retourne `{ action, scaledMove, moved, dt }`
3. **`applyRotation(moveVec, lerpFactor)`** — Rotation lissee vers la direction de mouvement

### Pattern d'utilisation dans les subclasses
```js
// Simple (chase pur) :
update(playerMesh, projectiles, enemies) {
    this.updateHitFlash()
    const result = this.updateNavGridAI(playerMesh, enemies)
    if (result) this.applyRotation(result.scaledMove)
}

// Avec mouvement additif (zigzag, orbit, strafe) :
const result = this.updateNavGridAI(playerMesh, enemies)
if (result?.moved) {
    // Ajouter mouvement special par-dessus
    this.enemy.position.addInPlace(lateralOffset)
    this.applyRotation(result.scaledMove)
}

// Avec FSM custom (DashTrigger, TitanRam, BlastZone) :
if (this.state === 'APPROACH') {
    const result = this.updateNavGridAI(playerMesh, enemies)
    // ...
} else if (this.state === 'DASHING') {
    // Logique specifique, pas de NavGrid
}
```

## Systeme d'equipement

### Classification
- **Standard (1-2 etoiles)** : Consommables, pas de limite. Stockes dans `BuildSystem.consumables[]`
- **Chassis (3-4 etoiles)** : Un seul item par slot corporel. Stockes dans `BuildSystem.chassisSlots{}`

### 6 Slots corporels
`head`, `body`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg`

### Auto-ban
Quand un slot chassis est occupe, les items 3-4 etoiles pour ce slot sont exclus du pool de loot (`LootSystem.generatePool()` recoit `occupiedSlots` depuis `BuildSystem.getOccupiedSlots()`).

### Item.js
- `isChassis` : getter → `rarity >= 3`
- `equip(player)` / `remove(player)` : applique/retire les effets
- `rollProc(luck)` : chance de proc (modules elementaires)
- `rarityColor` : couleur CSS par rarete

### Stats du joueur (Player.js)
`strength`, `speed`, `speedshot`, `luck`, `regen`, `lifesteal`, `armor`

## Commandes
```bash
npm run dev      # Dev server (Vite)
npm run build    # Build production
npm run preview  # Preview build
```

## Notes importantes
- `SupportEnemy.js` a son propre pathfinding custom, NON migre vers NavGrid
- Les vitesses des ennemis ont ete ajustees lors de la migration NavGrid (ex: HeavyEnemy 0.028→0.5, MetroidEnemy 0.055→1.0) car NavGrid multiplie `action.speed * this.speed`
- La rotation joueur utilise `Math.atan2(-dx, -dz)` (fix inversion souris)
- Le fichier `map_1.glb` (~50MB) est un goulot de performance a optimiser dans Blender
