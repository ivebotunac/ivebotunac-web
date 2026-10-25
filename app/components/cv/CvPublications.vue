<script setup lang="ts">
import type { Publication } from '~/types/cv'

defineProps<{ publications: Publication[], self: string }>()
</script>

<template>
  <ol class="pubs">
    <li v-for="pub in publications" :key="pub.title" class="pub">
      <span class="pub__year">{{ pub.year }}</span>
      <div class="pub__body">
        <p class="pub__title">{{ pub.title }}</p>
        <p class="pub__meta">
          <template v-for="(author, i) in pub.authors" :key="author"><template v-if="i">, </template><strong v-if="author === self">{{ author }}</strong><template v-else>{{ author }}</template></template><template v-if="pub.venue"> · <em>{{ pub.venue }}</em></template><template v-if="pub.doi"> · <a :href="`https://doi.org/${pub.doi}`" target="_blank" rel="noopener" class="cv-ext">doi</a></template>
        </p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.pubs {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pub {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 28px;
  padding: 0 0 20px;
}

.pub:last-child { padding-bottom: 0; }

.pub__year {
  font-family: var(--pn-font);
  font-size: .72rem;
  color: var(--pn-accent-text);
  padding-top: .35em;
}

.pub__title {
  margin: 0 0 4px;
  font-size: .95rem;
  font-weight: 600;
  line-height: 1.4;
}

.pub__meta {
  margin: 0;
  font-size: .82rem;
  color: var(--pn-text-muted);
}

.pub__meta strong {
  color: var(--pn-text);
  font-weight: 600;
}

.pub__meta em { font-style: italic; }

@media (max-width: 1024px) and (min-width: 861px) {
  .pub {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 22px;
  }
}

@media (max-width: 860px) {
  .pub {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .pub__year {
    color: var(--pn-accent-text);
    padding-top: 0;
  }
}

@media print {
  .pub { break-inside: avoid; }
}
</style>
