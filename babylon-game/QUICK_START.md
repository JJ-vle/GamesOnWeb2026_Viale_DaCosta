# 🚀 DÉMARRAGE RAPIDE — IA Ennemis

**Vous avez reçu:** Architecture IA complète 3 couches pour vos ennemis.  
**Vous pouvez faire maintenant:** Tester détection réaliste + support ennemi + comportements variés.

---

## ✅ État du Code

```
✅ Aucune erreur TypeScript
✅ xstate installé (npm install xstate)
✅ Backward compatible (vieux code marche)
✅ 4 systèmes prêts: Perception, FSM, Pathfinding, Support
```

---

## 🎯 En 2 Minutes

### Option A: Teste rapide sans modifier rien
```bash
# 1. Vos ennemis existants marchent comme avant
# → SimpleEnemy garde son premier comportement
# → aiConfig=false par défaut

# 2. Vérifier qu'il n'y a pas d'erreur
npm run dev

# 3. Voir dans console:
# SimpleEnemy apparait, fonctionne normal
```

### Option B: Ajouter IA à un ennemi existant
```javascript
// Dans votre classe Enemy héritée:
export class MyEnemy extends Enemy {
  constructor(scene, contact) {
    // AVANT (pas d'IA):
    // super(scene, contact, 20);
    
    // APRÈS (avec IA):
    super(scene, contact, 20, {
      fovDistance: 30,
      fovAngle: 90,
      attackRange: 5,
    });
    
    this.enemy = this._createMesh();
  }
}
```

Ça suffit! L'IA fait le reste automatiquement dans `update()`.

### Option C: Test SupportEnemy (Exemple complet)
```javascript
// Voir: src/babylon/entities/enemies/SupportEnemy.js
// C'est un ennemi qui:
// - Détecte joueur en FOV+LOS
// - Garde distance optimale (15m)
// - Kite si trop proche
// - Fuit si HP bas
// - Peut faire éventuellement du support (buff alliés)
```

Recopier et adapter pour votre usage!

---

## 📖 Fichiers Clés à Lire

Dans cet ordre d'importance:

