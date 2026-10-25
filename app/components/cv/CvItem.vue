<script setup lang="ts">
import { Comment, useSlots } from 'vue'

// A v-if inside the slot still passes a slot function, so look for real content.
const slots = useSlots()
const hasDetails = () => !!slots.default?.().some(node => node.type !== Comment)

defineProps<{
  when: string | number
  title: string
  sub?: string
}>()
</script>

<template>
  <!-- One line per item; its details open on click, so the list stays short until someone asks. -->
  <li class="item">
    <details v-if="hasDetails()">
      <summary class="item__line">
        <span class="item__when">{{ when }}</span>
        <span class="item__head">
          <span class="item__title">{{ title }}</span>
          <span v-if="sub" class="item__sub">{{ sub }}</span>
        </span>
        <span class="cv-tog" title="Details" aria-hidden="true" />
      </summary>
      <dl class="item__det"><slot /></dl>
    </details>
    <div v-else class="item__line">
      <span class="item__when">{{ when }}</span>
      <span class="item__head">
        <span class="item__title">{{ title }}</span>
        <span v-if="sub" class="item__sub">{{ sub }}</span>
      </span>
    </div>
  </li>
</template>

<style scoped>
.item { border-bottom: 1px solid var(--pn-border); }

.item__line {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 20px;
  gap: 28px;
  align-items: start;
  padding: 12px 0;
}

.item__when {
  font-family: var(--pn-font);
  font-size: .72rem;
  color: var(--pn-accent-text);
  padding-top: .3em;
  white-space: nowrap;
}

.item__head { min-width: 0; display: block; }

.item__title {
  display: block;
  font-size: .95rem;
  font-weight: 600;
  line-height: 1.4;
}

.item__sub {
  display: block;
  margin-top: 2px;
  font-size: .82rem;
  color: var(--pn-text-muted);
}

summary.item__line:hover .item__title { color: var(--pn-link); }

/* Details sit in a white well under the title, labels on the left. */
.item__det {
  margin: 0 48px 14px 124px;
  padding: 12px 14px;
  background-color: var(--pn-surface);
  border: 1px solid var(--pn-border);
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 6px 14px;
  font-size: .84rem;
  line-height: 1.5;
}

.item__det :deep(dt) {
  font-family: var(--pn-font);
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--pn-text-faint);
  padding-top: .25em;
}

.item__det :deep(dd) {
  margin: 0;
  color: var(--pn-text-secondary);
}

.item__det :deep(dd strong) {
  color: var(--pn-text);
  font-weight: 600;
}

@media (max-width: 1024px) and (min-width: 861px) {
  .item__line { grid-template-columns: 84px minmax(0, 1fr) 20px; gap: 22px; }
  .item__det { margin-left: 106px; }
}

@media (max-width: 860px) {
  .item__line { grid-template-columns: minmax(0, 1fr) 20px; gap: 3px 12px; }
  .item__when { grid-column: 1; padding-top: 0; }
  .item__head { grid-column: 1; }
  .item__line > .cv-tog { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
  .item__det { margin: 0 0 14px; grid-template-columns: 1fr; gap: 2px; }
  .item__det :deep(dd + dt) { margin-top: 8px; }
}

@media print {
  .item { break-inside: avoid; }
  .item__det { margin: 0 0 10px 124px; padding: 0; border: 0; }
}
</style>
