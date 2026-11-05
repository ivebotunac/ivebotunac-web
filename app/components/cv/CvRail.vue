<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Cv } from '~/types/cv'
import { CV_SECTIONS } from '~/components/layout/nav'
import { useActiveSection, useScrollToSection } from '~/composables/useActiveSection'
import CvMonoImage from './CvMonoImage.vue'

const props = defineProps<{ cv: Cv }>()

const active = useActiveSection()
const scrollToSection = useScrollToSection()
const navOpen = ref(false)

const displayName = computed(() => props.cv.name.toLowerCase().replace(/ /g, '_'))
const fullName = computed(() => [props.cv.name, props.cv.credential].filter(Boolean).join(', '))

const goTo = (id: string) => {
  navOpen.value = false
  scrollToSection(id)
}
</script>

<template>
  <div class="rail__sticky">
    <div class="id">
      <div class="id__photo">
        <CvMonoImage
          class="id__img"
          :src="cv.photo"
          :monogram="cv.monogram"
          :width="128"
          :height="128"
          eager
        />
      </div>
      <h1 class="id__name" :aria-label="fullName">{{ displayName }}<span class="cursor" aria-hidden="true">_</span></h1>
      <p class="id__role">
        <template v-for="(line, i) in cv.role" :key="line"><br v-if="i">{{ line }}</template>
      </p>
      <p class="id__loc">{{ cv.location }}</p>
    </div>

    <ul class="contacts">
      <li v-for="c in cv.contacts" :key="c.href">
        <a
          :href="c.href"
          :class="{ 'cv-ext': c.external }"
          :target="c.external ? '_blank' : undefined"
          :rel="c.external ? 'noopener' : undefined"
        >{{ c.label }}</a>
      </li>
    </ul>

    <button
      type="button"
      class="rail__toggle"
      :aria-expanded="navOpen"
      aria-controls="railnav"
      @click="navOpen = !navOpen"
    >
      Index <span aria-hidden="true">↓</span>
    </button>
    <nav id="railnav" class="railnav" :class="{ open: navOpen }" aria-label="Sections">
      <a
        v-for="s in CV_SECTIONS"
        :key="s.id"
        :href="`#${s.id}`"
        :class="{ active: active === s.id }"
        :aria-current="active === s.id ? 'location' : undefined"
        @click.exact.prevent="goTo(s.id)"
      ><span class="railnav__num">{{ s.num }}</span> {{ s.label }}</a>
    </nav>
  </div>
</template>

<style scoped>
.rail__sticky {
  position: sticky;
  top: 36px;
  padding: 56px 0 40px;
}

/* A rail taller than the window scrolls on its own, or its last links are never reachable. */
@media (min-width: 861px) and (max-height: 840px) {
  .rail__sticky {
    max-height: calc(100vh - 36px);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
    margin-left: -16px;
    padding-left: 16px;
  }
}

/* Identity */
.id__photo { margin: 0 0 22px; }

/* The photo sits like the CV's cards: hairline and a hard offset shadow. */
.id__img {
  width: 128px;
  height: 128px;
  object-fit: cover;
  display: block;
  border: 1px solid var(--pn-border-brand);
  border-radius: 2px;
  box-shadow: 4px 4px 0 0 var(--pn-shadow-offset-rest);
}

.id__img.mono-img--fallback {
  display: grid;
  place-items: center;
  font-family: var(--pn-font);
  font-weight: 400;
  font-size: 2rem;
  letter-spacing: .02em;
}

.id__name {
  margin: 0 0 8px;
  font-family: var(--pn-font-display);
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.cursor {
  color: var(--pn-accent-ui);
  font-weight: 400;
  animation: blink 1.1s steps(1) infinite;
}

@keyframes blink { 50% { opacity: 0; } }

.id__role {
  margin: 0 0 6px;
  font-family: var(--pn-font);
  font-size: .72rem;
  line-height: 1.55;
  color: var(--pn-text-muted);
}

.id__loc {
  margin: 0;
  font-family: var(--pn-font);
  font-size: .68rem;
  color: var(--pn-text-faint);
  letter-spacing: .02em;
}

.contacts {
  list-style: none;
  margin: 20px 0;
  padding: 16px 0;
  border-top: 1px solid var(--pn-border);
  border-bottom: 1px solid var(--pn-border);
  font-family: var(--pn-font);
  font-size: .74rem;
}

.contacts li { margin: 0 0 7px; }
.contacts li:last-child { margin-bottom: 0; }
.contacts a { color: var(--pn-text-muted); }
.contacts a:hover { color: var(--pn-link); }

/* Index */
.rail__toggle { display: none; }

.railnav {
  display: flex;
  flex-direction: column;
  font-family: var(--pn-font);
  font-size: .82rem;
}

.railnav a {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 5px 0;
  color: var(--pn-text-muted);
  position: relative;
}

.railnav__num {
  font-style: normal;
  color: var(--pn-text-faint);
  font-size: .72rem;
  min-width: 18px;
}

.railnav a:hover { color: var(--pn-text); }
.railnav a:hover .railnav__num { color: var(--pn-accent-ui); }

.railnav a.active {
  color: var(--pn-text);
  font-weight: 500;
}

.railnav a.active .railnav__num { color: var(--pn-accent-ui); }

/* The active dot sits in the gutter left of the number. */
.railnav a.active::before {
  content: "";
  position: absolute;
  left: -14px;
  top: 50%;
  width: 5px;
  height: 5px;
  background-color: var(--pn-accent-ui);
  border-radius: 50%;
  transform: translateY(-50%);
}

@media (prefers-reduced-motion: reduce) {
  .cursor { animation: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .rail__sticky { animation: rise .7s cubic-bezier(.2, .7, .3, 1) both; }
}

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

/* One column: the rail becomes a header block and the index folds behind a toggle. */
@media (max-width: 860px) {
  .rail__sticky {
    position: static;
    padding: 36px 0 0;
  }

  .id__photo {
    float: left;
    margin: 4px 18px 0 0;
  }

  .id__img { width: 88px; height: 88px; }
  .id__name { font-size: 1.6rem; }
  .id__role { font-size: .8rem; }

  .contacts {
    clear: both;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
  }

  .contacts li { margin: 0; }

  .rail__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: 0;
    border-top: 1px solid var(--pn-border);
    border-bottom: 1px solid var(--pn-border);
    padding: 12px 0;
    margin: 4px 0 0;
    cursor: pointer;
    font-family: var(--pn-font);
    font-size: .8rem;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: var(--pn-text-muted);
  }

  .rail__toggle span { transition: transform .2s ease; }
  .rail__toggle[aria-expanded="true"] span { transform: rotate(180deg); }

  /* Hidden, not just clipped, while closed, so its links leave the tab order. */
  .railnav {
    max-height: 0;
    overflow: hidden;
    visibility: hidden;
    transition: max-height .3s ease, visibility 0s linear .3s;
  }

  .railnav.open {
    max-height: 520px;
    padding: 10px 0;
    visibility: visible;
    transition: max-height .3s ease;
  }

  .railnav a { padding: 7px 0; }
  .railnav a.active::before { display: none; }
}

@media (max-width: 540px) {
  .id__img { width: 76px; height: 76px; }
  .id__name { font-size: 1.45rem; }
  .id__photo { margin: 2px 14px 0 0; }
}

@media print {
  .rail__sticky { position: static; padding: 0 0 16px; }
  .rail__toggle { display: none !important; }
}
</style>
