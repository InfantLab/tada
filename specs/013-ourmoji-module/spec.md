# Feature Specification: Ourmoji Module

**Feature Branch**: `013-ourmoji-module`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: TED-SPEC.md (Ted + Caspar + Marian)  
**Target Release**: v0.5.0+  
**Access Level**: Restricted — select users only (Caspar, Marian initially)

---

## Clarifications

### Session 2026-04-02

- Q1: Concurrent Experiment Participation → A: One experiment per user at a time. A user must complete or exit an active experiment before joining another active experiment.
- Q2: Sender Timezone Notification Timing → A (customized): Nightly assignment fires at 21:00 local time for the earliest participant timezone in the experiment. Morning dream flow remains independent in each participant's own local morning.
- Q3: Failed Dream Submission Recovery → B: After dream submission, dream text is locked and persisted even if the app closes. User can return later to complete only the guess.
- Q4: Statistics During Active Runs → B: During active runs, show only neutral progress metrics (e.g., nights completed, submissions count). Hide hit rates, p-values, and comparative breakdowns until completion.
- Q5: Voice Recording Reuse → A: Reuse existing `VoiceRecorder` as-is for dream capture. No custom dream-specific wrapper in MVP.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Daily Ourmoji Reception & Display (Priority: P1)

**Overview**: Each morning, an emoji is drawn from the Sacred Set, linked with a poetic reflection that references moon phase and significant calendar dates. Users open Ta-Da! and see today's Ourmoji as a first-class event with its symbolic context.

**Why this priority**: Daily Ourmoji is the foundational feature. It establishes the module's presence, creates the ritual entry point, and enables the dream experiment data collection without requiring weeks of development. External delivery (OpenClaw) is independent; Ta-Da!'s role is to log and display.

**Independent Test**: Can be fully tested by:

1. Manually posting a daily Ourmoji via API
2. Opening Ta-Da! as an enabled user
3. Verifying the emoji, reflection, moon phase, and Wheel of Year day appear correctly
4. Scrolling through historical calendar to confirm persistence
5. Delivers immediate value: users see their daily magical moment logged.

**Acceptance Scenarios**:

1. **Given** OpenClaw sends a daily Ourmoji via POST /api/ourmoji/daily, **When** an enabled user opens Ta-Da!, **Then** today's Ourmoji displays with emoji, full reflection text, moon phase name, and illumination percentage.

2. **Given** today is a significant date (e.g., "World Octopus Day", "Beltane"), **When** the user views the daily Ourmoji, **Then** the Wheel of Year reference appears with category label (e.g., "Pagan", "Discordian").

3. **Given** a user views the Ourmoji calendar view, **When** they scroll backward through dates, **Then** past Ourmojis display as emoji in a grid with date labels, and tapping any date shows the full reflection + context.

4. **Given** an Ourmoji already exists for today's date, **When** OpenClaw sends a new Ourmoji with the same date, **Then** the entry updates (no duplicate) and shows the new reflection.

5. **Given** a user lacks the `ourmoji` feature flag, **When** they navigate to any Ourmoji panel or API endpoint, **Then** the feature is hidden (no nav entry, no error message — simply unavailable).

---

### User Story 2 - Dream Experiment Nightly Assignment & Role Management (Priority: P2)

**Overview**: Each evening at 21:00 in the earliest participant timezone for that experiment, Ta-Da! assigns roles for the night to experiment participants: Sender (receives target emoji, focuses before sleep), Receiver (records dream, guesses emoji), Control (both participants are receivers, no sender), or Rest (no assignment). Assignment is blinded to Receiver — they don't know if a Sender exists. Morning dream capture remains independent to each participant's local morning.

**Why this priority**: Role assignment is the experiment's core orchestration mechanism. Without it, the dream recording and guessing flows have no context. It's a self-contained nightly process (no manual intervention) that unblocks the recorder/guesser flows downstream.

**Independent Test**: Can be fully tested by:

1. Creating an experiment run with 2+ participants
2. Triggering evening assignment (or waiting for scheduled 21:00)
3. Verifying Sender receives notification with target emoji
4. Verifying Receiver receives notification without target emoji revealed
5. Checking that role assignments are roughly balanced over time (e.g., each participant sends ~50% of available nights)
6. Delivers value: participants understand their roles and expectations, and the protocol's blinding is maintained.

