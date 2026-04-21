<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BabylonScene from './components/BabylonScene.vue'
import ZoneMapView from './components/ZoneMapView.vue'
import InventoryView from './components/InventoryView.vue'
import ModelViewer from './components/ModelViewer.vue'
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

    // Background wheel-based parallax: use mouse wheel to move background
    const bg = { y: 0 }
    let maxBgY = 0
    const factor = 0.5

    // Work with the actual background image element so we can move it precisely.
    const bgImgEl = document.querySelector('.home-bg-img')
    const recalcMax = () => {
      if (!bgImgEl || !bgImgEl.naturalWidth || !bgImgEl.naturalHeight) return
      const scale = Math.max(window.innerWidth / bgImgEl.naturalWidth, window.innerHeight / bgImgEl.naturalHeight)
      const displayedHeight = bgImgEl.naturalHeight * scale
      maxBgY = Math.max(0, displayedHeight - window.innerHeight)
      // clamp current value into new range
      bg.y = Math.min(maxBgY, Math.max(0, bg.y))
      if (bgImgEl) bgImgEl.style.transform = `translate(-50%, ${-bg.y}px)`
    }

    if (bgImgEl && bgImgEl.complete) recalcMax()
    if (bgImgEl) bgImgEl.addEventListener('load', recalcMax)
    window.addEventListener('resize', recalcMax)

    const onWheel = (e) => {
      if (gameStarted.value) return
      e.preventDefault()
      const delta = e.deltaY || 0
      // wheel down -> reveal lower part -> increase bg.y
      bg.y = Math.min(maxBgY, Math.max(0, bg.y + delta * factor))
      if (bgImgEl) bgImgEl.style.transform = `translate(-50%, ${-bg.y}px)`
    }

    const homeEl = document.querySelector('.home-page')
    if (homeEl && bgImgEl) {
      homeEl.addEventListener('wheel', onWheel, { passive: false })
    } else {
      window.addEventListener('wheel', onWheel, { passive: false })
    }

  onUnmounted(() => {
    window.removeEventListener('returnToMenu', handler)
    window.removeEventListener('openZoneMap', openMapHandler)
    window.removeEventListener('keydown', keyHandler)
    // remove wheel listener from either home element or window and cleanup
    const homeEl = document.querySelector('.home-page')
    try { if (homeEl) homeEl.removeEventListener('wheel', onWheel) } catch(e) { /* ignore */ }
    try { window.removeEventListener('wheel', onWheel) } catch(e) { /* ignore */ }
    try { window.removeEventListener('resize', recalcMax) } catch(e) { /* ignore */ }
    try { const bgImgEl = document.querySelector('.home-bg-img'); if (bgImgEl) bgImgEl.removeEventListener('load', recalcMax) } catch(e) { /* ignore */ }
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

const noop = () => { /* placeholder for future actions */ }
</script>

<template>
  <div v-if="!gameStarted" class="home-page">
    <div class="home-bg">
      <img src="/assets/background_skyline-b.png" class="home-bg-img" alt="background" />
    </div>

    <div class="top-left">
      <img src="/assets/logo.png" alt="logo" class="logo" />
    </div>

    <div class="left-bottom">
      <button @click="gameStarted = true" class="play-button">Jouer</button>
      <button @click="noop" class="menu-button">Avancement</button>
      <a href="https://github.com/JJ-vle/GamesOnWeb2026_Viale_DaCosta" target="_blank" rel="noopener" class="menu-link"><button class="menu-button">Github</button></a>
      <button @click="noop" class="menu-button">Crédits</button>
    </div>

    <div class="right-frame">
      <ModelViewer model-src="/assets/models/mecha01.glb" />
    </div>
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
      /* background handled by .home-bg element */
    font-family: Arial, sans-serif;
    color: #fff;
  }

  .home-bg {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: -1;
  }

  .home-bg-img {
    position: absolute;
    left: 50%;
    top: 0;
    transform: translate(-50%, 0px);
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
    image-rendering: -moz-crisp-edges;
    image-rendering: -o-crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }

  .logo {
    width: 360px;
    max-width: 60vw;
    height: auto;
    filter: drop-shadow(0 8px 18px rgba(0,0,0,0.7));
    display: block;
  }

  .top-left {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 60;
  }

  .left-bottom {
    position: fixed;
    left: 20px;
    bottom: 140px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 60;
  }

  .right-frame {
    position: fixed;
    right: 160px;
    top: 50%;
    transform: translateY(-50%);
    width: 420px;
    height: 640px;
    background: rgba(0,0,0,0.35);
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 55;
    backdrop-filter: blur(4px);
  }

  .frame-placeholder {
    color: rgba(255,255,255,0.9);
    text-align: center;
    font-size: 18px;
    line-height: 1.4;
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

  .menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .menu-button {
    padding: 12px 34px;
    font-size: 18px;
    color: #ffffff;
    background: rgba(0,0,0,0.25);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease;
    text-transform: none;
  }

  .menu-button:hover, .menu-link:hover button {
    transform: translateY(-3px);
    background: rgba(255,255,255,0.06);
  }

  .menu-link button { background: transparent; }

  .play-button:hover {
    background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  }

  .play-button:active {
    transform: scale(0.98);
  }
</style>
