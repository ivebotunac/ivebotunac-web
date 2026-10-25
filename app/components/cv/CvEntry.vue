<script setup lang="ts">
import { Comment, useSlots } from 'vue'

// A v-if inside the slot still passes a slot function, so look for real content.
const slots = useSlots()
const hasSummary = () => !!slots.default?.().some(node => node.type !== Comment)

defineProps<{
  when: string
  title: string
  sub?: string
  org: string
  place?: string
}>()
</script>

<template>
  <li class="entry">
    <p class="entry__when">{{ when }}</p>
    <div class="entry__body">
      <h3 class="entry__title">{{ title }}<template v-if="sub">{{ ' ' }}<span class="entry__sub">({{ sub }})</span></template></h3>
      <p class="entry__org">{{ org }}<template v-if="place">{{ ' ' }}<span class="entry__place">{{ place }}</span></template></p>
      <p v-if="hasSummary()" class="entry__summary"><slot /></p>
    </div>
  </li>
</template>

<style scoped>
.entry {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 28px;
  padding: 0 0 32px;
}

.entry:last-child { padding-bottom: 0; }

.entry__when {
  margin: 0;
  font-family: var(--pn-font);
  font-size: .72rem;
  color: var(--pn-text-faint);
  padding-top: .4em;
  letter-spacing: .01em;
  white-space: nowrap;
}

.entry__body { min-width: 0; }

.entry__title {
  margin: 0 0 4px;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.entry__sub {
  font-weight: 400;
  color: var(--pn-text-muted);
}

.entry__org {
  margin: 0 0 9px;
  font-size: .86rem;
  color: var(--pn-text-muted);
}

.entry__place {
  font-family: var(--pn-font);
  color: var(--pn-text-faint);
  font-size: .68rem;
  margin-left: 6px;
}

.entry__summary {
  margin: 0 0 9px;
  font-size: .92rem;
  color: var(--pn-text-secondary);
}

@media (max-width: 1024px) and (min-width: 861px) {
  .entry {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 22px;
  }
}

@media (max-width: 860px) {
  .entry {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .entry__when {
    color: var(--pn-accent-text);
    padding-top: 0;
  }
}

@media print {
  .entry { break-inside: avoid; }
}
</style>