**Acceptance Scenarios**:

1. **Given** an experiment run is active with 2 participants in different timezones, **When** the evening assignment trigger fires at 21:00 in the earliest participant timezone (or manual override runs), **Then** exactly one of the following is assigned: (1) one sender + one receiver, (2) two receivers (control), or (3) no assignment (rest), with weights configured for the experiment.

2. **Given** a Sender is assigned, **When** they receive the Sender notification, **Then** their Ta-Da! shows "Tonight you are Sender. Target emoji: 🐙" and they understand task (focus on emoji before sleep).

3. **Given** a Receiver is assigned, **When** they receive the Receiver notification, **Then** their Ta-Da! shows "Tonight you are Receiver. Record your dream on waking." with NO indication of whether a Sender exists (blinded).

4. **Given** a Rest assignment, **When** the trigger time reaches 21:00 in the earliest participant timezone, **Then** no notification is sent to that participant, and the app shows no experiment prompt.

5. **Given** an experiment run scheduled for 14 nights with 2 participants, **When** all 14 nights have been assigned via the randomisation algorithm, **Then** both participants have sent approximately equal times (e.g., 7 sends each) and received approximately equal times (verified via role audit log).

---

### User Story 3 - Dream Recording, Guessing, & Reveal Flow (Priority: P2)

**Overview**: On waking, the Receiver (or both participants on control nights) open Ta-Da! and see a morning prompt: "Record your dream to see the result." They tap → opens Dream Experiment panel → voice record or text input dream → tap "Submit dream" → locked immediately → slides to Guess screen showing Sacred Set grid (23 emoji) → tap emoji to guess → optional confidence slider → "Submit guess" → locked → reveal animation shows target emoji (or "Control night — no target") → hit or miss.

**Why this priority**: This is the high-friction UX at the heart of the protocol. It must be deeply frictionless (one voice tap, minimal screen transitions) to maximize dream fidelity. Voice recording reuses Ta-Da!'s existing voice infrastructure. Acceptance scenarios focus on flow completeness and UX smoothness.

**Independent Test**: Can be fully tested by:

1. Triggering a Receiver assignment for a test participant
2. Waking in the morning (simulated via time override or manual flow trigger)
3. Opening Ta-Da! as the Receiver
4. Recording dream via voice (or typing)
5. Guessing emoji from Sacred Set grid
6. Submitting and seeing reveal (target emoji or control message)
7. Verifying dream text + guess are locked and uneditable
8. Delivers value: dream is captured, guess recorded, result is transparent, no ambiguity about what happened.

**Acceptance Scenarios**:

1. **Given** a Receiver assignment for a participant, **When** they open Ta-Da! the morning after, **Then** an experiment banner appears at the top: "You were a Receiver last night. Record your dream to see the result."

2. **Given** the experiment banner is visible, **When** the user taps it, **Then** the Dream Experiment panel opens with: (1) large voice record button, (2) text input option, (3) "Submit dream" button.

3. **Given** the user taps the voice record button, **When** they speak their dream and tap stop, **Then** the audio is transcribed via the existing voice system and appears in the text field, ready for review/edit.

4. **Given** the dream text is visible, **When** the user taps "Submit dream", **Then** the text locks (no further edits), and the panel slides to the Guess screen.

5. **Given** the Guess screen is active, **When** the user sees the Sacred Set in a grid (all 23 emoji), **Then** they can tap any emoji to select it, and a confidence slider (1-5) is optionally adjustable, and "Submit guess" button is visible.

6. **Given** the user taps "Submit guess", **When** the guess is locked and submitted, **Then** the panel displays the Reveal screen showing: (1) the target emoji (if send condition) or "Control night — no target was sent", (2) a hit/miss indicator, (3) on hit: celebration animation (confetti-style à la Ta-Da!), on miss: gentle messaging with no shame.

7. **Given** dream text and guess are submitted, **When** the user later tries to edit either field, **Then** both fields remain locked with read-only state; no edits are permitted (scientific integrity).

