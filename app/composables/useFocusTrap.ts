import { type Ref, onUnmounted } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
  let active = false

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !containerRef.value) return

    const focusable = Array.from(
      containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(el => el.offsetParent !== null) // exclude hidden elements

    if (focusable.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  function activate() {
    if (active) return
    active = true
    document.addEventListener('keydown', onKeydown)
  }

  function deactivate() {
    if (!active) return
    active = false
    document.removeEventListener('keydown', onKeydown)
  }

  onUnmounted(deactivate)

  return { activate, deactivate }
}
