# AGENTS.md - Ta-Da! API Development Guide

> Instructions for coding agents implementing the Ta-Da! API.

## Context

You are implementing a REST API for Ta-Da!, a lifelogging application. The API enables external integrations (OpenClaw, automations, mobile apps) to read and write life activity data.

**Read First:**
- `API-SPECIFICATION.md` - Complete API spec (source of truth)
- `OPENCLAW-SKILL.md` - How the API will be consumed

## Project Structure

```
tada/
├── app/
│   ├── server/
│   │   ├── api/                    # API routes (implement here!)
│   │   │   ├── v1/
│   │   │   │   ├── entries/
│   │   │   │   │   ├── index.get.ts
│   │   │   │   │   ├── index.post.ts
│   │   │   │   │   ├── [id].get.ts
│   │   │   │   │   ├── [id].patch.ts
│   │   │   │   │   ├── [id].delete.ts
│   │   │   │   │   └── bulk.post.ts
│   │   │   │   ├── rhythms/
│   │   │   │   │   ├── index.get.ts
│   │   │   │   │   ├── [id].get.ts
│   │   │   │   │   └── [id]/history.get.ts
│   │   │   │   ├── insights/
│   │   │   │   │   ├── patterns.get.ts
│   │   │   │   │   ├── correlations.get.ts
│   │   │   │   │   └── summary.get.ts
│   │   │   │   ├── export/
│   │   │   │   │   ├── entries.get.ts
│   │   │   │   │   └── obsidian.get.ts
│   │   │   │   ├── import/
│   │   │   │   │   ├── csv.post.ts
│   │   │   │   │   ├── insight-timer.post.ts
│   │   │   │   │   └── json.post.ts
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── index.get.ts
│   │   │   │   │   ├── index.post.ts
│   │   │   │   │   ├── [id].patch.ts
│   │   │   │   │   ├── [id].delete.ts
│   │   │   │   │   └── [id]/test.post.ts
│   │   │   │   ├── auth/
│   │   │   │   │   ├── keys.get.ts
│   │   │   │   │   ├── keys.post.ts
│   │   │   │   │   └── keys/[id].delete.ts
│   │   │   │   └── user/
│   │   │   │       ├── index.get.ts
│   │   │   │       └── settings.patch.ts
│   │   │   └── _middleware.ts      # Auth, rate limiting
│   │   └── utils/
│   │       ├── api-key.ts          # API key validation
│   │       ├── rate-limit.ts       # Rate limiting
│   │       └── response.ts         # Response formatting
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle schema (existing)
│   │   │   └── api-keys.ts         # API keys table (new)
│   │   └── services/
│   │       ├── entries.ts          # Entry CRUD service
│   │       ├── rhythms.ts          # Rhythm calculations
│   │       ├── insights.ts         # Pattern detection
│   │       └── export.ts           # Export formatting
│   └── data/
│       └── db.sqlite               # SQLite database
├── design/
│   └── SDR.md                      # System Design Record
└── docs/
    └── API.md                      # API documentation (auto-generated)
```

## Tech Stack

- **Framework:** Nuxt 3.15.1 (server routes)
- **Database:** SQLite via Drizzle ORM
- **Authentication:** API keys (custom) + Lucia Auth v3 (sessions)
- **Runtime:** Bun 1.3.5
- **Validation:** Zod

## Implementation Priority

### Phase 1: MVP (Week 1)

**Goal:** Basic read access for OpenClaw integration

1. **Authentication middleware**
   - API key validation
   - Extract user from key
   - Rate limiting (basic)

2. **GET /api/v1/entries**
   - Query params: date, start, end, type, category
   - Pagination: limit, offset
   - Response: entries array + meta

3. **GET /api/v1/entries/:id**
   - Single entry by ID

4. **GET /api/v1/rhythms**
   - All rhythms with current streak
   - Basic stats: today, thisWeek, thisMonth

5. **GET /api/v1/rhythms/meditation**
   - Focused meditation rhythm (most important!)

### Phase 2: Full CRUD (Week 2)

6. **POST /api/v1/entries**
   - Create new entry
   - Validation by type

