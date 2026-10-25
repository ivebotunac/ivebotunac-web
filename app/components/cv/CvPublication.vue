<script setup lang="ts">
import type { Publication } from '~/types/cv'
import CvItem from './CvItem.vue'

defineProps<{ pub: Publication, self: string, scholar?: string }>()
</script>

<template>
  <CvItem :when="pub.year" :title="pub.title" :sub="pub.venue">
    <dt>Authors</dt>
    <dd><template v-for="(author, i) in pub.authors" :key="author"><template v-if="i">, </template><strong v-if="author === self">{{ author }}</strong><template v-else>{{ author }}</template></template></dd>
    <template v-if="pub.venue"><dt>Published in</dt><dd>{{ pub.venue }}</dd></template>
    <template v-if="pub.doi || scholar">
      <dt>Link</dt>
      <dd>
        <a v-if="pub.doi" :href="`https://doi.org/${pub.doi}`" target="_blank" rel="noopener" class="cv-ext">doi.org/{{ pub.doi }}</a>
        <a v-else :href="scholar" target="_blank" rel="noopener" class="cv-ext">Google Scholar</a>
      </dd>
    </template>
  </CvItem>
</template>
