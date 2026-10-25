<script setup lang="ts">
import { computed } from 'vue'
import type { Certification } from '~/types/cv'
import CvItem from './CvItem.vue'

const props = defineProps<{ cert: Certification }>()

const programme = computed(() => props.cert.courses ? `${props.cert.kind}, ${props.cert.courses} courses` : props.cert.kind)
</script>

<template>
  <CvItem :when="cert.year ?? '–'" :title="cert.title" :sub="`${cert.issuer} · ${programme}`">
    <dt>Issuer</dt><dd>{{ cert.issuer }}</dd>
    <dt>Programme</dt><dd>{{ programme }}</dd>
    <template v-if="cert.url"><dt>Certificate</dt><dd><a :href="cert.url" target="_blank" rel="noopener" class="cv-ext">Verify</a></dd></template>
  </CvItem>
</template>