7. **PATCH /api/v1/entries/:id**
   - Update existing entry

8. **DELETE /api/v1/entries/:id**
   - Soft delete

9. **GET /api/v1/insights/summary**
   - Period-based summary stats

10. **GET /api/v1/export/entries**
    - JSON/CSV export

11. **GET /api/v1/export/obsidian**
    - Markdown for daily notes

### Phase 3: Advanced (Week 3)

12. **GET /api/v1/insights/patterns**
    - Pattern detection algorithms
    - Correlation analysis

13. **POST /api/v1/entries/bulk**
    - Bulk create/update/delete

14. **Webhooks**
    - CRUD for webhook subscriptions
    - Event dispatching

15. **Import endpoints**
    - CSV parsing
    - Insight Timer format

### Phase 4: Polish (Week 4)

16. **API key management**
    - Create/list/revoke keys
    - Scoped permissions

17. **Rate limiting**
    - Per-endpoint limits
    - Headers

18. **Documentation**
    - OpenAPI spec generation
    - Interactive docs

---

## Implementation Details

### Database Schema Additions

```typescript
// lib/db/schema.ts - Add to existing schema

import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

// API Keys table
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => `key_${createId()}`),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(), // "OpenClaw Integration"
  keyHash: text('key_hash').notNull(), // bcrypt hash
  keyPrefix: text('key_prefix').notNull(), // First 8 chars for display
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
})

// Webhooks table
export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey().$defaultFn(() => `webhook_${createId()}`),
  userId: text('user_id').notNull().references(() => users.id),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: text('events', { mode: 'json' }).$type<string[]>().notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastTriggeredAt: integer('last_triggered_at', { mode: 'timestamp' }),
  failureCount: integer('failure_count').notNull().default(0),
})

// Cached insights (expensive to compute)
export const insightCache = sqliteTable('insight_cache', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'patterns', 'summary'
  params: text('params', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  data: text('data', { mode: 'json' }).$type<any>().notNull(),
  computedAt: integer('computed_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})
```

### Authentication Middleware

```typescript
// server/api/v1/_middleware.ts

import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
    })
  }
  
  const token = authHeader.slice(7)
  
  // Check if it's an API key (starts with 'tada_key_')
  if (token.startsWith('tada_key_')) {
    const user = await validateApiKey(token)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: { code: 'UNAUTHORIZED', message: 'Invalid API key' }
      })
    }
    
    // Store user and permissions in context
    event.context.user = user
    event.context.authType = 'api_key'
    event.context.permissions = user.permissions
    
    // Update last used
    await updateApiKeyLastUsed(token)
    
  } else {
    // Session token - use existing Lucia auth
    const session = await validateSessionToken(token)
    if (!session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: { code: 'TOKEN_EXPIRED', message: 'Session expired' }
      })
    }
    
    event.context.user = session.user
    event.context.authType = 'session'
    event.context.permissions = ['*'] // Full access with session
  }
  
  // Rate limiting
  await checkRateLimit(event)
})

async function validateApiKey(key: string) {
  const db = useDb()
  const prefix = key.slice(0, 16) // 'tada_key_' + first 8 chars
  
  // Find key by prefix
  const apiKey = await db.select()
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, prefix))
    .get()
  
  if (!apiKey) return null
  
  // Verify hash
  const valid = await bcrypt.compare(key, apiKey.keyHash)
  if (!valid) return null
  
  // Check expiry
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null
  }
  
  // Get user
  const user = await db.select()
    .from(users)
    .where(eq(users.id, apiKey.userId))
    .get()
  
  return user ? { ...user, permissions: apiKey.permissions } : null
}
```

### Response Formatting

```typescript
// server/utils/response.ts

interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    limit?: number
    offset?: number
    hasMore?: boolean
    [key: string]: any
  }
}

interface ApiError {
  error: {
    code: string
    message: string
    details?: any
  }
  meta: {
    requestId: string
    timestamp: string
  }
}

export function success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { data, ...(meta && { meta }) }
}

export function paginated<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): ApiResponse<T[]> {
  return {
    data,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total
    }
  }
}

export function apiError(
  statusCode: number,
  code: string,
  message: string,
  details?: any
): never {
  throw createError({
    statusCode,
    statusMessage: message,
    data: {
      error: { code, message, ...(details && { details }) },
      meta: {
        requestId: `req_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString()
      }
    }
  })
}
```

### Entries Endpoint Example

```typescript
// server/api/v1/entries/index.get.ts

