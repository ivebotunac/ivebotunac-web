<script setup lang="ts">
import type { Education } from '~/types/cv'
import CvEntry from './CvEntry.vue'

defineProps<{ education: Education[] }>()
</script>

<template>
  <ol class="entries">
    <CvEntry
      v-for="e in education"
      :key="e.degree"
      :when="`${e.start} – ${e.end}`"
      :title="e.degree"
      :sub="e.sub"
      :org="e.institution"
      :place="e.eqf ? `EQF ${e.eqf}` : undefined"
    >
      <template v-if="e.thesis">Thesis: <em>{{ e.thesis }}</em>.</template>
    </CvEntry>
  </ol>
</template>

<style scoped>
.entries {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
