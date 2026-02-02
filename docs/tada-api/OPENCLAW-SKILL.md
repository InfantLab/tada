# Ta-Da! OpenClaw Skill Specification

> OpenClaw skill for integrating with Ta-Da! lifelogging service.

## Overview

This skill enables OpenClaw agents to:
- **Read** meditation logs, accomplishments, rhythms, and patterns
- **Generate** weekly summaries, morning motivation, pattern insights
- **Export** to Obsidian daily notes
- **Send** encouraging messages and streak reminders
- **Analyze** correlations between life activities

## Installation

```bash
# Skill is built into OpenClaw
# Configure via environment or config file
```

## Configuration

### Environment Variables

```bash
export TADA_API_URL="https://tada.onemonkey.org/api/v1"
export TADA_API_KEY="tada_key_your_api_key_here"
export TADA_TIMEZONE="Europe/London"
```

### Config File

`~/.config/openclaw/skills/tada.json`:

```json
{
  "apiUrl": "https://tada.onemonkey.org/api/v1",
  "apiKey": "${TADA_API_KEY}",
  "timezone": "Europe/London",
  "obsidian": {
    "vault": "/srv/brain",
    "dailyNotePath": "diary/{YYYY}/{MM}/{YYYY-MM-DD}.md",
    "weeklyNotePath": "reviews/weekly/{YYYY}-W{WW}.md",
    "insertPosition": "after:## Ta-Da"
  },
  "notifications": {
    "enabled": true,
    "morningTime": "07:00",
    "eveningTime": "21:00",
    "streakAlertHour": 20
  },
  "email": {
    "enabled": true,
    "weeklyDay": "sunday",
    "weeklyTime": "20:00"
  }
}
```

---

## CLI Commands

### Daily Summary

```bash
openclaw tada today
```

**Output:**
```
🧘 Ta-Da! Summary for 2026-01-31

Meditation: 30 minutes (Day 4,016 streak! 🎉)
Running: 5km in 28:15

Accomplishments:
  ✅ Finished tandem evaluation report
  ✅ Updated research paper
  📖 Read 2 chapters of Eyelids

Mood: 8/10 - Peaceful, focused
Energy: 7/10

Rhythms:
  Meditation: ✅ Day 4,016
  Running: ✅ 2/3 this week
  Journaling: ⏳ Not yet today
```

### Yesterday

```bash
openclaw tada yesterday
```

### Specific Date

```bash
openclaw tada date 2026-01-15
```

### Weekly Summary

```bash
openclaw tada week
openclaw tada week --last  # Previous week
openclaw tada week 2026-W04  # Specific week
```

**Output:**
```
📊 Ta-Da! Weekly Summary (Jan 25-31, 2026)

═══════════════════════════════════════════════════

🧘 MEDITATION
   7/7 days - Perfect week! ✨
   Total: 3h 45m (avg 32 min/day)
   Streak: 4,016 days

🏃 MOVEMENT
   Running: 3 sessions, 15km
   Yoga: 2 sessions, 1h 20m

✅ ACCOMPLISHMENTS
   12 ta-das logged
   • work (5)
   • personal (4)
   • health (3)

📈 MOOD TREND
   Mon: 7 → Tue: 8 → Wed: 8 → Thu: 7 → Fri: 9 → Sat: 8 → Sun: 7
   Average: 7.7/10 (↑ from last week's 7.2)

🔍 PATTERNS NOTICED
   • Morning meditation → 2.3x afternoon productivity
   • Running days: mood 8.2 vs 7.1

═══════════════════════════════════════════════════
```

### Monthly Summary

```bash
openclaw tada month
openclaw tada month 2026-01
```

### Rhythms/Streaks

```bash
openclaw tada streaks
```

**Output:**
```
🔥 Current Streaks

Meditation      4,016 days  (since Feb 15, 2015) 🏆
Journaling         12 days  (since Jan 20, 2026)
Running            3 weeks  (3+ sessions/week)
Reading            8 days   (since Jan 23, 2026)
```

### Pattern Detection

```bash
openclaw tada patterns
openclaw tada patterns --lookback 90
openclaw tada patterns --category mindfulness
```

