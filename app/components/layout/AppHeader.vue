<script setup lang="ts">
import AppLogo from './AppLogo.vue'

// The CV marks its column #content; any other page falls back to <main>.
const skipToContent = (event: MouseEvent) => {
  const target = document.getElementById('content') ?? document.querySelector('main')
  if (!target) return
  event.preventDefault()
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.focus()
}
</script>

<template>
  <!-- #top is the footer's back-to-top target; tabindex lets that link move focus here. -->
  <header id="top" class="masthead" tabindex="-1">
    <a class="skip-link" href="#content" @click="skipToContent">Skip to content</a>
    <div class="masthead__inner">
      <AppLogo />
      <span class="masthead__doc">CURRICULUM&nbsp;VITÆ · ZADAR, HR</span>
    </div>
  </header>
</template>

<style scoped>
.masthead {
  position: relative;
  z-index: 2;
  border-bottom: 1px solid var(--pn-border);
  background-color: var(--pn-canvas);
}

.masthead__inner {
  max-width: var(--pn-container);
  margin: 0 auto;
  padding: 11px var(--pn-gutter);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--pn-font);
  font-size: .68rem;
  letter-spacing: .22em;
  color: var(--pn-text-muted);
  text-transform: uppercase;
}

.masthead__doc { color: var(--pn-text-faint); }

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background-color: var(--pn-text);
  color: var(--pn-text-on-ink);
  padding: 10px 16px;
  z-index: 100;
  font-family: var(--pn-font);
  font-size: .8rem;
}

.skip-link:hover { color: var(--pn-text-on-ink); }

.skip-link:focus {
  left: 10px;
  top: 10px;
}

@media (max-width: 860px) {
  .masthead__doc { display: none; }
}

@media (max-width: 540px) {
  .masthead__inner {
    padding: 10px var(--pn-gutter);
    font-size: .6rem;
    letter-spacing: .14em;
  }
}

@media print {
  .masthead { display: none !important; }
}
</style>
