<script setup lang="ts">
import { computed } from 'vue'
import type { Org, YearMonth } from '~/types/cv'
import { formatDuration, formatRange, orgSpan } from '~/utils/cv-dates'
import CvMonoImage from './CvMonoImage.vue'

const props = defineProps<{ org: Org, now: YearMonth }>()

const single = computed(() => props.org.roles.length === 1 ? props.org.roles[0] : null)

const tenure = computed(() => {
  const { start, end } = orgSpan(props.org.roles)
  return formatDuration(start, end, props.now)
})

const when = (start: YearMonth, end: YearMonth | 'present') =>
  `${formatRange(start, end)} · ${formatDuration(start, end, props.now)}`

const ext = computed(() => props.org.url
  ? { href: props.org.url, target: '_blank', rel: 'noopener' }
  : null)
</script>

<template>
  <li class="org">
    <!-- The name beside it is the same link, so the logo stays out of the tab order and the tree. -->
    <a v-if="ext" v-bind="ext" class="org__logo orglink" tabindex="-1" aria-hidden="true">
      <CvMonoImage class="org__img" :src="org.logo" :monogram="org.monogram" :width="48" :height="48" />
    </a>
    <span v-else class="org__logo">
      <CvMonoImage class="org__img" :src="org.logo" :monogram="org.monogram" :width="48" :height="48" />
    </span>

    <div v-if="single" class="org__body">
      <h3 class="role__title">{{ single.title }}</h3>
      <p class="org__line">
        <a v-if="ext" v-bind="ext" class="orglink">{{ org.org }}</a><template v-else>{{ org.org }}</template><template v-if="org.kind"> · {{ org.kind }}</template>
      </p>
      <p class="role__when">{{ when(single.start, single.end) }}<template v-if="org.location"> · {{ org.location }}</template></p>
      <p v-if="single.desc" class="role__desc">{{ single.desc }}</p>
    </div>

    <div v-else class="org__body">
      <h3 class="org__name">
        <a v-if="ext" v-bind="ext" class="orglink">{{ org.org }}</a><template v-else>{{ org.org }}</template>
      </h3>
      <p class="org__meta">{{ [org.kind, tenure].filter(Boolean).join(' · ') }}</p>
      <p v-if="org.location" class="org__meta org__loc">{{ org.location }}</p>
      <ol class="roles">
        <li v-for="role in org.roles" :key="role.title + role.start" class="role">
          <h4 class="role__title">{{ role.title }}</h4>
          <p class="role__when">{{ when(role.start, role.end) }}</p>
          <p v-if="role.desc" class="role__desc">{{ role.desc }}</p>
        </li>
      </ol>
    </div>
  </li>
</template>

<style scoped>
.org {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 16px;
  padding: 0 0 26px;
}

.org + .org {
  padding-top: 26px;
  border-top: 1px solid var(--pn-border);
}

.org__logo {
  width: 48px;
  height: 48px;
  border: 1px solid var(--pn-border-brand);
  border-radius: 8px;
  background-color: var(--pn-surface);
  display: grid;
  place-items: center;
  overflow: hidden;
  text-decoration: none;
}

.org__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.org__img.mono-img--fallback {
  font-size: 1.3rem;
}

.org__name {
  margin: 0 0 2px;
  font-size: 1.04rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

/* The old page's .org__name.mono: the company line under a single role's title. */
.org__line {
  margin: 0 0 2px;
  font-family: var(--pn-font);
  font-size: .8rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: .01em;
  color: var(--pn-text-muted);
}

.org__meta {
  margin: 0;
  font-family: var(--pn-font);
  font-size: .74rem;
  color: var(--pn-text-muted);
}

.org__loc { color: var(--pn-text-faint); }

.orglink {
  color: inherit;
  text-decoration: none;
}

.orglink:hover {
  color: var(--pn-link);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Role timeline: a hairline spine with an orange ring per role. */
.roles {
  list-style: none;
  margin: 14px 0 0;
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
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.005em;
}

.role__when {
  margin: 0 0 6px;
  font-family: var(--pn-font);
  font-size: .72rem;
  color: var(--pn-text-faint);
}

.role__desc {
  margin: 0;
  font-size: .9rem;
  line-height: 1.55;
  color: var(--pn-text-secondary);
}

@media (max-width: 540px) {
  .org {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 12px;
    padding-bottom: 22px;
  }

  .org + .org { padding-top: 22px; }
  .org__logo { width: 40px; height: 40px; }
  .roles { padding-left: 18px; }
}

@media (hover: none) {
  .org__logo:hover,
  .orglink:hover { text-decoration: none; }
}
</style>
