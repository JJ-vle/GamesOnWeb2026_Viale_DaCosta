import { ref } from 'vue'

// UI overlay state within an active game session: 'combat' | 'map'
const mode = ref('combat')

// Which gameplay mode the player chose at the main menu: 'arcade' | 'story' | null
const gameplayMode = ref(null)

export function useGameMode() {
  function setMode(m) { mode.value = m }
  function toggleMap(show) { mode.value = show ? 'map' : 'combat' }
  function isMap() { return mode.value === 'map' }

  function setGameplayMode(m) { gameplayMode.value = m }

  return { mode, setMode, toggleMap, isMap, gameplayMode, setGameplayMode }
}

export default useGameMode
