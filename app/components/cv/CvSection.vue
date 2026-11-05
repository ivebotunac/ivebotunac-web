<script setup lang="ts">
import { computed, inject } from 'vue'
import { CV_REVEAL_KEY } from './reveal'

const props = defineProps<{
  id: string
  num: string
  title: string
  count?: string
}>()

const reveal = inject(CV_REVEAL_KEY, null)
const shown = computed(() => !!reveal?.seen.has(props.id))
</script>

<template>
  <!-- tabindex -1: the rail index moves focus here after it scrolls. -->
  <section :id="id" class="cv-section" :class="{ 'is-in': shown }" tabindex="-1" :aria-labelledby="`${id}-title`">
    <h2 :id="`${id}-title`" class="shead">
      <span class="shead__num">{{ num }}</span>
      <span class="shead__name">{{ title }}</span>
      <span v-if="count" class="shead__count">{{ count }}</span>
    </h2>
    <slot />
  </section>
</template>

<style scoped>
.cv-section { padding: 46px 0 0; }

.shead {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 28px;
  font-family: var(--pn-font);
  font-size: .72rem;
  font-weight: 500;
  line-height: inherit;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: var(--pn-text-muted);
}

.shead__num { color: var(--pn-accent-text); }

/* After the rule, in the section's quiet grey. */
.shead__count {
  order: 3;
  text-transform: none;
  letter-spacing: 0;
  color: var(--pn-text-faint);
}

/* The hairline rule runs from the title to the column edge. */
.shead::after {
  content: "";
  order: 2;
  flex: 1;
  height: 1px;
  background-color: var(--pn-border);
}

/* Hidden from first paint once script runs, then faded in when scrolled to. */
@media (prefers-reduced-motion: no-preference) {
  :global(.js) .cv-section {
    opacity: 0;
    transform: translateY(12px);
  }

  :global(.js) .cv-section.is-in {
    opacity: 1;
    transform: none;
    transition: opacity .6s ease, transform .6s var(--pn-ease-rise);
  }
}

@media (max-width: 540px) {
  .cv-section { padding-top: 38px; }
  .shead { margin-bottom: 22px; }
}

@media print {
  .cv-section { break-inside: avoid; }
}
</style>
