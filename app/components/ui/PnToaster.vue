<script setup lang="ts">
// The one toast outlet, mounted in the layout; teleported to <body> so no ancestor clips it.
// Client only: toasts never exist on the server.
import { ref, watch } from 'vue'
import { mdiAlertCircle, mdiCheckCircle, mdiClose, mdiInformation } from '@mdi/js'
import PnIcon from '~/components/ui/PnIcon.vue'
import { usePnToast, type PnToastKind } from '~/composables/usePnToast'

const { toasts, dismiss, pause, resume } = usePnToast()

const ICONS: Record<PnToastKind, string> = {
  success: mdiCheckCircle,
  error: mdiAlertCircle,
  info: mdiInformation
}

// A manual popover lives in the top layer, so a toast can show above an open dialog's backdrop.
// Over a modal dialog it is still inert (per spec): visible, but not hoverable or announced.
const toasterEl = ref<HTMLElement | null>(null)

function raise() {
  const el = toasterEl.value
  if (!el || typeof el.showPopover !== 'function') return
  try {
    if (el.matches(':popover-open')) el.hidePopover()
    el.showPopover()
  } catch {
    // Not connected yet or no popover support: it stays a plain fixed layer under the dialog.
  }
}

watch(toasterEl, (el) => { if (el) raise() }, { flush: 'post' })

// A dialog opened after the toaster sits above it: a new toast re-enters the top layer on top.
// Keyed on the newest id, not the length: at the cap a push and a drop leave the length unchanged.
watch(() => toasts.value[toasts.value.length - 1]?.id ?? 0, (id, prev) => {
  if (id > prev && document.querySelector('dialog[open]')) raise()
})
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div ref="toasterEl" class="pn-toaster" popover="manual" data-pn-toaster>
        <!-- One live region that outlives its toasts, so each insert is announced; errors escalate. -->
        <TransitionGroup name="pn-toast" tag="div" class="pn-toaster__stack" aria-live="polite">
          <div
            v-for="t in toasts"
            :key="t.id"
            class="pn-toast"
            :class="`pn-toast--${t.kind}`"
            :aria-live="t.kind === 'error' ? 'assertive' : undefined"
            @mouseenter="pause(t.id)"
            @mouseleave="resume(t.id)"
            @focusin="pause(t.id)"
            @focusout="resume(t.id)"
          >
            <PnIcon :path="ICONS[t.kind]" :size="20" class="pn-toast__icon" />
            <p class="pn-toast__msg">{{ t.message }}</p>
            <button
              type="button"
              class="pn-toast__close"
              aria-label="Dismiss notification"
              @click="dismiss(t.id)"
            >
              <PnIcon :path="mdiClose" :size="18" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
/* Phones: bottom centre, above the home indicator, clear of the header and any results header. */
.pn-toaster {
  position: fixed;
  z-index: var(--pn-z-toast);
  top: auto;
  left: var(--pn-space-16);
  right: calc(var(--pn-space-16) + var(--pn-scroll-gutter, 0px));
  bottom: calc(var(--pn-space-16) + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
  /* Undo the UA popover box: centred, fit-content, bordered, padded, scrolling, Canvas-filled. */
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: visible;
  color: inherit;
  background-color: transparent;
}
.pn-toaster__stack {
  position: relative;               /* anchors a leaving toast */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--pn-space-8);
  margin: 0 auto;
  max-width: 420px;
}
@media (min-width: 768px) {
  .pn-toaster {
    left: auto;
    bottom: auto;
    top: calc(var(--pn-header-offset) + var(--pn-space-16));
    right: calc(var(--pn-space-24) + var(--pn-scroll-gutter, 0px));
    width: min(420px, calc(100vw - 2 * var(--pn-space-24)));
  }
  .pn-toaster__stack { align-items: stretch; }
}

.pn-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: var(--pn-space-12);
  padding: var(--pn-space-12) var(--pn-space-12) var(--pn-space-12) var(--pn-space-16);
  background-color: var(--pn-surface);
  border: 1px solid var(--pn-border);
  border-radius: var(--pn-radius-lg);
  box-shadow: var(--pn-elev-2);
  color: var(--pn-text);
}
.pn-toast__icon {
  flex: none;
  margin-top: 2px;
}
.pn-toast--success .pn-toast__icon { color: var(--pn-success); }
.pn-toast--error   .pn-toast__icon { color: var(--pn-error); }
.pn-toast--info    .pn-toast__icon { color: var(--pn-accent2-ui); }

.pn-toast__msg {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding-top: 2px;
  font-size: 0.9375rem;             /* 15px */
  line-height: 1.45;
  color: var(--pn-text);
  overflow-wrap: anywhere;
}

/* 44px tap target; the negative margin keeps the toast's visual padding at 12px. */
.pn-toast__close {
  flex: none;
  width: 44px;
  height: 44px;
  margin: -10px -8px -10px 0;
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
.pn-toast__close:hover {
  color: var(--pn-text);
  background-color: var(--pn-surface-sunk);
}

/* Motion: 200ms fade and an 8px rise. */
.pn-toast-enter-active,
.pn-toast-leave-active,
.pn-toast-move {
  transition: opacity 200ms var(--pn-ease-out), transform 200ms var(--pn-ease-out);
}
.pn-toast-leave-active { position: absolute; left: 0; right: 0; }
.pn-toast-enter-from,
.pn-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
  .pn-toast-enter-active,
  .pn-toast-leave-active,
  .pn-toast-move { transition: none; }
  .pn-toast-enter-from,
  .pn-toast-leave-to { transform: none; }
}
</style>
