<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { generateZoneTree } from '../babylon/ZoneTree'
import { getGame } from '../babylon/BabylonService'

const props = defineProps({ playerNodeId: { type: Number, default: null } })
const emit = defineEmits(['selectZone', 'close'])

const tree = ref(null)
const currentPlayerId = computed(() => props.playerNodeId)
const reachableSet = ref(new Set())
const successorsSet = ref(new Set())
const container = ref(null)
const content = ref(null)
const depthStack = ref(null)
const nodeRefs = {}
const links = ref([])
const contentSize = ref({ w: 0, h: 0 })

function setNodeRef(id, el) {
  if (el) nodeRefs[id] = el
  else delete nodeRefs[id]
}

function buildGroupedNodes(nodes, depth) {
  const groups = []
  for (let d = 1; d <= depth; d++) groups[d] = []
  nodes.forEach(n => groups[n.depth].push(n))
  return groups
}

const keyHandler = (e) => {
  if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M' || e.code === 'Tab') {
    emit('close')
  }
}

const resizeHandler = () => updateLinks()

onMounted(async () => {
  // Use game's zone tree if available to avoid re-generating every open
  const g = getGame()
  if (g && g.scene && g.scene.zone && g.scene.zone.tree) {
    tree.value = g.scene.zone.tree
  } else {
    try {
      tree.value = generateZoneTree({ minDepth: 7, maxDepth: 9 })
      // store into game scene zone if possible so other views reuse it
      if (g && g.scene && g.scene.zone) {
        g.scene.zone.tree = tree.value
      }
    } catch (e) {
      tree.value = { depth: 6, nodes: [{ id:1, depth:1, type:'Battle', corrupted:false, next:[2] },{ id:2, depth:2, type:'Battle', corrupted:false, next:[3] },{ id:3, depth:3, type:'Battle', corrupted:false, next:[4] },{ id:4, depth:4, type:'Battle', corrupted:true, next:[5] },{ id:5, depth:5, type:'Mini Boss', corrupted:true, next:[6] },{ id:6, depth:6, type:'Boss', corrupted:true, next:[] }] }
    }
  }

  await nextTick()

  // Wait for layout to be fully computed before calculating links and scrolling
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateLinks()
      // Scroll to bottom to show the first zone (depth 1 = root = bottom)
      if (container.value) {
        // show the top (boss) after inverting layout
        container.value.scrollTop = 0
      }
    })
  })

  // register listeners
  window.addEventListener('keydown', keyHandler)
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  window.removeEventListener('keydown', keyHandler)
})

const grouped = computed(() => {
  if (!tree.value) return []
  return buildGroupedNodes(tree.value.nodes, tree.value.depth)
})

function getImageFor(node) {
  const t = (node.type || '').toLowerCase()
  if (t.includes('boss') && !t.includes('mini')) return '/assets/zones/zone_boss.png'
  if (t.includes('mini')) return '/assets/zones/zone_miniboss.png'
  if (t.includes('shop')) return '/assets/zones/zone_shop.png'
  if (t.includes('rest')) return '/assets/zones/zone_heal.png'
  if (t.includes('random')) return '/assets/zones/zone_random.png'
  if (t.includes('heal')) return '/assets/zones/zone_heal.png'
  return '/assets/zones/zone_battle.png'
}

