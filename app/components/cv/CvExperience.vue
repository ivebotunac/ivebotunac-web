<script setup lang="ts">
import type { Org, YearMonth } from '~/types/cv'
import CvOrg from './CvOrg.vue'

defineProps<{ orgs: Org[], now: YearMonth }>()
</script>

<template>
  <ol class="orgs">
    <CvOrg v-for="org in orgs" :key="org.org" :org="org" :now="now" />
  </ol>
</template>

<style scoped>
.orgs {
  list-style: none;
}
</style>
