<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  inventory: {
    type: Object,
    required: true,
    // Shape: { items: [{id, item}], slotCapacity: {head,arm,leg,body,active}, slotCount: {head,arm,leg,body,active} }
  }
})

const emit = defineEmits(['close'])

const itemsBySlot = computed(() => {
  const groups = { head: [], arm: [], leg: [], body: [], active: [], none: [] }
  if (!props.inventory?.items) return groups
  for (const entry of props.inventory.items) {
    const slot = entry.item?.slot ?? 'none'
    if (!groups[slot]) groups[slot] = []
    groups[slot].push(entry)
  }
  return groups
})

const SLOT_LABELS = { head: 'INTERFACE NEURALE', arm: 'SYSTEME BRAS', leg: 'MOBILITE', body: 'CHASSIS', active: 'CAPACITES ACTIVES' }

function slotLabel(slot) {
  return SLOT_LABELS[slot] ?? slot.toUpperCase()
}

function rarityColor(rarity) {
  const c = { 1: '#7eb8ff', 2: '#4cff9f', 3: '#ff9f1c', 4: '#ff4c4c', 5: '#cc44ff' }
  return c[rarity] ?? '#7eb8ff'
}

function slotMax(slot) {
  if (slot === 'none') return Infinity
  return props.inventory?.slotCapacity?.[slot] ?? 1
}

function slotUsed(slot) {
  if (slot === 'none') return itemsBySlot.value.none.length
  return props.inventory?.slotCount?.[slot] ?? 0
}

function modifiersText(modifiers) {
  if (!modifiers) return []
  return Object.entries(modifiers).map(([k, v]) => {
    const sign = v > 0 ? '+' : ''
    return `${k.toUpperCase()}: ${sign}${typeof v === 'number' ? (v * 100).toFixed(0) + '%' : v}`
  })
}

function emptySlots(slot) {
  const used = slotUsed(slot)
  const max = slotMax(slot)
  if (!isFinite(max)) return []
  return Array(Math.max(0, max - used)).fill(null)
}

