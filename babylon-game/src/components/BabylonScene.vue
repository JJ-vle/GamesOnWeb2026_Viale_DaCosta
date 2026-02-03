<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Color3
} from '@babylonjs/core'

const canvasRef = ref(null)

let engine = null
let scene = null

const createScene = () => {
  const scene = new Scene(engine)

  scene.clearColor = new Color3(1, 0, 0)

  const sphere = MeshBuilder.CreateSphere(
    'mySphere',
    { diameter: 2, segments: 32 },
    scene
  )
  sphere.position.y = 1

  MeshBuilder.CreateGround(
    'myGround',
    { width: 60, height: 60 },
    scene
  )

  const camera = new FreeCamera(
    'myCamera',
    new Vector3(0, 5, -10),
    scene
  )
  camera.setTarget(Vector3.Zero())
  camera.attachControl(canvasRef.value, true)

  const light = new HemisphericLight(
    'myLight',
    new Vector3(0, 1, 0),
    scene
  )
  light.intensity = 0.3

  return scene
}

const resize = () => {
  engine?.resize()
}

onMounted(() => {
  engine = new Engine(canvasRef.value, true)
  scene = createScene()

  engine.runRenderLoop(() => {
    scene.render()
  })

  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  engine?.dispose()
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
