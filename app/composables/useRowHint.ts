import { onMounted, onUnmounted } from 'vue'

// Tells this browser's visitor once that rows open; gone for good after the first row they open.
const KEY = 'ib-hint-rows'
const HINT = 'cv-tog--hint'

export function useRowHint() {
  let tog: HTMLElement | null = null

  // A click, not toggle: printing opens every row, and Enter or Space on a summary also clicks.
  const onClick = (e: MouseEvent) => {
    const s = e.target instanceof Element ? e.target.closest('summary') : null
    if (!s || s.parentElement?.classList.contains('more')) return
    tog?.classList.remove(HINT)
    tog = null
    document.removeEventListener('click', onClick, true)
    try { localStorage.setItem(KEY, '1') } catch { /* storage blocked */ }
  }

  onMounted(() => {
    try { if (localStorage.getItem(KEY)) return } catch { /* storage blocked: show it */ }
    tog = document.querySelector<HTMLElement>('#experience details .cv-tog')
    if (!tog) return
    tog.classList.add(HINT)
    document.addEventListener('click', onClick, true)
  })

  onUnmounted(() => document.removeEventListener('click', onClick, true))
}
