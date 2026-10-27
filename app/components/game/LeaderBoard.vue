<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { postName } from '~/game/stats-client'
import type { BoardEntry, GameStats, MyRun } from '~/game/stats-client'
import { formatDuration as fmt } from '~/utils/duration'
import { track } from '~/utils/track'

// The AGI top ten on the team card, five a page, with the three-letter signature for the visitor's fight. run: the fight to sign.
// loading: the board has not answered yet, so a full page of grey rows and the pager hold their place.
const props = defineProps<{ board: BoardEntry[], mine: MyRun | null, run: string | null, loading?: boolean }>()
const emit = defineEmits<{ (e: 'stats', s: GameStats): void }>()

const PAGE_SIZE = 5
// BOARD_SIZE on the server, so a full board has these pages
const SKELETON_PAGES = 2

const page = ref(0)
const pages = computed(() => Math.ceil(props.board.length / PAGE_SIZE))
const shown = computed(() => props.board.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))
const pageLabel = (p: number) => `${p * PAGE_SIZE + 1}–${Math.min((p + 1) * PAGE_SIZE, props.board.length)}`
// A new answer opens on the visitor's own page, the first one otherwise.
watch(() => props.board, (b) => {
  const at = b.findIndex(e => e.mine)
  page.value = at < 0 ? 0 : Math.floor(at / PAGE_SIZE)
}, { immediate: true })

const inputId = useId()
const canName = computed(() => !!props.run && !!props.mine && !props.mine.initials)
const label = computed(() => `${(props.mine?.place ?? 0) <= 10 ? 'You made' : 'You are'} #${props.mine?.place}. Sign it with three letters:`)
// A signed run outside the top ten gets its own row under the list, at the time its initials hold.
const below = computed(() => (props.mine?.initials && !props.board.some(e => e.mine) ? props.mine : null))
// Initials that already hold a faster time keep it; this run's slower one is not shown.
const kept = computed(() => {
  const m = props.mine
  return m?.initials && m.best !== null && m.best < m.ms ? `${m.initials} already holds ${fmt(m.best)}, so the board keeps that.` : ''
})

const initials = ref('')
const saving = ref(false)
const error = ref('')
const onInput = (e: Event) => { initials.value = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) }

// postName answers the HTTP status when it fails, 0 when nothing answered; only a 400 is the letters' fault.
const NAME_ERRORS: Record<number, string> = {
  400: 'Those letters cannot be used. Try others.',
  409: 'This fight cannot be signed any more.',
  429: 'Too many tries. Wait a few minutes, then sign again.',
}
const OFFLINE = 'The board is not answering right now. Try again in a minute.'

async function save() {
  if (!props.run || initials.value.length !== 3 || saving.value) return
  saving.value = true
  error.value = ''
  const s = await postName(props.run, initials.value)
  saving.value = false
  if (typeof s === 'number') { error.value = NAME_ERRORS[s] ?? OFFLINE; return }
  track('board_name', { place: s.mine?.place ?? 0 })
  initials.value = ''
  emit('stats', s)
}
</script>

<template>
  <section class="lboard" aria-label="Fastest AGI kills" :aria-busy="loading">
    <p class="lboard__title">Fastest AGI kills</p>
    <form v-if="canName" class="lboard__name" @submit.prevent="save">
      <label class="lboard__name-label" :for="inputId">{{ label }}</label>
      <div class="lboard__name-row">
        <input
          :id="inputId"
          class="lboard__name-in"
          :value="initials"
          maxlength="3"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="AAA"
          @input="onInput"
        >
        <button type="submit" class="lboard__name-go" :disabled="initials.length !== 3 || saving">Save</button>
      </div>
      <p v-if="error" class="lboard__name-err" role="alert">{{ error }}</p>
    </form>
    <template v-if="loading">
      <p class="cv-sr-only">Loading the board.</p>
      <ol class="lboard__rows" aria-hidden="true">
        <li v-for="i in PAGE_SIZE" :key="i" class="lboard__row lboard__row--skel">
          <span class="lboard__pos">{{ i }}</span><span class="cv-skel lboard__skel-ini" /><span class="cv-skel lboard__skel-t" />
        </li>
      </ol>
      <div class="lboard__pager" aria-hidden="true">
        <span v-for="p in SKELETON_PAGES" :key="p" class="cv-skel lboard__skel-page" />
      </div>
    </template>
    <template v-else-if="board.length">
      <ol class="lboard__rows" :start="page * PAGE_SIZE + 1">
        <li v-for="(e, i) in shown" :key="e.initials" class="lboard__row" :class="{ 'is-mine': e.mine }">
          <span class="lboard__pos">{{ page * PAGE_SIZE + i + 1 }}</span><span class="lboard__ini">{{ e.initials }}</span><span class="lboard__t">{{ fmt(e.ms) }}</span>
        </li>
        <li v-if="below" class="lboard__row is-mine lboard__row--below">
          <span class="lboard__pos">{{ below.place }}</span><span class="lboard__ini">{{ below.initials }}</span><span class="lboard__t">{{ fmt(below.best ?? below.ms) }}</span>
        </li>
      </ol>
      <nav v-if="pages > 1" class="lboard__pager" aria-label="Board pages">
        <button
          v-for="p in pages"
          :key="p"
          type="button"
          class="lboard__page"
          :aria-current="page === p - 1 ? 'page' : undefined"
          @click="page = p - 1"
        >
          {{ pageLabel(p - 1) }}
        </button>
      </nav>
    </template>
    <p v-else-if="!canName" class="lboard__note">No one has signed this board yet.</p>
    <p v-if="kept" class="lboard__note lboard__note--gap">{{ kept }}</p>
  </section>
