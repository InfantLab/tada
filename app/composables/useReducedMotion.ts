import { ref, onUnmounted } from 'vue'

export function useReducedMotion() {
  const query = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

  const prefersReducedMotion = ref(query?.matches ?? false)

  function onChange(e: MediaQueryListEvent) {
    prefersReducedMotion.value = e.matches
  }

  query?.addEventListener('change', onChange)

  onUnmounted(() => {
    query?.removeEventListener('change', onChange)
  })

  return prefersReducedMotion
}
