/**
 * useTimelineRefresh - Global timeline refresh trigger
 *
 * Allows any component to trigger a timeline refresh after
 * creating, updating, or deleting entries.
 */

// Global refresh key - increment to trigger refresh
const refreshKey = ref(0);

export function useTimelineRefresh() {
  /**
   * Trigger a timeline refresh
   */
  function triggerRefresh() {
    refreshKey.value++;
  }

  /**
   * Get the current refresh key for watching
   */
  function getRefreshKey() {
    return refreshKey;
  }

  return {
    refreshKey: readonly(refreshKey),
    triggerRefresh,
    getRefreshKey,
  };
}
