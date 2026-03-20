# Implementation Plan: Weekly Rhythms — Encouragement & Celebration

**Branch**: `009-weekly-rhythms` | **Last Updated**: 2026-03-20 | **Spec**: [spec.md](./spec.md)

## Summary

Implement weekly rhythms as a persistent scheduling and content pipeline with four layers:

1. **Time & Scheduling**: Timezone-aware window calculation for Monday/Thursday user-local times
2. **Snapshot Generation**: Immutable weekly aggregates with factual data (entry counts, durations, rhythm chain status, personal records)
3. **Tiered Rendering**: Four-tier content pipeline (Tier 1 stats-only → Tier 2 local AI → Tier 3/4 cloud AI with fallbacks)
4. **Delivery Orchestration**: Multi-channel outbox system (in-app, email with retry/bounce handling, optional push)

This plan details algorithms, encryption strategies, UX flows, edge cases, and provider abstractions that were absent in the prior version. Implementation should follow this spec step-by-step to ensure all 45 functional requirements and 12 success criteria are met.

## Technical Context

**Language/Version**: TypeScript 5.9, Vue 3, Nuxt 4  
**Primary Dependencies**: Drizzle ORM, Zod, `croner` (scheduler), Node.js `crypto` (tokens), Nodemailer (SMTP), existing rhythm calculators, existing email infrastructure  
**Storage**: SQLite via Drizzle (weekly settings, snapshots, messages, delivery attempts); existing env-based SMTP/AI credentials  
**Testing**: Vitest unit tests co-located with services; Nuxt test-utils for API endpoints; targeted integration tests for scheduler/bounce workflows  
**Target Platform**: Single Nuxt full-stack server (Node 20 compatible); self-hosted and cloud deployments  
**Performance Goals**: Snapshot generation < 5s/user (2-year history); scheduler sweep < 1 min; in-app fetch < 200ms  
**Constraints**: Opt-in by default; always positive tone (zero guilt/shame); local timezone honored for generation/delivery; cloud AI sees summary-only payloads; graceful fallback when email/AI unavailable  
**Scale**: 0-N rhythms/user; single-user self-hosted through low-thousands cloud users; ≤104 weeks history; max 1 encouragement + 1 celebration/user/week

---

## Detailed Design — Critical Algorithms

### 1. Unsubscribe Token Generation & Verification

**Requirement**: FR-033, FR-037, SC-006 — one-click unsubscribe must work within 1 minute.

**Implementation**:

```typescript
// app/server/utils/weeklyRhythmTokens.ts
import { createHmac } from "crypto";

interface UnsubscribePayload {
  userId: string;
  scope: "email"; // extensible for other scopes
  issuedAt: number; // unix timestamp (ms)
}

export function generateUnsubscribeToken(
  userId: string,
  secret: string,
): { token: string; payload: UnsubscribePayload } {
  const issuedAt = Date.now();
  const payload: UnsubscribePayload = { userId, scope: "email", issuedAt };

  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(data).digest("hex");

  // Format: base64(JSON) + . + hex(signature)
  const token = Buffer.from(data).toString("base64") + "." + signature;
  return { token, payload };
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000, // 30 days default
): { valid: boolean; payload?: UnsubscribePayload; error?: string } {
  try {
    const [data64, sig] = token.split(".");
    if (!data64 || !sig) throw new Error("Malformed token");

    const data = Buffer.from(data64, "base64").toString("utf8");
    const expectedSig = createHmac("sha256", secret).update(data).digest("hex");

    if (sig !== expectedSig) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload: UnsubscribePayload = JSON.parse(data);
    const age = Date.now() - payload.issuedAt;

    if (age > maxAgeMs) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}
```

**API Endpoint**:

```typescript
// app/server/api/weekly-rhythms/unsubscribe/[token].get.ts
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  const secret = useRuntimeConfig().weeklyRhythmsTokenSecret;

  const verification = verifyUnsubscribeToken(token, secret);
  if (!verification.valid) {
    throw createError({
      statusCode: 400,
      message: verification.error || "Invalid or expired token",
    });
  }

  const userId = verification.payload!.userId;

  // Disable only email delivery; keep in-app
  await updateWeeklyRhythmSettings(userId, {
    emailUnsubscribedAt: new Date(),
    emailUnsubscribeSource: "email_link",
    deliveryChannels: {
      celebration: { inApp: true, email: false, push: false },
      encouragement: { inApp: true, email: false, push: false },
    },
  });

  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
        <h2>✓ Unsubscribed</h2>
        <p>You've been unsubscribed from weekly email summaries. In-app celebrations will still appear.</p>
        <p><a href="/">Return to Ta-Da!</a></p>
      </body>
    </html>
  `;
});
```

---

### 2. Email Bounce & Retry Strategy

**Requirement**: FR-035, FR-037, SC-005, SC-006 — retry with backoff; auto-disable after 3 bounces.

**Key Decisions**:

- **Immediate failures**: Count SMTP send errors (timeout, auth error, rate limit) immediately.
- **Async bounces**: If provider emits webhooks, ingest bounce events via dedicated endpoint (not in MVP scope but architecture prepared).
- **Counter**: `consecutiveEmailFailures` in `weekly_rhythm_settings` increments on send failure, resets to 0 on success.
- **Backoff**: Exponential (1 hour, 4 hours, 24 hours for attempts 1–3), then abandon.

**Implementation**:

```typescript
// app/server/services/weekly-rhythms/delivery.ts
interface EmailRetryState {
  attemptNumber: number;
  nextRetryAfter: Date;
  wasDelivered: boolean;
}