8. **Given** a user submits dream text and the app closes before guess submission, **When** they reopen the app, **Then** the flow resumes at the Guess screen with dream text locked and persisted, and only guess submission remains available.

---

### User Story 4 - Experiment Run Management (Priority: P2)

**Overview**: An admin (or experiment owner) creates an experiment run, specifies start/end dates, configures role distribution weights (% send, % control, % rest), and optionally adds/removes participants. Ta-Da! tracks which participants are active, prevents any participant from belonging to more than one active experiment at a time, and automatically assigns roles nightly throughout the run duration.

**Why this priority**: Without experiment management, the nightly assignment is orphaned. This story provides the control plane: setting boundaries, configuring randomisation, scaling to multiple participants. It's a gating feature for the team to onboard new experiment participants.

**Independent Test**: Can be fully tested by:

1. Creating an experiment run with 2 participants, start/end dates, and role weights (50% send, 30% control, 20% rest)
2. Verifying the run shows "active" on the experiments list
3. Checking that role assignments respect weights over a 14-night sample (binomial test p > 0.05)
4. Pausing the run and confirming no new assignments fire
5. Resuming and confirming assignments resume
6. Delivers value: experiments are fully controlled; participants can be added/removed; role distributions are reproducible.

**Acceptance Scenarios**:

1. **Given** an authorized user (admin or experiment owner), **When** they navigate to experiment management, **Then** they see: (1) create new experiment, (2) list of active/past runs, (3) for each run: start/end dates, participant list, role weights.

2. **Given** they tap "Create experiment", **When** they fill in form (name, start date, end date, participant emails, role weights), **Then** the experiment run is created with status "scheduled", and nightly assignments will begin on the start date at 21:00 in the earliest participant timezone.

3. **Given** a participant already belongs to another active experiment, **When** the user tries to add that participant to a new active experiment, **Then** the system rejects the add and explains that a participant can only belong to one active experiment at a time.

4. **Given** an active experiment run, **When** the user taps "Pause", **Then** the run status changes to "paused" and no new role assignments fire until resumed.

5. **Given** a paused experiment, **When** the user taps "Resume", **Then** the run resumes and nightly assignments continue from the current date (no catch-up backfill of missed nights).

6. **Given** an active experiment run, **When** the user adds a new participant via email, **Then** that participant is added to the role pool and receives assignments starting the next nightly sweep.

7. **Given** an experiment run with completed data, **When** its end date is reached, **Then** the status changes to "completed" and no further assignments fire.

---

### User Story 5 - Experiment Statistics & Analysis Dashboard (Priority: P3)

**Overview**: For completed experiment runs, users can view full statistics: hit rate vs 1/23 chance baseline, binomial test p-value, hit rates by condition (send vs control), by participant, by emoji, timeline of cumulative hit rate, and correlation with moon phase. During active runs, users only see neutral progress metrics (e.g., nights completed, submission counts) with no inferential or comparative results.

**Why this priority**: Statistics validate the experiment's rigor and provide feedback to participants. This is not mandatory for the experiment to function but is essential for post-hoc analysis and participant engagement (especially on control nights: "here's why control nights matter"). Deferred to P3 as polish once core flows are stable.

**Independent Test**: Can be fully tested by:

1. Running a synthetic experiment with pre-populated dream/guess entries (some hits, some misses, mix of conditions)
2. Navigating to the statistics dashboard for that experiment
3. Verifying hit rate is calculated as # hits / total guesses
4. Verifying p-value is computed via binomial test (scipy or equivalent)
5. Verifying breakdown by condition (send vs control) shows hit rates separated
6. Verifying no participant names are exposed; only anonymous IDs or "Participant A/B"
7. Delivers value: participants understand experimental design, can reason about results, feel the rigor.

**Acceptance Scenarios**:

1. **Given** an experiment run with ≥5 completed nights, **When** the user views the statistics dashboard, **Then** they see: (1) total hit rate (e.g., "42% of guesses were correct"), (2) 1/23 chance baseline (4.35%), (3) binomial test p-value, (4) explanation of statistical significance.

2. **Given** the statistics dashboard, **When** the user views breakdown by condition, **Then** send condition hit rate and control condition hit rate are displayed separately (e.g., "Send: 45%, Control: 38%").

