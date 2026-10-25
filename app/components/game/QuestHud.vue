<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { ROLES, ROLE_INFO } from '~/game/agents'
import type { Role } from '~/game/types'
import { useActiveSection } from '~/composables/useActiveSection'

const props = defineProps<{ team: Role[], visible: boolean, done: boolean, boss?: boolean, announce: string }>()
const emit = defineEmits<{ (e: 'card'): void }>()

const active = useActiveSection()
const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const chipEl = ref<HTMLButtonElement | null>(null)
const panelId = useId()

const has = (r: Role) => props.team.includes(r)
const count = computed(() => props.team.length)

// A full team has nothing left to find, so the chip opens the team card instead of the list.
const onChip = () => {
  if (props.done) { open.value = false; emit('card'); return }
  open.value = !open.value
}

// The game listens on window, the same event the team card sends; during a fight the same button ends it.
const fight = () => {
  open.value = false
  window.dispatchEvent(new CustomEvent(props.boss ? 'game:end-fight' : 'game:fight-agi'))
}

// Restart asks once more inside the panel, so a stray tap cannot wipe the progress.
const confirming = ref(false)
const restart = () => {
  confirming.value = false
  close(true)
  window.dispatchEvent(new CustomEvent('game:restart'))
}

const close = (refocus: boolean) => {
  open.value = false
  confirming.value = false
  if (refocus) chipEl.value?.focus()
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) { e.stopPropagation(); close(true) }
}

const onOutside = (e: PointerEvent) => {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) close(false)
}

watch(open, (v) => {
  if (v) document.addEventListener('pointerdown', onOutside, true)
  else document.removeEventListener('pointerdown', onOutside, true)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))

// Same as the rail index: scroll without the router, keep the hash, hand focus to the section.
const goTo = (id: string) => {
  close(false)
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(history.state, '', `#${id}`)
  el.focus({ preventScroll: true })
  active.value = id
}
</script>

