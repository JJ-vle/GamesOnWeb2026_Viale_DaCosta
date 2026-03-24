import { createMachine, interpret } from 'xstate';
import { Vector3 } from '@babylonjs/core';

/**
 * EnemyAIFSM: FSM complète pour les comportements d'ennemis
 * États: Idle -> Patrol -> Alert/Investigate -> Chase -> Attack -> Retreat -> Dead
 */
export class EnemyAIFSM {
  constructor(config = {}) {
    this.config = {
      fovDistance: config.fovDistance || 30,
      fovAngle: config.fovAngle || 90,
      aggroDistance: config.aggroDistance || 50,
      attackRange: config.attackRange || 5,
      retreatDistance: config.retreatDistance || 15,
      retreatThreshold: config.retreatThreshold || 0.3, // < 30% HP
      investigateDuration: config.investigateDuration || 3,
      ...config,
    };

    this.machine = this._createMachine();
    this.service = interpret(this.machine).start();
    
    // Initialiser la patrouille
    this._patrolTarget = null;
    this._patrolTimer = 0;
  }

  /**
   * Crée la machine à états avec xstate
   * @private
   */
  _createMachine() {
    return createMachine({
      id: 'enemyAI',
      initial: 'idle',
      states: {
        idle: {
          on: {
            PLAYER_SPOTTED: { target: 'alert' },
            START_PATROL: { target: 'patrol' },
          },
        },
        patrol: {
          on: {
            PLAYER_SPOTTED: { target: 'alert' },
            INVESTIGATE: { target: 'investigate' },
          },
        },
        alert: {
          on: {
            PLAYER_SPOTTED: { target: 'chase' },
            LOST_PLAYER: { target: 'investigate' },
            CHASE: { target: 'chase' },
          },
        },
        investigate: {
          on: {
            PLAYER_SPOTTED: { target: 'chase' },
            TIMEOUT: { target: 'patrol' },
          },
        },
        chase: {
          on: {
            LOST_PLAYER: { target: 'investigate' },
            IN_RANGE: { target: 'attack' },
            LOW_HEALTH: { target: 'retreat' },
          },
        },
        attack: {
          on: {
            PLAYER_SPOTTED: { target: 'chase' },
            OUT_OF_RANGE: { target: 'chase' },
            LOST_PLAYER: { target: 'investigate' },
            LOW_HEALTH: { target: 'retreat' },
          },
        },
        retreat: {
          on: {
            HEALTH_RECOVERED: { target: 'chase' },
            DIED: { target: 'dead' },
          },
        },
        dead: {
          type: 'final',
        },
      },
    });
  }

  /**
   * Retourne l'état actuel
   */
  getState() {
    return this.service.getSnapshot().value;
  }

  /**
   * Envoie un événement à la machine
   */
  send(event) {
    this.service.send(event);
  }

  /**
   * Détermine le comportement attendu basé sur l'état + contexte d'ennemi
   * Retourne les paramètres pour contrôler le mouvement et les actions
   * @param {Object} context - { health, maxHealth, position, playerPos }
   * @returns {Object} { state, action, targetPos, speed }
   */
  getAction(context) {
    const { health, maxHealth, position, playerPos, targetPos } = context;

    // ─────────────────────────────────────────────────────────
    // ÉTAPE 1: Envoyer les événements pour transitonner la FSM
    // ─────────────────────────────────────────────────────────
    
    // Vérifier seuil d'énergie pour retreat
    if (health / maxHealth < this.config.retreatThreshold) {
      this.send({ type: 'LOW_HEALTH' });
    }

    // Déterminer transition basée sur perception
    if (playerPos) {
      const state = this.getState();
      // Si en alerte ou investigation → forcer chase
      if (state === 'alert' || state === 'investigate') {
        this.send({ type: 'PLAYER_SPOTTED' });
      } else if (state === 'idle' || state === 'patrol') {
        this.send({ type: 'PLAYER_SPOTTED' });
        // Depuis alert, envoyer CHASE immédiatement
        this.send({ type: 'PLAYER_SPOTTED' });
      } else {
        this.send({ type: 'PLAYER_SPOTTED' });
      }
    } else if (targetPos && targetPos.length && targetPos.length() > 0.1) {
      // Joueur pas visible mais dernière position connue -> INVESTIGATE
      this.send({ type: 'INVESTIGATE' });
    } else {
      // Rien -> IDLE/PATROL
      if (this.getState() === 'idle') {
        this.send({ type: 'START_PATROL' });
      }
    }

    // ─────────────────────────────────────────────────────────
    // ÉTAPE 2: Lire l'état MAINTENANT (après transition)
    // ─────────────────────────────────────────────────────────
    const state = this.getState();

    // Déterminer action basée sur état
    let action = 'idle';
    let speed = 0;
    let actionTargetPos = null;

    switch (state) {
      case 'idle':
        action = 'idle';
        speed = 0;
        break;

      case 'patrol':
        action = 'patrol';
        speed = 0.05;
        // Générer une position aléatoire de patrouille si pas déjà fait
        if (!this._patrolTarget) {
          this._patrolTarget = this._generateRandomPatrolPoint(position);
          this._patrolTimer = Math.random() * 5 + 3; // 3-8 secondes
        }
        actionTargetPos = this._patrolTarget;
        
        // Réinitialiser la cible si trop proche
        if (position.subtract(this._patrolTarget).length() < 2) {
          this._patrolTarget = null;
        }
        break;

      case 'alert':
      case 'investigate':
        action = 'investigate';
        speed = 0.08;
        actionTargetPos = targetPos;
        break;

      case 'chase':
        action = 'chase';
        speed = 0.12;
        actionTargetPos = playerPos;
        if (!playerPos) {
          this.send({ type: 'LOST_PLAYER' });
        } else {
          const dist = position.subtract(playerPos).length();
          if (dist < this.config.attackRange) {
            this.send({ type: 'IN_RANGE' });
          }
        }
        break;

      case 'attack':
        action = 'attack';
        speed = 0.05;
        actionTargetPos = playerPos;
        if (!playerPos) {
          this.send({ type: 'LOST_PLAYER' });
        } else {
          const dist = position.subtract(playerPos).length();
          if (dist > this.config.attackRange * 1.5) {
            this.send({ type: 'OUT_OF_RANGE' });
          }
        }
        break;

      case 'retreat':
        action = 'retreat';
        speed = 0.1;
        if (playerPos) {
          actionTargetPos = position.add(position.subtract(playerPos).normalize().scale(15));
        }
        if (health / maxHealth > 0.6) {
          this.send({ type: 'HEALTH_RECOVERED' });
        }
        break;

      case 'dead':
        action = 'dead';
        speed = 0;
        break;
    }

    return {
      state,
      action,
      targetPos: actionTargetPos,
      speed,
    };
  }

  dispose() {
    this.service.stop();
  }

  /**
   * Génère un point aléatoire pour patrouiller autour de l'ennemi
   * @private
   */
  _generateRandomPatrolPoint(currentPos) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 15; // 10-25 units away
    const offset = new Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
    const patrolPos = currentPos.add(offset);
    // Limiter dans la map (130x110)
    patrolPos.x = Math.max(-65, Math.min(65, patrolPos.x));
    patrolPos.z = Math.max(-55, Math.min(55, patrolPos.z));
    return patrolPos;
  }
}
