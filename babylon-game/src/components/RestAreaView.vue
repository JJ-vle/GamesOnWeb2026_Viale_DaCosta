<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getGame } from '../babylon/BabylonService'

const emit = defineEmits(['close', 'healPlayer'])

const playerLife = ref(0)
const playerMaxLife = ref(0)

const isFullLife = computed(() => playerLife.value >= playerMaxLife.value)

function refreshLife() {
  const game = getGame()
  const player = game?.scene?.playerEntry
  playerLife.value = player?.life ?? 0
  playerMaxLife.value = player?.maxLife ?? 0
}

const handleKeyPress = (e) => {
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
    closeRestArea()
  }
}

const closeRestArea = () => {
  emit('close')
}

const healFully = () => {
  if (isFullLife.value) return
  emit('healPlayer')
  refreshLife()
}

onMounted(() => {
  refreshLife()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<template>
  <div class="shop-overlay">
    <div class="shop-container">
      <button class="close-btn" @click="closeRestArea" title="Fermer (S)">
        ✕
      </button>

      <div class="merchant-area">
        <div class="merchant-card">
          <img src="/assets/sprites/sprite_scientist.png" alt="Scientifique" class="merchant-sprite" />
          <div class="merchant-label">SCIENTIFIQUE</div>
        </div>
      </div>

      <div class="dialog-box">
        <div class="dialog-text">
          Ah on se voit enfin, tu veux que je te resserres quelques boulons ?
        </div>
      </div>

      <div class="rest-content">
        <div class="life-status">
          Intégrité robot: <span class="life-value">{{ playerLife }} / {{ playerMaxLife }}</span>
        </div>

        <button class="btn-heal" :disabled="isFullLife" @click="healFully">
          {{ isFullLife ? 'INTÉGRITÉ DÉJÀ MAX' : 'RÉPARER ENTIEREMENT LE ROBOT' }}
        </button>

        <button class="btn-cancel" @click="closeRestArea">
          FERMER
        </button>
      </div>

      <div class="keyboard-hint">
        Appuyez sur <kbd>S</kbd> pour fermer
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-overlay {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(135deg, rgba(10, 20, 40, 0.6) 0%, rgba(15, 35, 60, 0.5) 50%, rgba(10, 20, 40, 0.6) 100%),
    url('/assets/cyberpunk-street.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.shop-container {
  position: relative;
  max-width: 920px;
  width: 90%;
  max-height: 90vh;
  background: rgba(10, 15, 30, 0.85);
  border: 2px solid #00ccff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 0 40px rgba(0, 204, 255, 0.3), inset 0 0 20px rgba(0, 204, 255, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #ff6666;
}

.merchant-area {
  display: flex;
  justify-content: center;
}

.merchant-card {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.merchant-sprite {
  width: 120px;
  height: 120px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 10px rgba(0, 204, 255, 0.6));
}

.merchant-label {
  color: #00ccff;
  font-weight: 800;
  letter-spacing: 2px;
  text-shadow: 0 0 12px rgba(0, 204, 255, 0.8);
}

.dialog-box {
  border: 1px solid rgba(0, 204, 255, 0.5);
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.55);
  padding: 18px;
}

.dialog-text {
  text-align: center;
  color: #d6f5ff;
  font-size: 1.1rem;
}

.rest-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.life-status {
  color: #ffffff;
  font-size: 1.05rem;
}

.life-value {
  color: #00ff88;
  font-weight: 700;
}

.btn-heal,
.btn-cancel {
  border: none;
  border-radius: 6px;
  padding: 12px 18px;
  font-weight: 800;
  letter-spacing: 0.5px;
  cursor: pointer;
  min-width: 320px;
}

.btn-heal {
  background: linear-gradient(180deg, #00cc88 0%, #009966 100%);
  color: #02140d;
}

.btn-heal:hover:not(:disabled) {
  filter: brightness(1.08);
}

.btn-heal:disabled {
  background: #2e4c42;
  color: #9ec2b5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #2a3e55;
  color: #d6e5f2;
}

.btn-cancel:hover {
  background: #365273;
}

.keyboard-hint {
  text-align: center;
  color: #aac6dc;
  font-size: 0.92rem;
}

kbd {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  padding: 2px 6px;
  color: #fff;
}

@media (max-width: 700px) {
  .shop-container {
    padding: 24px 16px;
  }

  .btn-heal,
  .btn-cancel {
    min-width: 0;
    width: 100%;
  }
}
</style>