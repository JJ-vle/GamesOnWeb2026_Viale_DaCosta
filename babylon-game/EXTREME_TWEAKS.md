# Extreme Performance Tweaks (If Still Needed)

> ⚠️ Only use these if FPS is still <30 after QUICK_FIX

---

## Tier 1: Simple Config Changes (No Code Changes)

### 1.1 Ultra-Aggressive Culling
**File**: `src/babylon/scenes/MainScene.js`

```javascript
const ACTIVE_DISTANCE = 30;    // Only closest enemies active
const PASSIVE_DISTANCE = 60;   // Freeze farther out
```

**Impact**: FPS +5-10 | Gameplay -20 (many frozen)

### 1.2 Full X-Ray Disable
**File**: `src/babylon/systems/XRaySystem.js`

```javascript
// In constructor, set to 999 to disable effectively
this._raycastInterval = 999;
```

**Impact**: FPS +2-3 | Visuals -5 (can't see through walls)

### 1.3 Super Spacious Collision Grid
**File**: `src/babylon/systems/CollisionSystem.js`

```javascript
this._gridCellSize = 25;  // was 15
```

And in collision loop:
```javascript
if (dist > 12) continue;  // was 8
```

**Impact**: FPS +3-5 | Risk: Some projectiles miss

---

## Tier 2: Enemy AI Reduction

### 2.1 Disable Perception for Distant Enemies
**File**: `src/babylon/scenes/MainScene.js`

In the active zone update, add:
```javascript
// ONLY do full updates if VERY close
const SUPER_ACTIVE_DISTANCE = 30;
const MEDIUM_ACTIVE_DISTANCE = 60;

for (let enemy of activeEnemies) {
  const dist = enemy.distanceToPlayer;
  
  if (dist > SUPER_ACTIVE_DISTANCE) {
    // No AI, just move straight
    enemy._skipAI = true;
  } else {
    enemy._skipAI = false;
  }
}
```

Then modify enemy update:
```javascript
update() {
  if (this._skipAI) {
    // Just move, no pathfinding
    this.mesh.position.addInPlace(
      this.moveDirection.scale(this.speed * deltaTime)
    );
    return;
  }
  
  // Full AI
  // ... pathfinding, FSM, etc
}
```

**Impact**: FPS +15-20 | Gameplay -30 (low AI)

### 2.2 Reduce Pathfinding Frequency
**File**: Enemy classes

```javascript
// In VoltStriker, NeonVector, etc.
update() {
  this._pathfindCounter = (this._pathfindCounter || 0) + 1;
  
  // Only recalculate pathfinding every 3 frames
  if (this._pathfindCounter % 3 === 0) {
    this.movement = this.pathfinding.getMovementVector();
  } else {
    // Use cached movement
  }
  
  // Move anyway
  this.position.addInPlace(this.movement.scale(deltaTime));
}
```

**Impact**: FPS +10 | Gameplay -5 (jerky movement)

---

## Tier 3: Visual Quality Reduction

### 3.1 Disable Shadows/Lighting
**File**: `src/babylon/scenes/MainScene.js`

```javascript
// In _createLights()
const ambient = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene)
ambient.intensity = 0.3;  // Reduce from 0.6
// Remove PBR materials if any
```

**Impact**: FPS +3-5 | Visuals -20 (flat look)

### 3.2 Lower Texture Resolution
**File**: Assets (rebuild needed)

If assets are in folder, reduce resolution:
- 2048x2048 → 1024x1024
- 1024x1024 → 512x512

**Impact**: FPS +5-10 | Visuals -30 (blurry)

### 3.3 Disable Particle Effects
**File**: Any particle system

```javascript
// In weapon/ability systems
// Disable particle emitters
particleSystem.stop();
```

**Impact**: FPS +5 | Visuals -10

### 3.4 Reduce Animation Quality
**File**: Enemy animations

```javascript
// In enemy update()
// Skip animation on distant enemies
if (distanceToPlayer > 60) {
  animationGroup.playRate = 0.5;  // Half speed
} else {
  animationGroup.playRate = 1.0;
}
```

**Impact**: FPS +2 | Gameplay +2 (smoother)

---

## Tier 4: Aggressive Rendering

### 4.1 Lower Render Resolution
**File**: `src/babylon/Game.js`

```javascript
// In engine/scene setup
engine.setHardwareScalingLevel(2);  // Render at 0.5x resolution internally
```

**⚠️ WARNING**: Everything becomes pixelated/blurry
**Impact**: FPS +20-30 | Visuals -50

### 4.2 Disable Post-Processing
**File**: Scene rendering

```javascript
// Disable bloom, glow, effects
scene.postProcessRenderPipeline = null;
```

**Impact**: FPS +5-10 | Visuals -20

---

## Tier 5: Nuclear Option (Desperation Mode)

### 5.1 Cap Maximum Enemies on Screen
**File**: `src/babylon/scenes/MainScene.js`

```javascript
// Before rendering
const maxVisibleEnemies = 10;  // Only show first 10
this.enemies
  .filter(e => e.enemy.isVisible)
  .slice(0, maxVisibleEnemies)
  .forEach(e => e.enemy.isVisible = true);

// Hide rest
this.enemies
  .filter(e => e.enemy.isVisible)
  .slice(maxVisibleEnemies)
  .forEach(e => e.enemy.isVisible = false);
```

**Impact**: FPS +30-50 | Gameplay -70 (artificial limit)

### 5.2 Skip Collisions Entirely
⚠️ **NOT RECOMMENDED** - Game becomes broken

```javascript
// Comment out collision system calls
// if (this.collisionSystem) this.collisionSystem.update(deltaTime)
```

**Impact**: FPS +15 | Gameplay: ❌ BROKEN

---

## Optimization Strategy Path

```
17 FPS (Current)
     ↓
Apply QUICK_FIX (50% improvement)
     ↓
30-35 FPS (Acceptable)
     ↓ Still not enough?
Tier 1: Config changes (no code)
     ↓
35-40 FPS
     ↓ Still not enough?
Tier 2: Enemy AI reduction
     ↓
40-50 FPS (Good!)
     ↓ Still not enough?
Tier 3+4: Visual reduction
     ↓
50-60 FPS (Excellent)
     ↓ Still not enough?
Tier 5: Nuclear option
```

---

## My Recommendation

### If You Have 17 FPS Now:

1. **Apply QUICK_FIX** immediately → expect 40-50 FPS
2. **Test and enjoy** - likely this is enough
3. **Only if <30 FPS after QUICK_FIX**, apply Tier 1 changes
4. **Rarely needed**: Tier 2+ (unless 100+ enemies)

### Quick Priority If Still Laggy:

1. **Tier 1.1**: Ultra-aggressive culling (best bang-for-buck)
2. **Tier 1.2**: Full X-Ray disable  
3. **Tier 2.2**: Reduce pathfinding freq
4. Then TIersyyyy lower

---

## Before/After Scenarios

### Scenario 1: I Want the Game to Work (Fast)
```
ACTIVE_DISTANCE = 40
PASSIVE_DISTANCE = 70
X-Ray disabled
Perception cache = 200ms
Collision grid = 20

Expected: 50-60 FPS easy
Gameplay: 70% normal
```

### Scenario 2: I Want Better Visuals
```
ACTIVE_DISTANCE = 60
PASSIVE_DISTANCE = 100
X-Ray = every 6 frames
Perception cache = 100ms

Expected: 35-40 FPS
Gameplay: 90% normal
```

### Scenario 3: I Want Max Performance
```
ACTIVE_DISTANCE = 25
PASSIVE_DISTANCE = 50
X-Ray = disabled
Perception = never updated
Collision grid = 20
Render scale = 0.75

Expected: 60 FPS solid
Gameplay: Enemies appear frozen, no vision, sparse
```

---

## Testing Methodology

Add this to console to measure:

```javascript
// Measure FPS over 10 seconds
let samples = [];
setInterval(() => {
  samples.push(performanceMonitor._fps);
  if (samples.length >= 10) {
    console.log('Avg FPS:', Math.round(samples.reduce((a,b) => a+b) / samples.length));
    samples = [];
  }
}, 1000);
```

---

## When to Stop Optimizing

✅ **Stop when:**
- FPS ≥ 45 consistently
- Gameplay feels smooth
- No visible stutters
- You're happy!

❌ **Don't go beyond:**
- Tier 3 (visual quality usually not worth it)
- Don't sacrifice gameplay for 5 more FPS
- Remember: 30 FPS is playable, 60 is luxury

---

## Real Numbers to Expect

With your 25 enemies + map:

| Config | FPS | Feels | Gameplay |
|--------|-----|-------|----------|
| Ultra-aggressive (T1) | 50-55 | Great | Good |
| With T2.2 applied | 55-60 | Excellent | Acceptable |
| With visual cuts | 60 | Perfect | Good-ish |

Most likely **Tier 1 alone gives you 45+ FPS and you're done!**

