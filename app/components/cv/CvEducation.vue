<script setup lang="ts">
import type { Education } from '~/types/cv'
import CvItem from './CvItem.vue'

defineProps<{ education: Education[] }>()
</script>

<template>
  <ol class="list">
    <CvItem
      v-for="e in education"
      :key="e.degree"
      :when="`${e.start} – ${e.end}`"
      :title="e.degree"
      :sub="e.institution"
    >
      <template v-if="e.sub"><dt>Focus</dt><dd>{{ e.sub }}</dd></template>
      <template v-if="e.eqf"><dt>Level</dt><dd>EQF {{ e.eqf }}</dd></template>
      <template v-if="e.thesis"><dt>Thesis</dt><dd><em>{{ e.thesis }}</em></dd></template>
    </CvItem>
  </ol>
</template>

<style scoped>
.list {
  list-style: none;
}
</style>
