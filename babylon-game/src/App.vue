<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BabylonScene from './components/BabylonScene.vue'
import ZoneMapView from './components/ZoneMapView.vue'
import InventoryView from './components/InventoryView.vue'
import { getGame } from './babylon/BabylonService'
import { useGameMode } from './stores/useGameMode'

const gameStarted = ref(false)
// current player node id to pass to ZoneMapView
const playerNodeId = ref(null)
// Inventory overlay
const showInventory = ref(false)
const inventoryData = ref(null)

const { mode, setMode, toggleMap } = useGameMode()

function returnToMenu() {
  gameStarted.value = false
  setMode('combat')
}

  onMounted(() => {
  const handler = () => { returnToMenu() }
  window.addEventListener('returnToMenu', handler)

  // Écouter les demandes d'ouverture de la zone map depuis la scène (MainScene)
  const openMapHandler = (e) => {
    const id = e && e.detail && typeof e.detail.nodeId !== 'undefined' ? e.detail.nodeId : null
    if (mode.value !== 'map') {
      if (id != null) playerNodeId.value = id
      setMode('map')
    }
  }
  window.addEventListener('openZoneMap', openMapHandler)

  const keyHandler = (e) => {
    if (!gameStarted.value) return
    if (e.key && e.key.toLowerCase() === 'm') {
      // Toggle map open/close on 'm'
      if (mode.value !== 'map') {
        const g = getGame();
        // If scene defines the current node, use it. Otherwise fallback.
        const currentId = g?.scene?.currentZoneNodeId ?? null;
        playerNodeId.value = currentId;
        setMode('map')
      } else {
        setMode('combat')
      }
    }
    if (e.key && (e.key.toLowerCase() === 'i' || e.key === 'Tab')) {
      e.preventDefault()
      if (!showInventory.value) {
        // Snapshot de l'inventaire depuis la scène (read-only)
        const g = getGame()
        const inv = g?.scene?.player?.inventory
        inventoryData.value = inv
          ? { items: [...inv.items], slotCapacity: { ...inv.slotCapacity }, slotCount: { ...inv.slotCount } }
          : { items: [], slotCapacity: {}, slotCount: {} }
        showInventory.value = true
      } else {
        showInventory.value = false
      }
    }
  }
  window.addEventListener('keydown', keyHandler)

  onUnmounted(() => {
    window.removeEventListener('returnToMenu', handler)
    window.removeEventListener('openZoneMap', openMapHandler)
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
      <ZoneMapView v-if="mode === 'map'" :playerNodeId="playerNodeId" @selectZone="onSelectZone" @close="setMode('combat')" />
      <InventoryView v-if="showInventory && inventoryData" :inventory="inventoryData" @close="showInventory = false" />
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
