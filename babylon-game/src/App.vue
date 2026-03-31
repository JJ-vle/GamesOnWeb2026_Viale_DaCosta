<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BabylonScene from './components/BabylonScene.vue'
import ZoneMapView from './components/ZoneMapView.vue'

const gameStarted = ref(false)
const showZoneMap = ref(false)

function returnToMenu() {
  gameStarted.value = false
  showZoneMap.value = false
}

onMounted(() => {
  const handler = () => { returnToMenu() }
  window.addEventListener('returnToMenu', handler)

  const keyHandler = (e) => {
    if (!gameStarted.value) return
    if (e.key && e.key.toLowerCase() === 'm') {
      showZoneMap.value = !showZoneMap.value
    }
  }
  window.addEventListener('keydown', keyHandler)

  onUnmounted(() => {
    window.removeEventListener('returnToMenu', handler)
    window.removeEventListener('keydown', keyHandler)
  })
})
</script>

<template>
  <div v-if="!gameStarted" class="home-page">
    <h1>Universe Need</h1>
    <button @click="gameStarted = true" class="play-button">jouer</button>
  </div>

  <template v-else>
    <ZoneMapView v-if="showZoneMap" />
    <BabylonScene v-else />
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