const keyHandler = (e) => {
  if (e.key.toLowerCase() === 'i' || e.key === 'Tab') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', keyHandler))
onUnmounted(() => window.removeEventListener('keydown', keyHandler))
</script>

<template>
  <div class="inv-root" @click.self="emit('close')">

    <!-- Header -->
    <div class="inv-header">
      <span class="inv-title">// SYSTEME CYBERWARE //</span>
      <button class="inv-close" @click="emit('close')">[ ESC ]</button>
    </div>

    <!-- Main grid -->
    <div class="inv-layout">

      <!-- LEFT COLUMN: ARM + LEG -->
      <div class="inv-col inv-col-left">
        <div class="slot-panel">
          <div class="slot-title">{{ slotLabel('arm') }}</div>
          <div class="slot-counter">{{ slotUsed('arm') }} / {{ slotMax('arm') }}</div>
          <div class="slot-items">
            <div
              v-for="entry in itemsBySlot.arm"
              :key="entry.id"
              class="item-card"
              :style="{ '--rarity-color': rarityColor(entry.item.rarity) }"
            >
              <div class="item-name">{{ entry.item.name }}</div>
              <div class="item-bonus">{{ entry.item.bonus }}</div>
              <div class="item-mods">
                <span v-for="mod in modifiersText(entry.item.modifiers)" :key="mod" class="mod-tag">{{ mod }}</span>
              </div>
            </div>
            <div v-for="(_, i) in emptySlots('arm')" :key="'arm-empty-' + i" class="item-card item-empty">
              <span class="empty-label">— VIDE —</span>
            </div>
          </div>
        </div>

        <div class="slot-panel">
          <div class="slot-title">{{ slotLabel('leg') }}</div>
          <div class="slot-counter">{{ slotUsed('leg') }} / {{ slotMax('leg') }}</div>
          <div class="slot-items">
            <div
              v-for="entry in itemsBySlot.leg"
              :key="entry.id"
              class="item-card"
              :style="{ '--rarity-color': rarityColor(entry.item.rarity) }"
            >
              <div class="item-name">{{ entry.item.name }}</div>
              <div class="item-bonus">{{ entry.item.bonus }}</div>
              <div class="item-mods">
                <span v-for="mod in modifiersText(entry.item.modifiers)" :key="mod" class="mod-tag">{{ mod }}</span>
              </div>
            </div>
            <div v-for="(_, i) in emptySlots('leg')" :key="'leg-empty-' + i" class="item-card item-empty">
              <span class="empty-label">— VIDE —</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTER: Silhouette + Head + Body -->
      <div class="inv-col inv-col-center">

        <!-- HEAD -->
        <div class="slot-panel slot-head">
          <div class="slot-title">{{ slotLabel('head') }}</div>
          <div class="slot-counter">{{ slotUsed('head') }} / {{ slotMax('head') }}</div>
          <div class="slot-items slot-items-row">
            <div
              v-for="entry in itemsBySlot.head"
              :key="entry.id"
              class="item-card"
              :style="{ '--rarity-color': rarityColor(entry.item.rarity) }"
            >
              <div class="item-name">{{ entry.item.name }}</div>
              <div class="item-bonus">{{ entry.item.bonus }}</div>
              <div class="item-mods">
                <span v-for="mod in modifiersText(entry.item.modifiers)" :key="mod" class="mod-tag">{{ mod }}</span>
              </div>
            </div>
            <div v-for="(_, i) in emptySlots('head')" :key="'head-empty-' + i" class="item-card item-empty">
              <span class="empty-label">— VIDE —</span>
            </div>
          </div>
        </div>

        <!-- Silhouette placeholder -->
        <div class="silhouette-wrap">
          <div class="silhouette-grid-lines"></div>
          <svg class="silhouette-svg" viewBox="0 0 120 280" xmlns="http://www.w3.org/2000/svg">
            <!-- Head -->
            <ellipse cx="60" cy="28" rx="18" ry="22" fill="none" stroke="currentColor" stroke-width="2"/>
            <!-- Neck -->
            <rect x="54" y="49" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/>
            <!-- Torso -->
            <path d="M30 61 L20 140 L100 140 L90 61 Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <!-- Left arm -->
            <path d="M30 65 L10 100 L8 150 L20 150 L22 110 L36 78 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <!-- Right arm -->
            <path d="M90 65 L110 100 L112 150 L100 150 L98 110 L84 78 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <!-- Left leg -->
            <path d="M40 140 L32 220 L28 280 L44 280 L48 220 L54 140 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <!-- Right leg -->
            <path d="M80 140 L88 220 L92 280 L76 280 L72 220 L66 140 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <!-- Tech lines (decorative) -->
            <line x1="40" y1="80" x2="80" y2="80" stroke="currentColor" stroke-width="1" opacity="0.4"/>
            <line x1="35" y1="100" x2="85" y2="100" stroke="currentColor" stroke-width="1" opacity="0.4"/>
            <line x1="30" y1="120" x2="90" y2="120" stroke="currentColor" stroke-width="1" opacity="0.4"/>
          </svg>
          <div class="silhouette-label">MECHA-UNIT-01</div>
        </div>

        <!-- BODY -->
        <div class="slot-panel slot-body">
          <div class="slot-title">{{ slotLabel('body') }}</div>
          <div class="slot-counter">{{ slotUsed('body') }} / {{ slotMax('body') }}</div>
          <div class="slot-items slot-items-row">
            <div
              v-for="entry in itemsBySlot.body"
              :key="entry.id"
              class="item-card"
              :style="{ '--rarity-color': rarityColor(entry.item.rarity) }"
            >
              <div class="item-name">{{ entry.item.name }}</div>
              <div class="item-bonus">{{ entry.item.bonus }}</div>
              <div class="item-mods">
                <span v-for="mod in modifiersText(entry.item.modifiers)" :key="mod" class="mod-tag">{{ mod }}</span>
              </div>
            </div>
            <div v-for="(_, i) in emptySlots('body')" :key="'body-empty-' + i" class="item-card item-empty">
              <span class="empty-label">— VIDE —</span>
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN: ACTIVE -->
      <div class="inv-col inv-col-right">
        <div class="slot-panel">
          <div class="slot-title">{{ slotLabel('active') }}</div>
          <div class="slot-counter">{{ slotUsed('active') }} / {{ slotMax('active') }}</div>
          <div class="slot-items">
            <div
              v-for="entry in itemsBySlot.active"
              :key="entry.id"
              class="item-card item-active"
              :style="{ '--rarity-color': rarityColor(entry.item.rarity) }"
            >
              <div class="item-type-badge">ACTIF</div>
              <div class="item-name">{{ entry.item.name }}</div>
              <div class="item-bonus">{{ entry.item.bonus }}</div>
              <div class="item-mods">
                <span v-for="mod in modifiersText(entry.item.modifiers)" :key="mod" class="mod-tag">{{ mod }}</span>
              </div>
            </div>
            <div v-for="(_, i) in emptySlots('active')" :key="'active-empty-' + i" class="item-card item-empty">
              <span class="empty-label">— VIDE —</span>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /inv-layout -->

    <!-- PASSIVE SYSTEMS strip -->
    <div class="passive-panel">
      <div class="passive-header">
        <span class="passive-title">// SYSTEMES PASSIFS //</span>
        <span class="passive-count">{{ itemsBySlot.none.length }} MODULE(S) ACTIF(S)</span>
      </div>
      <div class="passive-list">
        <div
          v-for="entry in itemsBySlot.none"
          :key="entry.id"
          class="passive-item"
          :style="{ '--rarity-color': rarityColor(entry.item.rarity) }"
        >
          <span class="passive-name">{{ entry.item.name }}</span>
          <span class="passive-bonus">{{ entry.item.bonus }}</span>
          <span class="passive-mods">
            <span v-for="mod in modifiersText(entry.item.modifiers)" :key="mod" class="mod-tag mod-tag-sm">{{ mod }}</span>
          </span>
        </div>
        <div v-if="itemsBySlot.none.length === 0" class="passive-empty">
          AUCUN MODULE PASSIF INSTALLE
        </div>
      </div>
    </div>

    <!-- Footer hint -->
    <div class="inv-footer">
      <span>[ I ] ou [ TAB ] — FERMER L'INVENTAIRE</span>
    </div>

  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   ROOT OVERLAY
═══════════════════════════════════════════════ */
.inv-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(2,4,18,0.97) 0%, rgba(4,8,28,0.95) 60%, rgba(2,4,18,0.97) 100%);
  font-family: 'Courier New', 'Lucida Console', monospace;
  color: #c8e8ff;
  overflow: hidden;

  /* Scanline overlay */
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(0,200,255,0.025) 0px,
      rgba(0,200,255,0.025) 1px,
      transparent 1px,
      transparent 4px
    ),
    linear-gradient(180deg, rgba(2,4,18,0.97) 0%, rgba(4,8,28,0.95) 100%);
}

