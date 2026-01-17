# Feature Specification: Graceful Rhythm Chains

**Feature Branch**: `002-graceful-rhythms`  
**Created**: 2026-01-17  
**Status**: Draft  
**Input**: Implement graceful rhythm chains - tiered frequency targets that bend instead of break, with automatic tier suggestions, identity-based framing, and intelligent reminders

## Scope

### This Version (v1 - Mindfulness Timer Focus)

- Timer-based rhythms only (duration tracking)
- Focused on mindfulness category entries
- Single rhythm panel with full visualization
- Multiple rhythms supported with accordion collapse
- Duration thresholds: minimum time per day (default 6 min), per week, or per month

### Future Versions (Out of Scope)

- Moment-based chains (count by category/subcategory without duration)
- Accumulative rhythms (combining multiple activities, e.g., runs + tai chi = exercise)
- Activity type rhythms beyond mindfulness
- Push notifications and reminders
- **Milestone stars**: Award stars for completing weekly chains (similar to Insight Timer) — visual celebration for sustained effort
- **Monthly summary badges**: "Great", "Good", etc. rating based on days practiced (see Insight Timer design)

### Design Patterns for Future

The architecture should support:

- **Timer rhythms**: Duration-based, minimum time thresholds
- **Moment rhythms**: Count-based, any entry matching criteria counts as 1
- **Accumulative rhythms**: Multiple matching criteria combined into one rhythm

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Timer-Based Mindfulness Rhythm (Priority: P1)

A meditator wants to track their daily sitting practice with a minimum duration threshold. They create a rhythm called "Daily Meditation" that counts any mindfulness session of 6+ minutes as completing the day. They set a target of "most days" rather than strict daily.

**Why this priority**: Without rhythm creation, no other features work. Timer-based with duration threshold is the foundation.

**Independent Test**: Can be fully tested by creating a rhythm with a duration threshold and frequency target, then seeing it on the rhythms page.

**Acceptance Scenarios**:

1. **Given** I am on the rhythms page, **When** I tap "New Rhythm", **Then** I see a form to create a rhythm with name, duration threshold (default 6 min), and frequency options
2. **Given** I am creating a rhythm, **When** I set the frequency, **Then** I can choose from friendly options (daily, most days, few times a week, weekly, monthly)
3. **Given** I set a duration threshold of 10 minutes, **When** I complete an 8-minute session, **Then** that day does NOT count as complete for the chain
4. **Given** I have created a rhythm, **When** I return to the rhythms page, **Then** I see my rhythm panel with its current status

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

A user who has been meditating regularly sees messaging that reinforces their identity transformation: "You're becoming a meditator" alongside their statistics. The numbers (47 sessions, 12 hours total) are visible but the identity-focused encouragement is the hero message. Encouragements vary — the system draws from a library of inventive, warm messages rather than repeating the same phrase.

**Why this priority**: Identity framing is a core differentiator from other tracking apps. It shifts focus from numbers to personal growth while still providing the data users want.

**Independent Test**: Can be fully tested by viewing rhythm statistics and seeing varied identity-focused language alongside the numbers.

**Acceptance Scenarios**:

1. **Given** I have a meditation rhythm with consistent practice, **When** I view my rhythm details, **Then** I see identity-affirming language ("You're becoming a meditator") as the hero message
2. **Given** I view my rhythm multiple times, **When** encouragement messages appear, **Then** they vary rather than showing the same message repeatedly
3. **Given** I have practiced an activity regularly for weeks, **When** I view the rhythm, **Then** I see both my statistics (sessions, hours) and identity-focused encouragement
4. **Given** I'm new to a practice with only a few entries, **When** I view the rhythm, **Then** I see encouraging language about starting the journey

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

### User Story 5 - Rhythm Panel with Year and Month Views (Priority: P2)

A user opens the rhythms page and sees their rhythm in a modular panel. The panel includes a GitHub-style year tracker showing the full calendar year, and a month view showing weeks in calendar format. They can navigate back in time to see previous years.