import { z } from 'zod'
import { and, eq, gte, lte, like, desc, asc, sql } from 'drizzle-orm'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['timed', 'tada', 'tally', 'moment']).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  search: z.string().optional(),
  sort: z.enum(['startTime', 'createdAt', 'duration']).default('startTime'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  // Check permission
  if (!hasPermission(event, 'entries:read')) {
    return apiError(403, 'FORBIDDEN', 'Missing entries:read permission')
  }

  // Parse and validate query
  const query = getQuery(event)
  const params = querySchema.safeParse(query)
  
  if (!params.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid query parameters', params.error.issues)
  }

  const { date, start, end, type, category, subcategory, tags, search, sort, order, limit, offset } = params.data
  const userId = event.context.user.id
  const db = useDb()

  // Build query conditions
  const conditions = [eq(entries.userId, userId), eq(entries.deletedAt, null)]
  
  if (date) {
    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd = new Date(`${date}T23:59:59`)
    conditions.push(gte(entries.startTime, dayStart))
    conditions.push(lte(entries.startTime, dayEnd))
  }
  
  if (start) {
    conditions.push(gte(entries.startTime, new Date(`${start}T00:00:00`)))
  }
  
  if (end) {
    conditions.push(lte(entries.startTime, new Date(`${end}T23:59:59`)))
  }
  
  if (type) {
    conditions.push(eq(entries.type, type))
  }
  
  if (category) {
    conditions.push(eq(entries.category, category))
  }
  
  if (subcategory) {
    conditions.push(eq(entries.subcategory, subcategory))
  }
  
  if (search) {
    conditions.push(
      sql`(${entries.title} LIKE ${`%${search}%`} OR ${entries.note} LIKE ${`%${search}%`})`
    )
  }

  // Count total
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(and(...conditions))
    .get()
  
  const total = countResult?.count ?? 0

  // Fetch entries
  const orderFn = order === 'asc' ? asc : desc
  const sortColumn = entries[sort as keyof typeof entries] ?? entries.startTime
  
  const results = await db.select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset)
    .all()

  // Filter by tags (JSON array, requires post-filter)
  let filteredResults = results
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase())
    filteredResults = results.filter(entry => {
      const entryTags = (entry.tags || []).map(t => t.toLowerCase())
      return tagList.some(tag => entryTags.includes(tag))
    })
  }

  return paginated(filteredResults, total, limit, offset)
})
```

### Rhythms Calculation

```typescript
// lib/services/rhythms.ts

import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from 'date-fns'

interface RhythmStats {
  today: { completed: boolean; count: number; totalMinutes: number }
  thisWeek: { days: number; sessions: number; totalMinutes: number; avgMinutes: number }
  thisMonth: { days: number; sessions: number; totalMinutes: number; avgMinutes: number }
  allTime: { totalSessions: number; totalMinutes: number; avgMinutes: number; firstEntry: string }
}

interface Streak {
  current: number
  longest: number
  lastCompleted: string
  startedAt: string
}

