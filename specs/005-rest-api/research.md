# Phase 0 Research: Ta-Da! REST API

**Date**: 2026-02-01
**Phase**: 0 - Research & Discovery
**Status**: Complete

## Overview

This document captures research findings for key technical decisions required to implement the Ta-Da! REST API. Each section addresses specific unknowns identified in the implementation plan.

## 1. Authentication: API Keys + Lucia Integration

### Current State Analysis

**Existing System** ([app/server/db/schema.ts](../../app/server/db/schema.ts)):
- Lucia Auth v3.2.2 for session management
- `users` table with email/hashed password
- `sessions` table for active sessions
- Session validation via Lucia middleware

**Requirements**:
- Support API key authentication for external integrations
- Maintain backward compatibility with existing session auth
- Enable per-key permissions (entries:read, entries:write, etc.)

### Research Findings

**API Key Format**:
- Standard: `tada_key_` prefix + 32 random alphanumeric characters
- Generated via: `crypto.randomBytes(24).toString('base64url')`
- Total length: ~42 characters
- Prefix enables quick identification in logs

**Storage Strategy**:
```typescript
// Store hash, never plaintext
import bcrypt from 'bcryptjs'
const hash = await bcrypt.hash(apiKey, 12) // cost factor 12

// Validation (constant-time comparison)
const valid = await bcrypt.compare(providedKey, storedHash)
```

**Middleware Integration**:
```typescript
// app/server/api/v1/_middleware.ts
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    // Check if API key (starts with tada_key_)
    if (token.startsWith('tada_key_')) {
      const user = await validateApiKey(token)
      if (user) {
        event.context.user = user
        event.context.authType = 'api_key'
        event.context.permissions = user.permissions
        return // Success
      }
    }

    // Otherwise try session token
    const session = await validateSessionToken(token)
    if (session) {
      event.context.user = session.user
      event.context.authType = 'session'
      event.context.permissions = ['*'] // Full access
      return
    }
  }

  throw createError({ statusCode: 401, message: 'Unauthorized' })
})
```

**Decision**: Use bearer token authentication with prefix-based routing (API key vs session token). Store bcrypt hashes only. Middleware sets `event.context.user` and `event.context.permissions` for downstream use.

## 2. Rate Limiting Without Redis

### Requirements

- Enforce different limits per endpoint type (GET: 1000/hr, POST: 200/hr)
- Track per API key (not just per user)
- Work with SQLite (no Redis available)
- Low latency overhead (<10ms)

### Research Findings

**Sliding Window Counter Algorithm**:
```typescript
interface RateLimitEntry {
  count: number
  windowStart: number // timestamp
}

// In-memory LRU cache (size: 10000 keys)
const cache = new Map<string, RateLimitEntry>()

function checkRateLimit(keyId: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = cache.get(keyId)

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    cache.set(keyId, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= limit) {
    return false // Rate limited
  }

  entry.count++
  return true
}
```

**Headers** (RFC 6585):
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1706745600
Retry-After: 3600  // seconds (when 429 returned)
```

**Persistent Audit Log** (optional):
- Periodically flush cache to SQLite `rateLimitLogs` table
- For analytics and abuse detection, not real-time enforcement
- Async background job runs every 5 minutes

**Decision**: In-memory LRU cache with sliding window algorithm. Acceptable trade-off: limits reset on server restart (rare in production). Add persistent audit logging in Phase 3 if needed.

## 3. Pattern Detection Algorithms

### Requirements

- Detect 4 pattern types: correlation, temporal, trend, sequence
- Analyze 90 days of historical data (typical: 800-1000 entries)
- Complete within 5 seconds for first run
- Cache results for repeat queries (<100ms)

### Research Findings

#### Correlation Patterns

**Pearson Correlation Coefficient**:
```typescript
function calculatePearson(x: number[], y: number[]): number {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))

  return denominator === 0 ? 0 : numerator / denominator
}
```

**Confidence Levels**:
- High: r > 0.6, p < 0.01, n > 30
- Medium: r > 0.4, p < 0.05, n > 20
- Low: r > 0.3, p < 0.1, n > 10

#### Temporal Patterns

**Day of Week Distribution**:
```typescript
const byDayOfWeek = entries.reduce((acc, entry) => {
  const day = new Date(entry.startTime).getDay()
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
  acc[dayName] = (acc[dayName] || 0) + 1
  return acc
}, {} as Record<string, number>)

