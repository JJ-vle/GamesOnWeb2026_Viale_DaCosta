<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  characterName: {
    type: String,
    default: 'Système'
  },
  dialogueText: {
    type: String,
    default: 'Dialogu initiale...'
  },
  characterImage: {
    type: String,
    default: '/assets/items/disquette/disquette.png'
  }
})

const emit = defineEmits(['close', 'next'])

const isAnimating = ref(true)

const handleNext = () => {
  emit('next')
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div 
    v-if="isVisible"
    class="dialogue-overlay"
    @click="handleNext"
  >
    <div class="dialogue-container" @click.stop>
      <!-- Glitch effect background -->
      <div class="glitch-bg"></div>
      
      <!-- Character sprite area -->
      <div class="character-area">
        <div class="sprite-container">
          <img 
            :src="characterImage" 
            :alt="characterName"
            class="character-sprite"
          />
        </div>
      </div>

      <!-- Dialogue box -->
      <div class="dialogue-box">
        <!-- Cyberpunk border decorations -->
        <div class="corner-decoration top-left"></div>
        <div class="corner-decoration top-right"></div>
        <div class="corner-decoration bottom-left"></div>
        <div class="corner-decoration bottom-right"></div>

        <!-- Character name -->
        <div class="character-name">
          <span class="name-text">{{ characterName }}</span>
          <div class="name-underline"></div>
        </div>

        <!-- Dialogue text -->
        <div class="dialogue-text">
          {{ dialogueText }}
        </div>

        <!-- Optional: Continue indicator -->
        <div class="continue-indicator">
          <span>━━━ APPUYER POUR CONTINUER ━━━</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="dialogue-actions">
        <button class="btn-next" @click="handleNext">
          <span>SUIVANT</span>
        </button>
        <button class="btn-close" @click="handleClose">
          <span>FERMER</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Overlay container */
.dialogue-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  pointer-events: all;
}

/* Main dialogue container */
.dialogue-container {
  position: relative;
  width: 75%;
  margin-bottom: 20px;
  margin-right: 30px;
  display: flex;
  gap: 20px;
  pointer-events: all;
  animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  image-rendering: pixelated;
}

/* Character sprite area (left side) */
.character-area {
  flex-shrink: 0;
  width: 180px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sprite-container {
  position: relative;
  width: 160px;
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 255, 255, 0.05);
  border: 2px solid;
  border-image: linear-gradient(135deg, #00ffff, #ff00ff) 1;
  border-bottom: 3px solid #00ffff;
  box-shadow: 
    4px 0 0 0 rgba(0, 255, 255, 0.24),
    -4px 0 0 0 rgba(255, 0, 255, 0.18),
    0 4px 0 0 rgba(0, 255, 255, 0.2),
    0 -4px 0 0 rgba(255, 255, 255, 0.08),
    8px 8px 0 -4px rgba(0, 255, 255, 0.16),
    -8px 8px 0 -4px rgba(255, 0, 255, 0.12),
    0 0 0 1px rgba(242, 234, 216, 0.08);
  image-rendering: pixelated;
}

.character-sprite {
  max-width: 90%;
  max-height: 95%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.45));
}

/* Main dialogue box */
.dialogue-box {
  flex: 1;
  background: linear-gradient(135deg, rgba(0, 20, 40, 0.95) 0%, rgba(0, 40, 60, 0.95) 100%);
  backdrop-filter: blur(10px);
  border: 2px solid;
  border-image: linear-gradient(135deg, #00ffff, #ff00ff) 1;
  padding: 25px 30px;
  position: relative;
  box-shadow: 
    4px 0 0 0 rgba(0, 255, 255, 0.22),
    -4px 0 0 0 rgba(255, 0, 255, 0.18),
    0 4px 0 0 rgba(0, 255, 255, 0.16),
    0 -4px 0 0 rgba(255, 255, 255, 0.08),
    10px 10px 0 -4px rgba(0, 255, 255, 0.14),
    -10px 10px 0 -4px rgba(255, 0, 255, 0.12),
    0 20px 60px rgba(0, 0, 0, 0.6);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 15px;
  image-rendering: pixelated;
}

/* Glitch background effect */
.glitch-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      rgba(255, 0, 255, 0.03) 0px,
      rgba(255, 0, 255, 0.03) 1px,
      transparent 1px,
      transparent 2px
    );
  pointer-events: none;
  animation: scanlines 8s linear infinite;
}

/* Corner decorations */
.corner-decoration {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #00ffff;
  pointer-events: none;
  image-rendering: pixelated;
}

