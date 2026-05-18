<script setup>
const emit = defineEmits(['returnToMenu'])

function handleReturnToMenu() {
  emit('returnToMenu')
}
</script>

<template>
  <div class="game-end-root">
    <div class="end-container">
      <div class="end-content">
        <h1 class="end-title">Bravo, vous avez triomphé de l'IA Maléfique</h1>
        
        <div class="end-decorative">
          <div class="star"></div>
          <div class="star"></div>
          <div class="star"></div>
        </div>

        <button @click="handleReturnToMenu" class="end-button">
          Retour au menu principal
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-end-root {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  font-family: Inter, Arial, sans-serif;
  color: #e6f0ff;
}

.end-container {
  position: relative;
  width: 80%;
  max-width: 900px;
  min-width: 320px;
}

.end-content {
  position: relative;
  background: linear-gradient(135deg, rgba(0,20,40,0.95), rgba(0,40,60,0.95));
  border: 2px solid;
  border-image: linear-gradient(90deg, #00ffff, #ff00ff) 1;
  padding: 36px 44px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,255,0.06);
  text-align: center;
  animation: slideIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.end-title {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 24px 0;
  color: #e6f0ff;
  text-shadow: 0 0 24px rgba(0,255,255,0.08), 0 0 40px rgba(255,0,255,0.06);
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

.end-decorative {
  display: flex;
  gap: 18px;
  justify-content: center;
  align-items: center;
  margin: 24px 0 16px 0;
}

.star {
  width: 34px;
  height: 34px;
  background: url('/assets/star.png') no-repeat center;
  background-size: contain;
  filter: drop-shadow(0 6px 18px rgba(0,255,255,0.12));
}

.end-button {
  margin-top: 20px;
  padding: 12px 36px;
  font-size: 1rem;
  font-weight: 700;
  background: linear-gradient(90deg, rgba(0,255,255,0.12), rgba(255,0,255,0.08));
  color: #00f0ff;
  border: 2px solid rgba(0,255,255,0.18);
  border-radius: 8px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 8px 30px rgba(0,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.02);
  transition: all 180ms ease;
  font-family: 'Courier New', monospace;
}

.end-button:hover { transform: translateY(-4px); box-shadow: 0 14px 40px rgba(0,255,255,0.12); }
.end-button:active { transform: translateY(-2px); }

/* Neon corner decorations */
.end-content::before,
.end-content::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid #00ffff;
  box-shadow: 0 0 18px rgba(0,255,255,0.15), 0 0 38px rgba(255,0,255,0.06);
}
.end-content::before { top: -12px; left: -12px; border-right: none; border-bottom: none; }
.end-content::after { bottom: -12px; right: -12px; border-left: none; border-top: none; }

@keyframes slideIn { from { opacity: 0; transform: translateY(-30px) } to { opacity: 1; transform: translateY(0) } }

@media (max-width: 768px) {
  .end-content { padding: 20px; }
  .end-title { font-size: 1.6rem; }
  .star { width: 22px; height: 22px; }
}
</style>