// Calculate variance to determine if pattern exists
const values = Object.values(byDayOfWeek)
const mean = values.reduce((a, b) => a + b) / values.length
const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
const stdDev = Math.sqrt(variance)

// Significant if stdDev > mean * 0.3
```

#### Trend Patterns

**Linear Regression** (for duration/count trends):
```typescript
function linearRegression(data: { x: number, y: number }[]) {
  const n = data.length
  const sumX = data.reduce((sum, d) => sum + d.x, 0)
  const sumY = data.reduce((sum, d) => sum + d.y, 0)
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0)
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2)
  const intercept = (sumY - slope * sumX) / n

  // R-squared (goodness of fit)
  const yMean = sumY / n
  const ssTotal = data.reduce((sum, d) => sum + (d.y - yMean) ** 2, 0)
  const ssResidual = data.reduce((sum, d) => {
    const predicted = slope * d.x + intercept
    return sum + (d.y - predicted) ** 2
  }, 0)
  const rSquared = 1 - ssResidual / ssTotal

  return { slope, intercept, rSquared }
}
```

#### Sequence Patterns

**Sequential Event Detection**:
```typescript
// Find: "Event A often followed by Event B within N hours"
function detectSequence(
  entries: Entry[],
  antecedent: (e: Entry) => boolean,
  consequent: (e: Entry) => boolean,
  windowHours: number
): { rate: number, count: number } {
  const antecedents = entries.filter(antecedent)
  let matches = 0

  for (const ante of antecedents) {
    const anteTime = new Date(ante.startTime).getTime()
    const hasConsequent = entries.some(e => {
      if (!consequent(e)) return false
      const diff = new Date(e.startTime).getTime() - anteTime
      return diff > 0 && diff < windowHours * 3600 * 1000
    })
    if (hasConsequent) matches++
  }

  return {
    rate: antecedents.length > 0 ? matches / antecedents.length : 0,
    count: matches
  }
}
```

### Caching Strategy

**Schema**:
```typescript
interface InsightCache {
  id: string // `${userId}:${type}:${lookback}`
  userId: string
  type: 'patterns' | 'summary' | 'correlations'
  params: Record<string, any> // { lookback: 90, category: 'mindfulness' }
  data: any // Computed patterns
  computedAt: Date
  expiresAt: Date // computedAt + 1 hour
}
```

**Cache Key**: `userId:patterns:lookback:90:category:mindfulness`
**TTL**: 1 hour (insights change slowly)

**Decision**: Implement all 4 pattern types using standard statistical methods. Cache results in `insightCache` table with 1-hour TTL. Compute asynchronously if > 5s (return cached/stale data immediately, refresh in background).

## 4. Obsidian Export Format

### Requirements

- Generate markdown compatible with Obsidian daily notes
- Support Dataview plugin (inline metadata)
- Include summary, entries, rhythms, insights sections
- Weekly and monthly templates in addition to daily

### Research Findings

**Daily Note Format**:
```markdown
---
date: 2026-01-31
tags: [lifelogging, tada, daily-note]
mood: 8
entries: 12
meditation: 30m
---

## Ta-Da! Summary

🧘 **Meditation:** 30m (Day 4,016 streak!)
🏃 **Running:** 5km in 28:15
**Mood:** 8/10 - Peaceful, focused

### Accomplishments

- ✅ Finished tandem evaluation report
- ✅ Updated research paper
- 📖 Read 2 chapters of "Thinking Fast and Slow"

### Journal