.top-left {
  top: -10px;
  left: -10px;
  border-right: none;
  border-bottom: none;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.top-right {
  top: -10px;
  right: -10px;
  border-left: none;
  border-bottom: none;
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
}

.bottom-left {
  bottom: -10px;
  left: -10px;
  border-right: none;
  border-top: none;
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
}

.bottom-right {
  bottom: -10px;
  right: -10px;
  border-left: none;
  border-top: none;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

/* Character name section */
.character-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  position: relative;
  z-index: 2;
}

.name-text {
  font-size: 1.6rem;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
  image-rendering: pixelated;
}

.name-underline {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #00ffff, #ff00ff, transparent);
  box-shadow: 4px 0 0 0 rgba(0, 255, 255, 0.26);
}

/* Dialogue text */
.dialogue-text {
  font-size: 1.6rem;
  color: #e0e0ff;
  line-height: 1.6;
  position: relative;
  z-index: 2;
  font-family: 'Courier New', monospace;
  min-height: 80px;
  max-height: 120px;
  overflow-y: auto;
  padding-right: 10px;
  text-rendering: geometricPrecision;
}

.dialogue-text::-webkit-scrollbar {
  width: 6px;
}

.dialogue-text::-webkit-scrollbar-track {
  background: rgba(0, 255, 255, 0.05);
}

.dialogue-text::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #00ffff, #ff00ff);
  border-radius: 3px;
}

/* Continue indicator */
.continue-indicator {
  text-align: center;
  margin-top: 10px;
  font-size: 0.85rem;
  color: #00ffff;
  opacity: 0.6;
  animation: pulse 1.5s ease-in-out infinite;
  position: relative;
  z-index: 2;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  text-rendering: geometricPrecision;
}

/* Action buttons */
.dialogue-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  position: relative;
  z-index: 2;
  image-rendering: pixelated;
}

.btn-next,
.btn-close {
  padding: 10px 20px;
  border: 2px solid #00ffff;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  font-weight: bold;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  box-shadow: 
    4px 0 0 0 rgba(0, 255, 255, 0.24),
    -4px 0 0 0 rgba(255, 0, 255, 0.16),
    0 4px 0 0 rgba(0, 255, 255, 0.16),
    0 -4px 0 0 rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  image-rendering: pixelated;
}

.btn-next::before,
.btn-close::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(0, 255, 255, 0.3);
  transition: left 0.3s ease;
  z-index: -1;
}

.btn-next:hover::before,
.btn-close:hover::before {
  left: 0;
}

.btn-next:hover,
.btn-close:hover {
  box-shadow: 
    6px 0 0 0 rgba(0, 255, 255, 0.34),
    -6px 0 0 0 rgba(255, 0, 255, 0.22),
    0 6px 0 0 rgba(0, 255, 255, 0.2),
    0 -6px 0 0 rgba(255, 255, 255, 0.12),
    0 0 18px rgba(0, 255, 255, 0.38);
  transform: scale(1.05);
}

.btn-close {
  border-color: #ff6b9d;
  color: #ff6b9d;
  background: rgba(255, 107, 157, 0.1);
  box-shadow: 
    4px 0 0 0 rgba(255, 107, 157, 0.24),
    -4px 0 0 0 rgba(0, 255, 255, 0.16),
    0 4px 0 0 rgba(255, 107, 157, 0.16),
    0 -4px 0 0 rgba(255, 255, 255, 0.08);
}

.btn-close::before {
  background: rgba(255, 107, 157, 0.3);
}

.btn-close:hover {
  box-shadow: 
    6px 0 0 0 rgba(255, 107, 157, 0.34),
    -6px 0 0 0 rgba(0, 255, 255, 0.18),
    0 6px 0 0 rgba(255, 107, 157, 0.2),
    0 -6px 0 0 rgba(255, 255, 255, 0.12),
    0 0 18px rgba(255, 107, 157, 0.38);
}

/* Animations */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@keyframes scanlines {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 10px;
  }
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .dialogue-container {
    width: 85%;
    margin-right: 20px;
  }
  
  .character-area {
    width: 140px;
  }
  
  .sprite-container {
    width: 130px;
    height: 160px;
  }
}

@media (max-width: 768px) {
  .dialogue-container {
    width: 90%;
    flex-direction: column-reverse;
    margin-bottom: 10px;
    margin-right: 10px;
  }
  
  .character-area {
    width: 100%;
    height: 120px;
  }
  
  .sprite-container {
    width: 100px;
    height: 100px;
  }
  
  .dialogue-box {
    min-height: 150px;
    padding: 15px 20px;
  }
  
  .name-text {
    font-size: 1rem;
  }
  
  .dialogue-text {
    font-size: 0.9rem;
  }
}
</style>
