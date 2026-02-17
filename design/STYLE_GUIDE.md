# Ta-Da! Style Guide

**Version:** 0.4.0
**Last Updated:** February 2026
**Status:** Current

---

## Purpose

This guide ensures consistent voice, terminology, and philosophy across all Ta-Da! content - from UI copy to documentation, blog posts to error messages. Every word should serve our mission: celebrating who you're becoming, not tracking what you should be doing.

---

## Core Voice

### Characteristics

**Ta-Da! sounds like:**
- A **friend** who remembers and celebrates with you
- A **journal** you actually want to open
- A **mirror** showing patterns you didn't see
- A **wise companion** offering gentle encouragement

**Never sounds like:**
- A boss tracking your performance
- A doctor measuring compliance
- A guilt machine showing what you missed
- A social network comparing you to others

### Tone Principles

| Principle | What This Means | Example |
|-----------|----------------|---------|
| **Warm but not precious** | Friendly without being overly cute | ✅ "You meditated" ❌ "OMG you're a meditation superstar!!!" |
| **Clear but not cold** | Professional without being corporate | ✅ "Export your data anytime" ❌ "Data portability functionality available" |
| **Encouraging but not pushy** | Supportive without nagging | ✅ "You're becoming a meditator" ❌ "Don't break your streak!" |
| **Simple but not simplistic** | Accessible without talking down | ✅ "Rhythms track patterns" ❌ "Rhythms are complex aggregation queries" |

---

## Terminology Guide

### ✅ Preferred Terms

Use these terms consistently:

| Term | Use For | Why |
|------|---------|-----|
| **Ta-Da!** | Accomplishments, wins, celebrations | Our namesake - the inversion of to-do |
| **Celebrate** | Recording wins and moments | Active, joyful, not passive |
| **Notice** | Becoming aware of patterns | Mindful observation, not tracking |
| **Capture** | Recording any entry | Quick, friction-free, like a photo |
| **Practice** | Regular activity (meditation, music) | Implies growth and identity |
| **Rhythms** | Patterns of consistency | Natural, flexible, not rigid |
| **Graceful chains** | Forgiveness-enabled consistency tracking | Bends but doesn't break |
| **Journey stages** | Beginning → Building → Becoming → Being | Identity formation, not progress bars |
| **Sessions** | Timed practices | Clear, simple, universal |
| **Moments** | Quick captures (dreams, magic, etc.) | Treasured observations |
| **Tally** | Count-based tracking | Simple, clear counting |

### ❌ Terms to Avoid

Don't use these (or use very sparingly):

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Productivity** | Implies output optimization | "Practice", "showing up" |
| **Efficiency** | Mechanical, not human | "Consistency", "rhythm" |
| **Optimization** | Too clinical | "Growing", "deepening" |
| **Gamification** | Manipulative | "Celebration", "milestones" |
| **Streak** | Brittle, creates anxiety | "Chain" (when contrasting), "rhythm" |
| **Track** | Clinical, detached | "Capture", "notice", "celebrate" |
| **Log** | Mechanical data entry | "Capture", "record" |
| **Task** | Obligatory work | "Activity", "practice", "win" |
| **To-do** | Anxiety-inducing | "Ta-Da!" |
| **Goal** | Pressure-creating | "Intention", "direction" |

### Special Cases

**"Track" can be used when:**
- Describing what other apps do (contrast)
- Technical documentation about data
- Example: "Ta-Da! isn't a tracker. It's a collection."

**"Streak" can be used when:**
- Explaining the difference from chains
- Example: "Traditional streaks punish you for missing a day"

---

## Journey Stages

The four stages represent identity formation through accumulated practice time.

### Stage Definitions

| Stage | Internal Type | Display Label | Icon | Hours | Message |
|-------|--------------|---------------|------|-------|---------|
| **Beginning** | `"beginning"` | "🌱 Beginning" | 🌱 | 0-10 | You're beginning your journey |
| **Building** | `"building"` | "🌿 Building" | 🌿 | 10-100 | Developing the habit |
| **Becoming** | `"becoming"` | "🌳 Becoming" | 🌳 | 100-1000 | Established practitioner |
| **Being** | `"being"` | "⭐ Being" / "⭐ You Are" | ⭐ | 1000+ | You ARE a meditator/musician/etc. |

### Usage Examples

**In help text:**
> "Journey stages mark your accumulated practice time: Beginning (0-10 hours), Building (10-100 hours), Becoming (100-1000 hours), and Being (1000+ hours)."

**In encouragement:**
> "You're in the Beginning stage. Every journey starts with a single step."