function computeBackoffMs(attemptNumber: number): number {
  // Attempt 1 → 1 hour, Attempt 2 → 4 hours, Attempt 3 → 24 hours
  const hours = [1, 4, 24];
  return (hours[Math.min(attemptNumber - 1, 2)] || 24) * 60 * 60 * 1000;
}

async function deliverEmail(
  userId: string,
  messageId: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string,
): Promise<{ success: boolean; error?: string; shouldRetry?: boolean }> {
  try {
    const transport = getEmailTransport(); // uses existing app infrastructure
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM || "noreply@tada.living",
      to,
      subject,
      html: htmlBody,
      text: textBody,
      headers: {
        "List-Unsubscribe": `<mailto:noreply@tada.living?subject=unsubscribe>, <https://tada.living/api/weekly-rhythms/unsubscribe/${
          generateUnsubscribeToken(
            userId,
            process.env.WEEKLY_RHYTHMS_TOKEN_SECRET!,
          ).token
        }>`,
      },
    });

    // Record successful delivery
    await db.insert(weeklyDeliveryAttempts).values({
      id: generateId(),
      messageId,
      channel: "email",
      status: "sent",
      attemptNumber: 1,
      scheduledFor: new Date(),
      attemptedAt: new Date(),
      provider: "smtp",
      providerMessageId: result.messageId,
      createdAt: new Date(),
    });

    // Reset failure counter
    await db
      .update(weeklyRhythmSettings)
      .set({ consecutiveEmailFailures: 0 })
      .where(eq(weeklyRhythmSettings.userId, userId));

    return { success: true };
  } catch (err) {
    const errorStr = String(err);
    const shouldRetry =
      errorStr.includes("ETIMEDOUT") ||
      errorStr.includes("EHOSTUNREACH") ||
      errorStr.includes("rate limit") ||
      errorStr.includes("421") ||
      errorStr.includes("429");

    // Increment failure counter
    const current = await db.query.weeklyRhythmSettings.findFirst({
      where: eq(weeklyRhythmSettings.userId, userId),
    });
    const newFailureCount = (current?.consecutiveEmailFailures || 0) + 1;

    if (newFailureCount >= 3) {
      // Auto-disable email delivery
      await db
        .update(weeklyRhythmSettings)
        .set({
          consecutiveEmailFailures: newFailureCount,
          lastEmailFailureAt: new Date(),
          emailUnsubscribedAt: new Date(),
          emailUnsubscribeSource: "bounce",
          deliveryChannels: {
            ...current!.deliveryChannels,
            celebration: {
              ...current!.deliveryChannels.celebration,
              email: false,
            },
            encouragement: {
              ...current!.deliveryChannels.encouragement,
              email: false,
            },
          },
        })
        .where(eq(weeklyRhythmSettings.userId, userId));

      // Create in-app notification to user (Future: add notification service)
      // For now, just log
      console.error(
        `Email bounced 3x for user ${userId}; auto-disabled. User should update email in settings.`,
      );
    } else {
      // Record failure and schedule retry
      const backoffMs = computeBackoffMs(newFailureCount);
      const nextRetry = new Date(Date.now() + backoffMs);

      await db
        .update(weeklyRhythmSettings)
        .set({
          consecutiveEmailFailures: newFailureCount,
          lastEmailFailureAt: new Date(),
        })
        .where(eq(weeklyRhythmSettings.userId, userId));

      await db.insert(weeklyDeliveryAttempts).values({
        id: generateId(),
        messageId,
        channel: "email",
        status: shouldRetry ? "queued" : "failed",
        attemptNumber: newFailureCount,
        scheduledFor: new Date(),
        attemptedAt: new Date(),
        retryAfter: nextRetry,
        failureCode: errorStr.substring(0, 50),
        failureMessage: errorStr.substring(0, 200),
        createdAt: new Date(),
      });
    }

    return {
      success: false,
      error: errorStr,
      shouldRetry,
    };
  }
}
```

---

### 3. Tier Fallback Hierarchy

**Requirement**: FR-023, FR-028, SC-007 — seamless fallback without user-visible error.

**Fallback Chain**:

```typescript
// Tier 2 (Private AI) → Tier 1 (Stats Only)
// Tier 3 (Cloud Factual) → Tier 1
// Tier 4 (Cloud Creative) → Tier 1
// (No tier falls to a higher cost/privacy tier)

