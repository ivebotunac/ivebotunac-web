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
  line-height: var(--pn-lh-lg);
  font-weight: 400;
  color: var(--pn-text-secondary);
  letter-spacing: var(--pn-ls-lg);
}

.lead em {
  font-style: italic;
  color: var(--pn-accent-text);
}

@media (prefers-reduced-motion: no-preference) {
  .lead { animation: cvRise .7s var(--pn-ease-rise) .05s both; }
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
