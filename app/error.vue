<script setup lang="ts">
import type { NuxtError } from '#app'
import GlobalStyles from '~/components/layout/GlobalStyles.vue'

// Async on purpose: what error.vue imports lands in the entry chunk, whose stylesheet vitalizer
// strips, so its styles would be lost on every client navigation.
const ErrorContent = defineAsyncComponent(() => import('~/components/layout/ErrorContent.vue'))

defineProps<{ error: NuxtError }>()
</script>

<template>
  <GlobalStyles />
  <NuxtLayout>
    <ErrorContent :error="error" />
  </NuxtLayout>
</template>
