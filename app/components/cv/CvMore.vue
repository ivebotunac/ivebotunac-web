<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <!-- The rest of a long list, one click away. -->
  <details class="more">
    <summary class="more__btn">{{ label }} <span aria-hidden="true">↓</span></summary>
    <slot />
  </details>
</template>

<style scoped>
.more__btn {
  display: inline-block;
  padding: 12px 0;
  font-family: var(--pn-font);
  font-size: .8rem;
  color: var(--pn-link);
}

.more__btn:hover { color: var(--pn-link-hover); text-decoration: underline; text-underline-offset: 3px; }

.more[open] > .more__btn { display: none; }
</style>
