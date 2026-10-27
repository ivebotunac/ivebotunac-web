<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { CRITTERS, critter, drawFormIcon } from '~/game/critters'

// The collection of critter forms: each one in colour once the visitor has met it, a silhouette until then.
// Only the invented labels reach the page; the keys stay in code.
const props = defineProps<{ seen: string[] }>()

const cells = ref<HTMLCanvasElement[]>([])

function paint() {
  cells.value.forEach((cv, i) => {
    const c = cv.getContext('2d'), form = CRITTERS[i]
    if (c && form) drawFormIcon(c, form, props.seen.includes(form))
  })
}

onMounted(paint)
watch(() => props.seen.length, () => { void nextTick(paint) })

const label = (form: string) => (props.seen.includes(form) ? critter(form)?.label ?? '' : '???')
</script>

<template>
  <div class="forms">
    <p class="forms__title">Forms seen {{ seen.length }}/{{ CRITTERS.length }}</p>
    <div class="forms__grid" aria-hidden="true">
      <canvas v-for="f in CRITTERS" :key="f" ref="cells" class="forms__cell" width="24" height="24" :title="label(f)" />
    </div>
  </div>
</template>

<style scoped>
.forms__title {
  margin: 0 0 6px;
  font: 600 .62rem/1.2 var(--pn-font);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--pn-text-muted);
}

.forms__grid {
  display: grid;
  grid-template-columns: repeat(9, 24px);
  gap: 4px;
}

.forms__cell {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}
</style>
