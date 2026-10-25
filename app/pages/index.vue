<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, provide, reactive } from 'vue'
import type { YearMonth } from '~/types/cv'
import { cv } from '~/data/cv'
import { CV_SECTIONS, type CvSectionId } from '~/components/layout/nav'
import { useActiveSection } from '~/composables/useActiveSection'
import { useCvSeo } from '~/composables/useCvSeo'
import { useRowHint } from '~/composables/useRowHint'
import { toYearMonth } from '~/utils/cv-dates'
import { CV_REVEAL_KEY } from '~/components/cv/reveal'
import CvRail from '~/components/cv/CvRail.vue'
import CvLead from '~/components/cv/CvLead.vue'
import CvStats from '~/components/cv/CvStats.vue'
import CvSection from '~/components/cv/CvSection.vue'
import CvExperience from '~/components/cv/CvExperience.vue'
import CvPublications from '~/components/cv/CvPublications.vue'
import CvEducation from '~/components/cv/CvEducation.vue'
import CvCertifications from '~/components/cv/CvCertifications.vue'
import CvSkills from '~/components/cv/CvSkills.vue'
import AppFooter from '~/components/layout/AppFooter.vue'

// A path import skips the .client wrapper, so ClientOnly plus a lazy chunk keep the game off the server.
const AmbientGame = defineAsyncComponent(() => import('~/components/game/AmbientGame.client.vue'))

useCvSeo()

// As on the old page: sections start hidden only once script runs, so a page without JS still shows them.
useHead({ script: [{ key: 'cv-js', innerHTML: 'document.documentElement.classList.add(\'js\')' }] })

const { loadGoogleAnalytics } = useGoogleAnalytics()
onMounted(loadGoogleAnalytics)
useRowHint()

const head = (id: CvSectionId, count?: string) => {
  const s = CV_SECTIONS.find(x => x.id === id)!
  return { id: s.id, num: s.num, title: s.title, count }
}

const scholar = cv.contacts.find(c => c.href.includes('scholar.google'))?.href
const degrees = cv.education.map(e => e.degree.split(',')[0]).join(', ')

// Tenures run to this month: the prerendered build month, then the visitor's once mounted.
const now = useState<YearMonth>('cv-now', () => toYearMonth(new Date()))

const active = useActiveSection()
const seen = reactive(new Set<string>())
provide(CV_REVEAL_KEY, { seen })

let revealObserver: IntersectionObserver | null = null
let spyObserver: IntersectionObserver | null = null

// A printed CV carries every detail: closed rows open for the print and close again after.
let openedForPrint: HTMLDetailsElement[] = []
const openForPrint = () => {
  openedForPrint = [...document.querySelectorAll<HTMLDetailsElement>('.cv details:not([open])')]
  for (const d of openedForPrint) d.open = true
}
const closeAfterPrint = () => {
  for (const d of openedForPrint) d.open = false
  openedForPrint = []
}

// The page ends before the last section can reach the spy band, so the bottom of the page marks it.
const lastId = CV_SECTIONS[CV_SECTIONS.length - 1]!.id
const markLastAtBottom = () => {
  if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active.value = lastId
}

onMounted(() => {
  now.value = toYearMonth(new Date())
  window.addEventListener('beforeprint', openForPrint)
  window.addEventListener('afterprint', closeAfterPrint)
  window.addEventListener('scroll', markLastAtBottom, { passive: true })

  const sections = CV_SECTIONS
    .map(s => document.getElementById(s.id))
    .filter((el): el is HTMLElement => !!el)

  if (!('IntersectionObserver' in window)) {
    for (const el of sections) seen.add(el.id)
    return
  }

  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      seen.add(entry.target.id)
      revealObserver?.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })

  // A band just above the middle of the viewport decides which section is current.
  spyObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) active.value = entry.target.id
    }
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 })

  for (const el of sections) {
    revealObserver.observe(el)
    spyObserver.observe(el)
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeprint', openForPrint)
  window.removeEventListener('afterprint', closeAfterPrint)
  window.removeEventListener('scroll', markLastAtBottom)
  revealObserver?.disconnect()
  spyObserver?.disconnect()
  revealObserver = null
  spyObserver = null
})
</script>

<template>
  <div class="cv">
    <div class="page">
      <aside class="rail">
        <CvRail :cv="cv" />
      </aside>

      <div id="content" class="content" tabindex="-1">
        <CvLead :lead="cv.lead" />
        <CvStats :stats="cv.stats" />

        <CvSection v-bind="head('about')">
          <p class="prose">{{ cv.about }}</p>
        </CvSection>

        <CvSection v-bind="head('experience', `${cv.experience.length} organisations`)">
          <CvExperience :orgs="cv.experience" :now="now" />
        </CvSection>

        <CvSection v-bind="head('publications', `${cv.publications.length} papers`)">
          <CvPublications :publications="cv.publications" :self="cv.name" :scholar="scholar" />
        </CvSection>

        <CvSection v-bind="head('education', degrees)">
          <CvEducation :education="cv.education" />
        </CvSection>

        <CvSection v-bind="head('certifications', `${cv.certifications.length} programmes`)">
          <CvCertifications :certifications="cv.certifications" />
        </CvSection>

        <CvSection v-bind="head('skills', `${cv.skills.length} areas`)">
          <CvSkills :skills="cv.skills" />
        </CvSection>

        <AppFooter />
      </div>
    </div>

    <ClientOnly>
      <AmbientGame />
    </ClientOnly>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 1;
  max-width: var(--pn-container);
  margin: 0 auto;
  padding: 0 var(--pn-gutter);
  display: grid;
  grid-template-columns: var(--pn-rail) minmax(0, 1fr);
  gap: var(--pn-rail-gap);
  /* Stretch, so the rail cell runs the full row height and its sticky child can travel. */
  align-items: stretch;
}

.content {
  padding: 56px 0 0;
  max-width: var(--pn-container-prose);
}

.prose {
  margin: 0;
  font-size: .98rem;
  line-height: 1.68;
  color: var(--pn-text-secondary);
}

@media (max-width: 860px) {
  .page { grid-template-columns: 1fr; }

  .content {
    padding: 30px 0 0;
    max-width: none;
  }
}

@media (max-width: 540px) {
  .content { padding: 24px 0 0; }
}

@media print {
  .page {
    display: block;
    max-width: 100%;
    padding: 0;
  }

  .content {
    max-width: 100%;
    padding: 0;
  }
}
</style>
