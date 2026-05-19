<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getGame } from '../babylon/BabylonService'

const emit = defineEmits(['close', 'purchaseItem'])

const pool = ref([])
const selectedItem = ref(null)
const playerMoney = ref(0)
const showConfirmation = ref(false)
const purchasedItemIds = ref(new Set())

// Fetch shop data when component mounts
onMounted(async () => {
  const game = getGame()
  if (game && game.scene && game.scene.shopSystem) {
    const occupiedSlots = game.scene.playerEntry.inventory?.getOccupiedSlots() ?? new Set()
    pool.value = game.scene.shopSystem.generatePool(
      game.scene.playerEntry.money || 0,
      occupiedSlots
    )
    playerMoney.value = game.scene.playerEntry.money || 0
    
    // Initialize purchased items from inventory
    if (game.scene.playerEntry.inventory) {
      purchasedItemIds.value = new Set(game.scene.playerEntry.inventory.getOccupiedSlots())
    }
  }

  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})

const handleKeyPress = (e) => {
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
    closeShop()
  }
}

const isAlreadyPurchased = (item) => purchasedItemIds.value.has(item.id)

const canAfford = (item) => !isAlreadyPurchased(item) && playerMoney.value >= (item.price || 0)

const selectItem = (item) => {
  if (!canAfford(item)) return
  selectedItem.value = item
  showConfirmation.value = true
}

const confirmPurchase = async () => {
  if (!selectedItem.value) return
  const game = getGame()
  if (!game || !game.scene) return

  const player = game.scene.playerEntry
  const item = selectedItem.value

  if (player.money >= item.price && !isAlreadyPurchased(item)) {
    player.money -= item.price
    player.inventory.addItem(item.id)
    purchasedItemIds.value.add(item.id)
    playerMoney.value = player.money

    // Emit purchase event
    emit('purchaseItem', item)
    
    // Show notification
    game.scene.uiSystem?.showNotification(`${item.name} acheté!`, '#ffcc00', 2000)

    // Reset selection
    selectedItem.value = null
    showConfirmation.value = false
  }
}

const closeShop = () => {
  selectedItem.value = null
  showConfirmation.value = false
  emit('close')
}

const getRarityColor = (rarity) => {
  const colors = { 1: '#ffffff', 2: '#00ff88', 3: '#00ccff', 4: '#ffcc00' }
  return colors[rarity] || '#ffffff'
}

const getRarityStars = (rarity) => {
  return '★'.repeat(rarity)
}
</script>

<template>
  <div class="shop-overlay">
    <div class="shop-container">
      <!-- Close button -->
      <button class="close-btn" @click="closeShop" title="Fermer (S)">
        ✕
      </button>

      <!-- Merchant area (left) -->
      <div class="merchant-area">
        <div class="merchant-card">
          <img src="/assets/items/usb/cle_usb_orange.png" alt="Marchand" class="merchant-sprite" />
          <div class="merchant-label">MARCHAND</div>
        </div>
      </div>

      <!-- Dialog area -->
      <div class="dialog-box" v-if="!showConfirmation">
        <div class="dialog-text">
          Qu'est ce qu'il vous ferait cyber-plaisir ?
        </div>
      </div>

      <div class="dialog-box" v-if="showConfirmation && selectedItem">
        <div class="dialog-text">
          Donc vous voulez un <span class="item-name">{{ selectedItem.name }}</span> ?
        </div>
        <div class="price-confirm">
          Prix: <span class="price-tag">{{ selectedItem.price }} 💰</span>
        </div>
      </div>

      <!-- Items grid -->
      <div class="items-grid" v-if="!showConfirmation">
        <div
          v-for="item in pool"
          :key="item.id"
          class="item-card"
          :class="{ 
            disabled: !canAfford(item), 
            clickable: canAfford(item),
            'out-of-stock': isAlreadyPurchased(item)
          }"
          @click="selectItem(item)"
        >
          <div class="rarity-header" :style="{ borderColor: getRarityColor(item.rarity) }">
            <div class="stars">{{ getRarityStars(item.rarity) }}</div>
          </div>

          <img
            :src="item.sprite || item.image || '/assets/items/floppydisk.png'"
            :alt="item.name"
            class="item-image"
          />

          <div class="item-info">
            <div class="item-title">{{ item.name }}</div>
            <div class="item-bonus">{{ item.bonus || item.description || '' }}</div>
          </div>

          <div class="item-price" :style="{ color: getRarityColor(item.rarity) }">
            {{ item.price }} 💰
          </div>

          <div class="affordability-hint" v-if="!isAlreadyPurchased(item) && !canAfford(item)">
            Manque {{ item.price - playerMoney }} pièces
          </div>

          <div class="out-of-stock-label" v-if="isAlreadyPurchased(item)">
            HORS STOCK
          </div>
        </div>
      </div>

      <!-- Confirmation area -->
      <div class="confirmation-area" v-if="showConfirmation && selectedItem">
        <button class="btn-confirm" @click="confirmPurchase">
          ACHETER POUR {{ selectedItem.price }} 💰
        </button>
        <button class="btn-cancel" @click="() => { showConfirmation = false; selectedItem = null }">
          ANNULER
        </button>
      </div>

      <!-- Player money display -->
      <div class="money-display">
        Pièces: <span class="money-count">{{ playerMoney }}</span> 💰
      </div>

      <!-- Keyboard hint -->
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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.shop-container {
  position: relative;
  max-width: 1200px;
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

/* Scrollbar styling */
.shop-container::-webkit-scrollbar {
  width: 8px;
}
.shop-container::-webkit-scrollbar-track {
  background: rgba(0, 204, 255, 0.1);
}
.shop-container::-webkit-scrollbar-thumb {
  background: #00ccff;
  border-radius: 4px;
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
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
}

.close-btn:hover {
  background: #ff6666;
  box-shadow: 0 0 20px rgba(255, 68, 68, 0.6);
  transform: scale(1.1);
}

.merchant-area {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.merchant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: rgba(0, 204, 255, 0.05);
  border: 1px solid rgba(0, 204, 255, 0.3);
  border-radius: 6px;
}

.merchant-sprite {
  width: 100px;
  height: 100px;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 8px rgba(0, 204, 255, 0.4));
}

