/**
 * Zod request/response schemas for Ourmoji API endpoints.
 *
 * Phase 1 scaffolding — schemas mirror the OpenAPI contract in
 * `specs/013-ourmoji-module/contracts/openapi.yaml`. Endpoint handlers
 * (Phase 3+) import these for validation.
 */

import * as z from "zod";
import {
  MAX_TEXT_LENGTH,
  SACRED_SET_SIZE,
} from "~/utils/ourmoji/constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const _isoDateTime = z.string().datetime({ offset: true });

// ---------------------------------------------------------------------------
// Daily ingestion
// ---------------------------------------------------------------------------

export const dailyOurmojiPayloadSchema = z.object({
  date: isoDate,
  emoji: z.string().min(1).max(16),
  reflection: z.string().min(1).max(MAX_TEXT_LENGTH),
  moonPhase: z.string().min(1),
  moonIllumination: z.number().min(0).max(100).nullable().optional(),
  wheelOfYear: z.string().nullable().optional(),
  wheelCategory: z.string().nullable().optional(),
  timezone: z.string().min(1),
});

export type DailyOurmojiPayload = z.infer<typeof dailyOurmojiPayloadSchema>;

export const calendarQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

// ---------------------------------------------------------------------------
// Experiment lifecycle
// ---------------------------------------------------------------------------

export const roleWeightsSchema = z
  .object({
    send: z.number().min(0).max(1),
    control: z.number().min(0).max(1),
    rest: z.number().min(0).max(1),
  })
  .refine(
    (w) => Math.abs(w.send + w.control + w.rest - 1) < 1e-6,
    { message: "Role weights must sum to 1.0" },
  );

export const createExperimentSchema = z.object({
  name: z.string().min(1).max(120),
  startDate: isoDate,
  endDate: isoDate,
  participantUserIds: z.array(z.string().min(1)).min(1),
  roleWeights: roleWeightsSchema.optional(),
  randomizationSeed: z.string().optional(),
});

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;

// ---------------------------------------------------------------------------
// Submissions (US3)
// ---------------------------------------------------------------------------

export const dreamSubmissionSchema = z.object({
  dreamText: z.string().min(1).max(MAX_TEXT_LENGTH),
  capturedVia: z.enum(["voice", "text"]).default("text"),
});

export const guessSubmissionSchema = z.object({
  guessEmoji: z.string().min(1).max(16),
  guessConfidence: z.number().int().min(1).max(5),
});

// ---------------------------------------------------------------------------
// Stats (US5)
// ---------------------------------------------------------------------------

export const statsResponseActiveSchema = z.object({
  state: z.literal("active"),
  nightsCompleted: z.number().int().nonnegative(),
  submissionCount: z.number().int().nonnegative(),
  nightsRemaining: z.number().int().nonnegative(),
});

export const statsResponseCompletedSchema = z.object({
  state: z.literal("completed"),
  totals: z.object({
    nightsCompleted: z.number().int().nonnegative(),
    guesses: z.number().int().nonnegative(),
    hits: z.number().int().nonnegative(),
    hitRate: z.number().min(0).max(1),
  }),
  baseline: z.object({
    chanceRate: z.number(),
    sacredSetSize: z.literal(SACRED_SET_SIZE),
  }),
  binomialPValue: z.number().min(0).max(1),
  byCondition: z.record(z.string(), z.unknown()),
  byParticipantAnon: z.record(z.string(), z.unknown()),
});

export type DateString = z.infer<typeof isoDate>;
export type DateTimeString = z.infer<typeof _isoDateTime>;
