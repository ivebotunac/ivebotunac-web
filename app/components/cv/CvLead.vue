<script setup lang="ts">
import type { Inline } from '~/types/cv'

defineProps<{ lead: Inline[] }>()
</script>

<template>
  <p class="lead">
    <template v-for="(part, i) in lead" :key="i">
      <em v-if="typeof part === 'object'">{{ part.em }}</em>
      <template v-else>{{ part }}</template>
    </template>
  </p>
</template>

<style scoped>
.lead {
  margin: 0 0 44px;
  font-family: var(--pn-font-display);
  font-size: var(--pn-size-lg);
  line-height: 1.5;
  font-weight: 400;
  color: var(--pn-text-secondary);
  letter-spacing: -0.02em;
}

.lead em {
  font-style: italic;
  color: var(--pn-accent-text);
}

@media (prefers-reduced-motion: no-preference) {
  .lead { animation: rise .7s cubic-bezier(.2, .7, .3, 1) .05s both; }
}

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 860px) {
  .lead { margin-bottom: 34px; }
}

@media (max-width: 540px) {
  .lead { margin-bottom: 28px; }
}

@media print {
  .lead { font-size: 14pt; }
}
</style>