export async function calculateRhythm(
  db: any,
  userId: string,
  type: string,
  category: string,
  subcategory?: string
) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const yearStart = startOfYear(now)

  // Build base conditions
  const baseConditions = [
    eq(entries.userId, userId),
    eq(entries.type, type),
    eq(entries.category, category),
    eq(entries.deletedAt, null)
  ]
  
  if (subcategory) {
    baseConditions.push(eq(entries.subcategory, subcategory))
  }

  // Get all matching entries for streak calculation
  const allEntries = await db.select({
    date: sql<string>`date(${entries.startTime})`,
    count: sql<number>`count(*)`,
    totalDuration: sql<number>`sum(${entries.duration})`
  })
    .from(entries)
    .where(and(...baseConditions))
    .groupBy(sql`date(${entries.startTime})`)
    .orderBy(sql`date(${entries.startTime}) DESC`)
    .all()

  // Calculate streak
  const streak = calculateStreak(allEntries.map(e => e.date))

  // Today's stats
  const todayEntries = await db.select()
    .from(entries)
    .where(and(...baseConditions, gte(entries.startTime, todayStart)))
    .all()

  const todayStats = {
    completed: todayEntries.length > 0,
    count: todayEntries.length,
    totalMinutes: Math.round(todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60)
  }

  // This week stats
  const weekEntries = await db.select()
    .from(entries)
    .where(and(...baseConditions, gte(entries.startTime, weekStart)))
    .all()

  const weekDays = new Set(weekEntries.map(e => e.startTime.toISOString().split('T')[0])).size
  const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60

  const weekStats = {
    days: weekDays,
    sessions: weekEntries.length,
    totalMinutes: Math.round(weekMinutes),
    avgMinutes: weekDays > 0 ? Math.round(weekMinutes / weekDays) : 0
  }

  // This month stats
  const monthEntries = await db.select()
    .from(entries)
    .where(and(...baseConditions, gte(entries.startTime, monthStart)))
    .all()

  const monthDays = new Set(monthEntries.map(e => e.startTime.toISOString().split('T')[0])).size
  const monthMinutes = monthEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60

  const monthStats = {
    days: monthDays,
    sessions: monthEntries.length,
    totalMinutes: Math.round(monthMinutes),
    avgMinutes: monthDays > 0 ? Math.round(monthMinutes / monthDays) : 0
  }

  // All time stats
  const allTimeStats = await db.select({
    totalSessions: sql<number>`count(*)`,
    totalDuration: sql<number>`sum(${entries.duration})`,
    firstEntry: sql<string>`min(date(${entries.startTime}))`
  })
    .from(entries)
    .where(and(...baseConditions))
    .get()

  const allTimeTotalMinutes = (allTimeStats?.totalDuration || 0) / 60

  return {
    type,
    category,
    subcategory,
    streak,
    stats: {
      today: todayStats,
      thisWeek: weekStats,
      thisMonth: monthStats,
      allTime: {
        totalSessions: allTimeStats?.totalSessions || 0,
        totalMinutes: Math.round(allTimeTotalMinutes),
        avgMinutes: allTimeStats?.totalSessions > 0 
          ? Math.round(allTimeTotalMinutes / allTimeStats.totalSessions) 
          : 0,
        firstEntry: allTimeStats?.firstEntry
      }
    }
  }
}

function calculateStreak(dates: string[]): Streak {
  if (dates.length === 0) {
    return { current: 0, longest: 0, lastCompleted: '', startedAt: '' }
  }

  // dates are sorted DESC (most recent first)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = subDays(new Date(), 1).toISOString().split('T')[0]
  
  let current = 0
  let longest = 0
  let streakStart = dates[0]
  let currentStreakStart = dates[0]
  let tempStreak = 0
  let tempStart = dates[0]

  // Check if streak is active (done today or yesterday)
  const streakActive = dates[0] === today || dates[0] === yesterday

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const nextDate = dates[i + 1]
    
    tempStreak++
    
    if (nextDate) {
      const diff = (new Date(date).getTime() - new Date(nextDate).getTime()) / (1000 * 60 * 60 * 24)
      
      if (diff === 1) {
        // Consecutive day
        continue
      } else {
        // Streak broken
        if (tempStreak > longest) {
          longest = tempStreak
          streakStart = tempStart
        }
        if (i === 0 && streakActive) {
          current = tempStreak
          currentStreakStart = tempStart
        }
        tempStreak = 0
        tempStart = nextDate
      }
    } else {
      // Last entry
      if (tempStreak > longest) {
        longest = tempStreak
        streakStart = tempStart
      }
      if (streakActive && current === 0) {
        current = tempStreak
        currentStreakStart = tempStart
      }
    }
  }

  return {
    current: streakActive ? current : 0,
    longest,
    lastCompleted: dates[0],
    startedAt: currentStreakStart
  }
}
```

### Pattern Detection

```typescript
// lib/services/insights.ts

