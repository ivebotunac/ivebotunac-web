<script setup lang="ts">
import type { Talk } from '~/types/cv'
import CvEntry from './CvEntry.vue'

defineProps<{ talks: Talk[] }>()
</script>

<template>
  <ul class="entries">
    <CvEntry v-for="t in talks" :key="t.title" :when="t.when" :title="t.title" :org="t.org">
      <template v-if="t.summary">{{ t.summary }}</template>
    </CvEntry>
  </ul>
</template>

<style scoped>
.entries {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