async function renderCelebration(
  snapshot: WeeklyStatsSnapshot,
  requestedTier:
    | "stats_only"
    | "private_ai"
    | "cloud_factual"
    | "cloud_creative",
  userId: string,
): Promise<{
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
  tierApplied: string;
  fallbackReason: string | null;
}> {
  let appliedTier = requestedTier;
  let fallbackReason: string | null = null;

  // Tier 1 always succeeds (no prerequisites)
  if (requestedTier === "stats_only") {
    const content = await renderTier1Stats(snapshot);
    return {
      ...content,
      tierApplied: "stats_only",
      fallbackReason: null,
    };
  }

  // Tier 2: Check if local AI is available
  if (requestedTier === "private_ai") {
    const isPrivateAiAvailable = await checkPrivateAiCapability();
    if (!isPrivateAiAvailable) {
      appliedTier = "stats_only";
      fallbackReason = "private_ai_unavailable";
    } else {
      try {
        const content = await renderTier2PrivateAi(snapshot, userId);
        return {
          ...content,
          tierApplied: "private_ai",
          fallbackReason: null,
        };
      } catch (err) {
        if (String(err).includes("timeout")) {
          appliedTier = "stats_only";
          fallbackReason = "private_ai_timeout";
        } else {
          throw err; // Other errors bubble up
        }
      }
    }
  }

  // Tier 3 & 4: Use cloud AI adapter
  if (requestedTier === "cloud_factual" || requestedTier === "cloud_creative") {
    try {
      const content = await renderCloudAi(
        snapshot,
        requestedTier === "cloud_creative" ? "creative" : "factual",
        userId,
      );
      return {
        ...content,
        tierApplied: requestedTier,
        fallbackReason: null,
      };
    } catch (err) {
      appliedTier = "stats_only";
      fallbackReason = `cloud_ai_failed: ${String(err).substring(0, 50)}`;
    }
  }

  // Fallback to Tier 1
  if (appliedTier === "stats_only") {
    const content = await renderTier1Stats(snapshot);
    return {
      ...content,
      tierApplied: "stats_only",
      fallbackReason,
    };
  }

  throw new Error(`Unexpected tier state: ${appliedTier}`);
}
```

---

### 4. "Last 4 Weeks" Average Calculation (FR-008)

**Requirement**: Thursday encouragement compares to user's trailing 4-week average.

**Algorithm**:

```typescript
// app/server/services/weekly-rhythms/snapshots.ts
async function computeTrailingFourWeekAverages(
  userId: string,
  asOfDate: Date,
  userTimezone: string,
): Promise<{
  totalEntries: number;
  totalDurationSeconds: number;
  byRhythmCompletedDays: Record<string, number>;
}> {
  // 1. Calculate the current Thursday's Monday-Sunday week boundary
  const currentThursdayLocalDate = getLocalDateForTimezone(
    asOfDate,
    userTimezone,
  );

  // 2. Walk back 4 full weeks (4 * 7 = 28 days from last Sunday)
  const businessDayOfWeek = currentThursdayLocalDate.getDay(); // 0-6, where 4 = Thu
  const daysUntilSunday = (7 - businessDayOfWeek) % 7 || 7;
  const lastSundayLocal = new Date(currentThursdayLocalDate);
  lastSundayLocal.setDate(lastSundayLocal.getDate() - businessDayOfWeek);

  const fourWeeksAgoSundayLocal = new Date(lastSundayLocal);
  fourWeeksAgoSundayLocal.setDate(
    fourWeeksAgoSundayLocal.getDate() - (3 * 7 + 1),
  ); // -22 days

  // 3. Convert to UTC ranges for DB query
  const ranges = [];
  for (let i = 0; i < 4; i++) {
    const mondayLocal = new Date(fourWeeksAgoSundayLocal);
    mondayLocal.setDate(mondayLocal.getDate() + i * 7 + 1);

    const sundayLocal = new Date(mondayLocal);
    sundayLocal.setDate(sundayLocal.getDate() + 6);

    const mondayUtc = getUtcFromLocalDate(mondayLocal, userTimezone); // start of day
    const mondayNextUtc = getUtcFromLocalDate(
      new Date(sundayLocal.getTime() + 24 * 60 * 60 * 1000),
      userTimezone,
    ); // end of Sunday

    ranges.push({ start: mondayUtc, end: mondayNextUtc });
  }

  // 4. Query entries across all 4 weeks
  let totalEntries = 0;
  let totalDurationSeconds = 0;
  const rhythmCompletionsByRhythmId: Record<string, number> = {};

  for (const { start, end } of ranges) {
    const entries = await db.query.entries.findMany({
      where: and(
        eq(entries.userId, userId),
        gte(entries.createdAt, start),
        lt(entries.createdAt, end),
      ),
    });

    for (const entry of entries) {
      totalEntries += 1;
      if (entry.type === "timed" && entry.data?.durationSeconds) {
        totalDurationSeconds += entry.data.durationSeconds;
      }
    }

    // Count rhythm completions (any entry linked to a rhythm on that day counts as 1 completion/day)
    const rhythmDays = entries.reduce((acc, e) => {
      if (e.rhythmId) {
        const key = `${e.rhythmId}:${getLocalDateString(e.createdAt)}`;
        acc.add(key);
      }
      return acc;
    }, new Set<string>());

    rhythmDays.forEach((key) => {
      const rhythmId = key.split(":")[0];
      rhythmCompletionsByRhythmId[rhythmId] =
        (rhythmCompletionsByRhythmId[rhythmId] || 0) + 1;
    });
  }

  // 5. Divide by 4 weeks
  return {
    totalEntries: Math.round(totalEntries / 4),
    totalDurationSeconds: Math.round(totalDurationSeconds / 4),
    byRhythmCompletedDays: Object.fromEntries(
      Object.entries(rhythmCompletionsByRhythmId).map(([id, count]) => [
        id,
        Math.round(count / 4),
      ]),
    ),
  };
}
```

---

### 5. Personal Records Detection (FR-004)

**Requirement**: Identify notable achievements within the current calendar month.

**Algorithm**:

```typescript
async function findPersonalRecordsThisMonth(
  userId: string,
  asOfDate: Date,
  userTimezone: string,
): Promise<
  Array<{
    type: string; // "longest_session" | "most_entries_in_day" | "highest_tally" etc.
    label: string;
    value: number;
    unit: string;
    happenedAt: string; // ISO date
  }>
