/**
 * Ourmoji module constants.
 *
 * Sacred Set and Wheel-of-Year placeholders. Full data lives in
 * `sacredSet.ts` and `wheelOfYear.ts` (Phase 2).
 */

export const OURMOJI_ENTRY_TYPE = "ourmoji" as const;
export const DREAM_EXPERIMENT_ENTRY_TYPE = "dream-experiment" as const;

/** Module flag key used in user preferences `enabledModules`. */
export const OURMOJI_MODULE_FLAG = "ourmoji" as const;

/** Sacred Set size — 23-emoji forced-choice space. */
export const SACRED_SET_SIZE = 23;

/** Baseline guess probability for binomial test (1 / SACRED_SET_SIZE). */
export const SACRED_SET_BASELINE = 1 / SACRED_SET_SIZE;

/** Maximum length for dream / reflection text fields. */
export const MAX_TEXT_LENGTH = 5000;

/** Anchor hour-of-day for nightly assignments (earliest participant tz). */
export const NIGHTLY_ASSIGNMENT_HOUR_LOCAL = 21;

/** Default role weights for a new experiment run. Sum must equal 1.0. */
export const DEFAULT_ROLE_WEIGHTS = {
  send: 0.4,
  control: 0.4,
  rest: 0.2,
} as const;

export type RoleWeightKey = keyof typeof DEFAULT_ROLE_WEIGHTS;
