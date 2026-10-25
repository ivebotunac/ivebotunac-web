<script setup lang="ts">
import type { Skill } from '~/types/cv'

defineProps<{ skills: Skill[] }>()
</script>

<template>
  <dl class="skills">
    <template v-for="s in skills" :key="s.label">
      <dt>{{ s.label }}</dt>
      <dd>{{ s.text }}</dd>
    </template>
  </dl>
</template>

<style scoped>
.skills {
  margin: 0;
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: 0;
}

.skills dt {
  font-family: var(--pn-font);
  font-size: .74rem;
  color: var(--pn-accent-text);
  padding: 11px 0;
  border-top: 1px solid var(--pn-border);
}

.skills dd {
  margin: 0;
  padding: 11px 0;
  border-top: 1px solid var(--pn-border);
  color: var(--pn-text-secondary);
  font-size: 1rem;
  line-height: 1.5;
}

.skills dt:last-of-type,
.skills dd:last-of-type { border-bottom: 1px solid var(--pn-border); }

@media (max-width: 860px) {
  .skills { grid-template-columns: 1fr; }

  .skills dt {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .skills dd {
    padding-top: 4px;
    border-top: 0;
  }

  .skills dt + dd { border-bottom: 0; }
}
</style>
