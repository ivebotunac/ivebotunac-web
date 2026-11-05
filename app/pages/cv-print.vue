<script setup lang="ts">
import { cv } from '~/data/cv'
import type { YearMonth } from '~/types/cv'
import { formatDuration, formatRange, orgSpan, toYearMonth } from '~/utils/cv-dates'

// The A4 layout scripts/cv-pdf.mjs prints to public/ive-botunac-cv.pdf; same data, never indexed.
definePageMeta({ layout: false })
useSeoMeta({ title: 'Ive Botunac, CV', robots: 'noindex, nofollow' })
useHead({ bodyAttrs: { style: 'background:#fff' } })

const now = useState<YearMonth>('cv-print-now', () => toYearMonth(new Date()))

const SITE = 'ivebotunac.com'
const EMAIL = 'info@techprimo.ai'
// Profiles read as their address; Scholar's is an opaque id, so it keeps its name.
const links = cv.contacts.map(c => ({
  href: c.href,
  text: /scholar\.google/.test(c.href) ? c.label : c.href.replace(/^https?:\/\/(www\.)?/, '')
}))

const years = (start: YearMonth, end: YearMonth | 'present') =>
  `${start.slice(0, 4)} – ${end === 'present' ? 'now' : end.slice(0, 4)}`
const tenure = (roles: typeof cv.experience[number]['roles']) => {
  const s = orgSpan(roles)
  return { range: years(s.start, s.end), length: formatDuration(s.start, s.end, now.value) }
}
</script>

<template>
  <div class="sheet">
    <header class="head">
      <div class="head__id">
        <h1 class="head__name">{{ cv.name }}<span class="cursor">_</span></h1>
        <p class="head__role">AI Research Engineer · Assistant Professor · PhD in AI</p>
        <p class="head__links">
          <a :href="`https://${SITE}`">{{ SITE }}</a>
          <a :href="`mailto:${EMAIL}`">{{ EMAIL }}</a>
          <a v-for="l in links" :key="l.href" :href="l.href">{{ l.text }}</a>
        </p>
        <p class="head__loc">{{ cv.location }}</p>
      </div>
      <img v-if="cv.photo" class="head__photo" :src="cv.photo" alt="Ive Botunac" width="104" height="104">
    </header>

    <p class="lead">
      <template v-for="(part, i) in cv.lead" :key="i"><em v-if="typeof part === 'object'">{{ part.em }}</em><template v-else>{{ part }}</template></template>
    </p>

    <ul class="stats">
      <li v-for="s in cv.stats" :key="s.label"><b>{{ s.value }}</b><span>{{ s.label }}</span></li>
    </ul>

    <div class="cols">
      <main class="main">
        <section class="sec">
          <h2 class="shead"><span>01</span>About</h2>
          <p class="prose">{{ cv.about }}</p>
        </section>

        <section class="sec">
          <h2 class="shead"><span>02</span>Experience</h2>
          <article v-for="org in cv.experience" :key="org.org" class="org">
            <div class="org__head">
              <img v-if="org.logo" class="org__logo" :src="org.logo" alt="" width="30" height="30">
              <div class="org__name">
                <a v-if="org.url" :href="org.url">{{ org.org }}</a><template v-else>{{ org.org }}</template>
                <span class="meta">{{ [org.kind, org.location].filter(Boolean).join(' · ') }}</span>
              </div>
              <span class="org__years">{{ tenure(org.roles).range }}<span class="meta">{{ tenure(org.roles).length }}</span></span>
            </div>
            <div v-for="r in org.roles" :key="r.title + r.start" class="role">
              <p class="role__line"><strong>{{ r.title }}</strong><span class="meta">{{ formatRange(r.start, r.end) }}</span></p>
              <p v-if="r.desc" class="role__desc">{{ r.desc }}</p>
            </div>
          </article>
        </section>

        <section class="sec">
          <h2 class="shead"><span>03</span>Education</h2>
          <div v-for="e in cv.education" :key="e.degree" class="edu">
            <p class="edu__deg"><strong>{{ e.degree }}</strong></p>
            <p class="meta">{{ e.institution }} · {{ e.start }} – {{ e.end }}</p>
            <p v-if="e.thesis" class="edu__thesis">{{ e.thesis }}</p>
          </div>
        </section>

        <section class="sec">
          <h2 class="shead"><span>04</span>Publications</h2>
      <article v-for="p in cv.publications" :key="p.title" class="pub">
        <span class="yr">{{ p.year }}</span>
        <div>
          <p class="pub__title">{{ p.title }}</p>
          <p class="pub__meta">
            <template v-for="(a, i) in p.authors" :key="a"><template v-if="i">, </template><strong v-if="a === cv.name">{{ a }}</strong><template v-else>{{ a }}</template></template><template v-if="p.venue"> · <em>{{ p.venue }}</em></template><template v-if="p.doi"> · <a :href="`https://doi.org/${p.doi}`">doi.org/{{ p.doi }}</a></template>
          </p>
        </div>
      </article>
        </section>
      </main>

      <aside class="side">
        <section class="sec">
          <h2 class="shead"><span>05</span>Skills</h2>
          <div v-for="s in cv.skills" :key="s.label" class="skill">
            <p class="skill__label">{{ s.label }}</p>
            <p class="skill__tools"><strong>{{ s.core.join(' · ') }}</strong><template v-if="s.also?.length"> · {{ s.also.join(' · ') }}</template></p>
          </div>
        </section>

        <section class="sec">
          <h2 class="shead"><span>06</span>Certifications</h2>
          <div v-for="c in cv.certifications" :key="c.title" class="cert">
            <span class="yr">{{ c.year }}</span>
            <p><a v-if="c.url" :href="c.url">{{ c.title }}</a><template v-else>{{ c.title }}</template><span class="meta">{{ c.issuer }} · {{ c.courses ? `${c.courses} courses` : c.kind }}</span></p>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