interface Pattern {
  id: string
  type: 'correlation' | 'temporal' | 'trend' | 'sequence'
  confidence: 'low' | 'medium' | 'high'
  score: number
  title: string
  description: string
  variables: any
  evidence: any
  firstDetected: string
  lastConfirmed: string
}

export async function detectPatterns(
  db: any,
  userId: string,
  lookback: number = 90
): Promise<Pattern[]> {
  const patterns: Pattern[] = []
  const startDate = subDays(new Date(), lookback)

  // Get all entries in range
  const allEntries = await db.select()
    .from(entries)
    .where(and(
      eq(entries.userId, userId),
      gte(entries.startTime, startDate),
      eq(entries.deletedAt, null)
    ))
    .all()

  // Group by day
  const byDay = groupByDay(allEntries)

  // 1. Meditation → Productivity correlation
  const meditationProductivity = analyzeCorrelation(byDay, {
    predictor: (entries) => entries.some(e => 
      e.type === 'timed' && e.category === 'mindfulness' && new Date(e.startTime).getHours() < 10
    ),
    outcome: (entries) => entries.filter(e => 
      e.type === 'tada' && e.category === 'accomplishment' && new Date(e.startTime).getHours() >= 14
    ).length
  })

  if (meditationProductivity.correlation > 0.3) {
    patterns.push({
      id: 'pattern_meditation_productivity',
      type: 'correlation',
      confidence: meditationProductivity.correlation > 0.6 ? 'high' : 'medium',
      score: meditationProductivity.correlation,
      title: 'Morning meditation boosts afternoon productivity',
      description: `Days with meditation before 10 AM show ${meditationProductivity.ratio.toFixed(1)}x more accomplishments after 2 PM`,
      variables: {
        predictor: { type: 'timed', category: 'mindfulness', condition: 'hour < 10' },
        outcome: { type: 'tada', category: 'accomplishment', condition: 'hour >= 14' }
      },
      evidence: meditationProductivity,
      firstDetected: new Date().toISOString().split('T')[0],
      lastConfirmed: new Date().toISOString().split('T')[0]
    })
  }

  // 2. Movement → Mood correlation
  const movementMood = analyzeMoodCorrelation(byDay, {
    predictor: (entries) => entries.some(e => 
      e.type === 'timed' && e.category === 'movement'
    )
  })

  if (movementMood.difference > 0.5) {
    patterns.push({
      id: 'pattern_movement_mood',
      type: 'correlation',
      confidence: movementMood.difference > 1.0 ? 'high' : 'medium',
      score: movementMood.correlation,
      title: 'Movement correlates with higher mood',
      description: `Movement days show average mood of ${movementMood.withMovement.toFixed(1)} vs ${movementMood.withoutMovement.toFixed(1)}`,
      variables: {
        predictor: { type: 'timed', category: 'movement' },
        outcome: { field: 'mood' }
      },
      evidence: movementMood,
      firstDetected: new Date().toISOString().split('T')[0],
      lastConfirmed: new Date().toISOString().split('T')[0]
    })
  }

  // 3. Day of week patterns
  const weekdayPattern = analyzeWeekdayPattern(byDay, 'tada')
  
  if (weekdayPattern.variance > 0.5) {
    const peakDays = Object.entries(weekdayPattern.byDay)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 2)
      .map(([day]) => day)
    
    patterns.push({
      id: 'pattern_weekly_accomplishments',
      type: 'temporal',
      confidence: 'high',
      score: weekdayPattern.variance,
      title: `Peak accomplishments on ${peakDays.join(' & ')}`,
      description: 'You log significantly more accomplishments mid-week',
      distribution: weekdayPattern.byDay,
      peakDays,
      firstDetected: new Date().toISOString().split('T')[0],
      lastConfirmed: new Date().toISOString().split('T')[0]
    })
  }

  // 4. Duration trends
  const meditationTrend = analyzeTrend(allEntries.filter(e => 
    e.type === 'timed' && e.category === 'mindfulness'
  ), 'duration')

  if (Math.abs(meditationTrend.changePercent) > 10) {
    patterns.push({
      id: 'pattern_meditation_duration_trend',
      type: 'trend',
      confidence: meditationTrend.rSquared > 0.5 ? 'medium' : 'low',
      score: meditationTrend.rSquared,
      title: `Meditation duration ${meditationTrend.direction}`,
      description: `Average session ${meditationTrend.direction} from ${meditationTrend.startValue.toFixed(0)}m to ${meditationTrend.endValue.toFixed(0)}m`,
      trend: meditationTrend,
      firstDetected: new Date().toISOString().split('T')[0],
      lastConfirmed: new Date().toISOString().split('T')[0]
    })
  }

  return patterns.sort((a, b) => b.score - a.score)
}