**Output:**
```
🔍 Patterns Detected (Last 90 Days)

HIGH CONFIDENCE:
  1. Morning meditation → afternoon productivity
     Days with meditation before 10 AM show 2.3x more accomplishments
     after 2 PM (p < 0.01)

  2. Weekly accomplishment rhythm
     Peak: Tuesday & Thursday (3.6 avg)
     Low: Sunday (1.3 avg)

MEDIUM CONFIDENCE:
  3. Running ↔ Mood correlation
     Running days: mood 8.2 avg
     Non-running days: mood 7.1 avg

  4. Meditation duration trend
     Increasing from 28m to 32m over 90 days (+14%)

  5. Dream recall after evening meditation
     2.5x more likely to log dreams after evening sits
```

### Export to Obsidian

```bash
# Export today to Obsidian daily note
openclaw tada export --to-obsidian

# Export specific date
openclaw tada export --to-obsidian --date 2026-01-31

# Export week
openclaw tada export --to-obsidian --week

# Dry run (show what would be added)
openclaw tada export --to-obsidian --dry-run
```

### Encouragement

```bash
openclaw tada encourage
```

**Output:**
```
✨ Day 4,016 of daily meditation practice!

That's 11 years of showing up. Every single day.
Through joy and difficulty. In stillness, you found yourself.

This week:
  • 7/7 meditation sessions
  • 12 accomplishments celebrated
  • 3 runs completed

"Before enlightenment, chop wood, carry water.
 After enlightenment, chop wood, carry water."

Keep going. 🙏
```

### Reminder Check

```bash
openclaw tada remind
openclaw tada remind --type meditation
openclaw tada remind --type journal
```

**Output (if not yet meditated by 8 PM):**
```
🧘 Gentle reminder...

It's 8:15 PM and I haven't seen your meditation yet today.

Your 4,016-day streak is precious.
Even 5 minutes of sitting counts.

Would you like to start a quick session?
```

### Voice Summary (with TTS)

```bash
openclaw tada morning --voice
openclaw tada week --voice
```

Uses `sag` skill (ElevenLabs) to speak the summary.

---

## Agent Workflows

### Morning Ritual Agent

**Trigger:** Cron at 7:00 AM or heartbeat check

**Flow:**
```javascript
async function morningRitual() {
  const tada = new TadaClient()
  
  // Get yesterday's data
  const yesterday = await tada.getDay({ offset: -1 })
  
  // Get current streaks
  const rhythms = await tada.getRhythms()
  
  // Get "on this day" memories
  const oneYearAgo = await tada.getDay({ date: subYears(new Date(), 1) })
  const fiveYearsAgo = await tada.getDay({ date: subYears(new Date(), 5) })
  
  // Build message
  const message = `
Good morning! ☀️

🧘 Day ${rhythms.meditation.streak.current} of meditation practice

Yesterday:
${formatDaySummary(yesterday)}

${oneYearAgo.entries.length > 0 ? `📅 One year ago: ${summarize(oneYearAgo)}` : ''}

What's your intention for today?
`

  // Deliver
  await notify(message)
  await appendToObsidianDaily('## Morning', message)
}
```

**Cron Setup:**
```javascript
// Add to OpenClaw cron
cron.add({
  name: "tada-morning-ritual",
  schedule: { kind: "cron", expr: "0 7 * * *", tz: "Europe/London" },
  payload: { kind: "agentTurn", message: "Run morning ritual with Ta-Da! data" }
})
```

### Evening Reflection Agent

**Trigger:** Cron at 9:00 PM or heartbeat check

**Flow:**
```javascript
async function eveningReflection() {
  const tada = new TadaClient()
  
  // Get today's data
  const today = await tada.getDay()
  
  // Check if meditation done
  const meditatedToday = today.entries.some(e => 
    e.type === 'timed' && e.category === 'mindfulness'
  )
  
  // Check if journaled
  const journaledToday = today.entries.some(e => 
    e.category === 'journal'
  )
  
  // Build summary
  const summary = formatDaySummary(today)
  
  // Build prompts
  let prompts = []
  if (!meditatedToday) {
    prompts.push("🧘 Still time for a short evening sit!")
  }
  if (!journaledToday) {
    prompts.push("📝 How about a quick reflection before bed?")
  }
  
  const message = `
Today's Ta-Da! 📊

${summary}

${prompts.join('\n')}

Reflection prompt: What surprised you today?
`

  // Deliver
  await notify(message)
  await appendToObsidianDaily('## Evening', message)
}
```

### Weekly Summary Agent

**Trigger:** Cron on Sunday at 8:00 PM

