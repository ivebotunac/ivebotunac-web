<script setup lang="ts">
import type { Certification } from '~/types/cv'

defineProps<{ certifications: Certification[] }>()
</script>

<template>
  <ul class="certs">
    <li v-for="c in certifications" :key="c.title">
      <span v-if="c.year" class="certs__yr">{{ c.year }}</span>
      <span v-else class="certs__yr" aria-hidden="true">–</span>
      <a v-if="c.url" :href="c.url" target="_blank" rel="noopener" class="cv-ext">{{ c.title }}</a>
      <span v-else>{{ c.title }}</span>
      <span class="certs__by">{{ c.issuer }}</span>
    </li>
  </ul>
</template>

<style scoped>
.certs {
  list-style: none;
  margin: 0;
  padding: 0;
}

.certs li {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 16px;
  padding: 9px 0;
  border-top: 1px solid var(--pn-border);
}

.certs li:last-child { border-bottom: 1px solid var(--pn-border); }

.certs__yr {
  font-family: var(--pn-font);
  font-size: .72rem;
  color: var(--pn-text-faint);
}

.certs__by {
  font-family: var(--pn-font);
  font-size: .68rem;
  color: var(--pn-text-faint);
  white-space: nowrap;
}

@media (max-width: 860px) {
  .certs li { grid-template-columns: 44px 1fr; }
  .certs__by { grid-column: 2; }
}

@media (max-width: 540px) {
  .certs li {
    grid-template-columns: 40px minmax(0, 1fr);
    column-gap: 12px;
  }
}
</style>