**In code:**
```typescript
// Type definition (internal)
export type JourneyStage = "beginning" | "building" | "becoming" | "being";

// Display mapping (user-facing)
const labels = {
  beginning: "🌱 Beginning",
  building: "🌿 Building",
  becoming: "🌳 Becoming",
  being: "⭐ You Are",
};
```

**Important:** Always use "Beginning" (not "Starting") both internally and externally for consistency.

---

## Entry Types

### Core Types

| Type | Icon | Purpose | Verb | Example |
|------|------|---------|------|---------|
| **Ta-Da!** | ⚡ | Celebrate accomplishments | Celebrate | "Finished the painting!" |
| **Session** | ⏱️ | Timed practices | Practice | 20-minute meditation |
| **Moment** | ✨ | Quick captures | Notice | Dream journal entry |
| **Tally** | 📊 | Count-based | Count | 50 push-ups |

### Moment Subcategories

The four moment types:

| Type | Emoji | Purpose | Example |
|------|-------|---------|---------|
| **Magic** | 🪄 | Joy, serendipity, wonder | "Rainbow after the rain" |
| **Dream** | 🌙 | Dream journal with lucidity/vividness | "Flying dream - very vivid" |
| **Gratitude** | 🙏 | Appreciation | "Grateful for morning coffee" |
| **Journal** | 🪶 | Freeform reflection | "Thinking about change..." |

---

## Writing UI Copy

### Button Labels

**Principles:**
- Action-oriented but not commanding
- Clear about what will happen
- Celebrate actions, don't demand them

**Examples:**

| ✅ Good | ❌ Avoid | Why |
|---------|----------|-----|
| "Quick Add" | "Add Item" | More specific, friendly |
| "Celebrate a Win" | "Add Ta-Da" | Action-oriented, clear |
| "Start Session" | "Begin Timer" | Simple, direct |
| "Capture Moment" | "Log Entry" | Warm, not mechanical |
| "Save Changes" | "Submit" | Clear what happens |

### Empty States

**Principles:**
- Encourage without pressuring
- Show possibility, not absence
- Be helpful, not judgmental

**Examples:**

✅ **Good:**
> "No sessions yet. Ready to start your first practice?"

> "Your timeline is empty. Capture something that matters today."

✅ **Better:**
> "This is where your journey begins. Try starting a meditation session or celebrating a small win."

❌ **Avoid:**
> "You haven't logged anything yet."

> "No data available."

### Error Messages

**Principles:**
- Help, don't scold
- Explain what happened and what to do
- Be human, not robotic

**Examples:**

✅ **Good:**
> "Couldn't save your entry. Check your connection and try again."

> "Please wait a moment before requesting another verification email."

❌ **Avoid:**
> "Error: Network failure"

> "Rate limit exceeded. Error code: 429"

### Success Messages

**Principles:**
- Celebrate the accomplishment
- Be brief but warm
- Confirm what happened

**Examples:**

✅ **Good:**
> "Session saved! 🎉"

> "Ta-Da! Your win is captured."

> "Entry exported successfully"

❌ **Avoid:**
> "Operation completed successfully"

> "Data persisted to database"

---

## Writing Help Content

### Structure

Every help answer should have:
1. **What it is** - Brief description
2. **Why it matters** - The philosophy behind it
3. **How to use it** - Practical guidance
4. **Example** (if helpful) - Concrete illustration

### Example: Good Help Entry

**Question:** "What are graceful chains?"

**Answer:**
"Traditional streaks punish you for missing a single day. Graceful chains celebrate consistency while forgiving the occasional gap. Choose from daily, weekly (5+ or 3+ days), or monthly targets. Missing a day doesn't break your identity as a meditator — it's just one day."

### Help Writing Checklist

- [ ] Answers "why" not just "how"
- [ ] Uses Ta-Da! terminology consistently
- [ ] Explains philosophy when relevant
- [ ] Provides practical guidance
- [ ] Tone is warm and encouraging
- [ ] No jargon or technical terms (unless necessary)
- [ ] Examples are relatable

---

## Writing Blog Posts

### Structure

A good Ta-Da! blog post:
1. **Hook** - Relatable scenario or question
2. **Problem** - What traditional approaches get wrong
3. **Philosophy** - Ta-Da!'s different approach and why
4. **Research** (optional) - Supporting evidence
5. **Practice** - How to apply this
6. **Invitation** - Gentle call to try it

### Tone Guidelines

- **Conversational but not casual** - Like talking to a thoughtful friend
- **Research-informed but not academic** - Cite studies but stay readable
- **Philosophical but not preachy** - Share insights, don't lecture
- **Personal but not confessional** - Use "you" and "your practice"