**Flow:**
```javascript
async function weeklySummary() {
  const tada = new TadaClient()
  
  // Get week's data
  const week = await tada.getWeek()
  
  // Get patterns
  const patterns = await tada.getPatterns({ lookback: 90 })
  
  // Build comprehensive summary
  const summary = formatWeeklySummary(week, patterns)
  
  // Create Obsidian weekly review note
  await createObsidianNote(
    `reviews/weekly/${format(new Date(), 'yyyy')}-W${getWeek(new Date())}.md`,
    summary
  )
  
  // Send email
  await sendEmail({
    to: config.email.address,
    subject: `Ta-Da! Weekly Summary - ${format(new Date(), 'MMM d')}`,
    body: summary
  })
  
  // Notify
  await notify("📊 Weekly summary ready! Check your email or Obsidian.")
}
```

### Streak Alert Agent

**Trigger:** Heartbeat check after 8 PM

**Flow:**
```javascript
async function streakAlert() {
  const tada = new TadaClient()
  const today = await tada.getDay()
  const rhythms = await tada.getRhythms()
  
  // Check meditation streak
  if (rhythms.meditation.streak.current > 100) {
    const meditatedToday = today.entries.some(e => 
      e.type === 'timed' && e.category === 'mindfulness'
    )
    
    const hour = new Date().getHours()
    
    if (!meditatedToday && hour >= 20) {
      await notify({
        title: '🧘 Streak Alert',
        body: `Your ${rhythms.meditation.streak.current}-day meditation streak is at risk!\n\nEven 5 minutes counts. Would you like to sit now?`,
        priority: 'high'
      })
    }
  }
}
```

### Pattern Alert Agent

**Trigger:** Weekly pattern analysis

**Flow:**
```javascript
async function patternAlert() {
  const tada = new TadaClient()
  
  // Get fresh pattern analysis
  const patterns = await tada.getPatterns({ lookback: 90, refresh: true })
  
  // Find new patterns (detected in last week)
  const newPatterns = patterns.filter(p => 
    isAfter(new Date(p.firstDetected), subWeeks(new Date(), 1))
  )
  
  if (newPatterns.length > 0) {
    const message = `
🔍 New patterns detected in your data!

${newPatterns.map(p => `• ${p.title}\n  ${p.description}`).join('\n\n')}

These insights emerged from your consistent tracking. 
The data is speaking — are you listening? 🧘
`
    await notify(message)
  }
}
```

---

## API Client

### TypeScript Implementation

