# Feature Specification: Graceful Rhythm Chains

**Feature Branch**: `002-graceful-rhythms`  
**Created**: 2026-01-17  
**Status**: Draft  
**Input**: Implement graceful rhythm chains - tiered frequency targets that bend instead of break, with automatic tier suggestions, identity-based framing, and intelligent reminders

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Rhythm with Flexible Frequency (Priority: P1)

A meditator wants to track their daily sitting practice but knows life gets busy. They create a rhythm called "Daily Meditation" and set a target of "most days" rather than a strict daily requirement. The system understands this means 5+ days per week is excellent, but 3 days is still good progress.

**Why this priority**: Without rhythm creation, no other features work. This is the foundation that all other stories depend on.

**Independent Test**: Can be fully tested by creating a rhythm with a frequency target and seeing it appear on the rhythms page.

**Acceptance Scenarios**:

1. **Given** I am on the rhythms page, **When** I tap "New Rhythm", **Then** I see a form to create a rhythm with name, matching criteria, and frequency options
2. **Given** I am creating a rhythm, **When** I set the frequency, **Then** I can choose from friendly options (daily, most days, few times a week, weekly, monthly)
3. **Given** I have created a rhythm, **When** I return to the rhythms page, **Then** I see my rhythm with its current status

---

### User Story 2 - See Progress Without Breaking Chains (Priority: P1)

A user has a "Daily Meditation" rhythm and has practiced 4 days this week. It's Thursday and they're busy. Instead of showing a broken chain, the system shows them they're on track for "Most Days" (5/week) and celebrates that achievement level rather than shaming them for missing "Daily".

**Why this priority**: This is the core philosophy of "chains that bend, not break". Without graceful tier display, users experience the same guilt as other streak apps.

**Independent Test**: Can be fully tested by viewing a rhythm with some but not all days completed and seeing encouraging tier-based feedback.

**Acceptance Scenarios**:

1. **Given** I have a daily rhythm with 4/7 days completed this week, **When** I view the rhythm, **Then** I see which tier I'm achieving (e.g., "Most Days" or "Few Times")
2. **Given** I haven't completed my daily rhythm today, **When** I view the rhythms page, **Then** I see what tier I can still achieve, not a "broken streak" message
3. **Given** I have completed 6/7 days this week, **When** I view my rhythm, **Then** I see celebration of my near-daily achievement

---

### User Story 3 - Identity-Based Progress Display (Priority: P2)

A user who has been meditating regularly sees messaging that reinforces their identity transformation: "You're becoming a meditator" rather than cold statistics like "47 sessions logged".

**Why this priority**: Identity framing is a core differentiator from other tracking apps. It shifts focus from numbers to personal growth.

**Independent Test**: Can be fully tested by viewing rhythm statistics and seeing identity-focused language.

**Acceptance Scenarios**:

1. **Given** I have a meditation rhythm with consistent practice, **When** I view my rhythm details, **Then** I see identity-affirming language ("You're becoming a meditator")
2. **Given** I have practiced an activity regularly for weeks, **When** I view the rhythm, **Then** the framing emphasizes who I'm becoming, not just what I've done
3. **Given** I'm new to a practice with only a few entries, **When** I view the rhythm, **Then** I see encouraging language about starting the journey

---

### User Story 4 - Gentle Mid-Week Nudge (Priority: P2)

It's Thursday and a user has only meditated twice this week. The rhythms page shows a gentle nudge: "Meditate 3 more times to hit 'Most Days' this week" rather than "You've broken your streak."

**Why this priority**: Proactive encouragement helps users stay on track. Thursday is the inflection point where the week's outcome is still changeable.

**Independent Test**: Can be fully tested by viewing rhythms mid-week with partial completion and seeing actionable guidance.

**Acceptance Scenarios**:

1. **Given** it's mid-week (Thursday or later) and I'm behind on a rhythm, **When** I view the rhythm, **Then** I see what I need to do to reach the best achievable tier
2. **Given** I've completed 2/5 target days by Thursday, **When** I view the rhythm, **Then** I see "3 more times to hit 'Most Days'" rather than failure messaging
3. **Given** I've already exceeded my weekly target, **When** I view the rhythm, **Then** I see celebration, not pressure to do more

---

### User Story 5 - Week-at-a-Glance Visual (Priority: P2)

A user opens the rhythms page and sees each rhythm with a visual representation of the last 7 days, showing which days they completed the practice. This gives immediate context without diving into details.

**Why this priority**: Visual feedback is faster than reading statistics. Users need quick understanding of their patterns.

**Independent Test**: Can be fully tested by viewing a rhythm and seeing a 7-day visual representation.

**Acceptance Scenarios**:

