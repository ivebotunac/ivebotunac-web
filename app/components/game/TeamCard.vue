<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { mdiClose, mdiLinkedin } from '@mdi/js'
import { ROLES, drawAgent } from '~/game/agents'
import type { GameStats } from '~/game/stats-client'
import { GAME_EVENTS } from '~/game/types'
import { formatClock as fmt } from '~/utils/duration'
import { track } from '~/utils/track'
import { cv } from '~/data/cv'
import PnIcon from '~/components/ui/PnIcon.vue'
import LeaderBoard from './LeaderBoard.vue'
import FormsGrid from './FormsGrid.vue'

// mode: team card after the quest, boss card after a win; bossRun and bossMs: the fight just won.
const props = defineProps<{
  open: boolean, mode: 'team' | 'boss', ms: number | null, bossMs: number | null
  bossRun: string | null, stats: GameStats | null, statsOff: boolean, seen: string[]
}>()
const emit = defineEmits<{ (e: 'close'): void, (e: 'stats', s: GameStats): void }>()

const LINKEDIN = cv.contacts.find(c => c.label === 'LinkedIn')?.href
const X = cv.contacts.find(c => c.label === 'X')?.href
// The X logo; @mdi/js only has the old Twitter bird.
const X_LOGO = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
const PDF = '/ive-botunac-cv.pdf'
const FOCUSABLE = 'a[href], button:not([disabled]), input'

const dialogEl = ref<HTMLDialogElement | null>(null)
const teamEl = ref<HTMLCanvasElement | null>(null)
const titleId = useId()
let opener: HTMLElement | null = null

const time = computed(() => (props.ms === null ? '' : fmt(props.ms)))
// The board's own fight can be an older, faster one, so the title keeps to the fight just won.
const bossTime = computed(() => (props.bossMs === null ? '' : fmt(props.bossMs)))

const globalLine = computed(() => {
  const s = props.stats
  if (!s) return ''
  if (s.rank) return `You're #${s.rank} to do it` + (s.fasterThanPct !== null ? `, faster than ${Math.round(s.fasterThanPct)}% of them.` : '.')
  if (s.teams > 0) return `${s.teams} ${s.teams === 1 ? 'visitor has' : 'visitors have'} assembled the team so far.`
  return ''
})

// The whole team in a row, drawn once with the game's own sprites.
function paintTeam() {
  const c = teamEl.value?.getContext('2d')
  if (!c) return
  c.clearRect(0, 0, 264, 44)
  ROLES.forEach((r, i) => drawAgent(c, r, 22 + i * 44, 22, 2, 1, 0, i))
}

function show() {
  const d = dialogEl.value
  if (!d || d.open) return
  opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
  d.showModal()
  paintTeam()
  // the title, not a control: a focused initials field would pop a phone's keyboard over the card
  nextTick(() => d.querySelector<HTMLElement>('.tcard__title')?.focus({ preventScroll: true }))
}

function shut() {
  const d = dialogEl.value
  if (d?.open) d.close()
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
  opener = null
}

watch(() => props.open, (v) => { confirming.value = false; if (v) show(); else shut() }, { flush: 'post' })

onBeforeUnmount(() => { if (dialogEl.value?.open) dialogEl.value.close() })

const cta = (name: 'linkedin' | 'x' | 'cv_pdf' | 'close' | 'fight_agi') => track('cta_click', { cta: name })

function dismiss() {
  cta('close')
  emit('close')
}

// The boss is wired elsewhere; it listens for this event once the card is out of the way.
function fight() {
  cta('fight_agi')
  emit('close')
  nextTick(() => window.dispatchEvent(new CustomEvent(GAME_EVENTS.fight)))
}

// Restart asks once more, then clears this device's game and closes the card.
const confirming = ref(false)
function restart() {
  confirming.value = false
  emit('close')
  nextTick(() => window.dispatchEvent(new CustomEvent(GAME_EVENTS.restart)))
}

// Esc: cancelled so the parent's state stays the one source of truth.
function onCancel(e: Event) {
  e.preventDefault()
  dismiss()
}

