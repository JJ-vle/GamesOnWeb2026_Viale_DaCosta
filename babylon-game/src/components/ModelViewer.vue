<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import '@babylonjs/loaders'

const props = defineProps({
  modelSrc: { type: String, default: '/assets/models/mecha01.glb' },
  animSrc: { type: String, default: '/assets/models/mecha01_idle.glb' }
})

const canvas = ref(null)
let engine = null
let scene = null

onMounted(() => {
  if (!canvas.value) return
  engine = new Engine(canvas.value, true, { preserveDrawingBuffer: true, stencil: true })
  scene = new Scene(engine)
  scene.clearColor = new Color4(0,0,0,0)

  const camera = new ArcRotateCamera('cam', Math.PI/2, Math.PI/2.8, 8, new Vector3(0,1,0), scene)
  // Do not attach controls to prevent user interaction
  // camera.attachControl(canvas.value, true)

  const light = new HemisphericLight('h', new Vector3(0.5,1,0), scene)
  light.intensity = 1.2

  // load model, then optionally load animation file and play idle animations
  SceneLoader.Append('', props.modelSrc, scene, (s) => {
    try {
      const root = s.meshes && s.meshes.length ? s.meshes[0] : null
      if (root) root.position = Vector3.Zero()
    } catch (e) { /* ignore */ }

    // Apply same material fixes as Player.js to prevent invisible surfaces
    try {
      s.meshes.forEach(m => {
        if (m.material) {
          m.material.transparencyMode = 1
          if (m.material.albedoTexture) m.material.useAlphaFromAlbedoTexture = true
          if (m.material.diffuseTexture) m.material.useAlphaFromDiffuseTexture = true
          m.material.backFaceCulling = false
        }
      })
    } catch (e) { /* ignore */ }

    // compute scene bounds and position camera
    try {
      const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
      const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)
      scene.meshes.forEach(m => {
        if (!m.getBoundingInfo) return
        const bb = m.getBoundingInfo().boundingBox
        const mn = bb.minimumWorld
        const mx = bb.maximumWorld
        min.x = Math.min(min.x, mn.x); min.y = Math.min(min.y, mn.y); min.z = Math.min(min.z, mn.z)
        max.x = Math.max(max.x, mx.x); max.y = Math.max(max.y, mx.y); max.z = Math.max(max.z, mx.z)
      })
      const center = new Vector3((min.x+max.x)/2, (min.y+max.y)/2, (min.z+max.z)/2)
      const size = Math.max(max.x-min.x, max.y-min.y, max.z-min.z)
      camera.setTarget(center)
      camera.alpha = Math.PI/2
      camera.beta = Math.PI/2.8
      // increase multiplier so camera is further out by default (less zoomed)
      camera.radius = Math.max(12, size * 5.0)
      // lock zoom radius
      camera.lowerRadiusLimit = camera.radius
      camera.upperRadiusLimit = camera.radius
    } catch(e) { /* ignore */ }

    // load animation container and transfer animationGroups onto existing scene nodes by name
    // create wrapper and reparent meshes so we can rotate/transform model consistently
    let wrapper = new TransformNode('modelWrapper', scene)
    try {
      s.meshes.forEach(m => { try { if (m !== scene.getMeshByName('ground')) m.parent = wrapper } catch(e){} })
      // try to orient model upright (many models export rotated)
      wrapper.rotation.x += Math.PI / 2
    } catch(e) { /* ignore */ }

    if (props.animSrc) {
      SceneLoader.LoadAssetContainer('', props.animSrc, scene, (container) => {
        try {
          container.animationGroups.forEach(ag => {
            const newAg = new AnimationGroup(ag.name || 'imported', scene)
            ag.targetedAnimations.forEach(ta => {
              const targetName = ta.target && ta.target.name
              if (!targetName) return
              const targetInScene = scene.getMeshByName(targetName) || scene.getTransformNodeByName(targetName)
              if (targetInScene) {
                newAg.addTargetedAnimation(ta.animation, targetInScene)
              }
            })
            try { newAg.start(true) } catch(e) {}
          })
        } catch(e) { /* ignore */ }
        try { container.dispose() } catch(e) {}
      })
    } else {
      try { scene.animationGroups.forEach(g => g.start(true)) } catch(e) {}
    }

    // store wrapper for auto-rotation
    try { scene._modelWrapper = wrapper } catch(e) { /* ignore */ }
  })

  // auto-rotate model slowly by rotating the wrapper if present
  let lastTime = performance.now()
  engine.runRenderLoop(() => {
    if (!scene) return
    const now = performance.now()
    const dt = now - lastTime
    lastTime = now
    try {
      const wrapper = scene._modelWrapper
      if (wrapper) wrapper.rotation.y += 0.0006 * dt
    } catch(e) {}
    scene.render()
  })

  const handleResize = () => { if (engine) engine.resize() }
  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    try { window.removeEventListener('resize', handleResize) } catch(e) {}
    try { scene && scene.dispose(); engine && engine.dispose() } catch(e) {}
  })
})
</script>

<template>
  <canvas ref="canvas" class="model-canvas" />
</template>

<style scoped>
 .model-canvas {
   width: 100%;
   height: 100%;
   display: block;
 }
</style>