**Why this priority**: Visual feedback is core to understanding patterns. Multiple time scales reveal different insights.

**Independent Test**: Can be fully tested by viewing a rhythm panel and seeing both year and month visualizations with navigation.

**Acceptance Scenarios**:

1. **Given** I have a rhythm with activity, **When** I view the rhythm panel, **Then** I see a GitHub-style year tracker for the current calendar year
2. **Given** I am viewing the year tracker, **When** I tap navigation controls, **Then** I can view previous years
3. **Given** I view the rhythm panel, **When** I look at the month view, **Then** I see a calendar-style layout with weeks as rows and MTWTFSS columns
4. **Given** I completed sessions on Monday and Wednesday, **When** I view the month calendar, **Then** those days are visually marked as complete
5. **Given** I want a compact view, **When** I toggle view mode, **Then** I can switch to a linear week view (all days in one row)

---

### User Story 6 - Chain Statistics Display (Priority: P2)

Below the visualizations, a user sees their chain statistics for each tier. The current chain length is prominent, with longest-ever chain shown subtly. Chains are ordered by tier (Daily first, then Most Days, etc.).

**Why this priority**: Chain length is the motivating metric. Showing current prominently and longest-ever subtly provides context without pressure.

**Independent Test**: Can be fully tested by viewing chain statistics and seeing current vs longest chains for each tier.

**Acceptance Scenarios**:

1. **Given** I have chain data, **When** I view the rhythm panel, **Then** I see chain statistics ordered by tier (Daily, Most Days, Few Times, Weekly)
2. **Given** I have a current 5-day Daily chain, **When** I view the stats, **Then** "5 days" is displayed prominently
3. **Given** my longest-ever Daily chain was 23 days, **When** I view the stats, **Then** I see "best: 23" displayed subtly alongside current
4. **Given** I have no current Daily chain but have a Most Days chain, **When** I view the stats, **Then** I see my achieved tier highlighted

---

### User Story 7 - Multiple Rhythms with Accordion Collapse (Priority: P2)

A user has multiple rhythms (Meditation, Breathing, Tai Chi). The rhythms page shows each as a collapsible accordion panel. Collapsed panels show summary info (name, current tier, chain length). Expanded panels show full visualizations.

**Why this priority**: Users may track many rhythms. Space efficiency and quick scanning are essential.

**Independent Test**: Can be fully tested by creating multiple rhythms and seeing accordion behavior with summary info when collapsed.

**Acceptance Scenarios**:

1. **Given** I have multiple rhythms, **When** I view the rhythms page, **Then** I see each rhythm as a collapsible panel
2. **Given** a rhythm is collapsed, **When** I look at the header, **Then** I see rhythm name, current tier achieved, and current chain length
3. **Given** I tap a collapsed rhythm, **When** it expands, **Then** I see full visualizations (year tracker, month view, chain stats)
4. **Given** I have 5 rhythms, **When** I collapse all, **Then** I can see summary of all 5 without scrolling on desktop

---

### User Story 8 - Edit and Delete Rhythms (Priority: P3)

A user decides they no longer want to track their reading rhythm, or they want to change the duration threshold from 6 to 10 minutes. They can edit or delete rhythms.

**Why this priority**: Users need control over their tracking. Without this, abandoned rhythms create clutter and guilt.

**Independent Test**: Can be fully tested by editing a rhythm's settings and by deleting a rhythm.

**Acceptance Scenarios**:

1. **Given** I have an existing rhythm, **When** I tap to edit it, **Then** I can change its name, duration threshold, frequency, or matching criteria
2. **Given** I want to remove a rhythm, **When** I delete it, **Then** it no longer appears on my rhythms page (entries remain)
3. **Given** I delete a rhythm, **When** I look at my entries, **Then** the underlying entries are preserved (only the rhythm definition is removed)

---

### User Story 9 - Responsive Mobile and Desktop Layout (Priority: P3)