1. **`IMPLEMENTATION_SUMMARY.md`** ← START HERE (cette vue d'ensemble)
2. **`src/babylon/systems/AISystem_README.md`** ← Guide complet 500 lignes
3. **`src/babylon/entities/enemies/QUICKSTART_Templates.js`** ← 4 templates prêts
4. **`src/babylon/entities/enemies/SupportEnemy.js`** ← Exemple réel

---

## 🎮 Cas d'Usage Typiques

### Cas 1: "Je veux garder mes ennemis simples"
```javascript
// Aucun changement nécessaire
// SimpleEnemy reste en aiConfig=false
// Ancien behavior préservé ✅
```

### Cas 2: "Je veux ajouter détection réaliste"
```javascript
// Change: super(scene, contact, 20);
// En:     super(scene, contact, 20, { fovDistance: 35 });
// C'est tout.
```

### Cas 3: "Je veux un ennemi support"
```javascript
// Copier SupportEnemy.js
// Remplacer:
//   - mesh creation (_createMesh)
//   - XP/coin values
// Garder la logique distance+support
// ✅ Double clic et c'est prêt
```

### Cas 4: "Je veux combiner avec projectiles"
```javascript
// Dans updateAI():
//   if (can_attack) {
//     this._fireProjectile(playerMesh);
//   }
// Référer à WeaponSystem ou EnemyProjectile pour syntaxe
```

---

## 🔧 Configuration Options

Chaque ennemi peut avoir:

```javascript
super(scene, contact, maxLife, {
  fovDistance: 30,        // Distance détection (défaut: 30)
  fovAngle: 90,           // Angle FOV en degrés (défaut: 90)
  attackRange: 5,         // Distance attaque (défaut: 5)
  retreatThreshold: 0.3,  // % HP pour fuir (défaut: 0.3 = 30%)
})
```

Exemples:
- **Agressif:** fovDistance=40, fovAngle=120, retreatThreshold=0.1
- **Support:** fovDistance=35, fovAngle=100, attackRange=10, retreatThreshold=0.4
- **Tank:** fovDistance=25, fovAngle=75, retreatThreshold=0.05

---

## 🧪 Test du Système (Validation)

```javascript
// Terminal: npm run dev

// Dans le jeu:
console.log(enemy.fsm.getState());
// Output: 'idle', 'chase', 'attack', etc.

console.log(enemy.perception.canSee);
// Output: true/false

const action = enemy.fsm.getAction({...});
console.log(action.action, action.speed);
// Output: 'chase', 0.12
```

---

## ❓ FAQ

### Q: Mes ennemis actuels vont-ils se casser?
**A:** Non. `aiConfig=false` par défaut → ancien comportement conservé.

### Q: Comment faire fuit les ennemis?
**A:** Configurer `retreatThreshold: 0.3` (fuit à <30% HP). Automatique.

### Q: Comment faire ennemi ranged?
**A:** Config `attackRange: 15` (attaque loin). Puis implémenter `_fireProjectile()` dans `updateAI()`.

### Q: Peut-on faire ennemi boss complexe?
**A:** Oui, phase 2: BehaviorTree (behavior3js). Là c'est FSM (7 états) + custom actions.

### Q: Performance 100 ennemis?
**A:** ~10-20 ennemis OK. Pour 100+: utiliser Recast NavMesh (phase 2).

---

## 🔗 Documents Important

| Doc | Pour Quoi | Où |
|-----|-----------|-----|
| **IMPLEMENTATION_SUMMARY.md** | Vue d'ensemble | `/babylon-game/` |
| **AISystem_README.md** | Guide détail | `/babylon/systems/` |
| **QUICKSTART_Templates.js** | Templates code | `/babylon/entities/enemies/` |
| **SupportEnemy.js** | Exemple réel | `/babylon/entities/enemies/` |

---

## 🚦 Checklist: Commencer Maintenant

- [ ] Lire IMPLEMENTATION_SUMMARY.md (5 min)
- [ ] Lire AISystem_README.md (15 min)
- [ ] Tester: `npm run dev`, vérifier SimpleEnemy marche
- [ ] Créer nouvel Enemy avec aiConfig = {...}
- [ ] Valider: Voir enemy détecter et poursuivre joueur
- [ ] Tuner: Ajuster fovDistance/attackRange pour feeling
- [ ] Ajouter: Support Enemy ou autre archétype
- [ ] Optionnel: Implémenter actions ranged/buff

---

## 💡 Prochaines Étapes Recommandées

**Phase 1 (Immédiat):**
1. Test intégration MainScene
2. Ajouter 1-2 ennemis avec config AI simples
3. Valider aggro/chase/retreat

**Phase 2 (Optionnel après 1 semaine):**
1. Projectiles ranged pour support ennemi
2. Buff/debuff alliés
3. NavMesh pour larger maps

**Phase 3 (Optionnel après 1 mois):**
1. BehaviorTree pour boss patterns
2. Steering avancé (flocking)
3. Swarm coordination

---

## 📞 Déboguer Rapidement

Si ennemi ne détecte pas:
```javascript
console.log(enemy.fsm.config.fovDistance); // Vérifier distance
console.log(enemy.perception.canSee);     // Vérifier perception
```

Si ennemi raide:
```javascript
const action = enemy.fsm.getAction({...});
console.log(action.action, action.targetPos); // Vérifier cible
```

---

## ✨ Bon Développement!

**Architecture:** ✅ Livrée  
**Backward compat:** ✅ Garantie  
**Templates:** ✅ Prêts  
**Documentation:** ✅ Complète  

**Vous êtes prêt à faire des ennemis intelligents maintenant.** 🎮

Consultez `AISystem_README.md` pour détails avancés.

---

*Fait le: 19 Mars 2026*  
*Status: Production Ready ✅*