3. **Given** the statistics dashboard, **When** the user views "by emoji" stats, **Then** the 23 emoji are ranked by hit rate, with the highest "strongest signal" emoji highlighted.

4. **Given** the statistics dashboard, **When** the user views "by participant", **Then** two anonymous participant identifiers (A/B or "You" / "Partner") are shown with their send/receive/control counts and individual hit rates (never showing participant names or personal data).

5. **Given** the statistics dashboard, **When** the user views the timeline graph, **Then** the cumulative hit rate is plotted over nights, with confidence interval shading, showing convergence toward true hit rate as N increases.

6. **Given** the statistics dashboard, **When** the user filters by moon phase, **Then** hit rates are segmented (e.g., "Waxing Crescent: 38%, Full Moon: 51%, Waning Gibbous: 35%") with sample size noted.

7. **Given** an experiment run is still active, **When** a participant opens the statistics dashboard, **Then** they see only neutral progress metrics (nights completed, submissions count, nights remaining) and do not see hit rate, p-value, condition breakdown, emoji ranking, or participant comparison.

---

### User Story 6 - Voice Recording & Dream Transcription Integration (Priority: P2)

**Overview**: Dream Experiment flow integrates Ta-Da!'s existing `VoiceRecorder` component as-is and transcription infrastructure (Whisper API via GROQ). User presses voice record → speaks dream → audio is transcribed → text appears in dream field. Falls back to manual text entry if voice fails.

**Why this priority**: Dream fidelity depends on voice capture. If users must manually type dreams, friction increases and recall fades. Reusing existing voice infrastructure avoids redundant development. This is part of the core morning flow (US3) but deserves explicit validation.

**Independent Test**: Can be fully tested by:

1. Opening Dream Experiment panel as a Receiver
2. Tapping voice record button
3. Speaking a test dream sentence
4. Verifying transcription appears in text field with reasonable accuracy
5. Verifying user can edit/correct transcription before submitting
6. If voice fails, verifying text input fallback is available
7. Delivers value: dreams captured with minimal friction; high fidelity; natural human workflow.

**Acceptance Scenarios**:

1. **Given** the Dream Experiment panel is open, **When** the user taps the voice record button, **Then** the button changes state (e.g., red stop indicator) and recording begins.

2. **Given** recording is active, **When** the user speaks a dream, **Then** audio is captured with visual feedback (e.g., audio waveform or recording timer).

3. **Given** the user finishes speaking and taps stop, **When** the audio is processed, **Then** transcription appears in the text field within 3-5 seconds (latency acceptable for morning context).

4. **Given** transcription appears, **When** the user reviews it, **Then** they can edit the text manually before submitting (correcting any transcription errors).

5. **Given** voice transcription fails (API error, network down, etc.), **When** the system detects the failure, **Then** the Dream Experiment panel shows a text input fallback: "Voice transcription unavailable — please type your dream."

6. **Given** the user uses text input instead of voice, **When** they type their dream and tap "Submit dream", **Then** the submission works identically to the voice flow.

---

### Edge Cases

- **What happens when a Receiver is assigned but doesn't record a dream by end of day?** Dream field remains null; they cannot guess (no reveal shown). Statistics exclude non-submitters.

- **What happens if a Sender is assigned but the notification is never delivered (push failed)?** Sender doesn't see the target emoji. Receiver wakes, records dream, guesses without sender (unknown control night). Data is valid but control condition is detected post-hoc. Notification delivery robustness is a risk.

- **What happens when a participant changes timezone mid-experiment?** Evening assignment still fires at 21:00 in the earliest participant timezone for that experiment night. Morning dream capture remains based on each participant's own local morning. Scheduler idempotency prevents double-assignments.

- **What if experiment has 0 participants?** Experiment runs but no notifications fire; role assignments exist but no users are notified. Statistics remain empty.

- **What if Sacred Set emoji don't render on user's device (old OS, missing emoji font)?** Fallback to emoji code (e.g., "U+1F427" for penguin) or text name ("penguin"). UI gracefully degrades.