> Deep meditation session this morning. Noticed thoughts settling quickly.
> Productive afternoon following the sit. Correlation holding strong.

### Rhythms

| Rhythm | Status | Progress |
|--------|--------|----------|
| Meditation | ✅ 30m | Day 4,016 |
| Running | ✅ 5km | 2/3 this week |
| Journaling | ✅ | 5/7 this week |

### Patterns Noticed

- Morning meditation → afternoon productivity (correlation: 0.82)
- Running days show higher mood (8.2 vs 7.1)

---
*Generated by Ta-Da! API | [View in Ta-Da!](https://tada.onemonkey.org)*
```

**Weekly Format**:
```markdown
## Weekly Review: Jan 25-31, 2026

### Highlights

🧘 **Meditation:** 7/7 days - Perfect week! (3h 45m total)
🏃 **Movement:** 3 runs, 15km total
✅ **Accomplishments:** 12 ta-das logged

### Patterns Noticed

- Morning meditation → afternoon productivity (strong correlation)
- Running days = higher mood (8.2 vs 7.1)
- Peak accomplishments on Tuesday & Thursday

### Category Breakdown

| Category | Count | Time |
|----------|-------|------|
| Mindfulness | 7 | 225m |
| Movement | 5 | 180m |
| Accomplishment | 12 | - |
| Journal | 5 | - |

### Mood Trend

Mon: 7 → Tue: 8 → Wed: 8 → Thu: 7 → Fri: 9 → Sat: 8 → Sun: 7
Average: 7.7 ⬆️

### Top Tags

#morning (7), #work (5), #focus (4), #deep (3)
```

**YAML Frontmatter** (Dataview compatibility):
- Always include `date`, `tags` array
- Optional metrics: `mood`, `energy`, `entries`, category-specific fields

**Decision**: Use YAML frontmatter + markdown sections. Generate daily, weekly, monthly templates. Include Dataview-compatible inline metadata. Provide section filtering via query param.

## 5. Webhook Delivery Architecture

### Requirements

- Async delivery (don't block API responses)
- Retry failed deliveries with exponential backoff
- Disable webhooks after sustained failures
- Secure via HMAC signatures
- Support 8 event types

### Research Findings

**Webhook Events**:
```typescript
type WebhookEvent =
  | 'entry.created'
  | 'entry.updated'
  | 'entry.deleted'
  | 'streak.milestone'   // 100, 500, 1000, etc.
  | 'rhythm.broken'      // Rare but important
  | 'rhythm.completed'   // Daily/weekly target met
  | 'pattern.detected'   // New insight found
  | 'import.completed'   // CSV import finished
```

**Payload Format**:
```typescript
interface WebhookPayload {
  event: WebhookEvent
  timestamp: string // ISO 8601
  data: any // Event-specific data
  webhook: {
    id: string
  }
}
```

**HMAC Signature** (SHA-256):
```typescript
import crypto from 'crypto'

function signPayload(payload: string, secret: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

// Verification on recipient side
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
```

**Retry Strategy**:
```typescript
interface RetryConfig {
  maxAttempts: 3
  backoffMs: [1000, 5000, 25000] // 1s, 5s, 25s
  timeout: 10000 // 10s per request
}

async function deliverWebhook(webhook: Webhook, payload: WebhookPayload, attempt = 1) {
  try {
    const signature = signPayload(JSON.stringify(payload), webhook.secret)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tada-Event': payload.event,
        'X-Tada-Signature': signature,
        'X-Tada-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'X-Tada-Delivery-Attempt': attempt.toString()
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok && attempt < 3) {
      // Retry
      await sleep(RetryConfig.backoffMs[attempt - 1])
      return deliverWebhook(webhook, payload, attempt + 1)
    }

    // Update success stats
    await updateWebhookStats(webhook.id, { success: true, lastTriggeredAt: new Date() })

  } catch (error) {
    if (attempt < 3) {
      await sleep(RetryConfig.backoffMs[attempt - 1])
      return deliverWebhook(webhook, payload, attempt + 1)
    }

    // Final failure
    await incrementFailureCount(webhook.id)

    // Disable if failure rate > 50% in last 20 attempts
    const stats = await getWebhookStats(webhook.id)
    if (stats.failureRate > 0.5 && stats.totalAttempts > 20) {
      await disableWebhook(webhook.id)
      // TODO: Notify user via email
    }
  }
}
```

**Background Queue** (MVP):
```typescript
// Simple in-process queue (non-persistent for MVP)
class WebhookQueue {
  private queue: Array<{ webhook: Webhook, payload: WebhookPayload }> = []
  private processing = false

  async enqueue(webhook: Webhook, payload: WebhookPayload) {
    this.queue.push({ webhook, payload })
    if (!this.processing) {
      this.process()
    }
  }

  private async process() {
    this.processing = true
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      await deliverWebhook(job.webhook, job.payload)
    }
    this.processing = false
  }
}

