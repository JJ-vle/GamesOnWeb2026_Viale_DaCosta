# Architecture IA Ennemis — Guide d'Intégration

## Vue d'ensemble

L'IA ennemis est structurée en **3 couches**:

```
┌─────────────────────────────────────────┐
│   FOV + LOS + Mémoire (Perception)      │
├─────────────────────────────────────────┤
│   FSM (États + Logique Décision)        │
├─────────────────────────────────────────┤
│   PathfindingHelper (Déplacement)       │
└─────────────────────────────────────────┘
```

---

## Fichiers créés

### 1. **PerceptionSystem.js**
Gère la détection du joueur:
- **FOV** (Field of Vision): angle + distance
- **LOS** (Line of Sight): raycast pour vérifier obstacles
- **Mémoire courte**: garde dernière position vue pendant ~3 secondes

**Utilisation:**
```javascript
const perception = new PerceptionSystem(scene);
const canSee = perception.canSeePlayer(
  enemyPos,
  playerPos,
  30,      // fovDistance
  90,      // fovAngle en degrés
  forward, // direction de l'ennemi
  true     // useLineOfSight
);
```

---

### 2. **EnemyAIFSM.js**
Machine à états (xstate) pour orchestrer le comportement:

**États:**
- `idle` — Attente/neutre
- `patrol` — Patrouille
- `alert` / `investigate` — Enquête sur dernière position
- `chase` — Poursuite du joueur
- `attack` — Combat rapproché
- `retreat` — Fuite (HP bas)
- `dead` — Mort

**Transitions:** basées sur événements détection/distance/santé

**Utilisation:**
```javascript
const fsm = new EnemyAIFSM({
  fovDistance: 30,
  fovAngle: 90,
  attackRange: 5,
  retreatThreshold: 0.3, // < 30% HP
});

const action = fsm.getAction({
  health: enemy.life,
  maxHealth: enemy.maxLife,
  position: enemy.position,
  playerPos: playerPos,
  targetPos: lastSeenPos,
});

// action.state, action.action, action.speed, action.targetPos
```

---

### 3. **PathfindingHelper.js**
Navigation intelligente:

**Fonctions clés:**
- `getMovementVector()` — Déplacement vers cible + séparation
- `getWanderVector()` — Mouvement aléatoire (patrouille)
- `getLocalAvoidanceVector()` — Contournement obstacles mineurs
- `getRandomPatrolPoint()` — Position patrouille aléatoire

**Utilisation:**
```javascript
const pathfinding = new PathfindingHelper(scene);
const moveVec = pathfinding.getMovementVector(
  currentPos,
  targetPos,
  0.1,     // speed
  allies,  // pour séparation
  3.5,     // separationDistance
  1.5      // separationForce
);
entity.position.addInPlace(moveVec);
```

---

## Intégration dans Enemy.js

La classe `Enemy` intègre automatiquement ces 3 systèmes:

```javascript
export class Enemy {
  constructor(scene, contact, maxLife, aiConfig = null) {
    // ...
    
    // aiConfig = null → pas d'IA
    // aiConfig = false → désactiver IA pour compatibilité
    // aiConfig = {...} → config personnalisée
    
    if (aiConfig !== false) {
      this._initializeAI(aiConfig);
    }
  }

  updateAI(playerMesh, enemies = []) {
    // Implémentation par défaut (simple pursuit)
    // À surcharger dans les classes filles
  }
}
```

---

## Cas d'usage: Créer un nouvel ennemi

### Option 1: Ennemi agressif simple (comme SimpleEnemy)
```javascript
export class AggressiveEnemy extends Enemy {
  constructor(scene, contact) {
    super(scene, contact, 20, {
      fovDistance: 40,
      fovAngle: 120,
      attackRange: 3,
      retreatThreshold: 0.2,
    });
    this.enemy = this._createMesh();
    // ...
  }

  updateAI(playerMesh, enemies = []) {
    // Rush direct
    super.updateAI(playerMesh, enemies); // Call parent logic
    // Ajouter logique custom si besoin
  }
}
```