- **What if dream text is extremely long (10k+ words)?** Voice transcription may truncate. Accept first N characters (e.g., 5000 chars) and warn user; allow manual text edit to trim.

- **What if app closes after dream submission but before guess submission?** Dream submission remains persisted and locked. User resumes directly at the guess step; no dream re-entry required.

- **What if user submits guess but then closes app before reveal loads?** Guess is locked in database. On next app open, Dream Experiment panel shows cached reveal or refetches from API. Reveal is idempotent.

- **What if participants try to infer outcomes during an active run from analytics?** The dashboard only shows neutral progress metrics until run completion; no hit rates, p-values, or comparative breakdowns are shown.

- **What if experiment run end date passes but a participant hasn't recorded a dream/guess yet?** Experiment closes (status = "completed"); unsubmitted participants never see the flow. Their unsubmitted draft is discarded. (Aggressive but maintains data integrity.)

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST register `ourmoji` entry type via the module registry (Option B: Internal Module Registry) so that entries of type `ourmoji` are persisted.

- **FR-002**: System MUST provide a REST API endpoint `POST /api/ourmoji/daily` to receive daily Ourmoji from external systems (OpenClaw), accepting `emoji`, `reflection`, `moonPhase`, `moonIllumination`, `wheelOfYear`, `wheelCategory`, and `date` fields.

- **FR-003**: System MUST prevent duplicate Ourmoji entries for the same date; if a POST /api/ourmoji/daily request includes a date already in the database, the existing entry is updated (not duplicated).

- **FR-004**: System MUST display today's Ourmoji in a dedicated panel (accessible from Moments or its own nav entry) showing emoji, reflection text, moon phase name, moon illumination percentage, and Wheel of Year reference (if applicable).

- **FR-005**: System MUST provide a calendar view of historical Ourmoji entries, allowing users to scroll through past dates and tap any date to see the full reflection + metadata.

- **FR-006**: System MUST enforce access control via feature flag: users without `enabledModules: ["ourmoji"]` in their settings never see the Ourmoji panel, nav entry, or API endpoints (graceful invisibility, no error message).

- **FR-007**: System MUST register `dream-experiment` entry type (or store as `moment` subcategory — see Open Questions) to persist dream experiment submissions.

- **FR-008**: System MUST manage experiment runs: create, retrieve, update (pause/resume), end, and list operations. Each run has a unique `experimentId`, start date, end date, participant list, and role distribution weights (% send, % control, % rest). A participant MUST NOT belong to more than one active experiment run at a time.

- **FR-009**: System MUST assign nightly roles at 21:00 in the earliest participant timezone for each active experiment: exactly one role per participant from {Sender, Receiver, Rest, Control}. Role assignment MUST respect configured probability weights and produce roughly balanced sender/receiver splits over the run duration.

- **FR-010**: System MUST implement blinding: Receiver notifications MUST NOT reveal whether a Sender exists; Receiver only learns this after submitting their guess.

- **FR-011**: System MUST accept dream recording via voice (using existing VoiceRecorder component + Whisper transcription) or text input, with fallback to text if voice fails.

- **FR-012**: System MUST accept Receiver's emoji guess from a forced-choice grid of the 23 Sacred Set emoji, plus optional confidence rating (1-5).

- **FR-013**: System MUST lock dream text immediately after dream submission and lock guess immediately after guess submission. If interruption occurs between steps, dream text remains persisted and read-only, and the user resumes at guess-only step.

- **FR-014**: System MUST calculate hit/miss by comparing `guess` to `targetEmoji` (if Sender condition) and return the result with reveal animation (confetti on hit, gentle message on miss).

- **FR-015**: System MUST calculate experiment-level statistics: overall hit rate, binomial test p-value against 1/23 chance baseline, hit rates by condition (send vs control), hit rates by participant (anonymous), hit rates by emoji, cumulative hit rate timeline, and correlation with moon phase.

- **FR-016**: System MUST prevent unblinded analytical reveal during active experiments. While a run is active, only neutral progress metrics (e.g., nights completed, submission counts) are visible; hit rates, p-values, condition breakdowns, emoji rankings, and participant comparisons are visible only after the run is marked "completed".

- **FR-017**: System MUST store randomisation seed per experiment run for reproducibility; role assignments MUST be deterministic given the seed and night index.

