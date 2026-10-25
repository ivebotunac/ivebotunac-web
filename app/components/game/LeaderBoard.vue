<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { postName } from '~/game/stats-client'
import type { BoardEntry, GameStats, MyRun } from '~/game/stats-client'
import { formatDuration as fmt } from '~/utils/duration'
import { track } from '~/utils/track'

// The AGI top ten on the team card, with the three-letter signature for the visitor's fight. run: the fight to sign.
const props = defineProps<{ board: BoardEntry[], mine: MyRun | null, run: string | null }>()
const emit = defineEmits<{ (e: 'stats', s: GameStats): void }>()

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

async function save() {
  if (!props.run || initials.value.length !== 3 || saving.value) return
  saving.value = true
  error.value = ''
  const s = await postName(props.run, initials.value)
  saving.value = false
  if (!s) { error.value = 'Those letters cannot be used. Try others.'; return }
  track('board_name', { place: s.mine?.place ?? 0 })
  initials.value = ''
  emit('stats', s)
}
</script>

<template>
  <section class="lboard" aria-label="Fastest AGI kills">
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
    <ol v-if="board.length" class="lboard__rows">
      <li v-for="(e, i) in board" :key="e.initials" class="lboard__row" :class="{ 'is-mine': e.mine }">
        <span class="lboard__pos">{{ i + 1 }}</span><span class="lboard__ini">{{ e.initials }}</span><span class="lboard__t">{{ fmt(e.ms) }}</span>
      </li>
      <li v-if="below" class="lboard__row is-mine lboard__row--below">
        <span class="lboard__pos">{{ below.place }}</span><span class="lboard__ini">{{ below.initials }}</span><span class="lboard__t">{{ fmt(below.best ?? below.ms) }}</span>
      </li>
    </ol>
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

.lboard__rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lboard__row {
  display: grid;
  grid-template-columns: 2.2em 1fr auto;
  align-items: center;
  min-height: 22px;
  font-family: var(--pn-font-mono);
  font-size: .78rem;
  font-variant-numeric: tabular-nums;
}

.lboard__row + .lboard__row { border-top: 1px dashed var(--pn-border); }
.lboard__row--below { border-top-style: solid !important; margin-top: 2px; }
.lboard__pos { color: var(--pn-text-muted); }
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