// A click on the dialog element itself is a click on the backdrop.
function onClick(e: MouseEvent) {
  if (e.target === dialogEl.value) dismiss()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const items = [...(dialogEl.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
  if (!items.length) return
  const first = items[0]!, last = items[items.length - 1]!
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="tcard"
    :aria-labelledby="titleId"
    data-game-ui
    @cancel="onCancel"
    @close="open && emit('close')"
    @click="onClick"
    @keydown="onKeydown"
  >
    <div class="tcard__frame">
      <canvas ref="teamEl" class="tcard__team" width="264" height="44" aria-hidden="true" />
      <template v-if="mode === 'boss'">
        <p class="tcard__kicker">AGI defeated</p>
        <h2 :id="titleId" class="tcard__title" tabindex="-1" autofocus>AGI down<template v-if="bossTime"> in {{ bossTime }}</template></h2>
        <p class="tcard__body">Your team fixed the CV. Sign the kill, or fight again to beat it.</p>
      </template>
      <template v-else>
        <p class="tcard__kicker">6/6 sub-agents recruited</p>
        <h2 :id="titleId" class="tcard__title" tabindex="-1" autofocus>Team assembled<template v-if="time"> in {{ time }}</template></h2>
        <p v-if="globalLine" class="tcard__line">{{ globalLine }}</p>
        <p v-else-if="!stats && !statsOff" class="tcard__line" aria-hidden="true">
          <span class="cv-skel tcard__skel" /><span class="cv-skel tcard__skel tcard__skel--short" />
        </p>
        <p class="tcard__body">Five of them were hiding in the CV, so you have read more of it than most. Thanks for that.</p>
      </template>

      <p v-if="!stats && statsOff" class="tcard__offline">The leaderboard is offline right now. Your times are kept on this device.</p>
      <LeaderBoard
        v-if="stats || !statsOff"
        :board="stats?.board ?? []"
        :mine="stats?.mine ?? null"
        :run="bossRun"
        :loading="!stats"
        @stats="s => emit('stats', s)"
      />
      <FormsGrid class="tcard__forms" :seen="seen" />
      <div class="tcard__actions">
        <div class="tcard__social">
          <a class="tcard__btn tcard__btn--linkedin" :href="LINKEDIN" target="_blank" rel="noopener" @click="cta('linkedin')">
            <PnIcon :path="mdiLinkedin" :size="22" /><span class="tcard__net"><small>Follow me on</small>LinkedIn</span>
          </a>
          <a class="tcard__btn tcard__btn--x" :href="X" target="_blank" rel="noopener" @click="cta('x')">
            <PnIcon :path="X_LOGO" :size="18" /><span class="tcard__net"><small>Follow me on</small>X</span>
          </a>
        </div>
        <a class="tcard__btn" :href="PDF" download @click="cta('cv_pdf')">Download the CV (PDF)</a>
        <button type="button" class="tcard__btn tcard__btn--fight" @click="fight">{{ mode === 'boss' ? 'Fight again' : 'Fight AGI' }}</button>
      </div>
      <p class="tcard__reset">
        <button v-if="!confirming" type="button" class="tcard__reset-btn" @click="confirming = true">Restart game</button>
        <template v-else>
          Clear your team and records on this device?
          <button type="button" class="tcard__reset-btn tcard__reset-btn--go" @click="restart">Restart</button>
          <button type="button" class="tcard__reset-btn" @click="confirming = false">Cancel</button>
        </template>
      </p>
      <!-- Last in the DOM so the first Tab lands on LinkedIn, drawn in the top corner. -->
      <button type="button" class="tcard__close" aria-label="Close" @click="dismiss">
        <PnIcon :path="mdiClose" :size="20" />
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.tcard {
  width: min(380px, calc(100% - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  margin: auto;
  border: 1px solid var(--pn-border-brand);
  border-radius: 0;
  background-color: var(--pn-surface);
  color: var(--pn-text);
  box-shadow: 4px 4px 0 0 var(--pn-shadow-offset-rest);
  overflow: auto;
}

.tcard::backdrop {
  background-color: var(--pn-scrim);
}

.tcard__frame {
  position: relative;
  padding: 22px 22px calc(20px + env(safe-area-inset-bottom, 0px));
}

.tcard__team {
  display: block;
  width: 264px;
  max-width: 100%;
  height: auto;
  margin: 0 0 14px;
  image-rendering: pixelated;
}

.tcard__kicker {
  margin: 0 0 6px;
  font-size: var(--pn-size-micro);
  text-transform: uppercase;
  letter-spacing: .14em;
  /* the deeper orange: --pn-accent-text is about 3.1:1 on white at this size */
  color: var(--pn-primary-600);
}

/* focused on open so screen readers start here; it is not a control, so no ring */
.tcard__title:focus { outline: none; }

.tcard__title {
  font-family: var(--pn-font-display);
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--pn-text);
}

.tcard__line {
  margin: 10px 0 0;
  font-size: .84rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--pn-text);
}

/* Two lines, the length "347 visitors have assembled the team so far." wraps to. */
.tcard__skel { width: 100%; }
.tcard__skel--short { width: 45%; }

.tcard__forms {
  margin-top: 14px;
}

.tcard__body {
  margin: 10px 0 0;
  font-size: var(--pn-size-caption);
  line-height: 1.5;
  color: var(--pn-text-muted);
}

.tcard__offline {
  margin: 16px 0 0;
  font-size: .76rem;
  color: var(--pn-text-muted);
}

.tcard__actions {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.tcard__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--pn-border-brand);
  border-radius: 0;
  background-color: var(--pn-surface);
  color: var(--pn-text);
  font: 500 .8rem/1.2 var(--pn-font);
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: border-color var(--pn-motion-fast) var(--pn-ease-out), box-shadow var(--pn-motion-fast) var(--pn-ease-out);
}

.tcard__btn:hover {
  border-color: var(--pn-link);
  box-shadow: 3px 3px 0 0 var(--pn-shadow-offset-hover);
}

/* Side by side, the network name under a small "Follow me on". */
.tcard__social {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tcard__social .tcard__btn {
  justify-content: flex-start;
  gap: 10px;
  min-height: 50px;
  padding: 6px 12px;
  color: #fff;
}

.tcard__net {
  display: grid;
  text-align: left;
  font-size: .84rem;
  font-weight: 700;
  line-height: 1.2;
}

.tcard__net small {
  font-size: .66rem;
  font-weight: 400;
  opacity: .85;
}

/* The networks' own colours. */
.tcard__btn--linkedin { background-color: #0a66c2; border-color: #0a66c2; }
.tcard__btn--x { background-color: #000; border-color: #000; }
.tcard__btn--linkedin:hover { border-color: #0a66c2; }
.tcard__btn--x:hover { border-color: #000; }

/* Ink on the brand orange; white on it would fail contrast. */
.tcard__btn--fight {
  background-color: var(--pn-accent-ui);
  border-color: var(--pn-text);
  color: var(--pn-text);
  font-weight: 600;
}

.tcard__btn--fight:hover { border-color: var(--pn-text); }

.tcard__close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 0;
  background: none;
  color: var(--pn-error-text);
  cursor: pointer;
}

.tcard__close:hover {
  border-color: var(--pn-error);
  background-color: rgba(224, 72, 63, 0.08);
}

.tcard__reset {
  margin: 14px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--pn-border);
  font-size: var(--pn-size-label);
  line-height: 1.5;
  color: var(--pn-text-secondary);
}

.tcard__reset-btn {
  min-height: 32px;
  margin-right: 10px;
  border: 0;
  background: none;
  font: inherit;
  color: var(--pn-text-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.tcard__reset-btn:hover { color: var(--pn-link); }
.tcard__reset-btn--go { margin-left: 8px; color: var(--pn-primary-600); font-weight: 600; }

@media print {
  .tcard { display: none; }
}
</style>
