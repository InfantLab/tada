export type TimelineStyleOption = "minimal" | "beautiful";

const timelineStyle = ref<TimelineStyleOption>("beautiful");
const isHydrated = ref(false);

export function useTimelineStyle() {
  if (import.meta.client && !isHydrated.value) {
    const stored = localStorage.getItem("tada:timelineStyle");
    if (stored === "minimal" || stored === "beautiful") {
      timelineStyle.value = stored;
    }
    isHydrated.value = true;
  }

  function setTimelineStyle(style: TimelineStyleOption) {
    timelineStyle.value = style;
    if (import.meta.client) {
      localStorage.setItem("tada:timelineStyle", style);
    }
  }

  function toggleTimelineStyle() {
    setTimelineStyle(timelineStyle.value === "minimal" ? "beautiful" : "minimal");
  }

  return {
    timelineStyle: readonly(timelineStyle),
    setTimelineStyle,
    toggleTimelineStyle,
  };
}
