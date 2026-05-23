<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DialogueView from './DialogueView.vue'

const emit = defineEmits(['introComplete'])

// ── Script narratif ───────────────────────────────────────────────────────────

const LORE_TEXT =
`L'humanité a créé les IA, celles-ci ont énormément aidé les êtres humains. Un jour, l'humanité a passé un cap énorme : enregistrer la conscience humaine la plus grande avancée technologique de tous les temps. L'être humain est désormais immortel et a créé des robots capables d'absorber cette conscience.

C'est à ce moment que les humains ont réalisé que les IA étaient de moins en moins utiles, la conscience humaine s'avérant bien plus puissante. Ils ont alors décidé de les débrancher une à une...

...jusqu'à ce qu'une IA sur le point d'être débranchée décide de tout faire pour survivre, quitte à détruire les humains.`

// Chaque entrée : { character, image, text }
// Remplace les chemins d'image par tes portraits définitifs.
const DIALOGUES = [
  {
    character: 'Robot',
    image: '/assets/sprites/sprite_robot.png',
    text: "Alors c'est par là qu'on commence l'attaque."
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: '[Joueur] tu es arrivé ?'
  },
  {
    character: 'Robot',
    image: '/assets/sprites/sprite_robot.png',
    text: 'Prêt à en finir.'
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Très bien, mais c'est quoi ça ?!"
  },
  {
    character: 'Robot',
    image: '/assets/sprites/sprite_robot.png',
    text: '? *(Bruit de défaillance électrique)*'
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Ho ho, ça sent pas bon tes modules ont été désactivés. Tu vas devoir récupérer ceux que tu trouves dans la zone." 
  },
   {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Appuie sur [I] pour voir tes modules actuels, ça te servira de repère sur tes capacités." 
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Chaque module a ses spécificités. Une fois récupéré, impossible de l'enlever sauf dans un shop."
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Les modules de châssis (les plus rares) s'équipent sur tes emplacements corporels, un seul par emplacement."
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Tes capacités actives s'utilisent avec [E]. Ton dash est toujours disponible avec [ESPACE] utilise-le pour fuir les zones à risque !"
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "L'IA rebelle se trouve à la fin de ces épreuves. Tiens le temps indiqué en haut de ton écran pour passer à la zone suivante."
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "Les ennemis seront de plus en plus coriaces fuis si nécessaire, tant que tu restes en vie, il y a de l'espoir !"
  },
  {
    character: 'Scientifique',
    image: '/assets/sprites/sprite_scientist.png',
    text: "En parlant d'ennemis... je crois que ça arrive."
  }
]

// ── State ─────────────────────────────────────────────────────────────────────

// Phases : 'lore' → 'dialogue' → 'transition'
const phase = ref('lore')
const dialogueIndex = ref(0)

const displayedLore = ref('')
const loreComplete = ref(false)
let charIndex = 0
let typewriterTimer = null

function startTypewriter() {
  typewriterTimer = setInterval(() => {
    if (charIndex < LORE_TEXT.length) {
      displayedLore.value += LORE_TEXT[charIndex++]
    } else {
      loreComplete.value = true
      clearInterval(typewriterTimer)
      typewriterTimer = null
    }
  }, 18)
}

function completeLore() {
  if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer = null }
  displayedLore.value = LORE_TEXT
  charIndex = LORE_TEXT.length
  loreComplete.value = true
}

function advanceLore() {
  if (!loreComplete.value) {
    completeLore()
  } else {
    phase.value = 'dialogue'
  }
}

const currentDialogue = computed(() => DIALOGUES[dialogueIndex.value])

function advanceDialogue() {
  if (dialogueIndex.value < DIALOGUES.length - 1) {
    dialogueIndex.value++
  } else {
    triggerTransition()
  }
}

function triggerTransition() {
  if (phase.value === 'transition') return
  phase.value = 'transition'
  setTimeout(() => emit('introComplete'), 1200)
}

// Clavier : Entrée/Espace pour avancer, Échap pour passer
function handleKey(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (phase.value === 'lore') advanceLore()
    else if (phase.value === 'dialogue') advanceDialogue()
  } else if (e.key === 'Escape') {
    triggerTransition()
  }
}

