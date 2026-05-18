<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BabylonScene from './components/BabylonScene.vue'
import ZoneMapView from './components/ZoneMapView.vue'
import GameEndView from './components/GameEndView.vue'
import ShopView from './components/ShopView.vue'
import InventoryView from './components/InventoryView.vue'
import DialogueView from './components/DialogueView.vue'
import ModelViewer from './components/ModelViewer.vue'
import { getGame } from './babylon/BabylonService'
import { useGameMode } from './stores/useGameMode'

const gameStarted = ref(false)
const gameEnded = ref(false)
// current player node id to pass to ZoneMapView
const playerNodeId = ref(null)
const currentSelectedNodeId = ref(null)  // Pour tracker le nœud sélectionné
// Shop overlay
const showShop = ref(false)
// Inventory overlay
const showInventory = ref(false)
const inventoryData = ref(null)
// Dialogue system
const showDialogue = ref(false)
const dialoguePausedGame = ref(false)
const currentDialogue = ref({
  characterName: 'Système',
  dialogueText: 'Bienvenue voyageur...',
  characterImage: '/assets/items/disquette/disquette_blanc.png'
})

const { mode, setMode, toggleMap } = useGameMode()

function returnToMenu() {
  gameStarted.value = false
  gameEnded.value = false
  setMode('combat')
}

  onMounted(() => {
  const handler = () => { returnToMenu() }
  window.addEventListener('returnToMenu', handler)

  // Écouter les demandes d'ouverture de la zone map depuis la scène (MainScene)
  const openMapHandler = (e) => {
    const detail = e && e.detail ? e.detail : {}
    const id = typeof detail.nodeId !== 'undefined' ? detail.nodeId : null
    const completed = !!detail.completed

    // If this open request comes from a completed zone, and it's the final boss node,
    // show the game end screen instead of opening the map.
    if (completed && id != null) {
      const g = getGame()
      const node = g?.scene?.zone?.tree?.nodes?.find(n => n.id === id)
      const isFinalBoss = node && node.type && node.type.toLowerCase().includes('boss') && node.depth === g?.scene?.zone?.tree?.depth
      if (isFinalBoss) {
        gameEnded.value = true
        return
      }
    }

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
    if (e.key && e.key.toLowerCase() === 'p') {
      e.preventDefault()
      setDialogueVisible(!showDialogue.value)
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
    // DEBUG: Touche pour ouvrir le shop (Shift+O)
    if (e.shiftKey && (e.key === 'O' || e.key === 'o')) {
      showShop.value = !showShop.value
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
  // Check if selected node is a Shop
  const g = getGame()
  if (g?.scene?.zone?.tree) {
    const node = g.scene.zone.tree.nodes.find(n => n.id === id)
    if (node && node.type && node.type.toLowerCase().includes('shop')) {
      // Show the shop instead of loading the zone
      currentSelectedNodeId.value = id
      showShop.value = true
      return
    }
  }

  // Otherwise load the zone normally
  if (g && g.scene && typeof g.scene.loadZoneByNodeId === 'function') {
    g.scene.loadZoneByNodeId(id)
  } else {
    console.warn('Game scene not ready to load zone')
  }
  // close the map UI
  toggleMap(false)
}

function onShopClose() {
  // Close shop and return to map
  showShop.value = false
  // Return to map showing the current node
  if (currentSelectedNodeId.value != null) {
    playerNodeId.value = currentSelectedNodeId.value
    setMode('map')
  }
}

function onReturnToMenuFromEnd() {
  returnToMenu()
}

const noop = () => { /* placeholder for future actions */ }

function setDialogueVisible(isVisible) {
  const game = getGame()

  if (isVisible) {
    if (game?.scene && !game.scene._isGamePaused) {
      game.scene._isGamePaused = true
      dialoguePausedGame.value = true
    } else {
      dialoguePausedGame.value = false
    }
    showDialogue.value = true
    return
  }

  showDialogue.value = false
  if (dialoguePausedGame.value && game?.scene && game.scene._isGamePaused) {
    game.scene._isGamePaused = false
  }
  dialoguePausedGame.value = false
}

// Dialogue system functions
function showDialogueBox(characterName = 'Système', dialogueText = 'Dialogue...', characterImage = '/assets/items/disquette/disquette_blanc.png') {
  currentDialogue.value = {
    characterName,
    dialogueText,
    characterImage
  }
  setDialogueVisible(true)
}

function hideDialogueBox() {
  setDialogueVisible(false)
}

function handleDialogueNext() {
  // Si le ScenarioSystem expose un handler global, l'appeler pour avancer
  if (typeof window !== 'undefined' && typeof window.scenarioNext === 'function') {
    window.scenarioNext()
    return
  }
  // fallback: cacher la boîte
  hideDialogueBox()
}

// Exposer les fonctions au contexte global pour pouvoir les appeler depuis Babylon
if (typeof window !== 'undefined') {
  window.showDialogueBox = showDialogueBox
  window.hideDialogueBox = hideDialogueBox
}
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
      <GameEndView v-if="gameEnded" @returnToMenu="onReturnToMenuFromEnd" />
      <ZoneMapView v-if="mode === 'map' && !gameEnded" :playerNodeId="playerNodeId" @selectZone="onSelectZone" @close="setMode('combat')" />
      <ShopView v-if="showShop" @close="onShopClose" />
      <InventoryView v-if="showInventory && inventoryData" :inventory="inventoryData" @close="showInventory = false" />
      <DialogueView 
        :isVisible="showDialogue"
        :characterName="currentDialogue.characterName"
        :dialogueText="currentDialogue.dialogueText"
        :characterImage="currentDialogue.characterImage"
        @close="hideDialogueBox"
        @next="handleDialogueNext"
      />
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
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 0%;
    animation: slideBgToMiddle 8s ease-in-out forwards;
    image-rendering: -moz-crisp-edges;
    image-rendering: -o-crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }

  @keyframes slideBgToMiddle {
    0% {
      object-position: center 0%;
    }
    100% {
      object-position: center 68%;
    }
  }

  .logo {
    width: 450px;
    max-width: 75vw;
    height: auto;

    filter:
      drop-shadow(0 0 12px rgba(237, 246, 255, 0.35))
      drop-shadow(0 8px 18px rgba(0,0,0,0.7));

    display: block;
  }

  .top-left {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .top-left::before {
    content: '';
    position: absolute;

    width: 420px;
    height: 420px;

    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    border-radius: 50%;

    background:
      radial-gradient(
        circle,
        rgba(120, 180, 255, 0.45) 0%,
        rgba(120, 180, 255, 0.18) 45%,
        rgba(120, 180, 255, 0.06) 70%,
        transparent 100%
      );

    filter: blur(55px);

    z-index: -1;
    pointer-events: none;
  }

  .left-bottom {
    position: fixed;
    left: 20px;
    bottom: 80px;
    display: flex;
    flex-direction: column;
    gap: 25px;
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
    border: 3px solid rgba(255,255,255,0.08);
    border-radius: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 55;
    backdrop-filter: blur(4px);
    box-shadow: 
      3px 0 0 0 rgba(255,255,255,0.08),
      -3px 0 0 0 rgba(255,255,255,0.08),
      0 3px 0 0 rgba(255,255,255,0.08),
      0 -3px 0 0 rgba(255,255,255,0.08),
      3px 3px 0 0 rgba(255,255,255,0.08),
      -3px 3px 0 0 rgba(255,255,255,0.08),
      3px -3px 0 0 rgba(255,255,255,0.08),
      -3px -3px 0 0 rgba(255,255,255,0.08);
  }

  .frame-placeholder {
    color: rgba(255,255,255,0.9);
    text-align: center;
    font-size: 18px;
    line-height: 1.4;
  }

  .play-button {
    width: 200px;
    padding: 15px 30px;
    font-size: 24px;
    color: #000000;
    background: #ffffff;
    border: 3px solid #ffffff;
    border-radius: 0px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    font-weight: bold;
    text-align: center;
    box-sizing: border-box;
    box-shadow: 
      8px 0 0 -4px #ffffff,
      -8px 0 0 -4px #ffffff,
      0 8px 0 -4px #ffffff,
      0 -8px 0 -4px #ffffff,
      8px 8px 0 -4px #ffffff,
      -8px 8px 0 -4px #ffffff,
      8px -8px 0 -4px #ffffff,
      -8px -8px 0 -4px #ffffff;
  }

  .menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .menu-button {
    width: 200px;
    padding: 15px 30px;
    font-size: 24px;
    color: #ffffff;
    background: rgba(0,0,0,0.25);
    border: 3px solid rgba(255,255,255,0.15);
    border-radius: 0px;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease;
    text-transform: none;
    text-align: center;
    box-sizing: border-box;
    box-shadow: 
      8px 0 0 -4px rgba(255,255,255,0.15),
      -8px 0 0 -4px rgba(255,255,255,0.15),
      0 8px 0 -4px rgba(255,255,255,0.15),
      0 -8px 0 -4px rgba(255,255,255,0.15),
      8px 8px 0 -4px rgba(255,255,255,0.15),
      -8px 8px 0 -4px rgba(255,255,255,0.15),
      8px -8px 0 -4px rgba(255,255,255,0.15),
      -8px -8px 0 -4px rgba(255,255,255,0.15);
  }

  .menu-button:hover, .menu-link:hover button {
    transform: translateY(-3px);
    background: rgba(255,255,255,0.06);
  }

  .menu-link button { background: transparent; }

  .play-button:hover {
    background: #f0f0f0;
    box-shadow: 
      8px 0 0 -4px #ffffff,
      -8px 0 0 -4px #ffffff,
      0 8px 0 -4px #ffffff,
      0 -8px 0 -4px #ffffff,
      8px 8px 0 -4px #ffffff,
      -8px 8px 0 -4px #ffffff,
      8px -8px 0 -4px #ffffff,
      -8px -8px 0 -4px #ffffff,
      0 0 30px 3px rgba(255, 255, 255, 0.6);
  }

  .play-button:active {
    transform: scale(0.98);
  }
</style>