</template>

<style scoped>
/* The leaderboard: arcade initials in mono, the visitor's own row in the accent. */
.lboard {
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px solid var(--pn-border-brand);
  background-color: var(--pn-canvas);
}

.lboard__title {
  margin: 0 0 6px;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--pn-text-muted);
}

.lboard__note {
  margin: 0;
  font-size: .76rem;
  color: var(--pn-text-muted);
}

/* One set of columns for every row, so a place like #12345 widens the first one and the initials stay in line. */
.lboard__rows {
  display: grid;
  grid-template-columns: minmax(2.2em, max-content) 1fr auto;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: .78rem;
}

.lboard__row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
  align-items: center;
  min-height: 22px;
  font-family: var(--pn-font-mono);
  font-size: .78rem;
  font-variant-numeric: tabular-nums;
}

.lboard__row + .lboard__row { border-top: 1px dashed var(--pn-border); }
.lboard__row--below { border-top-style: solid !important; margin-top: 2px; }
.lboard__pos { padding-right: .6em; color: var(--pn-text-muted); }
.lboard__t { justify-self: end; }
.lboard__skel-ini { width: 2.2em; }
.lboard__skel-t { width: 2.6em; justify-self: end; }

/* One button per five places; the open page reads as pressed. */
.lboard__pager {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.lboard__page {
  min-width: 3.6em;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid var(--pn-border-brand);
  border-radius: 0;
  background-color: var(--pn-surface);
  color: var(--pn-text-muted);
  font: 600 .72rem/1 var(--pn-font-mono);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.lboard__page:hover { border-color: var(--pn-link); }
.lboard__page[aria-current="page"] { border-color: var(--pn-text); background-color: var(--pn-text); color: var(--pn-text-on-ink); }

.lboard__page:focus-visible {
  outline: var(--pn-focus-width) solid var(--pn-focus-ring);
  outline-offset: var(--pn-focus-offset);
}

.lboard__skel-page { width: 3.6em; height: 28px; }
.lboard__ini { font-weight: 700; letter-spacing: .12em; }
.lboard__row.is-mine { color: var(--pn-primary-600); }
.lboard__row.is-mine .lboard__pos { color: inherit; }

.lboard__name { margin: 0 0 10px; }

.lboard__name-label {
  display: block;
  margin-bottom: 6px;
  font-size: .78rem;
  font-weight: 600;
  line-height: 1.4;
}

.lboard__name-row {
  display: flex;
  gap: 8px;
}

.lboard__name-in {
  width: 5.2em;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--pn-text);
  border-radius: 0;
  background-color: var(--pn-surface);
  color: var(--pn-text);
  font: 700 1.05rem/1 var(--pn-font-mono);
  letter-spacing: .3em;
  text-transform: uppercase;
}

.lboard__name-go {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--pn-text);
  border-radius: 0;
  background-color: var(--pn-text);
  color: var(--pn-text-on-ink);
  font: 600 .78rem/1 var(--pn-font);
  cursor: pointer;
}

.lboard__name-go:disabled { opacity: .45; cursor: default; }

.lboard__name-in:focus-visible,
.lboard__name-go:focus-visible {
  outline: var(--pn-focus-width) solid var(--pn-focus-ring);
  outline-offset: var(--pn-focus-offset);
}

.lboard__name-err {
  margin: 6px 0 0;
  font-size: .74rem;
  color: var(--pn-error-text);
}

.lboard__note--gap { margin-top: 6px; }
</style>
