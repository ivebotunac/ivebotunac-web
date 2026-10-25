<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const code = computed(() => props.error?.statusCode ?? 500)
const isNotFound = computed(() => code.value === 404)

useSeoMeta({
  title: `${isNotFound.value ? 'Page not found' : 'Something went wrong'} - Ive Botunac`,
  robots: 'noindex, nofollow'
})

// clearError resets the error state; a plain route change would keep it.
const leave = (to: string) => clearError({ redirect: to })

const { loadGoogleAnalytics } = useGoogleAnalytics()
onMounted(() => loadGoogleAnalytics())
</script>

<template>
  <section class="pn-section err">
    <div class="container">
      <p class="pn-eyebrow">Error {{ code }}</p>
      <h1>{{ isNotFound ? 'This page got lost.' : 'Something went wrong.' }}</h1>
      <NuxtLink to="/" class="pn-btn" @click.prevent="leave('/')">Back to home</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.err { padding-top: var(--pn-hero-top); min-height: 60vh; }
</style>