A user views rhythms on their phone and sees a mobile-optimized layout. On desktop, the layout uses available space efficiently with less scrolling.

**Why this priority**: The app is mobile-first PWA but must work well on desktop too.

**Independent Test**: Can be fully tested by viewing rhythms page on mobile and desktop viewports.

**Acceptance Scenarios**:

1. **Given** I am on mobile, **When** I view a rhythm panel, **Then** visualizations stack vertically and are touch-friendly
2. **Given** I am on desktop, **When** I view a rhythm panel, **Then** year tracker and month view may display side-by-side
3. **Given** I have multiple rhythms on mobile, **When** I view the page, **Then** accordion collapse allows scanning all rhythms quickly
4. **Given** I am on desktop with multiple rhythms, **When** panels are collapsed, **Then** I can see more rhythms at once than on mobile

---

### Edge Cases

- What happens when a user has no entries matching a rhythm's criteria? (Show rhythm with empty state, encourage first entry)
- How do weekly rhythms handle timezone differences? (Use user's local timezone for week boundaries)
- What tier do we show when a rhythm was just created today? (Show "Just started" rather than calculating incomplete week)
- How do we handle rhythms for activities the user stopped doing entirely? (After 4+ weeks of no activity, offer to archive)
- What happens if user creates a rhythm with criteria matching 500+ old entries? (Calculate streaks efficiently, limit historical lookback to 2 years for year view)
- How do duration-based rhythms work with partial completions? (e.g., 5 min session when threshold is 6 min — day does NOT count, but show progress bar toward threshold)
- What if user does multiple sessions in one day? (Sum durations — two 5-min sessions = 10 min, exceeds 6-min threshold)
- How does year view handle a new user with only 2 weeks of data? (Show full year with mostly empty squares, current activity visible)
- What happens when switching between calendar month and linear week views? (Preference persists per-user)
- How do we handle panel elements being hidden? (Store visibility preferences, all elements shown by default)

## Requirements _(mandatory)_

### Functional Requirements

**Rhythm Creation (Timer-Based)**:

- **FR-001**: System MUST allow users to create named rhythms that track timer-based entries
- **FR-002**: System MUST allow rhythms to match entries by category (initially mindfulness only)
- **FR-003**: System MUST allow setting a minimum duration threshold per day (default 6 minutes)
- **FR-004**: System MUST offer human-friendly frequency options (daily, most days, few times a week, weekly, monthly)
- **FR-005**: System MUST sum multiple sessions on the same day when checking duration threshold

**Tiered Frequency System**:

- **FR-006**: System MUST calculate which tier a user is achieving based on their actual activity
- **FR-007**: System MUST display the achieved tier positively rather than showing "broken streaks"
- **FR-008**: System MUST show what tier is still achievable when user is behind their target

**Frequency Tiers** (friendly names):

- **FR-009**: "Daily" tier requires 7 days per week meeting duration threshold
- **FR-010**: "Most Days" tier requires 5-6 days per week
- **FR-011**: "Few Times" tier requires 3-4 days per week
- **FR-012**: "Weekly" tier requires 1-2 days per week

**Rhythm Panel - Visualizations**:

- **FR-013**: Each rhythm MUST display in a modular panel with collapsible sections
- **FR-014**: Panel MUST include a GitHub-style year tracker showing calendar year
- **FR-015**: Year tracker MUST show navigation to view previous years
- **FR-016**: Panel MUST include a month view in calendar format (weeks as rows, MTWTFSS columns)
- **FR-017**: Month view MUST show completed days visually distinguished (e.g., colored background like Insight Timer)
- **FR-018**: Month view MUST support navigation to previous/next months
- **FR-019**: Month view MUST support toggle to linear week view (all days in one row)
- **FR-020**: All panel elements MUST be hideable but shown by default

**Rhythm Panel - Chain Statistics**:

- **FR-021**: Panel MUST display chain statistics for each tier, ordered by tier (Daily first)
- **FR-022**: Current chain length MUST be displayed prominently
- **FR-023**: Longest-ever chain MUST be displayed subtly alongside current chain
- **FR-024**: System MUST use identity-based language ("You're becoming a meditator") as the hero message
- **FR-025**: System MUST display statistics (sessions count, total time) alongside encouragement messages
- **FR-026**: System MUST draw encouragement messages from a database table of varied, inventive phrases
- **FR-027**: System MUST vary encouragement messages rather than repeating the same phrase

**Multiple Rhythms**:

- **FR-028**: System MUST support multiple rhythms per user
- **FR-029**: Rhythms MUST display as accordion panels on the rhythms page
- **FR-030**: Collapsed panels MUST show summary: name, current tier, current chain length
- **FR-031**: System MUST show mid-week guidance on what's needed to reach the best achievable tier

**Rhythm Management**:

- **FR-032**: System MUST allow editing rhythm name, duration threshold, frequency, and matching criteria
- **FR-033**: System MUST allow deleting rhythms without deleting the underlying entries
- **FR-034**: System MUST preserve rhythm history even when entries are deleted

**Responsive Layout**:

- **FR-035**: Layout MUST be mobile-first with touch-friendly controls
- **FR-036**: Desktop layout MUST use space efficiently (side-by-side visualizations when space allows)
- **FR-037**: Multiple collapsed rhythms MUST be scannable without excessive scrolling

### Key Entities

- **Rhythm**: A named pattern definition with matching criteria, duration threshold, frequency target, and streak data (extends existing schema)
- **Frequency Tier**: A level of achievement (Daily, Most Days, Few Times, Weekly) calculated from actual activity
- **Chain**: A consecutive streak at a specific tier level, with current length and longest-ever tracking
- **Day Completion**: A calculated status for each day — complete if total duration meets threshold
- **Rhythm Panel Preferences**: User settings for which panel elements are visible, view mode (calendar/linear)
- **Encouragement**: A library of varied, inventive encouragement messages categorized by journey stage (starting, building, becoming) and context (streak milestone, tier achieved, etc.)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a new rhythm in under 60 seconds
- **SC-002**: Users never see "broken streak" or failure-focused messaging (100% positive framing)
- **SC-003**: Users can understand their rhythm status within 2 seconds of viewing the rhythms page
- **SC-004**: Mid-week guidance appears by Thursday for any rhythm where user is behind target
- **SC-005**: Identity-based language appears for rhythms with 2+ weeks of consistent practice
- **SC-006**: Rhythm calculations handle 1000+ historical entries without noticeable delay
- **SC-007**: Year tracker renders full calendar year with navigation to previous years
- **SC-008**: Multiple rhythms (5+) are scannable via collapsed accordion without scrolling on desktop
- **SC-009**: Mobile layout is usable with one-hand thumb navigation
- **SC-010**: Current chain length is immediately visible for each rhythm (collapsed or expanded)

## Assumptions

- Week boundaries follow ISO standard (Monday-Sunday) adjusted for user's local timezone
- Year tracker uses calendar year (Jan-Dec), not rolling 365 days
- Default duration threshold is 6 minutes (configurable per rhythm)
- The existing `rhythms` table schema will be extended for duration threshold and panel preferences
- "Most Days" and "Few Times" are better tier names than "Tier 1", "Tier 2" etc.
- Streak calculations will use efficient queries limited to 2 years for year view
- Identity language thresholds: "Starting" (week 1), "Building" (weeks 2-3), "Becoming" (4+ weeks consistent)
- This version focuses on mindfulness category only; future versions will expand to other categories
- Moment-based and accumulative rhythms are deferred to future version
- Tier status is calculated on-demand; no historical tier change logging (simplifies implementation, aligns with "no guilt" philosophy)

## Clarifications

### Session 2026-01-17

- Q: Should the system log tier change events (e.g., dropping from Daily to Most Days) for analytics? → A: No — calculate current tier on-demand only, no tier change logging
