<script setup lang="ts">
import { onMounted } from 'vue'

// Prerendered with the build year; the visitor's clock takes over once mounted.
const year = useState('footer-year', () => new Date().getFullYear())
onMounted(() => {
  year.value = new Date().getFullYear()
})

const backToTop = () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  document.getElementById('top')?.focus({ preventScroll: true })
}
</script>

<template>
  <!-- On the CV it sits inside the content column, as on the old page; other pages wrap it in a container. -->
  <footer class="foot">
    <p class="foot__line">
      &copy; {{ year }} Ive Botunac · <NuxtLink to="/privacy-policy">privacy policy</NuxtLink> · <a href="#top" @click.exact.prevent="backToTop">back to top ↑</a>
    </p>
  </footer>
</template>

<style scoped>
.foot {
  margin: 64px 0 80px;
  padding: 22px 0 0;
  border-top: 1px solid var(--pn-border);
  font-size: .72rem;
  color: var(--pn-text-faint);
}

/* The browser's paragraph margin, which the old page kept here and the kit reset removes. */
.foot__line { margin: 1em 0; }

.foot a { color: var(--pn-text-muted); }
.foot a:hover { color: var(--pn-link); }

@media (max-width: 540px) {
  .foot { margin: 48px 0 56px; }
}

@media print {
  .foot a { display: none !important; }
}
</style>