### Example Excerpt

✅ **Good blog voice:**
> "Picture this: You sit down to meditate. You set a timer for 20 minutes. The timer starts: 19:59... 19:58... 19:57...
>
> What does your mind do? It starts calculating. 'Almost 20 minutes left. This is going to take forever. When will this be over?'"

This is:
- Relatable (specific scenario)
- Present tense (draws you in)
- Human (acknowledges actual experience)
- Sets up the philosophy naturally

---

## Code Comments

### When to Comment

Comment when explaining **why**, not **what**:

✅ **Good:**
```typescript
/**
 * Count up, not down - celebrating what you did rather than what remains.
 * This philosophical choice pervades the entire app.
 */
```

❌ **Avoid:**
```typescript
/**
 * Increments the counter
 */
```

### File Headers

Every significant file should explain its purpose and philosophy:

```typescript
/**
 * RhythmCalculator - Calculate graceful chains and journey stages
 *
 * Graceful chains bend but don't break - they track consistency while
 * forgiving occasional gaps. This module handles all rhythm calculations
 * including weekly progress, chain tracking, and encouragement selection.
 */
```

---

## Voice Examples Library

### Best Empty States

> "No entries yet. Your journey begins with a single moment captured."

> "Nothing here yet. Ready to celebrate your first win?"

### Best Help Text

> "When you meditate for 47 minutes, the celebration is 'You did 47 minutes!' not 'You have 13 minutes left.'"

> "Missing a day doesn't break your identity as a meditator — it's just one day."

### Best Encouragement

> "Every journey begins with a single step"

> "You're becoming a meditator"

> "This is who you are"

### Best Error Messages

> "Couldn't save your entry. Check your connection and try again."

> "That session seems too short. Sessions must be at least 1 minute."

---

## Common Patterns

### Describing Features

**Formula:** What it is + Why it matters + How to use it

✅ **Example:**
> "Journey stages mark your accumulated practice time: Beginning (0-10h), Building (10-100h), Becoming (100-1000h), and Being (1000h+). They celebrate depth over speed, showing who you're becoming rather than how fast you're progressing."

### Explaining Philosophy

**Formula:** Traditional approach + Problem + Ta-Da! approach + Benefit

✅ **Example:**
> "Traditional timers count down, creating pressure and anxiety. Ta-Da! counts up — celebrating what you accomplished rather than what's remaining. This shift turns obligation into achievement."

### Encouraging Action

**Formula:** Acknowledge where they are + Possibility + No pressure

✅ **Example:**
> "You're in the Beginning stage. Every practice session deepens your journey. There's no rush — this is about who you're becoming."

---

## Anti-Patterns

### ❌ Don't Be Preachy

Bad: "You MUST meditate every day to see benefits"
Good: "Many people find daily practice helpful, though any rhythm works"

### ❌ Don't Create Guilt

Bad: "You haven't practiced in 7 days"
Good: "Ready to practice again?"

### ❌ Don't Use Jargon

Bad: "Optimize your practice cadence for maximum ROI"
Good: "Find a rhythm that works for you"

### ❌ Don't Be Overly Cute

Bad: "OMG you're crushing it bestie!!!"
Good: "You're doing great"

### ❌ Don't Use Corporate Speak

Bad: "Leverage our platform to maximize your productivity outcomes"
Good: "Ta-Da! helps you notice and celebrate your life"

---

## The Ta-Da! Test

Before publishing any content, ask:

1. **Would this make someone feel better about themselves?**
2. **Does it explain why, not just what?**
3. **Could a meditator and a developer both appreciate it?**
4. **Is it honest without being harsh?**
5. **Does it celebrate the journey, not just the destination?**

If you answer "no" to any of these, revise.

---

## Quick Reference

### Preferred Verbs
✅ celebrate, notice, capture, practice, show up, observe, become
❌ track, log, optimize, maximize, achieve, perform

### Preferred Nouns
✅ journey, rhythm, pattern, practice, identity, celebration
❌ goal, task, metric, performance, productivity, output

### Preferred Adjectives
✅ graceful, mindful, gentle, natural, flexible, human
❌ optimal, maximum, efficient, aggressive, perfect

---

## Updates

This style guide evolves with Ta-Da!. When adding new features or content:
1. Check this guide first
2. Use existing patterns as templates
3. Update the guide if you establish a new pattern
4. Keep the philosophy consistent

---

*"Every word should celebrate who you're becoming, not track what you should be doing."*
