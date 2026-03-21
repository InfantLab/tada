Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Detect and reduce ambiguity or missing decision points in the active feature specification and record the clarifications directly in the spec file.

This clarification workflow runs BEFORE `/speckit-plan`. If the user explicitly states they are skipping clarification, warn that downstream rework risk increases.

1. Run the prerequisites script from repo root once:
   ```bash
   bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only
   ```
   Parse: `FEATURE_DIR`, `FEATURE_SPEC`. If JSON parsing fails, abort and instruct user to re-run `/speckit-specify`.

2. Load the current spec file. Perform a structured ambiguity & coverage scan using this taxonomy (mark each: Clear / Partial / Missing):

   - Functional Scope & Behavior (core goals, out-of-scope, user roles)
   - Domain & Data Model (entities, attributes, relationships, lifecycle, scale)
   - Interaction & UX Flow (critical journeys, error/empty/loading states, accessibility)
   - Non-Functional Quality Attributes (performance, scalability, reliability, observability, security, compliance)
   - Integration & External Dependencies (services/APIs, failure modes, formats)
   - Edge Cases & Failure Handling (negative scenarios, rate limiting, conflicts)
   - Constraints & Tradeoffs (technical constraints, rejected alternatives)
   - Terminology & Consistency (canonical terms, avoided synonyms)
   - Completion Signals (acceptance criteria testability, Definition of Done)
   - Misc / Placeholders (TODOs, vague adjectives lacking quantification)

3. Generate a prioritized queue of max 5 clarification questions. Each must be answerable with multiple-choice (2-5 options) or short answer (<=5 words). Only include questions whose answers materially impact architecture, data modeling, task decomposition, test design, UX, operational readiness, or compliance.

4. **Sequential questioning** — present ONE question at a time:
   - For multiple-choice: Present **Recommended** option prominently with reasoning, then all options as a table. User can reply with letter, "yes"/"recommended", or own answer.
   - For short-answer: Present **Suggested** answer with reasoning. User can accept or provide own.
   - Stop when: all critical ambiguities resolved, user signals "done", or 5 questions asked.

5. **After EACH accepted answer**, update the spec:
   - Ensure `## Clarifications` section exists (create after overview if missing)
   - Add `### Session YYYY-MM-DD` subheading
   - Append bullet: `- Q: <question> → A: <answer>`
   - Apply clarification to the appropriate spec section(s)
   - Save the spec file after each integration

6. Validate after each write: no duplicates, no contradictions, no lingering placeholders, consistent terminology.

7. Report completion: questions asked/answered, path to updated spec, sections touched, coverage summary table (Resolved/Deferred/Clear/Outstanding), suggested next command.

If no meaningful ambiguities found, respond: "No critical ambiguities detected" and suggest proceeding to `/speckit-plan`.

Context for prioritization: $ARGUMENTS