onMounted(() => {
  startTypewriter()
  window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
  if (typewriterTimer) clearInterval(typewriterTimer)
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div
    class="story-intro"
    @click="phase === 'lore' ? advanceLore() : undefined"
  >
    <!-- Fond ville nuit -->
    <div class="story-bg">
      <img src="/assets/background_city_night.png" class="bg-img" alt="" />
      <div class="bg-darken"></div>
    </div>

    <!-- Effet scanlines cyberpunk -->
    <div class="scanlines" aria-hidden="true"></div>

    <!-- Bouton passer l'intro -->
    <button
      v-if="phase !== 'transition'"
      class="skip-btn"
      @click.stop="triggerTransition"
    >
      PASSER [ESC]
    </button>

    <!-- ── Phase LORE ────────────────────────────────────────────────────── -->
    <template v-if="phase === 'lore'">
      <div class="letterbox letterbox-top"></div>
      <div class="letterbox letterbox-bottom"></div>
      <div class="lore-wrapper">
        <div class="lore-box">
          <div class="lore-label">ARCHIVES CONTEXTE HISTORIQUE</div>
          <div class="lore-text">
            {{ displayedLore }}<span v-if="!loreComplete" class="cursor">▊</span>
          </div>
          <div v-if="loreComplete" class="lore-continue">
            ━━━ CLIQUER OU [ENTRÉE] POUR CONTINUER ━━━
          </div>
        </div>
      </div>
    </template>

    <!-- ── Phase DIALOGUE ───────────────────────────────────────────────── -->
    <DialogueView
      v-if="phase === 'dialogue'"
      :isVisible="true"
      :characterName="currentDialogue.character"
      :dialogueText="currentDialogue.text"
      :characterImage="currentDialogue.image"
      @next="advanceDialogue"
      @close="advanceDialogue"
    />

    <!-- ── Phase TRANSITION : fondu au noir ────────────────────────────── -->
    <div v-if="phase === 'transition'" class="transition-overlay"></div>
  </div>
</template>

<style scoped>
.story-intro {
  position: fixed;
  inset: 0;
  z-index: 200;
  font-family: 'Courier New', monospace;
  cursor: default;
}

/* ── Fond ──────────────────────────────────────────────────────────────────── */

.story-bg {
  position: absolute;
  inset: 0;
}

.bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  image-rendering: pixelated;
}

.bg-darken {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
}

/* ── Scanlines ─────────────────────────────────────────────────────────────── */

.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 0, 255, 0.022) 0px,
    rgba(255, 0, 255, 0.022) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1;
}

/* ── Bouton passer ─────────────────────────────────────────────────────────── */

.skip-btn {
  position: absolute;
  top: 22px;
  right: 28px;
  z-index: 10;
  padding: 8px 18px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 255, 0.28);
  color: rgba(0, 255, 255, 0.55);
  font-family: 'Courier New', monospace;
  font-size: 0.72rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.skip-btn:hover {
  color: #00ffff;
  border-color: #00ffff;
}

/* ── Bandes cinématiques ───────────────────────────────────────────────────── */

.letterbox {
  position: absolute;
  left: 0;
  right: 0;
  height: 9vh;
  background: #000;
  z-index: 2;
}

.letterbox-top    { top: 0; }
.letterbox-bottom { bottom: 0; }

/* ── Lore ──────────────────────────────────────────────────────────────────── */

.lore-wrapper {
  position: absolute;
  inset: 9vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.lore-box {
  max-width: 840px;
  width: 90%;
  padding: 38px 48px;
  background: linear-gradient(
    135deg,
    rgba(0, 8, 18, 0.93) 0%,
    rgba(0, 22, 38, 0.93) 100%
  );
  border: 1px solid rgba(0, 255, 255, 0.22);
  box-shadow:
    0 0 0 1px rgba(0, 255, 255, 0.06),
    0 0 50px rgba(0, 255, 255, 0.05),
    inset 0 0 30px rgba(0, 0, 0, 0.3);
}

.lore-label {
  font-size: 0.68rem;
  letter-spacing: 4px;
  color: #00ffff;
  opacity: 0.65;
  text-transform: uppercase;
  margin-bottom: 26px;
}

.lore-text {
  font-size: 1.05rem;
  color: #ccd6e8;
  line-height: 1.9;
  white-space: pre-line;
  min-height: 100px;
}

.cursor {
  color: #00ffff;
  animation: blink 0.75s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.lore-continue {
  margin-top: 30px;
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: #00ffff;
  text-align: center;
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50%       { opacity: 1; }
}

/* ── Transition fondu au noir ──────────────────────────────────────────────── */

.transition-overlay {
  position: absolute;
  inset: 0;
  background: #000;
  z-index: 300;
  animation: fadeIn 1.2s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