@page { size: A4; margin: 12mm 13mm 13mm; }

.sheet {
  --ink: #0c2236;
  --ink-2: #213b54;
  --muted: #506a83;
  --faint: #6f879e;
  --rule: #dde8f3;
  --accent: #e8460d;
  --link: #0b6bcb;
  max-width: 184mm;
  margin: 0 auto;
  padding: 10mm 0;
  color: var(--ink);
  background: #fff;
  font-family: var(--pn-font);
  font-size: 8pt;
  line-height: 1.4;
}

@media print {
  .sheet { padding: 0; }
}

.sheet a { color: inherit; text-decoration: none; }
.sheet p { margin: 0; }

/* Header: name and links left, the photo right. */
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8mm;
  padding-bottom: 4mm;
  border-bottom: 1px solid var(--rule);
}

.head__name {
  margin: 0 0 1.2mm;
  font-family: var(--pn-font-display);
  font-size: 23pt;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.cursor { color: var(--accent); font-weight: 400; }

.head__role { font-size: 9pt; color: var(--ink-2); }

.head__links {
  margin-top: 2.6mm;
  display: flex;
  flex-wrap: wrap;
  gap: .8mm 4mm;
  font-size: 7.6pt;
  color: var(--link);
}

.head__loc { margin-top: 1.4mm; font-size: 7.2pt; color: var(--faint); }

.head__photo {
  width: 28mm;
  height: 28mm;
  object-fit: cover;
  border: 1px solid #c6d7e7;
  box-shadow: 1.2mm 1.2mm 0 0 #d3deee;
  flex: none;
}

.lead {
  margin: 4mm 0 3.2mm;
  font-family: var(--pn-font-display);
  font-size: 9.6pt;
  line-height: 1.5;
  color: var(--ink-2);
}

.lead em { font-style: normal; color: var(--accent); }

.stats {
  list-style: none;
  margin: 0 0 1mm;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid #c6d7e7;
}

.stats li { padding: 2mm 3mm; border-left: 1px solid var(--rule); }
.stats li:first-child { border-left: 0; }
.stats b { display: block; font-family: var(--pn-font-display); font-size: 13pt; line-height: 1.1; }
.stats span { font-size: 6.9pt; color: var(--muted); }

/* Body: a main column and a sidebar, each flowing across pages on its own. */
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 55mm;
  gap: 7mm;
}

