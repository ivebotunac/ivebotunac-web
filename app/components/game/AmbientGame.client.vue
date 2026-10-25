<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { start, destroy } from '~/game/core'
import { getGameStats, postTeam } from '~/game/stats-client'
import type { GameStats } from '~/game/stats-client'
import type { QuestBridge, QuestView } from '~/game/types'
import { useActiveSection } from '~/composables/useActiveSection'
import QuestHud from './QuestHud.vue'
import TeamCard from './TeamCard.vue'

// The game says a line when a CV section first comes into view.
const activeSection = useActiveSection()

// Renders only after mount, so a direct path import, which skips the .client wrapper, cannot SSR the teleport.
const mounted = ref(false)

const rageEl = ref<HTMLElement | null>(null)
const fxEl = ref<HTMLCanvasElement | null>(null)
const trendEl = ref<HTMLElement | null>(null)
const petEl = ref<HTMLElement | null>(null)
const bubbleEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

// The team quest's view of the game: the HUD chip, screen-reader lines and the finished-team card.
const quest = reactive<QuestView>({ team: [], done: false, ms: null, run: null, boss: false })
const announce = ref('')
const cardOpen = ref(false)
const stats = ref<GameStats | null>(null)
// Set when the counters did not answer, so the card says so instead of leaving the board out.
const statsOff = ref(false)
const gotStats = (s: GameStats | null) => { if (s) { stats.value = s; statsOff.value = false } else if (!stats.value) statsOff.value = true }

const openCard = () => {
  cardOpen.value = true
  if (!stats.value) getGameStats(quest.run).then(gotStats)
}

const bridge: QuestBridge = {
  view: v => Object.assign(quest, v),
  announce: (text) => { announce.value = text },
  // A fresh finish posts its time, and the answer carries this visitor's rank.
  finished: (ms, run) => { postTeam(ms, run).then(gotStats) },
  // A fight started during the fly-by keeps the screen; the HUD chip opens the card later.
  complete: () => { if (!quest.boss) cardOpen.value = true }
}

onMounted(async () => {
  mounted.value = true
  await nextTick()
  const [rage, fx, trend, pet, bubble, canvas] = [rageEl.value, fxEl.value, trendEl.value, petEl.value, bubbleEl.value, canvasEl.value]
  if (!rage || !fx || !trend || !pet || !bubble || !canvas) return
  start({ pet, canvas, bubble, trend, fx, rage }, () => activeSection.value, bridge)
})

onUnmounted(destroy)
</script>

<template>
  <!-- On body, so no transformed or stacking ancestor can capture the fixed layers. -->
  <Teleport v-if="mounted" to="body">
    <div class="ambient" aria-hidden="true">
      <div ref="rageEl" class="rage" />
      <canvas ref="fxEl" class="fx" />
      <div ref="trendEl" class="trend" hidden />
      <div ref="petEl" class="pet">
        <div ref="bubbleEl" class="pet__bubble" hidden />
        <canvas ref="canvasEl" class="pet__canvas" width="220" height="220" />
      </div>
    </div>
    <!-- Outside the aria-hidden, pointer-events:none layers, so it takes clicks and speaks. -->
    <div class="quest">
      <QuestHud :team="quest.team" :done="quest.done" :boss="quest.boss" :announce="announce" @card="openCard" />
      <TeamCard :open="cardOpen" :ms="quest.ms" :run="quest.run" :stats="stats" :stats-off="statsOff" @close="cardOpen = false" @stats="s => stats = s" />
    </div>
  </Teleport>
</template>

<style scoped>
/* The old page's stack: rage, fx, trend, then the robot on top. */
.rage,
.fx,
.trend,
.pet {
  position: fixed;
  pointer-events: none;
}

.rage { z-index: 57; }
.fx { z-index: 58; }
.trend { z-index: 59; }

.pet {
  z-index: 60;
  top: 0;
  left: 0;
  will-change: transform;
  transform-origin: center;
}

