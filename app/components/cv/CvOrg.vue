<script setup lang="ts">
import { computed } from 'vue'
import type { Org, YearMonth } from '~/types/cv'
import { formatDuration, formatRange, orgSpan } from '~/utils/cv-dates'
import CvMonoImage from './CvMonoImage.vue'

const props = defineProps<{ org: Org, now: YearMonth }>()

// The newest role names the row; the data lists roles newest first.
const top = computed(() => props.org.roles[0]!)

const span = computed(() => orgSpan(props.org.roles))
const tenure = computed(() => formatDuration(span.value.start, span.value.end, props.now))
// "2020 – now" on the closed row, "now" in orange; the details carry months and durations.
const current = computed(() => span.value.end === 'present')
const until = computed(() => (span.value.end === 'present' ? 'now' : span.value.end.slice(0, 4)))

const when = (start: YearMonth, end: YearMonth | 'present') =>
  `${formatRange(start, end)} · ${formatDuration(start, end, props.now)}`
</script>

<template>
  <li class="org">
    <details>
      <summary class="org__row">
        <span class="org__logo">
          <CvMonoImage class="org__img" :src="org.logo" :monogram="org.monogram" :width="48" :height="48" />
        </span>
        <span class="org__head">
          <h3 class="org__title">{{ top.title }}</h3>
          <span class="org__line">{{ org.org }}<template v-if="org.kind"> · {{ org.kind }}</template></span>
        </span>
        <span class="org__years">{{ span.start.slice(0, 4) }} – <span :class="{ org__now: current }">{{ until }}</span></span>
        <span class="cv-tog" title="Details" aria-hidden="true" />
      </summary>

      <div class="org__body">
        <p class="org__meta">
          <a v-if="org.url" :href="org.url" target="_blank" rel="noopener" class="cv-ext">{{ org.org }}</a><template v-else>{{ org.org }}</template><template v-if="org.location"> · {{ org.location }}</template> · {{ tenure }}
        </p>
        <ol class="roles">
          <li v-for="role in org.roles" :key="role.title + role.start" class="role">
            <h4 class="role__title">{{ role.title }}</h4>
            <p class="role__when">{{ when(role.start, role.end) }}</p>
            <p v-if="role.desc" class="role__desc">{{ role.desc }}</p>
          </li>
        </ol>
      </div>
    </details>
  </li>
</template>

<style scoped>
.org { border-bottom: 1px solid var(--pn-border); }

.org__row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto 20px;
  gap: 16px;
  align-items: center;
  padding: 14px 0;
}

.org__logo {
  width: 48px;
  height: 48px;
  border: 1px solid var(--pn-border-brand);
  border-radius: var(--pn-radius);
  background-color: var(--pn-surface);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.org__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.org__img.mono-img--fallback {
  font-size: 1.3rem;
}

.org__head { min-width: 0; display: block; }

.org__title {
  margin: 0 0 2px;
  font-size: var(--pn-size-body);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.005em;
}

.org__row:hover .org__title { color: var(--pn-link); }

.org__line {
  display: block;
  font-size: .8rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--pn-text-muted);
}

.org__years {
  font-size: .74rem;
  color: var(--pn-text-muted);
  white-space: nowrap;
}

/* The orange of the section numbers. */
.org__now { color: var(--pn-accent-text); font-weight: 600; }

.org__body { padding: 0 0 22px 64px; }

.org__meta {
  margin: 0 0 14px;
  font-size: .76rem;
  color: var(--pn-text-muted);
}

/* Role timeline: a hairline spine with an orange ring per role. */
.roles {
  list-style: none;
  padding: 0 0 0 22px;
  position: relative;
}

.roles::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 9px;
  bottom: 11px;
  width: 1px;
  background-color: var(--pn-border-brand);
}

.role {
  position: relative;
  padding: 0 0 16px;
}

.role:last-child { padding-bottom: 0; }

.role::before {
  content: "";
  position: absolute;
  left: -22px;
  top: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--pn-canvas);
  border: 1.5px solid var(--pn-accent-ui);
}

.role__title {
  margin: 0 0 2px;
  font-size: .95rem;
  font-weight: 700;
  line-height: 1.3;
}

.role__when {
  margin: 0 0 6px;
  font-size: var(--pn-size-label);
  color: var(--pn-text-faint);
}

.role__desc {
  font-size: var(--pn-size-body-sm);
  line-height: 1.55;
  color: var(--pn-text-secondary);
}

@media (max-width: 540px) {
  .org__row {
    grid-template-columns: 40px minmax(0, 1fr) 20px;
    gap: 4px 12px;
  }

  .org__logo { width: 40px; height: 40px; grid-row: 1 / span 2; }
  .org__head { grid-column: 2; }
  .org__years { grid-column: 2; grid-row: 2; }
  .org__row > .cv-tog { grid-column: 3; grid-row: 1 / span 2; }
  .org__body { padding-left: 0; }
  .roles { padding-left: 18px; }
}

@media print {
  .org { break-inside: avoid; }
}
</style>
