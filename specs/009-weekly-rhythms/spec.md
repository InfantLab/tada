# Feature Specification: Weekly Rhythms — Encouragement & Celebration

**Feature Branch**: `009-weekly-rhythms`
**Created**: 2026-03-17
**Status**: Draft
**Input**: Two complementary weekly features: a Thursday mid-week encouragement nudge based on activity patterns, and a Monday morning end-of-week celebration summary with four privacy tiers (stats-only, local AI, cloud AI factual, cloud AI creative). Aligns with Ta-Da!'s philosophy: celebrate what you've done, don't guilt what you haven't.

## Scope

### This Version

- Thursday encouragement (in-app banner, push notification, optional email) with general progress and rhythm-specific stretch goals
- Monday morning celebration with four privacy/AI tiers, covering general progress and rhythm wins (weekly and all-time)
- Email delivery infrastructure
- Settings and onboarding flow for weekly rhythms
- Per-user timezone-aware scheduling

### Future Versions (Out of Scope)

- Configurable start-of-week day (currently fixed to Monday)
- Configurable delivery day/days and time of day for encouragement and celebration
- Daily encouragement option
- Fortnightly/monthly celebration cadence
- Shareable summary cards for social media
- Comparative stats beyond week-over-week
- Multi-user household celebration merging

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive a Stats-Only Weekly Celebration (Priority: P1)

A user enables weekly celebrations at Tier 1 (Stats Only). After their week ends (Monday–Sunday), the system generates a celebration summary overnight (default 3:33am Monday). The email arrives Monday morning at 8:08am, ready for the start of their new week. The summary shows their week in two parts: **general progress** (entry counts by type, total session time, week-over-week comparisons, personal records) and **rhythm wins** (chain status for each active rhythm this week, plus all-time rhythm milestones). Users may have between 0 and N rhythms — the celebration adapts accordingly. No AI is involved — pure numbers computed from server-side data.

**Why this priority**: The stats-only celebration is the foundation all other tiers build upon. It requires the core data aggregation pipeline, email infrastructure, and scheduling — all prerequisites for every other feature. It also serves privacy-conscious users with zero external dependencies.

**Independent Test**: Can be fully tested by enabling Tier 1 celebrations, creating entries throughout a week, and verifying the celebration email/in-app summary arrives Monday morning with accurate stats.

**Acceptance Scenarios**:

1. **Given** I have enabled weekly celebrations at Tier 1, **When** the generation time arrives (default 3:33am Monday my local time), **Then** a celebration summary is generated and the email is delivered at 8:08am
2. **Given** I have logged 4 meditation sessions totalling 2h 13m this week, **When** I receive my celebration, **Then** I see accurate counts and durations for meditation sessions under general progress
3. **Given** I logged 7 ta-das and 2 dream moments this week, **When** I receive my celebration, **Then** I see entry counts broken down by type (ta-das, sessions, moments, tallies)
4. **Given** I meditated 2h 13m this week vs 1h 45m last week, **When** I receive my celebration, **Then** I see a week-over-week comparison with directional indicators
5. **Given** my daily meditation chain is at 23 days, **When** I receive my celebration, **Then** I see this rhythm's chain status under rhythm wins, including whether it was maintained, extended, or is bending
6. **Given** my longest meditation this month was 47 minutes on Tuesday, **When** I receive my celebration, **Then** I see this highlighted as a personal record
7. **Given** I have not logged any entries this week, **When** the generation time arrives, **Then** I still receive a gentle celebration acknowledging the quiet week without guilt
8. **Given** I have no active rhythms but logged 5 ta-das, **When** I receive my celebration, **Then** I see general progress only — no rhythm wins section
9. **Given** I have 3 active rhythms, **When** I receive my celebration, **Then** I see individual chain status and weekly performance for each rhythm, plus any all-time milestones reached

---

### User Story 2 - Configure Weekly Rhythm Preferences (Priority: P1)

A new user discovers the weekly rhythms feature and goes through a simple onboarding flow. They choose their celebration tier, configure email delivery (or opt for in-app only), and enable or disable Thursday encouragement. All settings are simple choices — no technical configuration required. They can change any of these settings at any time.

**Why this priority**: Without configuration, no weekly rhythm features can be delivered. The settings infrastructure enables all other stories.

**Independent Test**: Can be fully tested by navigating to Settings, completing the onboarding flow, verifying settings are saved, and confirming they can be changed later.

**Acceptance Scenarios**:

1. **Given** I am enabling weekly rhythms for the first time, **When** I start the onboarding flow, **Then** I can choose from four celebration tiers with clear, non-technical descriptions of each
2. **Given** I am configuring email delivery, **When** I enter my email address, **Then** my preference is saved and I see a confirmation
3. **Given** I prefer in-app only (no email), **When** I select this option, **Then** no email configuration is required and celebrations appear only in-app
4. **Given** I want to change my celebration tier from Stats Only to Cloud AI Creative, **When** I visit Settings > Weekly Rhythms, **Then** I can change the tier and see a clear privacy notice for cloud tiers
5. **Given** I am selecting a cloud AI tier, **When** I make my selection, **Then** I see a plain-language privacy notice explaining that summary data (not my personal entries) is processed by an external service
6. **Given** I want to disable Thursday encouragement but keep Monday celebrations, **When** I toggle Thursday encouragement off, **Then** only Monday celebrations continue
7. **Given** all weekly rhythm features are off by default, **When** a new user creates an account, **Then** no weekly rhythms are active until they explicitly opt in

---

### User Story 3 - Receive a Thursday Mid-Week Encouragement (Priority: P2)

It's Thursday afternoon and a user receives a short, encouraging notification (default 3:03pm — past lunch, over halfway through the week, still enough time to act today). The encouragement has two parts: **general overall encouragement** based on their Monday–Thursday activity compared to recent patterns, and **rhythm-specific stretch goals** for each active rhythm where a small effort could make a difference ("One more meditation and you match last week"). The tone focuses on momentum and effort, never guilt. If it's been a quiet week, the nudge gently acknowledges that without pressure. Users may have between 0 and N rhythms — the encouragement adapts accordingly.

**Why this priority**: The Thursday nudge is a standalone feature that adds value mid-week. It depends on the same data aggregation as celebrations but is simpler (no email required for MVP — in-app banner suffices).

**Independent Test**: Can be fully tested by enabling Thursday encouragement, creating some entries Mon–Thu, and verifying an encouraging in-app message appears on Thursday at 3:03pm.

**Acceptance Scenarios**:

1. **Given** I have enabled Thursday encouragement and meditated 3 times this week, **When** Thursday 3:03pm arrives, **Then** I see a general encouragement message plus a rhythm stretch goal like "One more meditation and you match last week"
2. **Given** I have been very active this week (exceeding recent averages), **When** Thursday arrives, **Then** I see a celebratory general message acknowledging the strong week
3. **Given** I have had a quiet week with no entries, **When** Thursday arrives, **Then** I see a gentle message like "Quiet week? That's okay. One small thing today counts" — never guilt or shame
4. **Given** I have 3 active rhythms, **When** Thursday arrives, **Then** I see stretch goals for each rhythm where a small effort could make a difference this week
5. **Given** I have no active rhythms, **When** Thursday arrives, **Then** I see only general overall encouragement based on my entry activity
6. **Given** I have enabled push notifications, **When** the encouragement is triggered, **Then** I receive a push notification in addition to the in-app banner
7. **Given** I open the app after Thursday, **When** I visit the home page, **Then** I see the encouragement as a dismissible in-app banner

---

### User Story 4 - Receive a Local AI Celebration (Priority: P2)

A user selects the "Private AI" tier (Tier 2) for their celebrations. Their weekly summary includes a warm, personalised narrative generated entirely on the Ta-Da! server — no data is sent to any cloud AI provider. The AI adds pattern observations, encouragement grounded in data, gentle suggestions based on rhythm trends, and weekly theme identification. The user simply picks this tier in settings; the server-side AI infrastructure is invisible to them.

Note: The feasibility and quality of on-server AI generation needs research — the initial Ta-Da! deployment (tada.living) may not have a capable local LLM available immediately. This tier may launch after Tiers 1, 3, and 4.

**Why this priority**: Private AI adds significant richness over stats-only while maintaining full privacy. It serves users who want AI-enhanced celebrations but don't want their data processed by external services.

**Independent Test**: Can be fully tested by selecting Tier 2 in settings, creating a week of entries, and verifying the celebration includes narrative elements beyond raw stats.

**Acceptance Scenarios**:

1. **Given** I have selected the Private AI tier, **When** my celebration is generated, **Then** it includes a warm narrative summary covering both general progress and rhythm wins
2. **Given** I had 3 piano sessions and 2 writing entries this week, **When** I receive my celebration, **Then** the narrative identifies thematic patterns like "This was a creative week"
3. **Given** I tend to meditate longer after logging dreams, **When** the AI generates my summary, **Then** it may observe correlations like "Your meditation quality tracks with dream journaling"
4. **Given** the server-side AI is unavailable, **When** celebration generation is attempted, **Then** the system falls back to Tier 1 (stats only) and delivers successfully
5. **Given** I am using Tier 2, **When** the celebration is generated, **Then** zero data is sent to any external AI service
6. **Given** the Private AI tier is not yet available on this instance, **When** I try to select it, **Then** I see a message that this option is coming soon, and I can choose another tier

---

### User Story 5 - Receive a Cloud AI Factual Celebration (Priority: P3)

A user selects the "AI Enhanced" tier (Tier 3). Their weekly celebration is written by an external AI that produces a warm, well-crafted summary grounded strictly in the data. The AI stays factual — no invention, no metaphors — just the data told well. Only summary statistics (types, categories, durations, counts) are sent to the AI service, never entry text or personal content. The user sees a plain-language privacy notice when selecting this tier.

**Why this priority**: Cloud AI tiers serve users who want polished, well-written celebrations. Tier 3 establishes the external AI integration pattern that Tier 4 also uses.

**Independent Test**: Can be fully tested by selecting Tier 3 in settings, creating a week of entries, and verifying the celebration is a well-written factual narrative.

**Acceptance Scenarios**:

1. **Given** I have selected the AI Enhanced tier, **When** my celebration is generated, **Then** I receive a well-written, factual narrative covering both general progress and rhythm wins
2. **Given** I am using Tier 3, **When** the celebration is generated, **Then** only summary statistics are sent to the AI service — no entry text, dreams, journal content, or personal notes
3. **Given** the external AI service is unavailable, **When** celebration generation is attempted, **Then** the system falls back to Tier 1 (stats only)
4. **Given** I am on Tier 3, **When** I receive my celebration, **Then** the tone is warm and celebratory but stays close to the facts without creative embellishment

---

### User Story 6 - Receive a Cloud AI Creative Celebration (Priority: P3)

A user selects the "AI Creative" tier (Tier 4). Their weekly celebration is playful, inventive, and full of personality. The AI uses metaphors, humour, and creative freedom to make the summary genuinely enjoyable to read. The same privacy boundary applies as Tier 3.

**Why this priority**: This is the "delight" tier — the version users would actually look forward to reading. It shares infrastructure with Tier 3 but uses different prompting.

**Independent Test**: Can be fully tested by selecting Tier 4 in settings and verifying the celebration includes creative, playful language.

**Acceptance Scenarios**:

1. **Given** I have selected the AI Creative tier, **When** my celebration is generated, **Then** I receive a playful, creative summary with personality, metaphors, and humour covering both general progress and rhythm wins
2. **Given** the same week of data, **When** I compare Tier 3 and Tier 4 outputs, **Then** Tier 4 is noticeably more creative and personality-driven while Tier 3 is more restrained
3. **Given** the privacy boundary applies, **When** data is sent to the AI service, **Then** the same summary-statistics-only restriction applies as Tier 3
4. **Given** the AI uses creative language, **When** I read my celebration, **Then** all facts cited are accurate — creativity applies to framing, not to inventing accomplishments

---

### User Story 7 - Manage Email Delivery and Unsubscribe (Priority: P2)

A user receives celebration emails and wants control over delivery. Every email includes an unsubscribe link. They can manage email preferences from the email itself or from the app settings. Email delivery handles retries gracefully.

**Why this priority**: Email delivery is essential infrastructure for celebrations, and unsubscribe capability is both a user trust feature and a legal requirement.

**Independent Test**: Can be fully tested by receiving an email, clicking unsubscribe, and verifying emails stop while in-app celebrations continue.

**Acceptance Scenarios**:

1. **Given** I have email delivery enabled, **When** I receive a celebration email, **Then** it includes a working unsubscribe link
2. **Given** I click the unsubscribe link in an email, **When** the unsubscribe is processed, **Then** I stop receiving emails but in-app celebrations continue if enabled
3. **Given** email delivery fails (SMTP error), **When** the system retries, **Then** it retries with backoff and does not duplicate-send on success
4. **Given** I receive celebration emails, **When** I view them in my email client, **Then** they render well in both HTML and plain text
5. **Given** I have not configured an email address, **When** celebrations are generated, **Then** they are available only in-app with no email errors

---

### Edge Cases