/* Fixed CSS size: the robot grows in-canvas, a CSS scale would blur the pixel art. */
.pet__canvas {
  display: block;
  width: 220px;
  height: 220px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.pet__bubble {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--pn-canvas);
  color: var(--pn-text);
  border: 1px solid var(--pn-text);
  box-shadow: 3px 3px 0 0 var(--pn-shadow-offset-hover);
  padding: 6px 10px;
  border-radius: 3px;
  font-family: var(--pn-font-mono);
  font-size: .74rem;
  line-height: 1.3;
  white-space: normal;
  width: max-content;
  max-width: 228px;
  text-align: center;
}

.pet__bubble::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 50%;
  margin-left: -4px;
  width: 8px;
  height: 8px;
  background: var(--pn-canvas);
  border-right: 1px solid var(--pn-text);
  border-bottom: 1px solid var(--pn-text);
  transform: rotate(45deg);
}

.pet__bubble[hidden] {
  display: none;
}

.fx {
  inset: 0;
  width: 100vw;
  height: 100vh;
}

/* The flying AI-trend tag; the cyan wings are the game palette's spark colour. */
.trend {
  top: 0;
  left: 0;
  will-change: transform;
  background: var(--pn-text);
  color: var(--pn-canvas);
  border: 1px solid var(--pn-text);
  font-family: var(--pn-font-mono);
  font-size: .8rem;
  padding: 5px 10px;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 3px 3px 0 0 var(--pn-shadow-offset-hover);
}

.trend::before,
.trend::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  transform: translateY(-50%);
  animation: flap .34s ease-in-out infinite;
}

.trend::before {
  left: -12px;
  border-right: 12px solid var(--pn-secondary);
  transform-origin: right center;
}

.trend::after {
  right: -12px;
  border-left: 12px solid var(--pn-secondary);
  transform-origin: left center;
}

@keyframes flap {
  0%, 100% { transform: translateY(-50%) scaleY(1); }
  50% { transform: translateY(-50%) scaleY(0.4); }
}

.trend[hidden] {
  display: none;
}

/* Peak-rage flash in the robot's eye orange, under the robot and fx so the robot stays vivid. */
.rage {
  inset: 0;
  opacity: 0;
  background: radial-gradient(125% 125% at 50% 45%, rgba(255, 90, 31, 0.20) 0%, rgba(255, 90, 31, 0.40) 58%, rgba(232, 70, 13, 0.62) 100%);
}

.rage--on {
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  animation: rageFlash 2.5s ease-out both;
}

/* The boss defeat: the same flash in the brand cyan, blue and orange. */
.rage--brand {
  background: radial-gradient(125% 125% at 50% 40%, rgba(54, 198, 224, 0.22) 0%, rgba(11, 107, 203, 0.30) 55%, rgba(255, 90, 31, 0.50) 100%);
}

@keyframes rageFlash {
  0% { opacity: 0; }
  10% { opacity: 1; }
  45% { opacity: 0.92; }
  100% { opacity: 0; }
}

/* The robot's size shrinks in-canvas through dispScale; this only trims the DOM layers. */
@media (max-width: 700px) {
  .trend {
    font-size: .68rem;
    padding: 4px 8px;
    box-shadow: 2px 2px 0 0 var(--pn-shadow-offset-hover);
  }
  .trend::before,
  .trend::after {
    border-top-width: 6px;
    border-bottom-width: 6px;
  }
  .trend::before {
    left: -9px;
    border-right-width: 9px;
  }
  .trend::after {
    right: -9px;
    border-left-width: 9px;
  }
  .pet__bubble {
    font-size: .67rem;
    max-width: 180px;
    padding: 5px 8px;
  }
}

@media print {
  .ambient,
  .quest {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ambient,
  .quest {
    display: none !important;
  }
}
</style>

<style>
/* The game sets these on <html> while the cursor is over the robot or holding it. */
html.robot-grab,
html.robot-grab * {
  cursor: grab !important;
}

html.robot-grabbing,
html.robot-grabbing * {
  cursor: grabbing !important;
}

/* A letter the AGI burnt out (scorch.ts): the glyph keeps its width, a soot mark sits where it was. */
.ib-burnt {
  color: transparent !important;
  text-shadow: none !important;
  background: radial-gradient(circle at 50% 55%, rgba(12, 34, 54, .55) 0 22%, rgba(255, 90, 31, .28) 38%, transparent 68%);
}

/* Over a sub-agent waiting to be recruited. */
html.robot-point,
html.robot-point * {
  cursor: pointer !important;
}
</style>