- **FR-018**: System MUST implement scheduler idempotency: consecutive runs of the nightly assignment process for the same night MUST not create duplicate role assignments (use uniqueness constraint on `experimentId`, role type, nightDate).

- **FR-019**: System MUST support multi-user experiment orchestration: experiment can have 2+ participants, role assignments route notifications to the correct participant, statistics preserve participant anonymity (Participant A/B, never names), and participant eligibility checks enforce only one active experiment membership per user.

- **FR-020**: System MUST provide a Sacred Set configuration (the 23 emoji + their symbolic associations) stored as module static data (JSON or constant), not requiring database changes per emoji.

- **FR-021**: System MUST provide a Wheel of Year configuration (65 named days + lunar-dependent dates) stored as module static data, updated annually if needed.

- **FR-022**: System MUST support source tracking for Ourmoji: "manual" (user created) vs "api" (from OpenClaw), visible in the entry metadata.

- **FR-023**: System MUST send notifications (push or email TBD — see Open Questions) to Sender at 21:00 with target emoji and to Receiver with role prompt (without revealing if Sender exists).

- **FR-024**: System MUST handle missing/invalid Ourmoji fields gracefully: if moonIllumination is null, display "—"; if wheelOfYear is null, omit the Wheel reference (non-fatal).

---

### Key Entities _(data model)_

**OurmojiEntry**:

- `id` (UUID): Unique entry identifier
- `userId` (UUID): Entry owner
- `date` (DATE): YYYY-MM-DD of the Ourmoji
- `emoji` (STRING): Single emoji character (e.g., "🐙")
- `reflection` (TEXT): 2-3 sentences of poetic text
- `moonPhase` (STRING): Name of lunar phase (e.g., "Waxing Crescent", "Full Moon")
- `moonIllumination` (INT 0-100): Percentage illuminated
- `wheelOfYear` (STRING, nullable): Named day (e.g., "Beltane", "Yuri's Night")
- `wheelCategory` (STRING, nullable): Category label (e.g., "Pagan", "Discordian", "Málaga")
- `source` ("manual"|"api"): Origin of entry
- `createdAt`, `updatedAt` (TIMESTAMP): Metadata timestamps

**ExperimentRun**:

- `experimentId` (UUID): Unique run identifier
- `name` (STRING): Human-readable name (e.g., "March 2026 Dream Telepathy")
- `startDate` (DATE): First assignment date YYYY-MM-DD
- `endDate` (DATE): Last assignment date YYYY-MM-DD
- `status` ("scheduled"|"active"|"paused"|"completed"): Current state
- `participants` (JSON ARRAY of UUID): List of participant user IDs
- `participantTimezones` (JSON MAP): Participant timezone keyed by user ID for earliest-timezone scheduling
- `roleWeights` (JSON): {"send": 0.5, "control": 0.3, "rest": 0.2} probabilities
- `randomisationSeed` (BIGINT): Cryptographic seed for reproducibility
- `createdAt`, `updatedAt` (TIMESTAMP): Metadata

**RoleAssignment**:

- `assignmentId` (UUID): Unique assignment identifier
- `experimentId` (UUID): Foreign key to ExperimentRun
- `nightDate` (DATE): YYYY-MM-DD of the assignment
- `participantId` (UUID): Assigned participant
- `role` ("sender"|"receiver"|"control"|"rest"): Role for this night
- `targetEmoji` (STRING, nullable): If sender, the target emoji
- `notificationSentAt` (TIMESTAMP, nullable): When notification was delivered
- `createdAt` (TIMESTAMP): Assignment creation time

**DreamExperimentEntry**:

