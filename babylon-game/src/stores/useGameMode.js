import { ref } from 'vue'

// Simple global store for UI mode: 'combat' | 'map'
const mode = ref('combat')

export function useGameMode() {
  function setMode(m) { mode.value = m }
  function toggleMap(show) { mode.value = show ? 'map' : 'combat' }
  function isMap() { return mode.value === 'map' }
  return { mode, setMode, toggleMap, isMap }
}

export default useGameMode
