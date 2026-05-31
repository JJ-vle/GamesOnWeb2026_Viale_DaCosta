<script setup>
import { onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['close'])

function closeCredits() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeCredits()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="credits-overlay" role="dialog" aria-modal="true" aria-labelledby="credits-title">
    <div class="credits-bg">
      <img src="/assets/free_pixel_city_background_10.png" alt="Fond city pixel art" class="credits-bg-img" />
      <div class="credits-bg-dim"></div>
    </div>

    <div class="credits-panel">
      <div class="credits-header">
        <p class="credits-kicker">Univers Needs</p>
        <h1 id="credits-title" class="credits-title">Crédits</h1>
        <p class="credits-subtitle">Merci à toutes les personnes et ressources qui ont rendu ce projet possible.</p>
      </div>

      <div class="credits-scroll">
        <section class="credits-section">
          <h2>Assets 2D</h2>
          <div class="credits-group">
            <h3>Backgrounds</h3>
            <ul>
              <li>Warped City - ansimuz</li>
              <li>Cyberpunk Street Environment - ansimuz</li>
              <li>Cyberpunk Backgrounds Pixel Art - CraftPix.net</li>
              <li>City Parallax Background with Buildings Pixel Art - CraftPix.net</li>
            </ul>
          </div>
          <div class="credits-group">
            <h3>Sprites Personnages et Modules</h3>
            <ul>
              <li>Jean-Jacques Viale</li>
            </ul>
          </div>
        </section>

        <section class="credits-section">
          <h2>Assets 3D</h2>
          <div class="credits-group">
            <h3>Models</h3>
            <ul>
              <li>Voxel Mecha - Max Parata</li>
              <li>Voxel Spaceship - Max Parata</li>
              <li>Voxel Cyberpunk City - Max Parata</li>
            </ul>
          </div>
          <div class="credits-group">
            <h3>Configuration de la Map</h3>
            <ul>
              <li>Tom Da Costa</li>
            </ul>
          </div>
        </section>

        <section class="credits-section">
          <h2>Audio</h2>
          <div class="credits-group">
            <h3>Musiques</h3>
            <ul>
              <li>Anti Matter Magic - tricksntraps</li>
              <li>Cyberpunk City - Eric Matyas</li>
              <li>Cyberpunk Moonlight Sonata v2 - Joth</li>
              <li>Blue Beat 01 - ERH</li>
              <li>night_club_chill_100bpm - tricksntraps</li>
            </ul>
          </div>
          <div class="credits-group">
            <h3>Sound effects</h3>
            <ul>
              <li>Game Start - plasterbrain (Freesound)</li>
              <li>BLASTER 2 - tutarap (Freesound)</li>
              <li>UI Designed Hit - Modern Interface - Impact Sweetener 01 - RescopicSound</li>
              <li>Teleport - Fupicat (Freesound)</li>
            </ul>
          </div>
        </section>
      </div>

      <div class="credits-footer">
        <button class="credits-close" @click="closeCredits">Retour au menu</button>
        <p class="credits-hint">Appuyez sur Échap pour fermer</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.credits-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #f4f8ff;
  font-family: 'Courier New', monospace;
}

.credits-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.credits-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  image-rendering: pixelated;
  transform: scale(1.02);
}

.credits-bg-dim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(6, 10, 20, 0.74) 0%, rgba(6, 10, 20, 0.5) 45%, rgba(6, 10, 20, 0.82) 100%),
    radial-gradient(circle at top, rgba(0, 220, 255, 0.12), transparent 38%);
}

.credits-panel {
  position: relative;
  width: min(920px, 100%);
  max-height: min(88vh, 980px);
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px;
  border: 2px solid rgba(132, 232, 255, 0.35);
  background: rgba(5, 12, 22, 0.74);
  backdrop-filter: blur(8px);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.55),
    0 0 40px rgba(0, 220, 255, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.credits-header {
  text-align: center;
}

.credits-kicker {
  margin: 0 0 8px;
  font-size: 0.82rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(156, 234, 255, 0.8);
}

.credits-title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #f7fbff;
  text-shadow: 0 0 20px rgba(0, 220, 255, 0.18);
}

.credits-subtitle {
  margin: 12px auto 0;
  max-width: 720px;
  color: rgba(231, 243, 255, 0.82);
  font-size: 1rem;
}

.credits-scroll {
  display: grid;
  gap: 18px;
  overflow: auto;
  padding-right: 6px;
}

.credits-scroll::-webkit-scrollbar {
  width: 8px;
}

.credits-scroll::-webkit-scrollbar-thumb {
  background: rgba(110, 225, 255, 0.6);
  border-radius: 999px;
}

.credits-section {
  padding: 18px 20px;
  border: 1px solid rgba(132, 232, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
}

.credits-section h2 {
  margin: 0 0 12px;
  font-size: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8deeff;
}

.credits-group + .credits-group {
  margin-top: 14px;
}

.credits-group h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.credits-group ul {
  margin: 0;
  padding-left: 0;
  display: grid;
  gap: 6px;
  color: rgba(245, 249, 255, 0.9);
  list-style: none;
}

.credits-group li {
  line-height: 1.45;
}

.credits-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.credits-close {
  min-width: 220px;
  padding: 14px 24px;
  border: 1px solid rgba(145, 238, 255, 0.45);
  background: linear-gradient(180deg, rgba(15, 40, 62, 0.95), rgba(7, 20, 32, 0.95));
  color: #effcff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: 0 0 24px rgba(0, 220, 255, 0.12);
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.credits-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(0, 220, 255, 0.18);
  background: linear-gradient(180deg, rgba(20, 54, 82, 0.98), rgba(10, 24, 38, 0.98));
}

.credits-close:active {
  transform: translateY(0);
}

.credits-hint {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(225, 237, 255, 0.7);
}

@media (max-width: 768px) {
  .credits-overlay {
    padding: 14px;
  }

  .credits-panel {
    max-height: 92vh;
    padding: 18px;
  }

  .credits-section {
    padding: 14px;
  }

  .credits-close {
    width: 100%;
    min-width: 0;
  }
}
</style>
