// BabylonService.js
// Lightweight singleton to keep one persistent Game/Engine/Scene
// Avoids recreating Babylon on view switches. Minimal API: init, get, dispose
import { Game } from './Game'

const state = {
  game: null,
  _resizeHandler: null
}

export function initBabylon(canvas) {
  if (state.game) return state.game

  // Create the Game instance which in the existing code constructs
  // the engine and scene from the provided canvas.
  state.game = new Game(canvas)

  if (typeof state.game.start === 'function') {
    state.game.start()
  }

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

export function disposeBabylon() {
  try {
    if (state._resizeHandler) window.removeEventListener('resize', state._resizeHandler)
  } catch (e) {}
  if (state.game && typeof state.game.dispose === 'function') {
    state.game.dispose()
  }
  state.game = null
  state._resizeHandler = null
}

export default {
  initBabylon,
  getGame,
  disposeBabylon
}