.sec { margin-top: 4.2mm; }

.shead {
  display: flex;
  align-items: center;
  gap: 2.4mm;
  margin: 0 0 2.2mm;
  font-family: var(--pn-font);
  font-size: 7.2pt;
  font-weight: 500;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--muted);
  break-after: avoid;
}

.shead span { color: var(--accent); }
.shead::after { content: ""; flex: 1; height: 1px; background: var(--rule); }

.meta { color: var(--faint); font-size: 7.2pt; }
.prose { color: var(--ink-2); }

.org { padding: 0 0 2mm; break-inside: avoid; }
.org + .org { padding-top: 2mm; border-top: 1px solid var(--rule); }

.org__head {
  display: grid;
  grid-template-columns: 8mm minmax(0, 1fr) auto;
  gap: 2.6mm;
  align-items: center;
  margin-bottom: 1.4mm;
}

.org__logo { width: 8mm; height: 8mm; object-fit: cover; border: 1px solid #c6d7e7; border-radius: 1.2mm; }
.org__name { font-weight: 700; font-size: 9pt; line-height: 1.25; }
.org__name .meta, .org__years .meta { display: block; font-weight: 400; }
.org__years { text-align: right; font-size: 7.6pt; color: var(--ink-2); white-space: nowrap; }

.role {
  position: relative;
  margin-left: 10.6mm;
  padding-left: 3.4mm;
  border-left: 1px solid #c6d7e7;
}

.role + .role { padding-top: 1.4mm; }

.role::before {
  content: "";
  position: absolute;
  left: -1.15mm;
  top: 1.3mm;
  width: 1.5mm;
  height: 1.5mm;
  border: 1px solid var(--accent);
  border-radius: 50%;
  background: #fff;
}

.role + .role::before { top: 2.7mm; }

.role__line { display: flex; justify-content: space-between; gap: 3mm; }
.role__line strong { font-size: 8.4pt; }
.role__line .meta { white-space: nowrap; }
.role__desc { color: var(--ink-2); }

.pub, .cert {
  display: grid;
  grid-template-columns: 9mm minmax(0, 1fr);
  gap: 2mm;
  padding: 1.2mm 0;
  border-top: 1px solid var(--rule);
  break-inside: avoid;
}

.pub:first-of-type, .cert:first-of-type { border-top: 0; padding-top: 0; }

.yr { font-family: var(--pn-font-display); font-size: 7.6pt; color: var(--accent); }
.pub__title { font-weight: 600; line-height: 1.35; }
.pub__meta { color: var(--muted); font-size: 7.4pt; }
.pub__meta strong { color: var(--ink); }
.pub__meta a { color: var(--link); }

.skill { padding: 1.4mm 0; border-top: 1px solid var(--rule); break-inside: avoid; }
.skill:first-of-type { border-top: 0; padding-top: 0; }
.skill__label { font-size: 7pt; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.skill__tools { font-size: 7.6pt; color: var(--muted); }
.skill__tools strong { color: var(--ink); font-weight: 500; }

.edu { padding: 1.4mm 0; border-top: 1px solid var(--rule); break-inside: avoid; }
.edu:first-of-type { border-top: 0; padding-top: 0; }
.edu__thesis { font-size: 7.2pt; font-style: italic; color: var(--muted); }

.cert p { font-size: 7.6pt; line-height: 1.35; }
.cert .meta { display: block; font-size: 6.8pt; }
</style>
