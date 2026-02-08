<template>
  <div class="rhythm-encouragement">
    <!-- Encouragement Message -->
    <div v-if="encouragement" class="encouragement-card">
      <p class="encouragement-message">{{ encouragement }}</p>
      <span class="journey-badge">{{ journeyStageLabel }}</span>
    </div>

    <!-- Totals Section -->
    <h4 v-if="totals" class="totals-heading">All-Time</h4>
    <div v-if="totals" class="totals-grid">
      <div class="stat-card">
        <span class="stat-value">{{ totals.totalSessions }}</span>
        <span class="stat-label">Sessions</span>
      </div>
      <div class="stat-card">
        <template v-if="matchType === 'tally'">
          <span class="stat-value">{{ totals.totalCount || 0 }}</span>
          <span class="stat-label">Reps Total</span>
        </template>
        <template v-else>
          <span class="stat-value">{{ formatHours(totals.totalHours) }}</span>
          <span class="stat-label">Hours</span>
        </template>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ totals.weeksActive }}</span>
        <span class="stat-label">Weeks Active</span>
      </div>
      <div v-if="totals.firstEntryDate" class="stat-card">
        <span class="stat-value">{{ formatDate(totals.firstEntryDate) }}</span>
        <span class="stat-label">Started</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface RhythmTotals {
  totalSessions: number;
  totalSeconds: number;
  totalHours: number;
  totalCount?: number;
  firstEntryDate: string | null;
  weeksActive: number;
}

type JourneyStage = "starting" | "building" | "becoming" | "being";

const props = defineProps<{
  encouragement?: string;
  journeyStage?: JourneyStage;
  totals?: RhythmTotals;
  matchType?: string | null;
}>();

/**
 * Format journey stage into user-friendly label
 */
const journeyStageLabel = computed(() => {
  const labels: Record<JourneyStage, string> = {
    starting: "🌱 Starting",
    building: "🌿 Building",
    becoming: "🌳 Becoming",
    being: "⭐ You Are",
  };
  return props.journeyStage ? labels[props.journeyStage] : "";
});

/**
 * Format hours for display (e.g., "11.75" -> "11h 45m")
 */
function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

/**
 * Format date for display (e.g., "2025-11-15" -> "Nov 15, 2025")
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
</script>

<style scoped>
.rhythm-encouragement {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.encouragement-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.encouragement-message {
  font-size: 1rem;
  font-weight: 500;
  color: #166534;
  margin: 0;
  line-height: 1.5;
  font-style: italic;
}

.journey-badge {
  font-size: 0.75rem;
  color: #15803d;
  align-self: flex-start;
}

.totals-heading {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
  margin: 0;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .totals-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: #f9fafb;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .encouragement-card {
    background: linear-gradient(135deg, #14532d 0%, #166534 100%);
  }

  .encouragement-message {
    color: #bbf7d0;
  }

  .journey-badge {
    color: #86efac;
  }

  .totals-heading {
    color: #d1d5db;
  }

  .stat-card {
    background: #374151;
  }

  .stat-value {
    color: #f9fafb;
  }

  .stat-label {
    color: #9ca3af;
  }
}
</style>
