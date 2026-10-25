<script setup lang="ts">
// Native <dialog> gives Esc and inert; this adds Tab loop, scroll lock, focus return, exit motion.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { mdiClose } from '@mdi/js'
import PnIcon from '~/components/ui/PnIcon.vue'
import { useScrollLock } from '~/composables/useScrollLock'

export type PnModalSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    size?: PnModalSize
    closable?: boolean
    // id of an external heading, used when no title is given.
    labelledBy?: string
  }>(),
  { title: undefined, size: 'md', closable: true, labelledBy: undefined }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open' | 'close'): void
}>()

const CLOSE_MS = 240 // --pn-motion-base, the exit animation's length
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const dialogEl = ref<HTMLDialogElement | null>(null)
const isClosing = ref(false)
const titleId = useId()
const labelId = computed(() => (props.title ? titleId : props.labelledBy))

let opener: HTMLElement | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

const { lock: lockScroll, unlock: unlockScroll } = useScrollLock()

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function focusables(): HTMLElement[] {
  const root = dialogEl.value
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

function open() {
  const d = dialogEl.value
  if (!d || d.open) return
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  isClosing.value = false
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  d.showModal()
  lockScroll()
  nextTick(() => {
    // Focus the dialog, not a control: showModal()'s autofocus paints a ring nobody asked for.
    // focusVisible false keeps the UA ring off after a key press; Tab then reaches the close X.
    d.focus({ preventScroll: true, focusVisible: false } as FocusOptions)
  })
  emit('open')
}

function finishClose() {
  const d = dialogEl.value
  if (d?.open) d.close()
  isClosing.value = false
  unlockScroll()
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
  opener = null
  emit('close')
}

function close() {
  const d = dialogEl.value
  if (!d?.open || isClosing.value) return
  isClosing.value = true
  closeTimer = setTimeout(finishClose, reducedMotion() ? 0 : CLOSE_MS)
}

function requestClose() {
  if (!props.closable) return
  emit('update:modelValue', false)
}

// Esc: cancelled so the exit animation runs; a not-closable dialog stays.
function onCancel(e: Event) {
  e.preventDefault()
  requestClose()
}

// The platform closed it without us (e.g. a forced close): sync v-model back to false.
function onNativeClose() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  if (props.modelValue) emit('update:modelValue', false)
  isClosing.value = false
  unlockScroll()
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
  opener = null
}

// ::backdrop clicks target the dialog; the frame fills it, so a dialog target means the scrim.
function onBackdropClick(e: MouseEvent) {
  if (e.target === dialogEl.value) requestClose()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) {
    e.preventDefault()
    dialogEl.value?.focus()
    return
  }
  const first = items[0] as HTMLElement
  const last = items[items.length - 1] as HTMLElement
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === dialogEl.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) open()
    else close()
  }
)

onMounted(() => {
  if (props.modelValue) open()
})

onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
  if (dialogEl.value?.open) dialogEl.value.close()
  unlockScroll()
})

defineExpose({ open: () => emit('update:modelValue', true), close: requestClose })
</script>

<template>
  <dialog
    ref="dialogEl"
    class="pn-modal"
    :class="[`pn-modal--${size}`, { 'is-closing': isClosing }]"
    :aria-labelledby="labelId"
    aria-modal="true"
    tabindex="-1"
    @cancel="onCancel"
    @close="onNativeClose"
    @click="onBackdropClick"
    @keydown="onKeydown"
  >
    <div class="pn-modal__frame">
      <div v-if="$slots.media" class="pn-modal__media">
        <slot name="media" />
      </div>

      <header v-if="title || closable" class="pn-modal__head" :class="{ 'pn-modal__head--bare': !title }">
        <h2 v-if="title" :id="titleId" class="pn-modal__title">{{ title }}</h2>
        <button
          v-if="closable"
          type="button"
          class="pn-modal__close"
          aria-label="Close dialog"
          @click="requestClose"
        >
          <PnIcon :path="mdiClose" :size="22" />
        </button>
      </header>

      <div class="pn-modal__body">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="pn-modal__foot">
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.pn-modal {
  --pn-modal-w: 560px;
  --pn-modal-pad: var(--pn-space-24);
  width: min(100% - 32px, var(--pn-modal-w));
  max-width: none;
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  border: 0;
  border-radius: var(--pn-radius-xl);
  background-color: var(--pn-surface);
  color: var(--pn-text);
  box-shadow: var(--pn-elev-3);
  overflow: hidden;
  font-family: var(--pn-font);
}
.pn-modal--sm { --pn-modal-w: 440px; }
.pn-modal--md { --pn-modal-w: 560px; }
.pn-modal--lg { --pn-modal-w: 720px; }

/* tokens.css also declares --pn-scrim on ::backdrop: older engines let it inherit nothing. */
.pn-modal::backdrop {
  background-color: var(--pn-scrim);
  -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
}