```typescript
// skills/tada/client.ts

import { ofetch } from 'ofetch'

interface TadaConfig {
  apiUrl: string
  apiKey: string
  timezone: string
}

export class TadaClient {
  private config: TadaConfig
  private fetch: typeof ofetch

  constructor(config?: Partial<TadaConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.TADA_API_URL || 'https://tada.onemonkey.org/api/v1',
      apiKey: config?.apiKey || process.env.TADA_API_KEY || '',
      timezone: config?.timezone || process.env.TADA_TIMEZONE || 'Europe/London'
    }

    this.fetch = ofetch.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    })
  }

  // Entries
  async getEntries(params: {
    date?: string
    start?: string
    end?: string
    type?: string
    category?: string
    limit?: number
  }) {
    return this.fetch('/entries', { params })
  }

  async getDay(options?: { date?: Date | string, offset?: number }) {
    let date = options?.date ? new Date(options.date) : new Date()
    if (options?.offset) {
      date.setDate(date.getDate() + options.offset)
    }
    const dateStr = date.toISOString().split('T')[0]
    
    const { data } = await this.getEntries({ date: dateStr })
    const { data: rhythms } = await this.getRhythms()
    
    return {
      date: dateStr,
      entries: data,
      rhythms,
      summary: this.summarizeDay(data)
    }
  }

  async getWeek(options?: { date?: Date | string, offset?: number }) {
    const end = options?.date ? new Date(options.date) : new Date()
    if (options?.offset) {
      end.setDate(end.getDate() + (options.offset * 7))
    }
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    
    const { data } = await this.getEntries({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      entries: data,
      summary: this.summarizeWeek(data)
    }
  }

  // Rhythms
  async getRhythms() {
    return this.fetch('/rhythms')
  }

  async getRhythm(id: string) {
    return this.fetch(`/rhythms/${id}`)
  }

  // Insights
  async getPatterns(params?: { lookback?: number, refresh?: boolean }) {
    return this.fetch('/insights/patterns', { params })
  }

  async getSummary(params?: { period?: string, start?: string, end?: string }) {
    return this.fetch('/insights/summary', { params })
  }

  // Export
  async exportMarkdown(params: { date?: string, start?: string, end?: string, template?: string }) {
    return this.fetch('/export/obsidian', { params })
  }

  // Helpers
  private summarizeDay(entries: Entry[]) {
    const meditation = entries.find(e => e.type === 'timed' && e.category === 'mindfulness')
    const accomplishments = entries.filter(e => e.type === 'tada')
    const moods = entries.filter(e => e.mood != null)
    
    return {
      meditation: meditation ? { duration: meditation.duration, note: meditation.note } : null,
      accomplishments: accomplishments.map(e => ({ emoji: e.emoji, title: e.title })),
      mood: moods.length > 0 ? moods.reduce((sum, e) => sum + e.mood!, 0) / moods.length : null,
      entryCount: entries.length
    }
  }

  private summarizeWeek(entries: Entry[]) {
    // Group by day
    const byDay = entries.reduce((acc, e) => {
      const day = e.startTime.split('T')[0]
      if (!acc[day]) acc[day] = []
      acc[day].push(e)
      return acc
    }, {} as Record<string, Entry[]>)

    // Calculate stats
    const meditationDays = Object.values(byDay).filter(day => 
      day.some(e => e.type === 'timed' && e.category === 'mindfulness')
    ).length

    const totalMeditationMinutes = entries
      .filter(e => e.type === 'timed' && e.category === 'mindfulness')
      .reduce((sum, e) => sum + (e.duration || 0) / 60, 0)

    const accomplishments = entries.filter(e => e.type === 'tada')

    return {
      days: Object.keys(byDay).length,
      meditation: {
        days: meditationDays,
        totalMinutes: Math.round(totalMeditationMinutes),
        avgMinutes: meditationDays > 0 ? Math.round(totalMeditationMinutes / meditationDays) : 0
      },
      accomplishments: {
        total: accomplishments.length,
        byCategory: this.groupBy(accomplishments, 'category')
      }
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const k = String(item[key])
      if (!acc[k]) acc[k] = []
      acc[k].push(item)
      return acc
    }, {} as Record<string, T[]>)
  }
}
```

---

## Obsidian Integration

### Daily Note Template

```markdown
# {{date}}

## Morning Intention
<!-- Set your intention for the day -->

## Ta-Da! Summary
<!-- Auto-populated by OpenClaw agent -->

## Work
- 

## Evening Reflection
<!-- Auto-populated by agent prompt -->

## Gratitude
- 
```

### Insert Logic

