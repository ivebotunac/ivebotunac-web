<script setup lang="ts">
import type { NuxtError } from '#app'
import GlobalStyles from '~/components/layout/GlobalStyles.vue'

// Async on purpose: a sync import lands in the entry chunk, whose stylesheet vitalizer strips.
const ErrorContent = defineAsyncComponent(() => import('~/components/layout/ErrorContent.vue'))

defineProps<{ error: NuxtError }>()
</script>

<template>
  <GlobalStyles />
  <NuxtLayout>
    <ErrorContent :error="error" />
  </NuxtLayout>
</template>
