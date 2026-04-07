<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BabylonScene from './components/BabylonScene.vue'
import ZoneMapView from './components/ZoneMapView.vue'
import { getGame } from './babylon/BabylonService'
import { useGameMode } from './stores/useGameMode'

const gameStarted = ref(false)
// current player node id to pass to ZoneMapView
const playerNodeId = ref(null)

const { mode, setMode, toggleMap } = useGameMode()

function returnToMenu() {
  gameStarted.value = false
  setMode('combat')
}

  onMounted(() => {
  const handler = () => { returnToMenu() }
  window.addEventListener('returnToMenu', handler)

  const keyHandler = (e) => {
    if (!gameStarted.value) return
    if (e.key && e.key.toLowerCase() === 'm') {
      // Open the zone map on 'm' — avoid toggling off here to prevent conflict
      // with ZoneMapView's own key handling. When opening, set a player id
      // so the map receives it as a prop immediately.
      if (mode.value !== 'map') {
        playerNodeId.value = 5
        setMode('map')
      }
    }
  }
  window.addEventListener('keydown', keyHandler)

  onUnmounted(() => {
    window.removeEventListener('returnToMenu', handler)
    window.removeEventListener('keydown', keyHandler)
  })
})

function onSelectZone(id) {
  // ask the running Game/MainScene to load the selected zone node
  const g = getGame()
  if (g && g.scene && typeof g.scene.loadZoneByNodeId === 'function') {
    g.scene.loadZoneByNodeId(id)
  } else {
    console.warn('Game scene not ready to load zone')
  }
  // close the map UI
  toggleMap(false)
}
</script>

<template>
  <div v-if="!gameStarted" class="home-page">
    <h1>Universe Need</h1>
    <button @click="gameStarted = true" class="play-button">jouer</button>
  </div>

  <template v-else>
    <!-- Keep Babylon canvas mounted persistently. Show the map as an overlay when mode === 'map'. -->
    <div class="game-root">
      <BabylonScene />
      <ZoneMapView v-if="mode === 'map'" :playerNodeId="playerNodeId" @selectZone="onSelectZone" />
    </div>
  </template>
</template>

<style>
  body {
    margin: 0;
    overflow: hidden;
  }

  .home-page {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 30px;
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    font-family: Arial, sans-serif;
  }

  .home-page h1 {
    color: #ffffff;
    font-size: 48px;
    margin: 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .play-button {
    padding: 15px 40px;
    font-size: 24px;
    color: #ffffff;
    background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
    border: 2px solid #ffffff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    font-weight: bold;
  }

  .play-button:hover {
    background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  }

  .play-button:active {
    transform: scale(0.98);
  }
</style>