```javascript
async function appendToObsidianDaily(section: string, content: string) {
  const vault = config.obsidian.vault
  const date = new Date()
  const path = config.obsidian.dailyNotePath
    .replace('{YYYY}', format(date, 'yyyy'))
    .replace('{MM}', format(date, 'MM'))
    .replace('{YYYY-MM-DD}', format(date, 'yyyy-MM-dd'))
  
  const fullPath = `${vault}/${path}`
  
  // Read existing content
  let existing = ''
  try {
    existing = await readFile(fullPath, 'utf-8')
  } catch {
    // File doesn't exist, create with template
    existing = `# ${format(date, 'yyyy-MM-dd')}\n\n## Morning Intention\n\n## Ta-Da! Summary\n\n## Evening Reflection\n\n`
  }
  
  // Find or create section
  const sectionRegex = new RegExp(`(## ${section.replace('## ', '')})[\\s\\S]*?(?=\\n## |$)`)
  
  if (sectionRegex.test(existing)) {
    // Append to existing section
    existing = existing.replace(sectionRegex, `$1\n\n${content}\n\n`)
  } else {
    // Add new section
    existing += `\n${section}\n\n${content}\n\n`
  }
  
  await writeFile(fullPath, existing)
}
```

---

## Email Integration

### Weekly Summary Email

```javascript
async function sendWeeklyEmail() {
  const tada = new TadaClient()
  const week = await tada.getWeek()
  const patterns = await tada.getPatterns({ lookback: 90 })
  
  const html = `
    <h1>📊 Your Week in Review</h1>
    
    <h2>🧘 Meditation</h2>
    <p><strong>${week.summary.meditation.days}/7 days</strong> (${week.summary.meditation.totalMinutes} minutes total)</p>
    
    <h2>✅ Accomplishments</h2>
    <p><strong>${week.summary.accomplishments.total}</strong> ta-das logged</p>
    <ul>
      ${Object.entries(week.summary.accomplishments.byCategory)
        .map(([cat, items]) => `<li>${cat}: ${items.length}</li>`)
        .join('')}
    </ul>
    
    <h2>🔍 Patterns</h2>
    <ul>
      ${patterns.slice(0, 3).map(p => `<li>${p.title}</li>`).join('')}
    </ul>
    
    <p><em>Keep celebrating your accomplishments! 🎉</em></p>
  `
  
  await message({
    action: 'send',
    channel: 'email',
    to: config.email.address,
    subject: `Ta-Da! Weekly Summary - ${format(new Date(), 'MMM d')}`,
    message: html
  })
}
```

### Morning Encouragement Email

```javascript
async function sendMorningEmail() {
  const tada = new TadaClient()
  const rhythms = await tada.getRhythms()
  const yesterday = await tada.getDay({ offset: -1 })
  
  const text = `
Good morning! ☀️

Day ${rhythms.data.find(r => r.category === 'mindfulness')?.streak.current} of your meditation practice.

Yesterday:
${yesterday.summary.meditation ? `• Meditated ${yesterday.summary.meditation.duration / 60} minutes` : ''}
${yesterday.summary.accomplishments.map(a => `• ${a.emoji} ${a.title}`).join('\n')}

What will you accomplish today?

🙏 Ta-Da!
`
  
  await message({
    action: 'send',
    channel: 'email',
    to: config.email.address,
    subject: `☀️ Day ${rhythms.data[0].streak.current} - Good morning!`,
    message: text
  })
}
```

---

## Testing

### Unit Tests

```javascript
describe('TadaClient', () => {
  it('should fetch today\'s entries', async () => {
    const client = new TadaClient()
    const result = await client.getDay()
    expect(result.date).toBe(format(new Date(), 'yyyy-MM-dd'))
    expect(result.entries).toBeArray()
  })

  it('should calculate weekly summary', async () => {
    const client = new TadaClient()
    const week = await client.getWeek()
    expect(week.summary.meditation.days).toBeGreaterThanOrEqual(0)
    expect(week.summary.meditation.days).toBeLessThanOrEqual(7)
  })

  it('should handle API errors gracefully', async () => {
    const client = new TadaClient({ apiKey: 'invalid' })
    await expect(client.getDay()).rejects.toThrow()
  })
})
```

### Integration Tests

```javascript
describe('Ta-Da! Integration', () => {
  it('should export to Obsidian', async () => {
    const tada = new TadaClient()
    await tada.exportToObsidian({ date: '2026-01-31' })
    
    const content = await readFile('/srv/brain/diary/2026/01/2026-01-31.md')
    expect(content).toContain('Ta-Da! Summary')
  })

  it('should send weekly email', async () => {
    // Mock email service
    const emailSpy = jest.spyOn(message, 'send')
    await sendWeeklyEmail()
    expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      subject: expect.stringContaining('Weekly Summary')
    }))
  })
})
```

---

## Future Enhancements

### Voice Interface

```bash
# Morning briefing via voice (uses sag skill)
openclaw tada morning --voice

# Interactive voice logging
openclaw tada log --voice
# "I meditated for 30 minutes this morning"
# → Creates timed entry
```

### Natural Language Queries

```bash
openclaw tada ask "How many hours did I meditate this month?"
# → "You meditated for 16 hours and 25 minutes across 31 sessions this month."

openclaw tada ask "What days do I usually run?"
# → "You typically run on Mondays, Wednesdays, and Saturdays. Morning runs are most common."

openclaw tada ask "How does meditation affect my mood?"
# → "Based on your data, meditation days show 15% higher mood scores on average."
```

### Proactive Insights

```javascript
// Agent proactively surfaces insights without being asked
async function proactiveInsight() {
  const patterns = await tada.getPatterns({ lookback: 30 })
  const newInsight = patterns.find(p => !p.seenByUser)
  
  if (newInsight && random() < 0.3) { // 30% chance to share
    await notify({
      title: '💡 Did you notice?',
      body: newInsight.description
    })
    await tada.markInsightSeen(newInsight.id)
  }
}
```

---

*OpenClaw Skill Specification*
*Version: 1.0*
*Last Updated: 2026-01-31*
