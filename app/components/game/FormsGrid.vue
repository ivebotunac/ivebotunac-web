<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { CRITTERS, critter, drawFormIcon } from '~/game/critters'

// The critter forms: each in colour once the visitor has met it, a silhouette until then.
// Only the invented labels reach the page; the keys stay in code.
const props = defineProps<{ seen: string[] }>()

const cells = ref<HTMLCanvasElement[]>([])
// The tile under the pointer or last tapped; the caption names it.
const focus = ref<string | null>(null)
// Forms met while this grid is on screen get a short glow.
const fresh = ref<string[]>([])

function paint() {
  cells.value.forEach((cv, i) => {
    const c = cv.getContext('2d'), form = CRITTERS[i]
    if (c && form) drawFormIcon(c, form, props.seen.includes(form))
  })
}

onMounted(paint)
watch(() => props.seen.length, (n, old) => {
  // a newly met form is appended, so the tail past the old length is what is new
  if (old !== undefined && n > old) fresh.value = props.seen.slice(old)
  void nextTick(paint)
})

const pct = computed(() => Math.round((props.seen.length / CRITTERS.length) * 100))

const caption = computed(() => {
  const f = focus.value
  if (!f) return props.seen.length ? 'Tap a form to see who it is.' : 'Forms appear as the robot shape-shifts.'
  if (!props.seen.includes(f)) return '??? Not met yet.'
  const s = critter(f)
  return s ? `${s.label}: ${s.lines.idle[0] ?? ''}` : ''
})
</script>

<template>
  <div class="forms">
    <div class="forms__head">
      <p class="forms__title">Forms seen {{ seen.length }}/{{ CRITTERS.length }}</p>
      <span class="forms__bar" aria-hidden="true"><span class="forms__fill" :style="{ width: pct + '%' }" /></span>
    </div>
    <div class="forms__grid" aria-hidden="true" @pointerleave="focus = null">
      <span
        v-for="f in CRITTERS"
        :key="f"
        class="forms__tile"
        :class="{ 'is-seen': seen.includes(f), 'is-fresh': fresh.includes(f), 'is-focus': focus === f }"
        @pointerenter="focus = f"
        @click="focus = f"
      >
        <canvas ref="cells" class="forms__cell" width="24" height="24" />
      </span>
    </div>
    <p class="forms__caption" aria-hidden="true">{{ caption }}</p>
  </div>
</template>

<style scoped>
.forms__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.forms__title {
  margin: 0;
  font: 600 .62rem/1.2 var(--pn-font);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--pn-text-muted);
  white-space: nowrap;
}

.forms__bar {
  flex: 1;
  height: 4px;
  background: var(--pn-border);
}

.forms__fill {
  display: block;
  height: 100%;
  background: var(--pn-accent-ui);
  transition: width .4s ease;
}

.forms__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 28px);
  gap: 4px;
}

/* A 28px tile around the 24px sprite; unseen ones are a faint silhouette marked with a question mark. */
.forms__tile {
  position: relative;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px dashed var(--pn-border-brand);
  background: var(--pn-surface);
  cursor: pointer;
}

.forms__tile:not(.is-seen)::after {
  content: '?';
  position: absolute;
  font: 700 .62rem/1 var(--pn-font);
  color: var(--pn-text-faint);
}

.forms__tile.is-seen {
  border-style: solid;
  background: var(--pn-canvas);
}

.forms__tile.is-focus {
  border-color: var(--pn-accent-ui);
}

.forms__tile.is-fresh {
  animation: forms-glow 1.6s ease-out 2;
}

@keyframes forms-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--pn-primary-rgb), 0); }
  30% { box-shadow: 0 0 0 3px rgba(var(--pn-primary-rgb), .45); }
}

.forms__cell {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}

.forms__tile:not(.is-seen) .forms__cell {
  opacity: .45;
}

/* A fixed two-line height: a caption that grew under the pointer moved the bottom-anchored grid away from it. */
.forms__caption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  height: 2.8em;
  overflow: hidden;
  margin: 6px 0 0;
  font: .68rem/1.4 var(--pn-font);
  color: var(--pn-text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .forms__fill { transition: none; }
  .forms__tile.is-fresh { animation: none; }
}
</style>
