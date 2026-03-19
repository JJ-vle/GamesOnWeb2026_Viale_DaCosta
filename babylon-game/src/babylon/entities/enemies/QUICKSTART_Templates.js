// ===== QUICK START: IA Ennemis =====

// 1. IMPORTER dans MainScene si besoin de logs / debug
// import { SupportEnemy } from './entities/enemies/SupportEnemy'

// 2. UTILISER UN ENNEMI EXISTANT AVEC IA
// 
// Avant (ancien comportement, pas d'IA):
//   const enemy = new SimpleEnemy(scene, contact); // aiConfig=false par défaut
// 
// Après (avec IA moderne):
//   // Option A: desactiver pour garder ancien behavior
//   const enemy = new SimpleEnemy(scene, contact); // ← compatible
// 
//   // Option B: activer IA avec config
//   class MyAggressiveEnemy extends Enemy {
//     constructor(scene, contact) {
//       super(scene, contact, 15, {
//         fovDistance: 35,
//         fovAngle: 100,
//         attackRange: 5,
//       });
//       this.enemy = this._createMesh();
//     }
//   }

// ===== TEMPLATE 1: Ennemi Melee Agressif =====
/*
import { Enemy } from './Enemy'
import { Vector3, MeshBuilder, Color3, StandardMaterial } from '@babylonjs/core'

export class AggressiveEnemy extends Enemy {
  constructor(scene, contact) {
    // Config: vision large, rush rapide, peu de retraite
    super(scene, contact, 20, {
      fovDistance: 40,
      fovAngle: 120,
      attackRange: 4,
      retreatThreshold: 0.15,
    });
    
    this.enemy = this._createMesh();
    this.material = this.enemy.material;
    this.xpValue = 25;
    this.coinValue = 8;
  }

  _createMesh() {
    const mesh = MeshBuilder.CreateBox("AggressiveEnemy", { size: 2.5 }, this.scene);
    mesh.position = new Vector3(4, 1, 0);
    const mat = new StandardMaterial("aggrMat", this.scene);
    mat.diffuseColor = new Color3(1, 0.2, 0.2); // Rouge
    mesh.material = mat;
    return mesh;
  }

  update(playerMesh, projectiles = [], enemies = []) {
    if (!this.enemy) return;
    
    // Hit flash
    if (this._hitTimer > 0) {
      this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000;
      if (this._hitTimer <= 0) {
        this.material.diffuseColor = new Color3(1, 0.2, 0.2);
      }
    }

    // Appeler logique IA parente
    this.updateAI(playerMesh, enemies);
  }
}
*/

// ===== TEMPLATE 2: Ennemi Support (Distance Optimale) =====
/*
// Voir: src/babylon/entities/enemies/SupportEnemy.js
// C'est le template complet avec:
// - Distance optimale maintenue
// - Kite automatique
// - Actions support (buff/debuff)
// - Fuite intelligente
*/

// ===== TEMPLATE 3: Ennemi Tank (Tankeur, Ne Fuit Pas) =====
/*
export class TankEnemy extends Enemy {
  constructor(scene, contact) {
    super(scene, contact, 50, { // Plus de HP
      fovDistance: 25,
      fovAngle: 75,
      attackRange: 2,
      retreatThreshold: 0.05, // Presque jamais en retraite
    });
    
    this.enemy = this._createMesh();
    this.armor = 2; // Réduction dégâts additionnelle
  }

  _createMesh() {
    const mesh = MeshBuilder.CreateCylinder("TankEnemy", { height: 3, diameter: 2 }, this.scene);
    const mat = new StandardMaterial("tankMat", this.scene);
    mat.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gris/métal
    mesh.material = mat;
    return mesh;
  }

  updateAI(playerMesh, enemies = []) {
    // Appeler parent
    super.updateAI(playerMesh, enemies);
    
    // Logic custom: block attacks for nearby allies?
    // or shield mechanic?
  }
}
*/

// ===== TEMPLATE 4: Ennemi Ranged (Attaque à Distance) =====
/*
export class RangedEnemy extends Enemy {
  constructor(scene, contact) {
    super(scene, contact, 12, {
      fovDistance: 40,  // Vision très loin
      fovAngle: 100,
      attackRange: 15,  // Attaque à distance
      retreatThreshold: 0.35,
    });
    
    this.enemy = this._createMesh();
    this.lastShotTime = 0;
    this.shootInterval = 1.5; // Tir toutes les 1.5s
  }

  update(playerMesh, projectiles = [], enemies = []) {
    if (!this.enemy) return;

    // Hit flash
    if (this._hitTimer > 0) {
      this._hitTimer -= this.scene.getEngine().getDeltaTime() / 1000;
      if (this._hitTimer <= 0) {
        this.material.diffuseColor = new Color3(0.2, 0.6, 1);
      }
    }

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    
    // IA parente
    this.updateAI(playerMesh, enemies);

    // Shooting logic
    const dist = Vector3.Distance(this.enemy.position, playerMesh.position);
    this.lastShotTime += deltaTime;
    
    if (dist < 30 && this.lastShotTime >= this.shootInterval) {
      // Créer projectile vers joueur
      // this._fireProjectile(playerMesh.position);
      this.lastShotTime = 0;
    }
  }

  _fireProjectile(targetPos) {
    // TODO: implémenter projectile ranged
    // Référer à WeaponSystem ou EnemyProjectile
  }
}
*/

// ===== UN PAS À LA FOIS =====
// 
// Étape 1: Test SimpleEnemy existant (compatible)
// Étape 2: Créer AggressiveEnemy ou RangedEnemy avec config AI
// Étape 3: Ajouter SupportEnemy pour alliance
// Étape 4: Tuner fovDistance/attackRange pour feeling
// Étape 5: Implémenter projectiles ranged si besoin
//
// Chaque template override update() → appelle super.updateAI()
// Puis ajoute custom logic: projectiles, buffs, spécial attacks, etc.

// ===== DEBUG =====
// 
// Voir état FSM actuel:
//   console.log(enemy.fsm.getState());
// 
// Voir action courante:
//   const action = enemy.fsm.getAction({...});
//   console.log(action.action, action.speed);
// 
// Afficher FOV raycast (debug visual):
//   this.perception.debugDrawRay(enemyPos, playerPos);
//

export {}; // Dummy export
