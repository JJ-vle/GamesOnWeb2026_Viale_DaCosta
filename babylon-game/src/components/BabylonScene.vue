<!--BabylonScene.vue-->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Game } from '@/babylon/Game'

const canvasRef = ref(null)
let game = null

onMounted(() => {
  game = new Game(canvasRef.value)
  game.start()
  window.addEventListener('resize', game.resize.bind(game))
})

onUnmounted(() => {
  window.removeEventListener('resize', game.resize)
  game.dispose()
})
</script>

<template>
  <canvas ref="canvasRef" class="babylon-canvas"></canvas>
</template>

<style scoped>
.babylon-canvas {
  width: 100vw;
  height: 100vh;
  display: block;
}
</style>
