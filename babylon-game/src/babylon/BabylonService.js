// BabylonService.js
// Lightweight singleton to keep one persistent Game/Engine/Scene
// Avoids recreating Babylon on view switches. Minimal API: init, get, dispose
import { Game } from './Game'

const state = {
  game: null,
  _resizeHandler: null,
  _uiPaused: false
}

function applyUiPause(game, paused) {
  if (game?.scene) {
    game.scene._isUiPaused = !!paused
  }
}

export function initBabylon(canvas, gameplayMode = 'arcade') {
  if (state.game) return state.game

  // Create the Game instance which in the existing code constructs
  // the engine and scene from the provided canvas.
  state.game = new Game(canvas, gameplayMode)

  if (typeof state.game.start === 'function') {
    state.game.start()
  }

  applyUiPause(state.game, state._uiPaused)

  // Global resize handler (registered once)
  const resizeHandler = () => {
    try {
      state.game && state.game.resize && state.game.resize()
    } catch (e) {
      // swallow - best-effort resize
    }
  }
  window.addEventListener('resize', resizeHandler)
  state._resizeHandler = resizeHandler

  return state.game
}

export function getGame() {
  return state.game
}

export function setUiPaused(paused) {
  state._uiPaused = !!paused
  applyUiPause(state.game, state._uiPaused)
}

export function disposeBabylon() {
  try {
    if (state._resizeHandler) window.removeEventListener('resize', state._resizeHandler)
  } catch (e) {}
  if (state.game && typeof state.game.dispose === 'function') {
    state.game.dispose()
  }
  state.game = null
  state._resizeHandler = null
  state._uiPaused = false
}

export default {
  initBabylon,
  getGame,
  setUiPaused,
  disposeBabylon
}
