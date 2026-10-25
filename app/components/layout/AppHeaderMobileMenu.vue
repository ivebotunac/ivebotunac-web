<script setup lang="ts">
import { ref } from 'vue'
import { NAV_LINKS } from './nav'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// AppHeader's focus trap focuses this panel and queries its links.
const panelEl = ref<HTMLElement | null>(null)

defineExpose({ panelEl })
</script>

<template>
  <!-- Tapping outside the panel is the first gesture people try. -->
  <div
    v-if="open"
    class="mobile-scrim"
    aria-hidden="true"
    @click="emit('close')"
  />

  <div
    id="pn-mobile-menu"
    ref="panelEl"
    class="mobile-menu"
    :class="{ active: open }"
    :aria-hidden="open ? undefined : 'true'"
    role="group"
    aria-label="Menu"
    tabindex="-1"
  >
    <nav class="mobile-nav" aria-label="Mobile">
      <NuxtLink v-for="link in NAV_LINKS" :key="link.to" :to="link.to" class="mobile-link" :class="{ 'mobile-link--home': link.to === '/' }">
        {{ link.label }}
      </NuxtLink>
      <slot />
    </nav>
  </div>
</template>

<style scoped>
.mobile-scrim,
.mobile-menu {
  pointer-events: auto;
}

.mobile-scrim {
  position: fixed;
  inset: 0;
  background-color: var(--pn-scrim);
  z-index: var(--pn-z-base);
}

/* The open menu locks scroll: the gutter terms keep the panel under the pill. */
.mobile-menu {
  position: fixed;
  left: calc(50% - var(--pn-scroll-gutter, 0px) / 2);
  transform: translateX(-50%);
  width: calc(100% - var(--pn-space-32) - var(--pn-scroll-gutter, 0px));
  max-width: var(--pn-container);
  /* Opaque: translucency ghosts the hero through; backdrop-filter would trap fixed children. */
  background-color: var(--pn-surface);
  border: 1px solid var(--pn-border);
  border-radius: var(--pn-radius-lg);
  box-shadow: var(--pn-elev-2);
  display: none;
  z-index: var(--pn-z-sticky);
  /* Landscape phones: the panel scrolls so the button at its foot stays reachable. */
  max-height: calc(100dvh - var(--pn-space-120));
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--pn-space-8) 0;
}

.mobile-menu.active {
  display: block;
}

.mobile-menu:focus,
.mobile-menu:focus-visible {
  outline: none;
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.mobile-link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: var(--pn-space-8) var(--pn-space-16);
  color: var(--pn-text);
  text-decoration: none;
  font-size: var(--pn-size-md);
  font-weight: var(--pn-w-medium);
  border-radius: var(--pn-radius-sm);
  margin: 2px var(--pn-space-8);
  transition: color var(--pn-motion-fast) var(--pn-ease-out),
              background-color var(--pn-motion-fast) var(--pn-ease-out);
}

.mobile-link:hover {
  background-color: var(--pn-surface-sunk);
  color: var(--pn-text);
}

/* Home matches every path by prefix, so it marks only on an exact match. */
.mobile-link:not(.mobile-link--home).router-link-active,
.mobile-link--home.router-link-exact-active {
  background-color: var(--pn-nav-active-bg);
  color: var(--pn-nav-active-fg);
}
</style>
