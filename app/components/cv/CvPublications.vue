<script setup lang="ts">
import { computed } from 'vue'
import type { Publication } from '~/types/cv'
import CvPublication from './CvPublication.vue'
import CvMore from './CvMore.vue'

const props = defineProps<{ publications: Publication[], self: string, scholar?: string }>()

// The newest three show; the rest wait behind "show all".
const SHOWN = 3
const first = computed(() => props.publications.slice(0, SHOWN))
const rest = computed(() => props.publications.slice(SHOWN))
</script>

<template>
  <ol class="list">
    <CvPublication v-for="pub in first" :key="pub.title" :pub="pub" :self="self" :scholar="scholar" />
  </ol>
  <CvMore v-if="rest.length" :label="`Show all ${publications.length} publications`">
    <ol class="list" :start="SHOWN + 1">
      <CvPublication v-for="pub in rest" :key="pub.title" :pub="pub" :self="self" :scholar="scholar" />
    </ol>
  </CvMore>
</template>

<style scoped>
.list {
  list-style: none;
}
</style>