> {
  // 1. Get current calendar month boundaries in user's timezone
  const localDate = getLocalDateForTimezone(asOfDate, userTimezone);
  const monthStart = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
  const monthEnd = new Date(
    localDate.getFullYear(),
    localDate.getMonth() + 1,
    0,
  );

  const utcStart = getUtcFromLocalDate(monthStart, userTimezone);
  const utcEnd = getUtcFromLocalDate(
    new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000),
    userTimezone,
  );

  // 2. Query all entries this month
  const monthEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, userId),
      gte(entries.createdAt, utcStart),
      lt(entries.createdAt, utcEnd),
    ),
  });

  const records: Array<any> = [];

  // 3. Find longest session
  let longestSession = { durationSeconds: 0, createdAt: "" };
  const sessionEntries = monthEntries.filter((e) => e.type === "timed");
  for (const entry of sessionEntries) {
    const duration = entry.data?.durationSeconds || 0;
    if (duration > longestSession.durationSeconds) {
      longestSession = {
        durationSeconds: duration,
        createdAt: entry.createdAt,
      };
    }
  }
  if (longestSession.durationSeconds > 600) {
    // Only notable if > 10 min
    records.push({
      type: "longest_session",
      label: `Longest session: ${formatDuration(longestSession.durationSeconds)}`,
      value: longestSession.durationSeconds,
      unit: "seconds",
      happenedAt: formatLocalDateIso(longestSession.createdAt, userTimezone),
    });
  }

  // 4. Find day with most entries
  const entriesByDay: Record<string, number> = {};
  for (const entry of monthEntries) {
    const day = getLocalDateString(entry.createdAt, userTimezone); // "2026-03-20"
    entriesByDay[day] = (entriesByDay[day] || 0) + 1;
  }
  const [maxDay, maxCount] = Object.entries(entriesByDay).reduce(
    (max, curr) => (curr[1] > max[1] ? curr : max),
    ["", 0],
  );
  if (maxCount > 5) {
    records.push({
      type: "most_active_day",
      label: `Most active day: ${maxCount} entries`,
      value: maxCount,
      unit: "entries",
      happenedAt: maxDay,
    });
  }

  return records;
}
```

---

### 6. Quiet Week Detection

**Requirement**: Spec edge cases, SC-003, SC-011 — gentle copy for low-activity weeks.

**Definition**: Quiet week if total entries (all types) ≤ 1 for the week.

**Implementation**:

```typescript
function isQuietWeek(snapshot: WeeklyStatsSnapshot): boolean {
  const total = Object.values(
    snapshot.generalProgress.entryCountsByType,
  ).reduce((a, b) => a + b, 0);
  return total <= 1;
}