function updateLinks() {
  if (!tree.value || !content.value) return

  // The SVG and the nodes share the same offsetParent: content.value
  // So we compute positions relative to content.value
  const contentEl = content.value
  const contentRect = contentEl.getBoundingClientRect()

  const out = []
  const nodesById = {}
  tree.value.nodes.forEach(n => nodesById[n.id] = n)

  // compute reachable nodes from player position (if provided)
  const reachable = new Set()
  if (currentPlayerId.value != null && nodesById[currentPlayerId.value]) {
    const q = [currentPlayerId.value]
    reachable.add(currentPlayerId.value)
    while (q.length) {
      const cur = q.shift()
      const node = nodesById[cur]
      if (!node || !node.next) continue
      for (const nid of node.next) {
        if (!reachable.has(nid) && nodesById[nid]) {
          reachable.add(nid)
          q.push(nid)
        }
      }
    }
  } else {
    // if no player pos, consider all reachable
    Object.keys(nodesById).forEach(k => reachable.add(Number(k)))
  }

  // successors of player (clickable)
  const successorsOfPlayer = new Set()
  if (currentPlayerId.value != null && nodesById[currentPlayerId.value] && nodesById[currentPlayerId.value].next) {
    nodesById[currentPlayerId.value].next.forEach(id => successorsOfPlayer.add(id))
  }
  // expose to template
  reachableSet.value = reachable
  successorsSet.value = successorsOfPlayer

  tree.value.nodes.forEach(parent => {
    const pEl = nodeRefs[parent.id]
    if (!pEl) return

    parent.next.forEach(childId => {
      const cEl = nodeRefs[childId]
      if (!cEl) return

      // getBoundingClientRect gives viewport coords — subtract content's top-left
      // to get coords relative to the SVG (which is positioned at top:0 left:0 of content)
      const pRect = pEl.getBoundingClientRect()
      const cRect = cEl.getBoundingClientRect()

      const x1 = pRect.left - contentRect.left + pRect.width / 2
      const y1 = pRect.top  - contentRect.top  + pRect.height / 2
      const x2 = cRect.left - contentRect.left + cRect.width / 2
      const y2 = cRect.top  - contentRect.top  + cRect.height / 2

      const bothReachable = reachable.has(parent.id) && reachable.has(childId)
      // trait corrompu dépend uniquement de la zone successeur (child)
      const isCorrupted = !!nodesById[childId].corrupted
      const disabled = !bothReachable
      const stroke = disabled ? '#6b7280' : (isCorrupted ? '#ff5a5a' : '#7eb8ff')
      out.push({
        x1, y1, x2, y2,
        corrupted: isCorrupted,
        disabled,
        stroke
      })
    })
  })

  contentSize.value = { w: contentEl.scrollWidth, h: contentEl.scrollHeight }
  links.value = out

  // center on player node on first render if provided
  if (currentPlayerId.value != null && nodeRefs[currentPlayerId.value]) {
    // center vertically in container where possible
    const c = container.value
    const nodeEl = nodeRefs[currentPlayerId.value]
    const cRect = c.getBoundingClientRect()
    const nRect = nodeEl.getBoundingClientRect()
    // compute scrollTop to center node
    const rel = nRect.top - cRect.top
    const target = c.scrollTop + rel - (c.clientHeight / 2) + (nRect.height / 2)
    // clamp
    const clamped = Math.max(0, Math.min(target, contentEl.scrollHeight - c.clientHeight))
    // set with small timeout to let rendering settle
    setTimeout(() => { c.scrollTop = clamped }, 0)
  }
}

function selectNode(id) {
  emit('selectZone', id)
}

function reachableHas(id) { return reachableSet.value && reachableSet.value.has && reachableSet.value.has(id) }
function successorsOfPlayerHas(id) { return successorsSet.value && successorsSet.value.has && successorsSet.value.has(id) }

watch(grouped, async () => {
  await nextTick()
  requestAnimationFrame(() => requestAnimationFrame(updateLinks))
})
</script>