- `id` (UUID): Unique entry identifier
- `userId` (UUID): Entry owner (Receiver)
- `experimentId` (UUID): Foreign key to ExperimentRun
- `nightDate` (DATE): YYYY-MM-DD of the assignment night
- `condition` ("send"|"control"|"rest"): Condition for this night
- `role` ("sender"|"receiver"|null): User's role
- `targetEmoji` (STRING, nullable): Target emoji (null for receiver/control)
- `dreamText` (TEXT, nullable): Receiver's dream transcript
- `guess` (STRING, nullable): Receiver's emoji guess (1 of 23)
- `guessConfidence` (INT 1-5, nullable): Confidence rating
- `isHit` (BOOLEAN, nullable): guess === targetEmoji
- `submissionState` ("none"|"dream_locked"|"complete"): Step-wise lock state for interruption-safe resume
- `lockedAt` (TIMESTAMP, nullable): Timestamp when dream + guess locked
- `revealedAt` (TIMESTAMP, nullable): Timestamp when reveal shown to user
- `createdAt`, `updatedAt` (TIMESTAMP): Metadata

**ExperimentStatistics** _(computed, may be cached)_:

- `experimentId` (UUID): Parent experiment
- `totalGuesses` (INT): Total receiver guesses submitted
- `hits` (INT): Number of correct guesses
- `hitRate` (FLOAT 0-1)
- `baselineRate` (FLOAT 0.0435): 1/23 = 4.35%
- `binomialPValue` (FLOAT): p-value from binomial test
- `byCondition` (JSON): {"send": {"hits": X, "total": Y, "rate": Z}, "control": {...}}
- `byEmoji` (JSON): {"🐙": {"hits": X, "total": Y, "rank": 1}, ...}
- `byParticipant` (JSON): {"participantA": {...}, "participantB": {...}} (anonymized)
- `moonPhaseCorrelation` (JSON): {"Full Moon": {...}, "Waxing": {...}, ...}
- `updatedAt` (TIMESTAMP): Last calculation time

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view today's Ourmoji from app open to full display in under 30 seconds; no loading spinners or perceptible delays.

- **SC-002**: Dream recording and guess submission workflow completes in under 5 minutes from app open to reveal display, measured on a median device (e.g., iPhone 12 or equivalent).

- **SC-003**: Voice transcription of a 30-second dream achieves ≥90% word accuracy when measured via manual review or edit distance; fallback to text input is available on 100% of voice failures.

- **SC-004**: Experiment role assignments achieve role distribution within 10% of configured weights over 14+ nights (e.g., if configured for 50% send, actual send rate is 40–60%).

- **SC-005**: Randomisation seed + night index produce deterministic, reproducible role assignments: re-running assignment algorithm for same experimentId + nightDate and participant timezone set yields identical roles (verified via audit log comparison).

- **SC-006**: Blinding is maintained: Receiver notifications contain zero information about whether a Sender exists; blinding is broken only after Receiver submits guess (verified via notification content audit).

- **SC-007**: Step-wise lock is enforced: dream text is non-editable after dream submission and guess is non-editable after guess submission; interrupted sessions resume with dream locked and guess pending (verified by recovery test plus edit-attempt rejection).

- **SC-008**: Binomial test p-value is computed correctly in at least 3 synthetic test cases with known outcomes (e.g., 100% hit rate should give p < 0.0001; 4% hit rate should give p > 0.05).

- **SC-009**: Neutral progress metrics are updated nightly within 1 hour during active runs. Full inferential statistics (hit rate, p-value, breakdowns) are published within 1 hour after run completion; no manual intervention required.

- **SC-010**: Feature flag access control works correctly: users without `ourmoji` in enabledModules see zero trace of the Ourmoji feature (UI hidden, API returns 403, nav entry invisible).

- **SC-011**: At least 90% of Receivers successfully complete the morning flow (record dream → guess → reveal) without encountering errors; error recovery (voice fallback to text, network retry) reduces error rate to <5%.

- **SC-012**: Experiment participants (Caspar + Marian) report subjective satisfaction ≥4/5 with magical feel, ritual engagement, and morning frictionlessness (evaluated via post-experiment survey).

---

## Assumptions

1. **Entry Type Registration**: The modular architecture (Option B: Internal Module Registry) is already implemented in v0.4.0+. Ourmoji can register entry type without requiring schema changes to the core `entries` table.

2. **Voice Infrastructure**: Existing `VoiceRecorder` component and Whisper transcription (GROQ API) are production-ready and reusable for dream transcription by Phase 3. No redundant voice infrastructure needed.