async function renderTier1Stats(snapshot: WeeklyStatsSnapshot): Promise<{
  title: string;
  summaryBlocks: SummaryBlock[];
}> {
  const blocks: SummaryBlock[] = [];
  const quiet = isQuietWeek(snapshot);

  // Title
  const title = quiet ? "A quiet week, and that's okay" : "Your week in Ta-Da!";

  // General Progress Block
  if (quiet) {
    blocks.push({
      section: "general_progress",
      heading: "You showed up",
      lines: [
        "Even quiet weeks count. You logged entries when it mattered to you.",
        `Total entries: ${Object.values(snapshot.generalProgress.entryCountsByType).reduce((a, b) => a + b, 0)}`,
      ],
    });
  } else {
    // Normal week: show entry counts, durations, comparisons
    const lines = [];
    for (const [type, count] of Object.entries(
      snapshot.generalProgress.entryCountsByType,
    )) {
      if (count > 0) {
        lines.push(`${count} ${capitalize(type)}`);
      }
    }

    // Add durations
    const totalSeconds = Object.values(
      snapshot.generalProgress.sessionDurationsByCategory,
    ).reduce((a, b) => a + b, 0);
    if (totalSeconds > 0) {
      lines.push(`${formatDuration(totalSeconds)} of sessions`);
    }

    blocks.push({
      section: "general_progress",
      heading: "General progress",
      lines,
    });

    // Week-over-week comparison
    const { entryCountDelta, durationDeltaSeconds } =
      snapshot.generalProgress.weekOverWeek;
    if (entryCountDelta !== 0 || durationDeltaSeconds !== 0) {
      const entryTrend =
        entryCountDelta > 0
          ? `↑ ${entryCountDelta} more entries`
          : `↓ ${Math.abs(entryCountDelta)} fewer entries`;
      const durationTrend =
        durationDeltaSeconds > 0
          ? `↑ ${formatDuration(durationDeltaSeconds)} more time`
          : `↓ ${formatDuration(Math.abs(durationDeltaSeconds))} less time`;

      blocks.push({
        section: "general_progress",
        heading: "vs. last week",
        lines: [entryTrend, durationTrend],
      });
    }

    // Personal records
    if (snapshot.generalProgress.personalRecordsThisMonth.length > 0) {
      const prLines = snapshot.generalProgress.personalRecordsThisMonth.map(
        (pr) => `🎯 ${pr.label}`,
      );
      blocks.push({
        section: "general_progress",
        heading: "This month's highlights",
        lines: prLines,
      });
    }
  }

  // Rhythm Wins Block (omit entirely if no active rhythms or quiet week)
  if (!quiet && snapshot.rhythmWins.length > 0) {
    const rhythmLines = snapshot.rhythmWins.map((rw) => {
      let status = "";
      if (rw.chainStatus === "extended") status = "✨ extended";
      else if (rw.chainStatus === "maintained") status = "✓ maintained";
      else if (rw.chainStatus === "bending")
        status = "🤔 bending (but still going!)";
      else if (rw.chainStatus === "broken") status = "started fresh";

      let line = `${rw.rhythmName} chain ${status}`;
      if (rw.completedDays > 0) {
        line += ` (${rw.completedDays} days)`;
      }

      if (rw.allTimeMilestones.length > 0) {
        line += ` — ${rw.allTimeMilestones.map((m) => m.label).join(", ")}`;
      }

      return line;
    });

    blocks.push({
      section: "rhythm_wins",
      heading: "Rhythm wins",
      lines: rhythmLines,
    });
  }

  return { title, summaryBlocks: blocks };
}
```

---

### 7. Encouragement Stretch Goals & Variation (FR-009, SC-008)

**Requirement**: Per-rhythm stretch goals; vary copy each week (no repeats in 4-week window).

**Algorithm**:

```typescript
async function generateencouragementContent(
  userId: string,
  snapshot: WeeklyStatsSnapshot,
  trailingFourWeekAverages: {
    totalEntries: number;
    totalDurationSeconds: number;
    byRhythmCompletedDays: Record<string, number>;
  },
): Promise<{
  title: string;
  summaryBlocks: SummaryBlock[];
  usedCopyVariant: string; // for deduplication check
}> {
  const blocks: SummaryBlock[] = [];

  // 1. Determine overall momentum
  const currentWeekTotal = Object.values(
    snapshot.generalProgress.entryCountsByType,
  ).reduce((a, b) => a + b, 0);
  const momentum =
    currentWeekTotal === 0
      ? "quiet"
      : currentWeekTotal > trailingFourWeekAverages.totalEntries * 1.1
        ? "ahead"
        : "steady";

  // 2. Select title based on momentum (rotation to avoid repetition)
  const titleVariants = {
    quiet: [
      "There's still room in this week",
      "You have time today",
      "One more thing counts",
    ],
    steady: [
      "Keep the momentum going",
      "You're on a roll",
      "One more would finish it well",
    ],
    ahead: [
      "What a week you're having",
      "You're crushing it",
      "You're way ahead",
    ],
  };

  // Fetch recent encouragements for this user to avoid repetition
  const recentEnc = await db.query.weeklyMessages.findMany({
    where: and(
      eq(weeklyMessages.userId, userId),
      eq(weeklyMessages.kind, "encouragement"),
      gte(
        weeklyMessages.weekStartDate,
        getDateNWeeksAgo(4, snapshot.timezone), // last 4 weeks
      ),
    ),
    orderBy: desc(weeklyMessages.createdAt),
    limit: 10,
  });

  const usedTitles = recentEnc.map((m) => m.title);
  const availableTitles = titleVariants[
    momentum as keyof typeof titleVariants
  ].filter((t) => !usedTitles.includes(t));
  const title =
    availableTitles.length > 0
      ? availableTitles[0]
      : titleVariants[momentum as keyof typeof titleVariants][0];

  blocks.push({
    section: "general_progress",
    heading: "Your week so far",
    lines: [
      `${currentWeekTotal} entries logged`,
      momentum === "ahead"
        ? `You're ${Math.round((currentWeekTotal / trailingFourWeekAverages.totalEntries - 1) * 100)}% ahead of average`
        : momentum === "quiet"
          ? `Average week has ${trailingFourWeekAverages.totalEntries} — ${trailingFourWeekAverages.totalEntries - currentWeekTotal} to go`
          : `On track with your usual pace`,
    ],
  });

  // 3. Rhythm stretch goals
  const stretchLines: string[] = [];
  for (const rhythm of snapshot.rhythmWins) {
    const avg =
      trailingFourWeekAverages.byRhythmCompletedDays[rhythm.rhythmId] || 0;
    const current = rhythm.completedDays;

    if (current < avg) {
      const shortfall = avg - current;
      if (shortfall === 1) {
        stretchLines.push(
          `One more ${rhythm.rhythmName} and you match last week`,
        );
      } else {
        stretchLines.push(
          `${shortfall} more ${rhythm.rhythmName} to match last week`,
        );
      }
    } else if (current === avg && avg > 0) {
      stretchLines.push(`You've matched your ${rhythm.rhythmName} average`);
    }
  }

  if (stretchLines.length > 0) {
    blocks.push({
      section: "stretch_goals",
      heading: "Small moves that would count",
      lines: stretchLines,
    });
  } else if (snapshot.rhythmWins.length === 0) {
    // No rhythms: just encourage entry
    blocks.push({
      section: "stretch_goals",
      heading: "What would feel good today?",
      lines: ["Add one entry — any type, any length"],
    });
  }

  return { title, summaryBlocks: blocks, usedCopyVariant: title };
}
```

---

### 8. Timezone Handling & Re-Scheduling

**Requirement**: Spec edge case — "if user changes timezone, recalculate delivery time for next scheduled delivery"

**Implementation**:

```typescript
// When timezone is updated in settings:
async function handleTimezoneChange(
  userId: string,
  oldTimezone: string,
  newTimezone: string,
): Promise<void> {
  // 1. Recalculate next scheduled delivery times
  const settings = await db.query.weeklyRhythmSettings.findFirst({
    where: eq(weeklyRhythmSettings.userId, userId),
  });

  if (!settings) return;

  // 2. Find any pending messages (status = "generated" or "queued")
  const pendingMessages = await db.query.weeklyMessages.findMany({
    where: and(
      eq(weeklyMessages.userId, userId),
      inArray(weeklyMessages.status, ["generated", "queued"]),
    ),
  });

  // 3. For each pending message, recalculate scheduledDeliveryAt
  for (const msg of pendingMessages) {
    const originalScheduledFor = new Date(msg.scheduledDeliveryAt!);

    // Convert original UTC time back to local time in old timezone
    const localTimeString = getLocalTimeString(
      originalScheduledFor,
      oldTimezone,
    );

    // Convert that local time to new timezone
    const newScheduledFor = getUtcFromLocalTimeString(
      localTimeString,
      newTimezone,
    );

    await db
      .update(weeklyMessages)
      .set({ scheduledDeliveryAt: newScheduledFor })
      .where(eq(weeklyMessages.id, msg.id));
  }

  // 4. Update settings to reflect new timezone in future schedules
  // (already stored in users.timezone, just verify it's in sync)
}
```

---

### 9. Scheduler Idempotency & Catch-Up

**Requirement**: Scheduler survives restarts; handles downtime without duplicates.

**Key Design**:

- Scheduler creates `weekly_due_work` records for future weeks at config time.
- Sweep runs: check for due work where `scheduledFor ≤ now`, execute, mark done.
- On startup: backfill any missed due work from the last 7 days.
- Uniqueness enforced by database constraint `(userId, kind, weekStartDate)`.

**Implementation**:

```typescript
// app/server/plugins/weekly-rhythms.ts
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const enabled = config.weeklyRhythmsEnabled !== false;

  if (!enabled) return;

  // 1. On startup: catch up any missed generations
  setTimeout(async () => {
    try {
      const logger = createLogger("weekly-rhythms:startup");
      logger.info("🌙 Weekly rhythms scheduler starting up");

      // Find users who might have missed generations in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const allUsers = await db.query.users.findMany();
      for (const user of allUsers) {
        if (!user.timezone) continue;

        // Check what celebrations/encouragements *should* have been generated
        const missedWeeks = generateMissedWeekWindows(
          user.timezone,
          sevenDaysAgo,
        );

        for (const window of missedWeeks) {
          const existing = await db.query.weeklyMessages.findFirst({
            where: and(
              eq(weeklyMessages.userId, user.id),
              eq(weeklyMessages.kind, window.kind),
              eq(weeklyMessages.weekStartDate, window.weekStartDate),
            ),
          });

          if (!existing && window.kind === "celebration") {
            // Catch up generation
            await generateWeeklyContent(
              user.id,
              window.kind,
              window.weekStartDate,
            );
            logger.info(
              `📋 Caught up ${window.kind} for ${user.id} week ${window.weekStartDate}`,
            );
          }
        }
      }
    } catch (err) {
      console.error("Weekly rhythms startup error:", err);
    }
  }, 5000); // Give server 5s to stabilize before scheduler runs

  // 2. Run sweep every 5 minutes
  setInterval(
    async () => {
      try {
        await runWeeklyRhythmsSchedulerSweep();
      } catch (err) {
        console.error("Weekly rhythms sweep error:", err);
      }
    },
    5 * 60 * 1000,
  );
});

