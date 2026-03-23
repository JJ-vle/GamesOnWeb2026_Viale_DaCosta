<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BabylonScene from './components/BabylonScene.vue'

const gameStarted = ref(false)

onMounted(() => {
  const handler = () => { gameStarted.value = false }
  window.addEventListener('returnToMenu', handler)
  // remove on unmount
  onUnmounted(() => window.removeEventListener('returnToMenu', handler))
})
</script>

<template>
  <div v-if="!gameStarted" class="home-page">
    <h1>Le titre là mais je m'en souviens plus trop</h1>
    <button @click="gameStarted = true" class="play-button">jouer</button>
  </div>
  <BabylonScene v-if="gameStarted" />
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