1. **Given** I have rhythms with activity, **When** I view the rhythms page, **Then** each rhythm shows a 7-day visual indicator
2. **Given** I completed a rhythm on Monday and Wednesday, **When** I view the week visual, **Then** those days are marked as complete
3. **Given** today is Friday, **When** I view the week visual, **Then** I see the current week's context (Mon-Fri completed/incomplete, Sat-Sun upcoming)

---

### User Story 6 - Edit and Delete Rhythms (Priority: P3)

A user decides they no longer want to track their reading rhythm, or they want to change the frequency from daily to weekly. They can edit or delete rhythms from settings.

**Why this priority**: Users need control over their tracking. Without this, abandoned rhythms create clutter and guilt.

**Independent Test**: Can be fully tested by editing a rhythm's settings and by deleting a rhythm.

**Acceptance Scenarios**:

1. **Given** I have an existing rhythm, **When** I tap to edit it, **Then** I can change its name, frequency, or matching criteria
2. **Given** I want to remove a rhythm, **When** I delete it, **Then** it no longer appears on my rhythms page (entries remain)
3. **Given** I delete a rhythm, **When** I look at my entries, **Then** the underlying entries are preserved (only the rhythm definition is removed)

---

### Edge Cases

- What happens when a user has no entries matching a rhythm's criteria? (Show rhythm with empty state, encourage first entry)
- How do weekly rhythms handle timezone differences? (Use user's local timezone for week boundaries)
- What tier do we show when a rhythm was just created today? (Show "Just started" rather than calculating incomplete week)
- How do we handle rhythms for activities the user stopped doing entirely? (After 4+ weeks of no activity, offer to archive)
- What happens if user creates a rhythm with criteria matching 500+ old entries? (Calculate streaks efficiently, perhaps limit historical lookback)
- How do duration-based rhythms work with partial completions? (e.g., "30 min/week" rhythm when user did 25 min — show progress, not failure)

## Requirements _(mandatory)_

### Functional Requirements

**Rhythm Creation**:

- **FR-001**: System MUST allow users to create named rhythms that track patterns in their entries
- **FR-002**: System MUST allow rhythms to match entries by type, category, subcategory, or name
- **FR-003**: System MUST offer human-friendly frequency options (daily, most days, few times a week, weekly, monthly)

**Tiered Frequency System**:

- **FR-004**: System MUST calculate which tier a user is achieving based on their actual activity
- **FR-005**: System MUST display the achieved tier positively rather than showing "broken streaks"
- **FR-006**: System MUST show what tier is still achievable when user is behind their target

**Frequency Tiers** (friendly names):

- **FR-007**: "Daily" tier requires 7 days per week
- **FR-008**: "Most Days" tier requires 5-6 days per week
- **FR-009**: "Few Times" tier requires 3-4 days per week
- **FR-010**: "Weekly" tier requires 1-2 days per week
- **FR-011**: Duration-based rhythms MUST support "X minutes per week" as an alternative to day counting

**Progress Display**:

- **FR-012**: System MUST display a visual week-at-a-glance for each rhythm showing completed/incomplete days
- **FR-013**: System MUST use identity-based language ("You're becoming a meditator") rather than pure statistics
- **FR-014**: System MUST show mid-week guidance on what's needed to reach the best achievable tier

**Rhythm Management**:

- **FR-015**: System MUST allow editing rhythm name, frequency, and matching criteria
- **FR-016**: System MUST allow deleting rhythms without deleting the underlying entries
- **FR-017**: System MUST preserve rhythm history even when entries are deleted

### Key Entities

- **Rhythm**: A named pattern definition with matching criteria, frequency target, and current streak data (already exists in schema)
- **Frequency Tier**: A level of achievement (Daily, Most Days, Few Times, Weekly, Monthly) that can be calculated from actual activity
- **Week Progress**: Calculated view showing which days in current week have matching entries

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a new rhythm in under 60 seconds
- **SC-002**: Users never see "broken streak" or failure-focused messaging (100% positive framing)
- **SC-003**: Users can understand their rhythm status within 2 seconds of viewing the rhythms page (visual week indicator)
- **SC-004**: Mid-week guidance appears by Thursday for any rhythm where user is behind target
- **SC-005**: Identity-based language appears for rhythms with 2+ weeks of consistent practice
- **SC-006**: Rhythm calculations handle 1000+ historical entries without noticeable delay

## Assumptions

- Week boundaries follow ISO standard (Monday-Sunday) adjusted for user's local timezone
- The existing `rhythms` table schema is sufficient for core features (may need minor extensions for tier tracking)
- "Most Days" and "Few Times" are better tier names than "Tier 1", "Tier 2" etc.
- Streak calculations will use efficient queries limited to recent history (e.g., last 12 weeks) rather than all-time
- Identity language thresholds: "Starting" (week 1), "Building" (weeks 2-3), "Becoming" (4+ weeks consistent)