3. **Notification System**: Ta-Da! has a notification dispatch mechanism (push and/or email). Dream Experiment sends notifications via this system at 21:00 in the earliest participant timezone for the experiment. Morning flows remain local to each participant.

4. **External Delivery**: OpenClaw independently sends daily Ourmoji via API; Ta-Da! receives and logs only. OpenClaw's uptime/delivery is not Ta-Da!'s responsibility.

5. **Experiment Participants**: Initially restricted to Caspar + Marian; expansion to other users happens post-v0.5.0 (multi-user scaling is deferred). Each user may participate in only one active experiment at a time.

6. **Moon Phase Data**: OpenClaw provides accurate moon phase; Ta-Da! can trust incoming `moonPhase` and `moonIllumination` fields. No independent moon calculation needed.

7. **Wheel of Year Maintenance**: The 65 named days (Pagan, Discordian, etc.) are maintained as static JSON; annual updates (e.g., Easter, lunar feasts) are manual. Automatic recalculation is a future enhancement.

8. **Scientific Rigor**: Experiment is designed for small-scale (2-person) testing. Statistical significance testing (binomial) is appropriate for manual review; no automated decision-making on results.

9. **Privacy & Data Retention**: Dream text is sensitive; stored encrypted at rest. Experiment data is retained per Ta-Da!'s standard retention policy (retained while app is active, no indefinite archive). No export to external systems without explicit user consent.

10. **UI/UX Simplicity**: Dream recording panel reuses Ta-Da!'s design system (Tailwind, Vue 3) and patterns (voice recorder UI, modal panel). No custom UI framework or third-party animation library needed beyond existing Tailwind + Vue transitions.

11. **Voice Component Scope**: MVP reuses `VoiceRecorder` as-is for dream capture. No dream-specific wrapper (`VoiceDreamRecorder`) is introduced in MVP.

---

## Open Questions _(to resolve before planning)_

1. **Entry Type vs Subcategory**: Should `ourmoji` and `dream-experiment` be new entry types (requiring module registry) or subcategories under `moment`? New types are cleaner but require modularity work completion. Recommend: **New types** (cleaner, isolated from moment taxonomy).

2. **Notification Delivery**: How does Ta-Da! send evening assignments to Sender and Receiver? (a) PWA push notification, (b) Email, (c) Both? Currently no push infrastructure in v0.5.0 roadmap. Accepted clarification: notifications are scheduled for 21:00 in the earliest participant timezone; channel choice still needs planning. Recommend: **Email for MVP**, with PWA as future enhancement.

3. **Multi-User Experiment State**: How is the experiment linked to two users? (a) Shared `experiment_runs` table with participant list (current design), (b) Separate user→experiment join table, (c) Simpler: just store participantIds in experiment_runs JSONB? Recommend: **(a) Current design** — simple and sufficient for 2-person experiments.

4. **Wheel of Year Data Source**: Static JSON in module, or fetched dynamically from OpenClaw? Static is simpler; dynamic allows OpenClaw to manage calendar. Recommend: **Static JSON** for MVP; dynamic fetch in v0.6.0 if needed.

5. **Voice Recording Reuse**: Resolved in Clarifications (Q5): use existing `VoiceRecorder` as-is for MVP. Revisit dream-specific wrapper only if usability data shows need post-launch.

---

## Summary

**Ourmoji Module** is a two-phase internal feature:

1. **Phase 1 (MVP)**: Daily Ourmoji reception and display — log external emoji with reflection + context (moon, Wheel of Year).
2. **Phase 2**: Dream Experiment orchestration — assign roles nightly, capture dreams, collect guesses, compute statistics with scientific rigor.
3. **Phase 3**: Polish — voice integration, reveal animations, extended statistics.

**Design Philosophy**: Magical, rigorous, frictionless. The module celebrates the dream (and the emoji) while maintaining experimental blinding and data integrity.

**User Impact**: Caspar + Marian receive a beautiful ritual space for their daily magical practice and dream telepathy protocol. The Ta-Da! platform becomes the central hub for this work.

**Technical Impact**: Validates the modular architecture (Option B: Internal Module Registry) as a path for experimental features. Demonstrates timely entry type registration, feature-flag access control, and complex data flows (multi-user, time-dependent orchestration).
