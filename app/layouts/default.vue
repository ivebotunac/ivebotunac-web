<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '~/components/layout/AppHeader.vue'
import AppFooter from '~/components/layout/AppFooter.vue'

// No icon webfont: every glyph is inline SVG; a webfont fails into tofu.

// The CV renders the footer inside its content column, so the layout skips it there.
const route = useRoute()
const footerInPage = computed(() => route.path === '/')
</script>

<template>
  <div class="pn-layout">
    <AppHeader />
    <main>
      <slot />
    </main>
    <div v-if="!footerInPage" class="container container--prose">
      <AppFooter />
    </div>
  </div>
</template>
