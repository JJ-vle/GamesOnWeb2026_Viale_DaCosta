# Aggressive Performance Tuning - 17 FPS Fix

## Problème Identifié

Avec 25 ennemis et 0 culled, votre jeu faisait 17 FPS car:
- **Tous les 25 ennemis faisaient des updates complètes** (pathfinding + FSM)
- Les distances de culling étaient trop permissives
- Les raycasts (X-Ray, Perception) étaient trop fréquents
- Les collision checks testaient trop d'ennemis

## Solutions Appliquées ✅

### 1. Distance Culling Agressif
**Fichier**: `src/babylon/scenes/MainScene.js`

```javascript
const ACTIVE_DISTANCE = 50;    // (avant: 100)
const PASSIVE_DISTANCE = 80;   // (avant: 150)
```

Avec ces distances sur une map de 130x110:
- Ennemis à plus de 80 units = **invisible** (mesh disabled)
- Ennemis à 50-80 units = **animation seule** (pas de pathfinding)
- Ennemis à moins de 50 units = **update complet**

**Résultat**: Beaucoup plus d'ennemis culled sur votre capture (attendu: 10-15 culled au lieu de 0)

### 2. X-Ray Raycast Agressif
**Fichier**: `src/babylon/systems/XRaySystem.js`

```javascript
this._raycastInterval = 8;  // (avant: 4, original: 2)
```

Raycast tous les **8 frames** = ~133ms à 60fps = 75% moins de raycasts

### 3. Perception Cache Agressif
**Fichier**: `src/babylon/systems/PerceptionSystem.js`

```javascript
this._cacheValidityDuration = 0.15; // 150ms (avant: 50ms)
```

Les détections ennemis sont cachées plus longtemps = moins de raycasts

### 4. Collision Grid & Distance Check
**Fichier**: `src/babylon/systems/CollisionSystem.js`

```javascript
this._gridCellSize = 15;  // (avant: 10) - cellules plus grandes
// Et distance check augmenté de 5 à 8 units
```

---

## Test à Faire Maintenant

1. **Relancer le jeu**
2. **Spawnez 25 ennemis**
3. **Vérifiez le FPS counter**:
   - Avant: 17 FPS, 25 enemies (0 culled)
   - **Attendu**: 35-45 FPS, 25 enemies (10-15 culled)

---

## Ajustements Fins par Cas

### Si 40+ FPS → Excellent! C'est bon ✅
Vous pouvez relâcher légèrement:
```javascript
const ACTIVE_DISTANCE = 60;    // au lieu de 50
const PASSIVE_DISTANCE = 100;  // au lieu de 80
```

### Si toujours 20-25 FPS → Ennemis trop complexes
Les ennemis font trop de calculs individuels. Options:
1. **Réduire encore plus distance**:
```javascript
const ACTIVE_DISTANCE = 35;
const PASSIVE_DISTANCE = 60;
```

2. **Ou augmenter X-Ray interval**:
```javascript
this._raycastInterval = 12;  // plus agressif
```

### Si FPS rouges quand camera zoom out → Spatial grid trop large
Réduire:
```javascript
this._gridCellSize = 12;  // de 15 à 12
```

---

## Monitoring pour Validation

Appuyer **[D]** du jeu pour voir performance counter:

**Bon état**:
```
FPS: 45
GPU: 1ms
Enemies: 10 (Culled: 15)  ← 15 culled = bon!
```

**Mauvais état**:
```
FPS: 17 (ROUGE)
GPU: 1ms
Enemies: 25 (Culled: 0)   ← 0 culled = problème!
```

---

## Configs Recommandées par Cas

### "Je veux 60 FPS avec beaucoup d'ennemis"
```javascript
const ACTIVE_DISTANCE = 35;
const PASSIVE_DISTANCE = 60;
// X-Ray
this._raycastInterval = 12;
// Perception
this._cacheValidityDuration = 0.20; // 200ms
```

### "Je veux le meilleur gameplay"
```javascript
const ACTIVE_DISTANCE = 60;
const PASSIVE_DISTANCE = 100;
// X-Ray
this._raycastInterval = 6;
// Perception
this._cacheValidityDuration = 0.10; // 100ms
```

### "Je prioritize qualité visuelle"
```javascript
const ACTIVE_DISTANCE = 80;
const PASSIVE_DISTANCE = 120;
// X-Ray
this._raycastInterval = 4;
// Perception
this._cacheValidityDuration = 0.08;
```

---

## Attention ⚠️

Les configurations très agressives (ACTIVE_DISTANCE = 35) peuvent affecter:
- **IA ennemis loin**: Arrêtent de chaser/attaquer quand culled
- **Ambiance**: Moins d'ennemis visibles en même temps
- **Gameplay**: Ennemis apparaissent soudainement à 50 units

C'est un tradeoff performance vs gameplay. Ajustez selon votre priorité.

---

## Prochaines Optimisations Si Encore Laggy

1. **Réduire animation quality au loin**:
   - Ennemis loin = pas d'animation, juste position
   
2. **Réduire particle effects**:
   - Impacts, explosions seulement pour ennemis proches

3. **Réduire texture resolution**:
   - Assets chargent en basse résolution d'abord

4. **Limiter collision raycasts**:
   - Projectiles vs ennemis seulement si <20 units

---

## Support

- Ouvrez [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) pour architecture complète
- Consultez [TESTING_GUIDE.md](./TESTING_GUIDE.md) pour validation