.merchant-label {
  color: #ffcc00;
  font-weight: bold;
  font-family: monospace;
  font-size: 14px;
}

.dialog-box {
  background: rgba(15, 20, 40, 0.8);
  border: 1px solid rgba(0, 204, 255, 0.4);
  border-radius: 4px;
  padding: 16px;
  text-align: center;
}

.dialog-text {
  color: #ffffff;
  font-size: 16px;
  font-family: monospace;
  line-height: 1.5;
}

.item-name {
  color: #ffcc00;
  font-weight: bold;
}

.price-confirm {
  margin-top: 12px;
  color: #00ff88;
  font-family: monospace;
  font-size: 14px;
}

.price-tag {
  color: #ff4444;
  font-weight: bold;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.item-card {
  background: rgba(15, 20, 40, 0.7);
  border: 2px solid #444;
  border-radius: 6px;
  padding: 16px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.item-card.clickable {
  cursor: pointer;
  border-color: #00ccff;
  box-shadow: 0 0 12px rgba(0, 204, 255, 0.2);
}

.item-card.clickable:hover {
  background: rgba(15, 25, 50, 0.8);
  border-color: #00ff88;
  box-shadow: 0 0 20px rgba(0, 204, 255, 0.4);
  transform: translateY(-2px);
}

.item-card.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.item-card.out-of-stock {
  opacity: 0.6;
  border-color: #ff4444 !important;
  background: rgba(255, 68, 68, 0.1) !important;
  pointer-events: none;
}

.rarity-header {
  border: 2px solid;
  border-radius: 4px;
  padding: 8px;
  text-align: center;
  background: rgba(0, 204, 255, 0.05);
}

.stars {
  color: #ffcc00;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 2px;
}

.item-image {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin: 0 auto;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 4px rgba(0, 204, 255, 0.2));
}

.item-info {
  flex: 1;
}

.item-title {
  color: #ffffff;
  font-weight: bold;
  font-size: 14px;
  font-family: monospace;
}

.item-bonus {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-family: monospace;
  margin-top: 4px;
}

.item-price {
  text-align: right;
  font-weight: bold;
  font-size: 14px;
  font-family: monospace;
}

.affordability-hint {
  color: #ff4444;
  font-size: 11px;
  font-family: monospace;
  text-align: center;
  margin-top: 8px;
}

.out-of-stock-label {
  color: #ff4444;
  font-size: 12px;
  font-weight: bold;
  font-family: monospace;
  text-align: center;
  margin-top: 8px;
  padding: 4px 8px;
  background: rgba(255, 68, 68, 0.2);
  border: 1px solid #ff4444;
  border-radius: 3px;
  text-transform: uppercase;
}

.confirmation-area {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.btn-confirm,
.btn-cancel {
  flex: 1;
  max-width: 300px;
  padding: 12px 24px;
  font-size: 14px;
  font-family: monospace;
  font-weight: bold;
  border: 2px solid;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm {
  background: #00ff88;
  color: #000000;
  border-color: #00ff88;
}

.btn-confirm:hover {
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
  transform: scale(1.02);
}

.btn-cancel {
  background: transparent;
  color: #ffffff;
  border-color: #ffffff;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.money-display {
  text-align: center;
  color: #ffcc00;
  font-family: monospace;
  font-weight: bold;
  padding: 12px;
  background: rgba(255, 204, 0, 0.05);
  border: 1px solid rgba(255, 204, 0, 0.3);
  border-radius: 4px;
}

.money-count {
  color: #00ff88;
  font-size: 18px;
}

.keyboard-hint {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
  font-size: 12px;
}

kbd {
  background: rgba(0, 204, 255, 0.2);
  border: 1px solid rgba(0, 204, 255, 0.4);
  border-radius: 3px;
  padding: 2px 6px;
  font-weight: bold;
  color: #00ccff;
}
</style>
