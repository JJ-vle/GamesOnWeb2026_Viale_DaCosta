<!--BabylonScene.vue-->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { initBabylon, getGame } from '@/babylon/BabylonService'

// The canvas will be created and passed once to the singleton Babylon service.
// We intentionally do NOT dispose the Game on unmount so the engine/scene
// remain persistent across UI view switches.
const canvasRef = ref(null)

onMounted(() => {
  initBabylon(canvasRef.value)
})

onUnmounted(() => {
  // NOTE: no dispose here. Keep the singleton alive.
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
  z-index: 0;
}
</style>