export const webhookQueue = new WebhookQueue()
```

**Decision**: Use in-process queue with async delivery. HMAC-SHA256 signatures for security. Exponential backoff retry (3 attempts). Disable webhooks after sustained failures (>50% failure rate over 20 attempts). Store delivery stats in webhooks table.

## 6. Additional Research

### Database Indexes

**Required Indexes**:
```sql
CREATE INDEX idx_entries_user_time ON entries(userId, startTime DESC);
CREATE INDEX idx_entries_user_type_category ON entries(userId, type, category);
CREATE INDEX idx_entries_user_deleted ON entries(userId, deletedAt);
CREATE INDEX idx_api_keys_prefix ON api_keys(keyPrefix);
CREATE INDEX idx_webhooks_user_active ON webhooks(userId, active);
CREATE INDEX idx_insight_cache_lookup ON insight_cache(userId, type, expiresAt);
```

**Impact**: Reduces query time from O(n) to O(log n) for filtered entry lookups.

### Security Considerations

**Timing Attack Prevention**:
```typescript
// Use constant-time comparison for API keys
import crypto from 'crypto'
crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
```

**SQL Injection**:
- ✅ Drizzle ORM uses parameterized queries by default
- No raw SQL except for specific aggregations (which use parameterized builders)

**Rate Limiting Bypass**:
- Track at both API key level AND user level
- IP-based fallback for unauthenticated endpoints
- Implement CAPTCHA for repeated auth failures (Phase 3)

### Performance Optimizations

**Connection Pooling**:
```typescript
// drizzle.config.ts
export default {
  poolSize: 10, // SQLite recommendation
  busyTimeout: 5000 // Wait up to 5s for lock
}
```

**WAL Mode** (Write-Ahead Logging):
```bash
# Enable in migration
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

**Benefit**: Allows concurrent reads during writes, reduces contention

## Summary of Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Auth Integration | Middleware checks Bearer token prefix, routes to API key or session validation | Maintains backward compatibility, centralizes auth logic |
| Rate Limiting | In-memory LRU cache with sliding window algorithm | Simple, low latency, acceptable restart trade-off |
| Pattern Detection | Statistical algorithms (Pearson, linear regression) + 1-hour cache | Industry-standard methods, cache mitigates compute cost |
| Export Format | YAML frontmatter + markdown sections, Dataview-compatible | Obsidian best practices, extensible |
| Webhooks | Async in-process queue + exponential backoff retry | Non-blocking, resilient, simple for MVP |
| Caching | SQLite table with TTL for insights, in-memory for rate limits | Persistent when needed, fast when ephemeral acceptable |
| Security | bcrypt cost 12, HMAC-SHA256, constant-time comparison | Industry standards, OWASP recommendations |

## Phase 0 Complete

All research questions answered with documented decisions. Ready to proceed to Phase 1: Design & Contracts.

**Next**: Generate [data-model.md](data-model.md), [contracts/](contracts/), and [quickstart.md](quickstart.md).