// Helper functions

function groupByDay(entries: Entry[]): Record<string, Entry[]> {
  return entries.reduce((acc, entry) => {
    const day = new Date(entry.startTime).toISOString().split('T')[0]
    if (!acc[day]) acc[day] = []
    acc[day].push(entry)
    return acc
  }, {} as Record<string, Entry[]>)
}

function analyzeCorrelation(byDay: Record<string, Entry[]>, config: {
  predictor: (entries: Entry[]) => boolean
  outcome: (entries: Entry[]) => number
}) {
  const days = Object.values(byDay)
  const withPredictor = days.filter(config.predictor)
  const withoutPredictor = days.filter(d => !config.predictor(d))
  
  const avgWith = withPredictor.reduce((sum, d) => sum + config.outcome(d), 0) / withPredictor.length
  const avgWithout = withoutPredictor.reduce((sum, d) => sum + config.outcome(d), 0) / withoutPredictor.length
  
  return {
    withPredictorDays: withPredictor.length,
    withoutPredictorDays: withoutPredictor.length,
    avgWithPredictor: avgWith,
    avgWithoutPredictor: avgWithout,
    ratio: avgWithout > 0 ? avgWith / avgWithout : 0,
    correlation: calculatePearson(
      days.map(d => config.predictor(d) ? 1 : 0),
      days.map(d => config.outcome(d))
    )
  }
}

function calculatePearson(x: number[], y: number[]): number {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}
```

---

## Testing

### Test API Key

For development, create a test API key:

```bash
# In development, you can use this for testing
TADA_TEST_API_KEY="tada_key_test_development_only"
```

### Test Commands

```bash
# Start dev server
bun run dev

# Test endpoints
curl http://localhost:3000/api/v1/entries \
  -H "Authorization: Bearer $TADA_TEST_API_KEY"

curl http://localhost:3000/api/v1/rhythms/meditation \
  -H "Authorization: Bearer $TADA_TEST_API_KEY"

# Test with date
curl "http://localhost:3000/api/v1/entries?date=2026-01-31" \
  -H "Authorization: Bearer $TADA_TEST_API_KEY"
```

### Unit Tests

```bash
# Run tests
bun test

# Test specific file
bun test server/api/v1/entries
```

---

## Security Checklist

- [ ] API keys hashed with bcrypt (cost 12+)
- [ ] Rate limiting implemented
- [ ] CORS configured for allowed origins
- [ ] Input validation with Zod
- [ ] SQL injection prevented (parameterized queries)
- [ ] Soft delete (never hard delete user data)
- [ ] Audit logging for sensitive operations
- [ ] HTTPS only in production

---

## Performance Considerations

1. **Caching:** Cache pattern detection results (expensive)
2. **Indexes:** Add indexes on `(userId, startTime)`, `(userId, type, category)`
3. **Pagination:** Always paginate large result sets
4. **Lazy loading:** Don't load attachments by default
5. **Background jobs:** Webhook delivery, pattern detection in background

---

## Questions for Maintainer

When implementing, ask about:

1. **Rate limits:** What specific limits per endpoint?
2. **Webhook reliability:** Retry policy for failed webhooks?
3. **Pattern detection:** Which patterns are highest priority?
4. **Export formats:** Any specific Obsidian template requirements?
5. **Permissions:** Granular permissions or simple read/write?

---

*Last Updated: 2026-01-31*
*For: Coding agents implementing Ta-Da! API*
