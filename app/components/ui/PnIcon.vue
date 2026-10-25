<script setup lang="ts">
// Inline MDI glyph from an @mdi/js path: no icon font stylesheet, renders on prerendered routes.
// Decorative by default; pass `label` to expose it to assistive tech.
withDefaults(
  defineProps<{
    path: string
    size?: number | string
    label?: string
  }>(),
  { size: 24, label: undefined }
)
</script>

<template>
  <svg
    class="pn-icon"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<style scoped>
.pn-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
  color: inherit;
}
</style>