<template>
  <div class="zone-map-root">
    <div ref="container" class="zone-map-container">
      <div ref="content" class="zone-map-content">

        <!-- SVG links layer — sits inside content, same coordinate space as nodes -->
        <svg
          class="links-svg"
          :width="contentSize.w"
          :height="contentSize.h"
          v-if="links.length > 0"
        >
          <line
            v-for="(l, i) in links"
            :key="i"
            :x1="l.x1" :y1="l.y1"
            :x2="l.x2" :y2="l.y2"
            :stroke="l.stroke"
            stroke-width="3"
            stroke-linecap="round"
            :stroke-opacity="l.disabled ? 0.35 : 0.75"
          />
        </svg>

        <div ref="depthStack" class="depth-stack">
          <!-- iterate depths reversed so max-depth (boss) appears at the top -->
          <template
            v-for="d in Array((tree && tree.depth) || 0).fill(0).map((_,i) => i+1).reverse()"
            :key="d"
          >
            <div class="depth-row">
              <div class="nodes">
                <div
                  v-for="node in grouped[d] || []"
                  :key="node.id"
                  class="node-card"
                  :class="[node.type.replace(/\s+/g, '-'), node.aura ? 'aura-' + node.aura : '', (currentPlayerId === node.id) ? 'player' : '', (!reachableHas(node.id) ? 'disabled' : ''), (successorsOfPlayerHas(node.id) ? 'clickable' : '')]"
                  :ref="el => setNodeRef(node.id, el)"
                  @click="successorsOfPlayerHas(node.id) ? selectNode(node.id) : null"
                >
                  <div class="zone-img-container">
                    <img :src="currentPlayerId === node.id ? '/assets/zones/zone_player.png' : getImageFor(node)" class="zone-img" :alt="node.type" />
                    <div class="node-effect" v-if="node.effect && node.effect !== 'none' && currentPlayerId !== node.id">{{ node.effect }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.zone-map-root {
  position: fixed;
  inset: 0;
  background-image: linear-gradient(180deg, rgba(7,16,37,0.72) 0%, rgba(11,26,43,0.45) 60%, rgba(7,16,37,0.72) 100%), url('/assets/background_city_night.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: #e6f0ff;
  font-family: Inter, Arial, sans-serif;
}

.zone-map-container {
  height: 100vh;
  overflow-y: auto;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  scroll-behavior: smooth;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
  box-sizing: border-box;
}

/* hide scrollbar for WebKit browsers */
.zone-map-container::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* content fills the container width so the SVG and nodes share the same origin */
.zone-map-content {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* SVG is absolute inside content — same coordinate space as the nodes */
.links-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  overflow: visible;
}

.depth-stack {
  display: flex;
  flex-direction: column; /* top = first rendered depth (max depth when iterating reversed) */
  gap: 72px;
  width: 100%;
  position: relative;
  z-index: 2; /* nodes above SVG lines */
  padding: 20px 0;
  box-sizing: border-box;
}

.depth-row {
  display: flex;
  justify-content: center;
  align-items: center;
}

.nodes {
  display: flex;
  gap: 56px;
  justify-content: center;
  align-items: center;
  padding: 12px 24px;
}

.node-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  min-width: 120px;
  transition: transform 180ms cubic-bezier(.2,.9,.2,1), box-shadow 180ms ease;
  will-change: transform;
}

.zone-img-container {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  isolation: isolate;
}

.node-card:hover {
  transform: translateY(-6px) scale(1.06);
  z-index: 10;
}

.node-card.disabled { pointer-events: none; opacity: 0.5; }
.node-card.clickable { cursor: pointer; }

.player .zone-img-container::before {
  box-shadow: 0 0 18px 6px rgba(255,255,255,0.95);
  border: 2px solid rgba(255,255,255,0.95);
  z-index: 0; /* bring aura above background */
}

.player .zone-img {
  box-shadow: 0 0 22px 8px rgba(255,255,255,0.95), 0 6px 22px rgba(255,255,255,0.12);
  z-index: 2;
}

.node-card:hover .zone-img-container::before {
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.6));
}

.zone-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
  border-radius: 6px;
}

.zone-img-container::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 8px;
  background-image:
    repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 8px),
    repeating-linear-gradient(rgba(255,255,255,0.06) 0 4px, transparent 4px 8px);
  background-size: 8px 8px;
  z-index: -1;
  filter: drop-shadow(0 6px 18px rgba(2,6,23,0.6));
}

.node-effect {
  position: absolute;
  bottom: 6px;
  left: 6px;
  right: 6px;
  text-align: center;
  background: rgba(0,0,0,0.45);
  color: #dff2ff;
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 6px;
}

.Boss .zone-img     { box-shadow: 0 6px 18px rgba(255,110,110,0.15); }
.Mini-Boss .zone-img { box-shadow: 0 6px 18px rgba(255,160,100,0.10); }
.Shop .zone-img     { box-shadow: 0 6px 18px rgba(120,255,190,0.08); }

.aura-yellow .zone-img {
  box-shadow: 0 0 28px 10px rgba(255,220,100,0.65), 0 6px 28px rgba(255,180,60,0.12);
}

@media (max-width: 800px) {
  .node-card { min-width: 90px; }
  .zone-img-container { width: 90px; height: 90px; }
  .nodes { gap: 28px; }
}
</style>