- What if a user changes their tier mid-week? (Use the new tier for the next celebration; don't regenerate the current week)
- What if a user changes their timezone? (Recalculate delivery time for the next scheduled delivery)
- What if the celebration generation time falls during server downtime? (Queue and deliver on recovery, with a "delayed" note if more than 6 hours late)
- What if a user has no entries at all (brand new account)? (Skip celebration with no notification rather than sending an empty summary)
- What if a user has entries but no active rhythms? (Celebrate general progress only; rhythm wins section is omitted)
- What if a user has many rhythms but only some are relevant this week? (Show all active rhythms; highlight those with activity; gently note quiet ones without guilt)
- What if the server-side AI (Tier 2) takes too long to generate? (Timeout after 60 seconds and fall back to Tier 1)
- What if the external AI service (Tier 3/4) returns inappropriate or off-brand content? (System should use a celebratory-tone prompt; no content moderation layer needed for V1 since summary-statistics-only input limits risk)
- What if a user has email configured but their email address becomes invalid? (After 3 consecutive bounces, disable email delivery and show an in-app notification to update their email)
- What if two celebrations are queued (e.g., delayed delivery + next week's on-time delivery)? (Deliver both in chronological order, clearly dated)

## Requirements *(mandatory)*

### Functional Requirements

**Weekly Data Aggregation**:

- **FR-001**: System MUST aggregate weekly entry counts by type (ta-das, sessions, moments, tallies)
- **FR-002**: System MUST calculate total session durations by category for the week
- **FR-003**: System MUST calculate week-over-week comparisons with directional indicators
- **FR-004**: System MUST identify personal records within the current month (longest session, highest count, etc.)
- **FR-005**: System MUST compute rhythm chain status (maintained, extended, bending, broken) for each of the user's active rhythms (0 to N)
- **FR-006**: System MUST track all-time rhythm milestones (longest chain ever, total completions, etc.)

**Thursday Encouragement**:

- **FR-007**: System MUST generate encouragement with two parts: general overall encouragement and rhythm-specific stretch goals
- **FR-008**: System MUST compare current week activity to the user's last 4 weeks' averages for general encouragement
- **FR-009**: System MUST generate per-rhythm stretch goals for each active rhythm where a small effort could make a difference this week
- **FR-010**: System MUST gracefully handle users with zero active rhythms (general encouragement only, no stretch goals)
- **FR-011**: System MUST never use guilt-based or shame-based language in any encouragement
- **FR-012**: System MUST deliver encouragement at the configured time (default: Thursday 15:03 user local time)
- **FR-013**: System MUST deliver encouragement via in-app banner on the configured day
- **FR-014**: System SHOULD support push notification delivery for encouragement (if push is available)
- **FR-015**: System SHOULD support email delivery for encouragement (if email is configured)

**Monday Celebration — Tier 1 (Stats Only)**:

- **FR-016**: System MUST generate a structured statistics summary with zero external API calls
- **FR-017**: System MUST include two sections: general progress (entry counts, session durations, week-over-week, personal records) and rhythm wins (per-rhythm chain status, weekly performance, all-time milestones)
- **FR-018**: System MUST compute all statistics from server-side data only
- **FR-019**: System MUST generate the celebration overnight (default: 3:33am Monday user local time)
- **FR-020**: System MUST deliver the celebration email at morning delivery time (default: 8:08am Monday user local time)

**Monday Celebration — Tier 2 (Private AI)**:

- **FR-021**: System MUST generate a narrative summary using server-side AI with zero external data transmission
- **FR-022**: System MUST include pattern observations, encouragement grounded in data, suggestions based on trends, and weekly theme identification
- **FR-023**: System MUST fall back to Tier 1 if the server-side AI is unavailable
- **FR-024**: System MUST gracefully indicate when this tier is not yet available on the current instance

**Monday Celebration — Tier 3 (AI Enhanced)**:

- **FR-025**: System MUST generate a factual, well-written narrative using an external AI service
- **FR-026**: System MUST send only summary statistics (types, categories, durations, counts) to the external AI service — never entry text, journal content, dreams, or personal notes
- **FR-027**: System MUST clearly disclose to the user in plain language what data is processed externally before first use
- **FR-028**: System MUST fall back to Tier 1 if the external AI service is unavailable

**Monday Celebration — Tier 4 (AI Creative)**:

- **FR-029**: System MUST generate a creative, playful narrative using an external AI service with creative freedom
- **FR-030**: System MUST maintain the same summary-statistics-only data boundary as Tier 3
- **FR-031**: System MUST ensure all cited facts are accurate regardless of creative embellishment

**Delivery Infrastructure**:

- **FR-032**: System MUST support email delivery with HTML and plain text formats
- **FR-033**: System MUST include an unsubscribe link in every email
- **FR-034**: System MUST handle the user's local timezone for scheduling both generation and delivery
- **FR-035**: System MUST retry failed email deliveries with backoff
- **FR-036**: System MUST support in-app-only delivery as an alternative to email
- **FR-037**: System MUST disable email delivery after 3 consecutive bounce failures and notify the user in-app

**Settings and Configuration**:

- **FR-038**: System MUST default all weekly rhythm features to OFF (opt-in only)
- **FR-039**: System MUST allow independent toggling of Thursday encouragement and Monday celebration
- **FR-040**: System MUST allow changing celebration tier at any time
- **FR-041**: System MUST present tier choices with plain-language, non-technical descriptions
- **FR-042**: System MUST securely manage credentials for external AI services (server-side configuration, invisible to end user)

**Privacy**:

- **FR-043**: Tier 1 and Tier 2 MUST involve zero external data transmission
- **FR-044**: Tier 3 and Tier 4 MUST transmit only summary statistics, never entry content
- **FR-045**: System MUST display a plain-language privacy notice before enabling any cloud AI tier

### Key Entities

- **Weekly Celebration**: A generated summary for a specific user and week, with tier, content (general progress + rhythm wins), delivery status, and timestamp
- **Encouragement**: A generated mid-week nudge for a specific user and week, with general encouragement content, per-rhythm stretch goals, and delivery status
- **Weekly Rhythm Settings**: Per-user preferences including celebration tier, delivery method, email address, encouragement on/off
- **Weekly Stats Snapshot**: Aggregated statistics for a user's week — entry counts by type, session durations by category, per-rhythm chain statuses, week-over-week deltas, personal records, all-time rhythm milestones
- **Email Delivery Record**: Tracks email send attempts, delivery status, bounce count, and unsubscribe status per user

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enable weekly celebrations and receive their first summary the following Monday morning
- **SC-002**: Tier 1 celebrations are generated by 3:33am and emails delivered by 8:08am in the user's local timezone
- **SC-003**: 100% of encouragement and celebration messages use positive, celebratory language — zero instances of guilt, shame, or failure framing
- **SC-004**: Users can complete the weekly rhythms onboarding flow in under 2 minutes
- **SC-005**: Email delivery succeeds on first attempt for 95%+ of sends (excluding invalid addresses)
- **SC-006**: Every celebration email includes a working one-click unsubscribe that takes effect within 1 minute
- **SC-007**: System falls back from any AI tier to Tier 1 without user-visible error when the AI provider is unavailable
- **SC-008**: Thursday encouragement messages vary across weeks — no identical message delivered to the same user in a 4-week window
- **SC-009**: All weekly stats are accurate to within the user's actual entry data — zero statistical errors in counts, durations, or comparisons
- **SC-010**: Celebrations and encouragements are delivered at the correct time in the user's local timezone
- **SC-011**: Celebrations for users with 0 rhythms show meaningful general progress without empty rhythm sections
- **SC-012**: Celebrations for users with N rhythms show individual status for every active rhythm

## Assumptions

- Email infrastructure (SMTP, Resend, SendGrid, or equivalent) will be introduced as a new capability for this feature
- The existing rhythm chain calculation logic from spec 002 will be reused for chain status reporting
- Week boundaries follow ISO standard (Monday–Sunday) adjusted for user's local timezone
- Server-side AI capability (Tier 2) needs research — tada.living may not have a capable local LLM initially; this tier may launch after Tiers 1, 3, and 4
- Cloud AI integration (Tier 3/4) supports configurable providers (Anthropic, OpenAI, etc.) configured server-side
- Push notification support depends on existing PWA push infrastructure; if not yet available, push delivery is deferred
- AI service credentials are managed server-side (environment variables / secrets), not exposed to end users
- Tier 1 requires no additional infrastructure beyond the existing server and database
- The "last 4 weeks' averages" comparison for Thursday encouragement uses a rolling window, not calendar months
- Personal records are scoped to the current month to keep them frequent and meaningful
- This feature ships as part of v0.5.0 or later, after email infrastructure is available
- Users can have at most one celebration and one encouragement per week (no duplicate deliveries)
- Users may have between 0 and N active rhythms; all features gracefully adapt to any count
