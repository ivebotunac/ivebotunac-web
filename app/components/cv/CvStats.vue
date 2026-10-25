<script setup lang="ts">
import type { Stat } from '~/types/cv'

defineProps<{ stats: Stat[] }>()
</script>

<template>
  <ul class="stats">
    <li v-for="s in stats" :key="s.label" class="stat">
      <span class="stat__value">{{ s.value }}</span>
      <span class="stat__label">{{ s.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.stats {
  list-style: none;
  margin: -12px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

/* The CV's card: white, hairline, hard offset shadow. */
.stat {
  padding: 12px 14px;
  background-color: var(--pn-surface);
  border: 1px solid var(--pn-border-brand);
  box-shadow: 4px 4px 0 0 var(--pn-shadow-offset-rest);
}

.stat__value {
  display: block;
  font-family: var(--pn-font-display);
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--pn-text);
}

.stat__label {
  display: block;
  margin-top: 4px;
  font-family: var(--pn-font);
  font-size: .72rem;
  line-height: 1.35;
  color: var(--pn-text-muted);
}

@media (max-width: 860px) {
  .stats { margin-top: -6px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
}

@media print {
  .stat { box-shadow: none; }
}
</style>
