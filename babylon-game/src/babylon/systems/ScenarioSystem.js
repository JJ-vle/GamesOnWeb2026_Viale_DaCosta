/**
 * ScenarioSystem — Gère l'affichage des dialogues de scénario
 * Les dialogues sont définis dans scenarios.json et affichés via DialogueView
 */

import scenarios from './scenarios.json'

export class ScenarioSystem {
  constructor() {
    this.scenarios = scenarios
    this.displayedDialogues = new Set() // Pour tracker les dialogues déjà affichés (keys zone_round)
    this.currentSequences = {} // map key -> { dialogues: [], index }
    this.currentZoneId = null
  }

  /**
   * Récupère les dialogues pour une zone donnée
   * @param {number} zoneId - L'ID de la zone
   * @returns {Array} Liste des dialogues pour cette zone
   */
  getDialoguesForZone(zoneId) {
    const zone = this.scenarios.zones.find(z => z.zoneId === zoneId)
    return zone ? zone.dialogues : []
  }

  /**
   * Récupère le dialogue à afficher pour le round courant dans une zone
   * @param {number} zoneId - L'ID de la zone
   * @param {number} roundNumber - Le numéro du round courant
   * @returns {Object|null} Le dialogue à afficher ou null si aucun
   */
  /**
   * Démarre une séquence de dialogues pour la zone/round si elle n'a pas déjà été jouée
   * Retourne true si une séquence a été lancée, false sinon
   */
  startDialogueSequence(zoneId, roundNumber) {
    const dialogues = this.getDialoguesForZone(zoneId)
    const dialoguesForRound = dialogues.filter(d => d.round === roundNumber)
    if (dialoguesForRound.length === 0) return false

    const key = `${zoneId}_${roundNumber}`
    if (this.displayedDialogues.has(key)) return false

    // initialiser la séquence
    this.currentSequences[key] = { dialogues: dialoguesForRound.slice(), index: 0 }
    // marquer comme affiché pour ne pas relancer plus tard
    this.displayedDialogues.add(key)

    // exposer une fonction globale pour avancer dans la séquence
    if (typeof window !== 'undefined') {
      window.scenarioNext = this._advanceSequence.bind(this, key)
    }

    // afficher le premier
    this._showDialogueObject(dialoguesForRound[0])
    return true
  }

  /**
   * Avance la séquence identifiée par `key`. Si fin de séquence, ferme la dialogue et nettoie.
   */
  _advanceSequence(key) {
    const seq = this.currentSequences[key]
    if (!seq) return
    seq.index++
    if (seq.index >= seq.dialogues.length) {
      // fin de la séquence
      delete this.currentSequences[key]
      if (typeof window !== 'undefined' && window.hideDialogueBox) {
        window.hideDialogueBox()
      }
      // nettoyer le handler global si aucune séquence active
      if (typeof window !== 'undefined') {
        const anyLeft = Object.keys(this.currentSequences).length > 0
        if (!anyLeft) delete window.scenarioNext
      }
      return
    }

    // afficher le dialogue suivant
    this._showDialogueObject(seq.dialogues[seq.index])
  }

  /**
   * Affiche un dialogue via la DialogueView
   * @param {Object} dialogue - L'objet dialogue { nom, sprite, dialogue, round }
   */
  showDialogue(dialogue) {
    // backward compatibility: directly show a single dialogue
    this._showDialogueObject(dialogue)
  }

  _showDialogueObject(dialogue) {
    if (!dialogue) return
    const spritePath = this._resolveSpritePath(dialogue.sprite)
    if (typeof window !== 'undefined' && window.showDialogueBox) {
      window.showDialogueBox(
        dialogue.nom,
        dialogue.dialogue,
        spritePath
      )
    } else {
      console.warn('[ScenarioSystem] showDialogueBox non disponible')
    }
  }

  /**
   * Détermine la catégorie du sprite (disquette, usb, etc.)
   * @param {string} spriteFilename - Le nom du fichier sprite
   * @returns {string} La catégorie (usb, disquette, etc.)
   */
  _getSpriteCategory(spriteFilename) {
    if (spriteFilename.includes('usb') || spriteFilename.includes('turquoize') || spriteFilename.includes('rouge')) {
      return 'usb'
    }
    if (spriteFilename.includes('disquette')) {
      return 'disquette'
    }
    return 'items' // Fallback
  }

  _resolveSpritePath(spriteFilename) {
    if (!spriteFilename) return '/assets/items/disquette/disquette_blanc.png'
    if (spriteFilename.startsWith('/')) return spriteFilename
    if (spriteFilename.startsWith('sprite_')) {
      return `/assets/sprites/${spriteFilename}`
    }
    return `/assets/items/${this._getSpriteCategory(spriteFilename)}/${spriteFilename}`
  }

  /**
   * Réinitialise le système pour une nouvelle zone
   */
  reset() {
    this.currentDialogueIndex = 0
  }
}