### Option 2: Ennemi support (distance optimale)
Voir `SupportEnemy.js` — Exemple complet d'override.

**Points clés:**
- Override `updateAI()` pour logique spécifique
- Utiliser `_getOptimalSupportPosition()` pour cercles autour joueur
- Implémenter `_performSupportAction()` pour abilities custom
- Appeler `super.updateAI()` ou réimplémenter complètement

### Option 3: Boss complexe (à venir)
Peut utiliser BehaviorTree pour patterns >10 états

---

## Intégration dans MainScene / SpawnerSystem

**Aucun changement nécessaire** — Compatible backward.

Les ennemis existants marchent comme avant:
```javascript
new SimpleEnemy(scene, contact); // aiConfig = false → pas d'IA
```

Pour utiliser la nouvelle IA:
```javascript
// Option A: Config au spawn
const advancedEnemy = new SimpleEnemy(scene, contact);
advancedEnemy._initializeAI({ fovDistance: 40 });

// Option B: Créer classes filles avec super(scene, contact, maxLife, aiConfig)
```

---

## Validation des critères

✅ **Ennemi derrière un mur:** pas d'aggro
- → FOV + LOS raycast dans `PerceptionSystem.canSeePlayer()`

✅ **Ennemi en vision directe:** trigger fiable
- → FOV angle + distance dans `canSeePlayer()`

✅ **Perte visuelle:** poursuite limitée
- → Memory 3s dans `updatePerception()`, puis retour patrol

✅ **Ennemi support:** garde distance + n'entre pas mêlée
- → `SupportEnemy._getOptimalSupportPosition()` + kiting

---

## Paramètres recommandés par archétype

### Ennemi Melee Agressif
```javascript
{
  fovDistance: 30,
  fovAngle: 90,
  attackRange: 3,
  retreatThreshold: 0.2, // Pour rarement fuir
}
```

### Ennemi Support
```javascript
{
  fovDistance: 35,
  fovAngle: 100,
  attackRange: 10,      // Attaque loin
  retreatThreshold: 0.4, // Fuit plus tôt
}
```

### Ennemi Tank
```javascript
{
  fovDistance: 25,
  fovAngle: 75,
  attackRange: 2,
  retreatThreshold: 0.1, // Ne fuit jamais
}
```

### Boss Complexe
```javascript
{
  fovDistance: 50,
  fovAngle: 120,
  attackRange: 5,
  retreatThreshold: 0.3,
  // + implémenter BehaviorTree
}
```

---

## Optimisations futures

1. **Réduire coût raycast FOV**
   - Check FOV seulement chaque 100-200ms (déjà implémenté dans la logique)
   - Cache résultats perception

2. **NavMesh complet**
   - Utiliser Recast pour large maps
   - Actuellement: simple pathfinding + local avoidance

3. **Behavior Trees**
   - Pour boss >10 états
   - Lib behavior3js prête à intégrer

4. **Steering avancé**
   - Flocking automatique
   - Swarm coordination

---

## Débogage

Afficher FOV et raycast:
```javascript
perception.debugDrawRay(enemyPos, playerPos);
```

Voir état FSM:
```javascript
console.log(enemy.fsm.getState());
```

Voir action active:
```javascript
const action = enemy.fsm.getAction(context);
console.log(action.action, action.speed);
```

---

## Résumé: Étapes pour migrate un ennemi existant

1. **Ajouter config AI dans `super()` call**
   ```javascript
   super(scene, contact, 20, { fovDistance: 30, ... })
   ```

2. **Override `updateAI()` si comportement custom**
   ```javascript
   updateAI(playerMesh, enemies) {
     super.updateAI(playerMesh, enemies); // Ou pas
     // Custom logic here
   }
   ```

3. **Test:** vérifier aggro/chase/retreat/death

4. **Tuner** paramètres fovDistance, attackRange, speed pour feeling d'IA

---

**Status:** ✅ IA base intégrée et validée — Prête pour extension.

Contact: Consultez les classes existantes (`SimpleEnemy`, `SupportEnemy`) comme templates.