/* The frame holds the column and only the body scrolls; it anchors the X so it can sit on media. */
.pn-modal__frame {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  min-height: 0;
}
.pn-modal__media {
  flex: none;
  overflow: hidden;
  background-color: var(--pn-surface-sunk);
}
.pn-modal__media :deep(img),
.pn-modal__media :deep(picture),
.pn-modal__media :deep(video) {
  display: block;
  width: 100%;
  height: auto;
}

.pn-modal__head {
  flex: none;
  padding: var(--pn-modal-pad) calc(var(--pn-modal-pad) + 44px) var(--pn-space-8) var(--pn-modal-pad);
}
.pn-modal__head--bare { padding-bottom: 0; min-height: 44px; }
/* With a media band the X moves onto the band, so the heading gets its width back. */
.pn-modal__media ~ .pn-modal__head { padding-right: var(--pn-modal-pad); }
/* The panel rides up over the band on a radius, so artwork past the seam meets a curved edge. */
/* Tree order paints the panel over the band, no stacking context; the absolute X stays on top. */
.pn-modal__media ~ .pn-modal__head,
.pn-modal__media + .pn-modal__body {
  margin-top: -20px;
  border-radius: var(--pn-card-radius) var(--pn-card-radius) 0 0;
  background-color: var(--pn-surface);
}
.pn-modal__title {
  margin: 0;
  font-size: var(--pn-size-xl);
  line-height: var(--pn-lh-xl);
  letter-spacing: var(--pn-ls-xl);
  font-weight: var(--pn-w-bold);
  color: var(--pn-text);
}
.pn-modal__close {
  position: absolute;
  top: calc(var(--pn-modal-pad) - 10px);
  right: calc(var(--pn-modal-pad) - 10px);
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--pn-radius-circle);
  background: transparent;
  color: var(--pn-text-muted);
  cursor: pointer;
  transition: color var(--pn-motion-fast) var(--pn-ease-out),
              background-color var(--pn-motion-fast) var(--pn-ease-out);
}
.pn-modal__close:hover {
  color: var(--pn-text);
  background-color: var(--pn-surface-sunk);
}
/* Over artwork the X has no ground of its own: neutral chrome on a white puck, never coloured. */
.pn-modal__media ~ .pn-modal__head .pn-modal__close {
  color: var(--pn-text);
  background-color: rgba(255, 255, 255, 0.78);
  box-shadow: var(--pn-elev-1);
}
.pn-modal__media ~ .pn-modal__head .pn-modal__close:hover {
  background-color: #FFFFFF;
}

.pn-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: var(--pn-space-8) var(--pn-modal-pad) var(--pn-modal-pad);
  font-size: var(--pn-size-md);
  line-height: var(--pn-lh-md);
  color: var(--pn-text-secondary);
}
.pn-modal__head + .pn-modal__body { padding-top: var(--pn-space-8); }
.pn-modal__media + .pn-modal__body,
.pn-modal__frame > .pn-modal__body:first-child { padding-top: var(--pn-modal-pad); }

.pn-modal__foot {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--pn-space-12);
  padding: var(--pn-space-16) var(--pn-modal-pad) calc(var(--pn-modal-pad) + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--pn-border);
  background-color: var(--pn-surface);
}

/* Short viewports (landscape phones): cap the decorative band so the body keeps room to scroll. */
@media (max-height: 500px) {
  .pn-modal__media { max-height: 28dvh; }
}

/* Motion: --pn-motion-base scale 0.98 to 1 with a fade, mirrored on close. */
@keyframes pn-modal-in {
  from { opacity: 0; transform: scale(0.98); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pn-modal-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.98); }
}
@keyframes pn-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pn-backdrop-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.pn-modal[open] { animation: pn-modal-in var(--pn-motion-base) var(--pn-ease-out) both; }
.pn-modal[open]::backdrop { animation: pn-backdrop-in var(--pn-motion-base) var(--pn-ease-out) both; }
.pn-modal[open].is-closing { animation: pn-modal-out var(--pn-motion-base) var(--pn-ease-in-out) both; }
.pn-modal[open].is-closing::backdrop { animation: pn-backdrop-out var(--pn-motion-base) var(--pn-ease-in-out) both; }

/* Phones: dock to the bottom as a sheet, like the app. */
@media (max-width: 575.98px) {
  .pn-modal {
    --pn-modal-pad: var(--pn-space-16);
    width: 100%;
    max-width: 100%;
    max-height: calc(100dvh - 48px);
    margin: auto 0 0;
    border-radius: var(--pn-radius-xl) var(--pn-radius-xl) 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .pn-modal__frame { max-height: calc(100dvh - 48px - env(safe-area-inset-bottom, 0px)); }
  .pn-modal__head { padding-top: var(--pn-space-24); }
  .pn-modal__close { top: calc(var(--pn-space-24) - 10px); }
  .pn-modal__foot { padding-bottom: var(--pn-space-16); }
  .pn-modal__foot > :deep(*) { flex: 1 1 auto; }
  @keyframes pn-modal-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pn-modal-out {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(16px); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .pn-modal[open],
  .pn-modal[open]::backdrop,
  .pn-modal[open].is-closing,
  .pn-modal[open].is-closing::backdrop { animation: none; }
}
</style>
