<script setup lang="ts">
import { computed } from 'vue'
import type { Certification } from '~/types/cv'
import CvCertification from './CvCertification.vue'
import CvMore from './CvMore.vue'

const props = defineProps<{ certifications: Certification[] }>()

// The five newest show; the older ones wait behind "more".
const SHOWN = 5
const first = computed(() => props.certifications.slice(0, SHOWN))
const rest = computed(() => props.certifications.slice(SHOWN))
const restYears = computed(() => {
  const ys = rest.value.map(c => c.year).filter((y): y is number => !!y)
  return ys.length ? `, ${Math.min(...ys)} to ${Math.max(...ys)}` : ''
})
</script>

<template>
  <ul class="list">
    <CvCertification v-for="c in first" :key="c.title" :cert="c" />
  </ul>
  <CvMore v-if="rest.length" :label="`${rest.length} more${restYears}`">
    <ul class="list">
      <CvCertification v-for="c in rest" :key="c.title" :cert="c" />
    </ul>
  </CvMore>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