async function runWeeklyRhythmsSchedulerSweep(): Promise<void> {
  const logger = createLogger("weekly-rhythms:sweep");

  // Find all messages ready for delivery
  const duMessages = await db.query.weeklyMessages.findMany({
    where: and(
      eq(weeklyMessages.status, "queued"),
      lte(weeklyMessages.scheduledDeliveryAt, new Date()),
    ),
  });

  for (const message of duMessages) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, message.userId),
      });

      if (!user || !user.email) {
        logger.warn(`⚠️ Skipping ${message.id}: no valid user/email`);
        continue;
      }

      const settings = await db.query.weeklyRhythmSettings.findFirst({
        where: eq(weeklyRhythmSettings.userId, message.userId),
      });

      if (!settings) continue;

      const channels = settings.deliveryChannels;
      const isEmailChannel =
        message.kind === "celebration"
          ? channels.celebration.email
          : channels.encouragement.email;

      if (isEmailChannel && message.emailHtml && message.emailSubject) {
        const result = await deliverEmail(
          message.userId,
          message.id,
          user.email,
          message.emailSubject,
          message.emailHtml,
          message.emailText || "",
        );

        if (result.success) {
          await db
            .update(weeklyMessages)
            .set({ status: "delivered", deliveredAt: new Date() })
            .where(eq(weeklyMessages.id, message.id));

          logger.info(`✓ Delivered ${message.kind} to ${message.userId}`);
        } else if (result.shouldRetry) {
          logger.info(`↻ Email failed; retry scheduled for ${message.id}`);
        } else {
          await db
            .update(weeklyMessages)
            .set({ status: "failed" })
            .where(eq(weeklyMessages.id, message.id));

          logger.error(`✗ Failed ${message.id}: ${result.error}`);
        }
      } else {
        // In-app only
        await db
          .update(weeklyMessages)
          .set({ status: "delivered", deliveredAt: new Date() })
          .where(eq(weeklyMessages.id, message.id));

        logger.info(`✓ In-app ${message.kind} ready for ${message.userId}`);
      }
    } catch (err) {
      logger.error(`Sweep error for message ${message.id}:`, err);
    }
  }
}
```

---

### 10. Onboarding Flow & UX Copy

**Requirement**: FR-041, SC-004 — complete in < 2 minutes with plain-language tier descriptions.

**Tier Descriptions** (for WeeklyTierPicker.vue):

```typescript
const tierDescriptions = {
  stats_only: {
    name: "Stats Only",
    description:
      "Pure numbers. Entry counts, session times, week-over-week changes, and your rhythm chains.",
    privacy: "Everything stays on your device. Zero data sent anywhere.",
    icon: "📊",
  },
  private_ai: {
    name: "Private AI (Beta)",
    description:
      "Our AI writes a warm summary entirely on your server—pattern observations, encouragement, and weekly themes.",
    privacy:
      "Your data never leaves your server. Requires local AI capability.",
    icon: "🤓",
    badge: "Coming soon",
  },
  cloud_factual: {
    name: "AI Enhanced",
    description:
      "Polished, factual summaries written by cloud AI. Well-crafted, grounded in your data, no creative liberties.",
    privacy:
      "We send only your summary stats—counts, durations, milestones. Never your actual entries or personal notes.",
    icon: "✨",
  },
  cloud_creative: {
    name: "AI Creative",
    description:
      "Fun, playful summaries full of personality. Metaphors, humor, and a voice that's genuinely delightful.",
    privacy:
      "Same privacy boundary as AI Enhanced: only summary stats sent, never personal content.",
    icon: "🎨",
  },
};
```

**Onboarding Flow** (in WeeklyRhythmsSettings.vue):

1. **Welcome**: "Enable weekly celebrations & mid-week encouragement"
2. **Tier Selection**: Show 4 cards with icons + descriptions; highlight "Stats Only" as default
3. **Email Configuration**: "You'll receive emails at 8:08am every Monday. We'll use your account email."
   - If no email set: link to email settings
   - If email set: show current email with "Change" button
4. **Delivery Channels**: Toggle "Email" (checked) and "In-app" (always available)
5. **Thursday Encouragement**: Toggle "Get a mid-week nudge on Thursday at 3:03pm"
6. **Privacy Acknowledgment** (if cloud tier): Checkbox "I understand only my summary stats are sent to AI"
7. **Save**: Create `weekly_rhythm_settings` record with defaults

Target: 2 minutes for walkthrough (5 clicks, 1 email check).

---

## Project Structure (Updated)

## Implementation Phases

### Phase 1: Schema & Core Services (Days 1–3)

**Inputs**: None (greenfield)

**Deliverables**:

1. Database migration for 4 new tables (schema.ts + drizzle migration)
2. `time.ts`: Timezone-aware week boundaries, delivery windows
3. `snapshots.ts`: Aggregation logic with quiet week, personal records, 4-week averages
4. Unit tests for time helpers and snapshot generation

**Key Algorithms Implemented**: Week boundaries, 4-week average calculation, personal records, quiet week detection

**Validation**:

```bash
cd app
bun run db:generate
bun run db:migrate
bun run test app/server/services/weekly-rhythms/time.test.ts
bun run test app/server/services/weekly-rhythms/snapshots.test.ts
```

---

### Phase 2: Rendering & Tier Logic (Days 4–5)

**Inputs**: Phase 1 snapshots

**Deliverables**:

1. `renderer.ts`: Tier 1 structural rendering (stats-only baseline)
2. `encouragement.ts`: Stretch goal + copy variation logic
3. `providers/privateAi.ts`: Capability detection + timeout handling
4. `providers/cloudAi.ts`: Provider adapter (OpenAI/Anthropic contract)
5. Tier fallback tests

**Key Algorithms Implemented**: Tier fallback chain, encouragement stretch goals, copy variation deduplication

**Validation**:

```bash
bun run test app/server/services/weekly-rhythms/renderer.test.ts
bun run test app/server/services/weekly-rhythms/encouragement.test.ts
```

---

### Phase 3: Delivery & Email (Days 6–7)

**Inputs**: Phase 1–2 messages and snapshots

**Deliverables**:

1. Token generation/verification for unsubscribe (`weeklyRhythmTokens.ts`)
2. `delivery.ts`: Multi-channel orchestration, bounce retry strategy
3. `weekly-rhythms-email.ts`: HTML + plain-text templates with unsubscribe links
4. Email delivery tests with mock SMTP

**Key Algorithms Implemented**: Exponential backoff, consecutive failure counter, auto-disable after 3 bounces

**Validation**:

```bash
bun run test app/server/services/weekly-rhythms/delivery.test.ts
bun run test app/server/utils/weeklyRhythmTokens.test.ts
```

---

### Phase 4: Scheduler & Messages (Day 8)

**Inputs**: All Phase 1–3 services

**Deliverables**:

1. `scheduler.ts`: Message creation, due-work tracking, catch-up logic
2. `plugins/weekly-rhythms.ts`: Startup catch-up, recurring sweep
3. Scheduler integration tests (fake time, idempotency)

**Key Algorithms Implemented**: Idempotent execution, duplicate prevention, downtime recovery

**Validation**:

```bash
bun run test app/server/services/weekly-rhythms/scheduler.test.ts
```

---

### Phase 5: API Endpoints (Days 9–10)

**Inputs**: Phase 1–4 services

**Deliverables**:

1. Settings API (GET/PUT `/api/weekly-rhythms/settings`)
2. Current/History APIs (`/current`, `/history`)
3. Preview and unsubscribe endpoints
4. Dismiss endpoint for in-app banners
5. API contract validation tests

**Validation**:

```bash
bun run test app/server/api/weekly-rhythms/*.test.ts
```

---

### Phase 6: Frontend Components & Onboarding (Days 11–12)

**Inputs**: Phase 5 API contracts

**Deliverables**:

1. `WeeklyRhythmsSettings.vue`: Onboarding + settings form
2. `WeeklyTierPicker.vue`: 4-tier selector with descriptions
3. `WeeklyEncouragementBanner.vue`: Dismissible Thursday banner
4. `WeeklyCelebrationCard.vue`: Monday celebration rendering
5. `useWeeklyRhythms.ts`: Composable for settings mutations

**Validation**:

```bash
bun run test app/components/weekly-rhythms/*.test.ts
```

---

### Phase 7: Integration & Hardening (Days 13–14)

**Inputs**: Phase 1–6 complete

**Deliverables**:

1. End-to-end tests (entry creation → snapshot → message → delivery)
2. Bounce retry workflow tests
3. Timezone change + mid-week tier change edge cases
4. Quiet week rendering validation
5. Manual testing checklist

**Validation**:

```bash
bun run test:run app/tests/
bun run typecheck
bun run lint
```

---

## Configuration & Environment Variables

Required additions to `.env`:

```bash
# SMTP (reuse existing)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@tada.living

# Weekly Rhythms
WEEKLY_RHYTHMS_ENABLED=true
WEEKLY_RHYTHMS_TOKEN_SECRET=your-hmac-secret-32-chars-min
WEEKLY_RHYTHMS_SWEEP_INTERVAL_MS=300000  # 5 minutes

# Cloud AI (if using Tier 3/4)
CLOUD_AI_PROVIDER=openai                 # or "anthropic"
CLOUD_AI_MODEL=gpt-4
CLOUD_AI_API_KEY=sk-...

# Private AI (optional, for Tier 2)
PRIVATE_AI_ENDPOINT=http://localhost:8000  # local LLM
PRIVATE_AI_TIMEOUT_MS=60000
PRIVATE_AI_ENABLED=false                 # gated feature flag
```

---

## Testing Strategy

### Unit Tests (Co-located)

- **TimeHelpers** (`time.test.ts`): Week boundaries, crossing month/DST, timezone edge cases
- **Snapshots** (`snapshots.test.ts`): Aggregation accuracy, 0 rhythms, quiet weeks, personal records
- **Renderers** (`renderer.test.ts`): Tier 1 copy, gentle language (no guilt), rhythm wins structure
- **Encouragement** (`encouragement.test.ts`): Stretch goals, copy variation, momentum tiers
- **Tokens** (`weeklyRhythmTokens.test.ts`): Generation, signature verification, expiration
- **Delivery** (`delivery.test.ts`): Retry backoff, bounce counter, auto-disable logic
- **Providers** (`cloudAi.test.ts`, `privateAi.test.ts`): Provider adapters, fallback triggering, timeouts

### Integration Tests

- **Scheduler** (`scheduler.test.ts`): Idempotency, catch-up, no duplicates
- **Email Workflow** (`email-workflow.test.ts`): Generation → queued → sent → unsubscribe
- **Tier Fallback** (`tier-fallback.test.ts`): All tiers → Tier 1 on error
- **Edge Cases** (`edge-cases.test.ts`): Timezone change, mid-week tier change, quiet weeks, no rhythms

### Manual Testing Checklist

- [ ] Enable celebrations, create entries throughout week, verify Monday email
- [ ] Click unsubscribe link, verify email stops but in-app continues
- [ ] Enable 3 times, each email bounces, verify auto-disable after 3rd bounce
- [ ] Change tier mid-week, verify next celebration uses new tier
- [ ] Change timezone, verify next message uses new local time
- [ ] Verify Thursday encouragement appears in-app at 3:03pm local time
- [ ] Disable email delivery, verify in-app still shows
- [ ] Test with 0 rhythms, verify general progress only
- [ ] Test quiet week (1 entry), verify gentle copy
- [ ] Test 4+ rhythms, verify all shown with status

---

## Risk Mitigations

| Risk                                          | Severity | Mitigation                                                                                                                        |
| --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| SMTP-only installs can't detect async bounces | Medium   | Document that auto-disable requires webhook support; flag bare SMTP as limitation in deploy docs; plan webhook adapter for future |
| Personal record edge cases (month boundaries) | Low      | Extensive test coverage; define calendar month clearly in code comments                                                           |
| Scheduler duplicate execution on restart      | High     | Database uniqueness constraint + status machine prevents dupes; catch-up only fills gaps > 7 days                                 |
| Tier fallback silently downgrades             | Medium   | Log fallback reason; always populate `fallbackReason` field in message record for audit                                           |
| Cloud AI returns off-brand content            | Low      | Use celebratory-tone system prompt; summary-stats-only input limits hallucination risk; no moderation needed for V1               |
| User email becomes invalid mid-week           | Medium   | Track bounce count; auto-disable after 3; notify user in-app to update email in settings                                          |
| Push delivery unavailable mid-feature         | Low      | Feature-flag push channel; architecture leaves room for future integration; start with `push: false` in all defaults              |
| Timezone DST transitions                      | Low      | Use `date-fns` or Node.js native timezone helpers; test around March/November boundary                                            |
| Encouragement copy repeats within 4 weeks     | Low      | Query last 4 weeks of encouragements before generation; cross with variant list; randomize if needed                              |

---

## Requirement Mapping

Each phase and algorithm above maps to spec requirements:

| Requirement                      | Phase | Algorithm/Component                    |
| -------------------------------- | ----- | -------------------------------------- |
| FR-001–006 (Aggregation)         | 1     | snapshots.ts                           |
| FR-007–015 (Encouragement)       | 2     | encouragement.ts, providers            |
| FR-016–020 (Tier 1)              | 2     | renderer.ts                            |
| FR-021–024 (Tier 2)              | 2     | providers/privateAi.ts                 |
| FR-025–031 (Tier 3/4)            | 2     | providers/cloudAi.ts                   |
| FR-032–037 (Email + unsubscribe) | 3     | delivery.ts, weeklyRhythmTokens.ts     |
| FR-038–042 (Settings)            | 5     | settings.get/put.ts                    |
| FR-043–045 (Privacy)             | 2, 5  | providers/cloudAi.ts, WeeklyTierPicker |
| SC-001–012 (Success Criteria)    | All   | E2E tests, manual checklist            |

---

## Rollback & Safety

**Before Going Live**:

1. Feature flag `weeklyRhythmsEnabled` defaults to `false`
2. Enable only after Phase 7 testing + manual checklist green
3. Roll out to 10% of users first (env var `WEEKLY_RHYTHMS_USERBASE_PCT`)
4. Monitor logs for scheduler errors, bounce rates, API latencies
5. If critical issues: set `WEEKLY_RHYTHMS_ENABLED=false` to pause all generations

**Data Safety**:

- All weekly rhythm data (settings, snapshots, messages) stored in same SQLite as entries
- Backup strategy inherited from main app
- No external dependencies on cloud AI for core app operation (Tier 1 always works)