/* ═══════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════ */
.inv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 28px;
  border-bottom: 1px solid rgba(255,100,0,0.4);
  background: rgba(0,0,0,0.3);
  flex-shrink: 0;
}

.inv-title {
  font-size: 18px;
  letter-spacing: 4px;
  color: #ff6a00;
  text-shadow: 0 0 12px rgba(255,106,0,0.8), 0 0 24px rgba(255,106,0,0.4);
  animation: flicker 6s infinite;
}

@keyframes flicker {
  0%, 96%, 100% { opacity: 1; }
  97% { opacity: 0.85; }
  98% { opacity: 1; }
  99% { opacity: 0.9; }
}

.inv-close {
  background: transparent;
  border: 1px solid rgba(255,100,0,0.5);
  color: #ff6a00;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 2px;
  padding: 4px 12px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.inv-close:hover {
  background: rgba(255,100,0,0.15);
  box-shadow: 0 0 10px rgba(255,100,0,0.5);
}

/* ═══════════════════════════════════════════════
   MAIN LAYOUT — 3 COLUMNS
═══════════════════════════════════════════════ */
.inv-layout {
  display: grid;
  grid-template-columns: 1fr 320px 1fr;
  gap: 16px;
  padding: 14px 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.inv-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,100,0,0.4) transparent;
}
.inv-col::-webkit-scrollbar { width: 4px; }
.inv-col::-webkit-scrollbar-thumb { background: rgba(255,100,0,0.4); border-radius: 2px; }