<template>
  <div ref="rootEl" class="qhud" data-game-ui @keydown="onKey">
    <p class="qhud__live" role="status">{{ announce }}</p>

    <template v-if="visible">
      <button
        ref="chipEl"
        type="button"
        class="qhud__chip"
        :aria-expanded="done ? undefined : open"
        :aria-controls="done ? undefined : panelId"
        :aria-haspopup="done ? 'dialog' : undefined"
        @click="onChip"
      >
        <span class="qhud__name">TEAM {{ count }}/{{ ROLES.length }}</span>
        <span class="qhud__slots" aria-hidden="true">
          <span v-for="r in ROLES" :key="r" class="qhud__slot qhud__slot--sm" :class="{ 'is-on': has(r) }" :style="{ '--slot': ROLE_INFO[r].c }" />
        </span>
        <span class="qhud__vh">{{ done ? ', team assembled. Open the team card' : ', show where the sub-agents hide' }}</span>
      </button>
      <!-- Stays mounted through the fight, so keyboard focus is not dropped when it changes role. -->
      <button v-if="done" type="button" class="qhud__fight" @click="fight">{{ boss ? 'End fight' : 'Fight AGI' }}</button>

      <!-- After the chip, so Tab from the expanded chip goes straight into the links; CSS keeps it above. -->
      <div v-show="open && !done" :id="panelId" class="qhud__panel">
        <p class="qhud__title">Find the six sub-agents</p>
        <ul class="qhud__list">
          <li v-for="r in ROLES" :key="r" class="qhud__row">
            <span class="qhud__slot" :class="{ 'is-on': has(r) }" :style="{ '--slot': ROLE_INFO[r].c }" aria-hidden="true" />
            <span class="qhud__role">{{ ROLE_INFO[r].label }}</span>
            <span v-if="has(r)" class="qhud__state">found</span>
            <a
              v-else-if="ROLE_INFO[r].section"
              :href="`#${ROLE_INFO[r].section}`"
              class="qhud__where"
              @click.prevent="goTo(ROLE_INFO[r].section!)"
            >open a row in {{ ROLE_INFO[r].where }}</a>
            <span v-else class="qhud__state">shows up when the robot pops</span>
          </li>
        </ul>
        <div class="qhud__reset">
          <button v-if="!confirming" type="button" class="qhud__reset-btn" @click="confirming = true">Restart game</button>
          <template v-else>
            <p class="qhud__reset-q">Start over? This clears your team and records on this device.</p>
            <button type="button" class="qhud__reset-btn qhud__reset-btn--go" @click="restart">Restart</button>
            <button type="button" class="qhud__reset-btn" @click="confirming = false">Cancel</button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qhud {
  position: fixed;
  z-index: 61;
  left: max(16px, env(safe-area-inset-left, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  font-family: var(--pn-font);
  color: var(--pn-text);
}

.qhud__live,
.qhud__vh {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* 36px tall to look like a chip; the ::before pad makes the touch target 44px. */
.qhud__chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 10px;
  background-color: var(--pn-surface);
  color: var(--pn-text);
  border: 1px solid var(--pn-border-brand);
  border-radius: 0;
  box-shadow: 4px 4px 0 0 var(--pn-shadow-offset-rest);
  font: 500 .68rem/1 var(--pn-font);
  letter-spacing: .08em;
  cursor: pointer;
  transition: box-shadow var(--pn-motion-fast) var(--pn-ease-out), border-color var(--pn-motion-fast) var(--pn-ease-out);
}

.qhud__chip::before {
  content: "";
  position: absolute;
  inset: -4px;
}

.qhud__chip:hover {
  border-color: var(--pn-link);
  box-shadow: 5px 5px 0 0 var(--pn-shadow-offset-hover);
}

.qhud__fight:focus-visible,
.qhud__chip:focus-visible,
.qhud__where:focus-visible {
  outline: var(--pn-focus-width) solid var(--pn-focus-ring);
  outline-offset: var(--pn-focus-offset);
}

.qhud__chip[aria-expanded="true"] { border-color: var(--pn-text); }

/* Same chip shape in the accent; the ::before pad makes the touch target 44px. */
.qhud__fight {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin-left: 8px;
  padding: 0 10px;
  background-color: var(--pn-surface);
  color: var(--pn-text);
  border: 1px solid var(--pn-accent-display);
  border-radius: 0;
  box-shadow: 4px 4px 0 0 var(--pn-shadow-offset-rest);
  font: 600 .68rem/1 var(--pn-font);
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: box-shadow var(--pn-motion-fast) var(--pn-ease-out);
}

.qhud__fight::before {
  content: "";
  position: absolute;
  inset: -4px;
}

.qhud__fight:hover { box-shadow: 5px 5px 0 0 var(--pn-shadow-offset-hover); }

.qhud__slots {
  display: inline-flex;
  gap: 2px;
}

.qhud__slot {
  display: inline-block;
  flex: none;
  width: 10px;
  height: 10px;
  border: 1px solid var(--pn-border-brand);
  background-color: transparent;
}

.qhud__slot--sm {
  width: 6px;
  height: 12px;
}

.qhud__slot.is-on {
  border-color: var(--pn-text);
  background-color: var(--slot);
}

.qhud__panel {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  width: min(280px, calc(100vw - 32px));
  /* a landscape phone is shorter than the panel, so it scrolls instead of running off the top */
  max-height: calc(100dvh - 90px - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 14px;
  background-color: var(--pn-surface);
  border: 1px solid var(--pn-border-brand);
  box-shadow: 4px 4px 0 0 var(--pn-shadow-offset-rest);
}

.qhud__title {
  margin: 0 0 8px;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--pn-text-muted);
}

.qhud__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.qhud__row {
  display: grid;
  grid-template-columns: 10px 84px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 30px;
  font-size: .76rem;
  line-height: 1.3;
  border-top: 1px solid var(--pn-border);
}

.qhud__row:first-child { border-top: 0; }

.qhud__role { font-weight: 600; }

.qhud__state { color: var(--pn-text-muted); }

/* 44px tall, so the link is a full touch target. */
.qhud__where {
  display: flex;
  align-items: center;
  min-height: 44px;
  color: var(--pn-link);
  text-decoration: underline;
  text-decoration-color: var(--pn-border-brand);
  text-underline-offset: 3px;
}

.qhud__where:hover { color: var(--pn-link-hover); text-decoration-color: currentColor; }

/* Restart sits under the list, quiet until asked to confirm. */
.qhud__reset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--pn-border);
}

.qhud__reset-q {
  flex-basis: 100%;
  margin: 0;
  font-size: .72rem;
  line-height: 1.4;
  color: var(--pn-text-secondary);
}

.qhud__reset-btn {
  min-height: 32px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: .72rem;
  color: var(--pn-text-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.qhud__reset-btn:hover { color: var(--pn-link); }
.qhud__reset-btn--go { color: var(--pn-primary-600); font-weight: 600; }

@media (max-width: 540px) {
  .qhud {
    left: max(12px, env(safe-area-inset-left, 0px));
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
