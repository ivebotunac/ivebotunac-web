<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  src?: string
  monogram: string
  width: number
  height: number
  eager?: boolean
}>()

const failed = ref(!props.src)
const imgEl = ref<HTMLImageElement | null>(null)

// An image that failed before hydration fired its error event with no listener attached yet.
onMounted(() => {
  const el = imgEl.value
  if (el && el.complete && el.naturalWidth === 0) failed.value = true
})
</script>

<template>
  <img
    v-if="!failed"
    ref="imgEl"
    class="mono-img"
    :src="src"
    alt=""
    :width="width"
    :height="height"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    @error="failed = true"
  >
  <span v-else class="mono-img mono-img--fallback" aria-hidden="true">{{ monogram }}</span>
</template>

<style scoped>
/* Line height stays inherited, as on the old page's monogram tiles. */
.mono-img--fallback {
  display: grid;
  place-items: center;
  background-color: var(--pn-text);
  color: var(--pn-text-on-ink);
  font-family: var(--pn-font-display);
  font-weight: 700;
}
</style>