/* ═══════════════════════════════════════════════
   CENTER COLUMN
═══════════════════════════════════════════════ */
.inv-col-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  overflow: visible;
}

/* ═══════════════════════════════════════════════
   SILHOUETTE
═══════════════════════════════════════════════ */
.silhouette-wrap {
  position: relative;
  width: 140px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.silhouette-grid-lines {
  position: absolute;
  inset: -20px;
  background-image:
    linear-gradient(rgba(0,180,255,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,180,255,0.07) 1px, transparent 1px);
  background-size: 20px 20px;
  border-radius: 4px;
}

.silhouette-svg {
  width: 100%;
  height: 100%;
  color: rgba(0,180,255,0.55);
  filter: drop-shadow(0 0 6px rgba(0,180,255,0.5));
  transition: color 0.3s, filter 0.3s;
}

.silhouette-wrap:hover .silhouette-svg {
  color: rgba(255,100,0,0.7);
  filter: drop-shadow(0 0 10px rgba(255,100,0,0.6));
}

.silhouette-label {
  position: absolute;
  bottom: -18px;
  font-size: 9px;
  letter-spacing: 3px;
  color: rgba(0,180,255,0.6);
  text-align: center;
}

/* ═══════════════════════════════════════════════
   SLOT PANELS
═══════════════════════════════════════════════ */
.slot-panel {
  background: rgba(0,10,30,0.75);
  border: 1px solid rgba(255,100,0,0.35);
  border-radius: 2px;
  padding: 10px 12px;
  position: relative;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.slot-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 30px; height: 2px;
  background: #ff6a00;
  box-shadow: 0 0 8px rgba(255,106,0,0.8);
}

.slot-panel:hover {
  border-color: rgba(255,100,0,0.65);
  box-shadow: 0 0 16px rgba(255,100,0,0.12), inset 0 0 20px rgba(255,100,0,0.04);
}

.slot-head, .slot-body {
  width: 100%;
  box-sizing: border-box;
}

.slot-title {
  font-size: 10px;
  letter-spacing: 3px;
  color: #ff6a00;
  margin-bottom: 4px;
  text-shadow: 0 0 8px rgba(255,106,0,0.6);
}

.slot-counter {
  font-size: 9px;
  color: rgba(200,232,255,0.45);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

/* ═══════════════════════════════════════════════
   ITEM CARDS
═══════════════════════════════════════════════ */
.slot-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slot-items-row {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
}

.item-card {
  --rarity-color: #7eb8ff;
  background: rgba(0,20,50,0.6);
  border: 1px solid var(--rarity-color);
  border-radius: 2px;
  padding: 7px 10px;
  position: relative;
  cursor: default;
  transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
  box-shadow: 0 0 4px color-mix(in srgb, var(--rarity-color) 30%, transparent);
  min-width: 80px;
}

.item-card::after {
  content: '';
  position: absolute;
  bottom: 0; right: 0;
  width: 8px; height: 8px;
  border-bottom: 1px solid var(--rarity-color);
  border-right: 1px solid var(--rarity-color);
}

.item-card:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 0 14px color-mix(in srgb, var(--rarity-color) 55%, transparent);
  background: rgba(0,30,70,0.75);
  z-index: 2;
}

.item-name {
  font-size: 11px;
  font-weight: bold;
  color: #e8f4ff;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.item-bonus {
  font-size: 9px;
  color: var(--rarity-color);
  letter-spacing: 1px;
  margin-bottom: 4px;
  text-shadow: 0 0 5px color-mix(in srgb, var(--rarity-color) 60%, transparent);
}

.item-mods {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.mod-tag {
  font-size: 8px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 1px 5px;
  border-radius: 1px;
  color: rgba(200,232,255,0.7);
  letter-spacing: 0.5px;
}

.item-active {
  --rarity-color: #ff4c4c;
}

.item-type-badge {
  font-size: 8px;
  letter-spacing: 2px;
  color: #ff4c4c;
  margin-bottom: 3px;
  text-shadow: 0 0 6px rgba(255,76,76,0.7);
}

/* Empty slot placeholder */
.item-empty {
  border-style: dashed;
  border-color: rgba(255,100,0,0.2);
  background: rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  box-shadow: none;
}
.item-empty:hover {
  transform: none;
  box-shadow: none;
  background: rgba(255,100,0,0.04);
}
.empty-label {
  font-size: 9px;
  letter-spacing: 2px;
  color: rgba(255,100,0,0.3);
}

/* ═══════════════════════════════════════════════
   PASSIVE SYSTEMS STRIP
═══════════════════════════════════════════════ */
.passive-panel {
  border-top: 1px solid rgba(255,100,0,0.3);
  background: rgba(0,5,20,0.85);
  padding: 10px 20px;
  flex-shrink: 0;
  max-height: 130px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,100,0,0.3) transparent;
}
.passive-panel::-webkit-scrollbar { height: 3px; width: 3px; }
.passive-panel::-webkit-scrollbar-thumb { background: rgba(255,100,0,0.35); }

.passive-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.passive-title {
  font-size: 10px;
  letter-spacing: 3px;
  color: #ff6a00;
  text-shadow: 0 0 8px rgba(255,106,0,0.6);
}

.passive-count {
  font-size: 9px;
  color: rgba(200,232,255,0.4);
  letter-spacing: 1px;
}

.passive-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.passive-item {
  --rarity-color: #7eb8ff;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,20,50,0.5);
  border: 1px solid rgba(126,184,255,0.25);
  border-left: 2px solid var(--rarity-color);
  padding: 4px 10px;
  border-radius: 1px;
  transition: background 0.2s, box-shadow 0.2s;
  cursor: default;
}

.passive-item:hover {
  background: rgba(0,30,70,0.7);
  box-shadow: 0 0 10px color-mix(in srgb, var(--rarity-color) 25%, transparent);
}

.passive-name {
  font-size: 10px;
  letter-spacing: 1px;
  color: #e8f4ff;
  text-transform: uppercase;
  white-space: nowrap;
}

.passive-bonus {
  font-size: 9px;
  color: rgba(200,232,255,0.5);
  white-space: nowrap;
}

.passive-mods {
  display: flex;
  gap: 3px;
}

.mod-tag-sm {
  font-size: 7.5px;
}

.passive-empty {
  font-size: 9px;
  letter-spacing: 3px;
  color: rgba(255,100,0,0.25);
  padding: 4px 0;
}

/* ═══════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════ */
.inv-footer {
  text-align: center;
  font-size: 9px;
  letter-spacing: 3px;
  color: rgba(200,232,255,0.25);
  padding: 6px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255,100,0,0.1);
}

/* ═══════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .inv-layout {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }
  .inv-col-center {
    grid-column: 1 / -1;
    order: -1;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  .silhouette-wrap { width: 100px; height: 150px; }
}
</style>
