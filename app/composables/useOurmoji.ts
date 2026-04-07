/**
 * useOurmoji — daily Ourmoji data fetching for the client.
 *
 * Wraps the `/api/ourmoji/*` endpoints with reactive state.
 * Returns 404 from the server when the module is disabled — we surface
 * that as `enabled.value === false` rather than an error so the UI can
 * gracefully hide the panel.
 */

import { computed, ref } from "vue";
import type { OurmojiDailyCardDTO } from "~/types/ourmoji";

interface CalendarResponse {
  entries: OurmojiDailyCardDTO[];
}

interface DailyResponse {
  entry: OurmojiDailyCardDTO;
}

export function useOurmoji() {
  const entries = ref<OurmojiDailyCardDTO[]>([]);
  const loading = ref(false);
  const enabled = ref<boolean | null>(null); // null until first fetch
  const error = ref<string | null>(null);

  const today = computed<OurmojiDailyCardDTO | null>(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return entries.value.find((e) => e.date === todayIso) ?? null;
  });

  const history = computed<OurmojiDailyCardDTO[]>(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return entries.value.filter((e) => e.date !== todayIso);
  });

  async function fetchCalendar(options: { from?: string; to?: string } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (options.from) params.set("from", options.from);
      if (options.to) params.set("to", options.to);
      const qs = params.toString();
      const response = await $fetch<CalendarResponse>(
        `/api/ourmoji/calendar${qs ? `?${qs}` : ""}`,
      );
      entries.value = response.entries;
      enabled.value = true;
    } catch (err: unknown) {
      const status =
        (err as { statusCode?: number; status?: number }).statusCode ??
        (err as { status?: number }).status;
      if (status === 404) {
        // Module disabled — gracefully hide UI.
        enabled.value = false;
        entries.value = [];
      } else {
        enabled.value = enabled.value ?? true;
        error.value =
          err instanceof Error ? err.message : "Failed to load Ourmoji";
      }
    } finally {
      loading.value = false;
    }
  }

  async function submitDaily(payload: {
    date: string;
    emoji: string;
    reflection: string;
    moonPhase: string;
    moonIllumination?: number | null;
    wheelOfYear?: string | null;
    wheelCategory?: string | null;
    timezone: string;
  }) {
    const response = await $fetch<DailyResponse>("/api/ourmoji/daily", {
      method: "POST",
      body: payload,
    });
    // Optimistically merge the returned entry into local state.
    const idx = entries.value.findIndex((e) => e.date === response.entry.date);
    if (idx >= 0) entries.value.splice(idx, 1, response.entry);
    else entries.value.unshift(response.entry);
    return response.entry;
  }

  return {
    entries,
    today,
    history,
    loading,
    enabled,
    error,
    fetchCalendar,
    submitDaily,
  };
}
