<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mdiWeatherNight, mdiWhiteBalanceSunny } from '@mdi/js'
import PnIcon from '~/components/ui/PnIcon.vue'

// The head script in nuxt.config.ts has already set data-theme; null until mount keeps hydration equal.
const dark = ref<boolean | null>(null)

onMounted(() => { dark.value = document.documentElement.dataset.theme === 'dark' })

const toggle = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  dark.value = next === 'dark'
  try { localStorage.setItem('theme', next) } catch { /* private mode: the choice lasts this page only */ }
}
</script>

<template>
  <!-- Both glyphs render on the server; CSS shows the one for the theme, so nothing flips on hydration. -->
  <button
    type="button"
    class="theme-toggle"
    aria-label="Dark theme"
    :aria-pressed="dark === null ? undefined : dark"
    @click="toggle"
  >
    <PnIcon class="theme-toggle__moon" :path="mdiWeatherNight" :size="16" />
    <PnIcon class="theme-toggle__sun" :path="mdiWhiteBalanceSunny" :size="16" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin: -6px -8px -6px 0;
  border: 0;
  border-radius: var(--pn-radius-sm);
  background: none;
  color: var(--pn-text-muted);
  cursor: pointer;
  transition: color var(--pn-motion-fast) var(--pn-ease-out);
}

.theme-toggle:hover { color: var(--pn-accent-ui); }

.theme-toggle__sun { display: none; }
:root[data-theme="dark"] .theme-toggle__moon { display: none; }
:root[data-theme="dark"] .theme-toggle__sun { display: inline-block; }
</style>
