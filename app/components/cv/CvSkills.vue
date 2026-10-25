<script setup lang="ts">
import type { Skill } from '~/types/cv'

defineProps<{ skills: Skill[] }>()
</script>

<template>
  <ul class="skills">
    <li v-for="s in skills" :key="s.label" class="skill">
      <details>
        <summary class="skill__row">
          <span class="skill__label">{{ s.label }}</span>
          <span class="skill__body">
            <span class="skill__claim">{{ s.claim }}</span>
            <span class="chips">
              <span v-for="t in s.core" :key="t" class="chip chip--core">{{ t }}</span>
              <span v-for="t in s.also ?? []" :key="t" class="chip">{{ t }}</span>
            </span>
          </span>
          <span v-if="s.proof" class="cv-tog" title="Details" aria-hidden="true" />
        </summary>
        <p v-if="s.proof" class="skill__proof"><span class="skill__where">Where</span>{{ s.proof }}</p>
      </details>
    </li>
  </ul>
</template>

<style scoped>
.skills {
  list-style: none;
  margin: 0;
  padding: 0;
}

.skill { border-bottom: 1px solid var(--pn-border); }

.skill__row {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr) 20px;
  gap: 16px;
  align-items: start;
  padding: 14px 0;
}

.skill__label {
  font-family: var(--pn-font);
  font-size: .74rem;
  line-height: 1.4;
  color: var(--pn-accent-text);
  padding-top: .2em;
}

.skill__body { min-width: 0; display: block; }

.skill__claim {
  display: block;
  margin-bottom: 8px;
  font-size: .95rem;
  font-weight: 600;
  line-height: 1.4;
}

.skill__row:hover .skill__claim { color: var(--pn-link); }

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Tool chips: the daily ones in ink on white, the rest quieter. */
.chip {
  font-family: var(--pn-font);
  font-size: .72rem;
  line-height: 1.4;
  padding: 2px 8px;
  border: 1px solid var(--pn-border);
  color: var(--pn-text-muted);
}

.chip--core {
  border-color: var(--pn-border-brand);
  background-color: var(--pn-surface);
  color: var(--pn-text);
  font-weight: 500;
}

.skill__proof {
  margin: 0 36px 16px 132px;
  padding: 12px 14px;
  background-color: var(--pn-surface);
  border: 1px solid var(--pn-border);
  font-size: .84rem;
  line-height: 1.55;
  color: var(--pn-text-secondary);
}

.skill__where {
  display: block;
  margin-bottom: 4px;
  font-family: var(--pn-font);
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--pn-text-faint);
}

@media (max-width: 860px) {
  .skill__row { grid-template-columns: minmax(0, 1fr) 20px; gap: 4px 12px; }
  .skill__label { grid-column: 1; padding-top: 0; }
  .skill__body { grid-column: 1; }
  .skill__row > .cv-tog { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
  .skill__proof { margin: 0 0 16px; }
}

@media print {
  .skill { break-inside: avoid; }
  .chip--core { background: none; }
}
</style>
