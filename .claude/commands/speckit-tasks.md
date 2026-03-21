Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

Check if `.specify/extensions.yml` exists. If so, check `hooks.before_tasks` for enabled hooks. Execute mandatory hooks before proceeding; display optional hooks.

## Outline

1. **Setup**: Run from repo root:
   ```bash
   bash .specify/scripts/bash/check-prerequisites.sh --json
   ```
   Parse FEATURE_DIR and AVAILABLE_DOCS.

2. **Load design documents** from FEATURE_DIR:
   - **Required**: plan.md, spec.md
   - **Optional**: data-model.md, contracts/, research.md, quickstart.md

3. **Generate tasks** organized by user story:
   - Extract tech stack and user stories with priorities
   - Map entities and contracts to stories
   - Generate dependency graph and parallel execution examples

4. **Write tasks.md** using `.specify/templates/tasks-template.md`:
   - Phase 1: Setup (project init)
   - Phase 2: Foundational (blocking prerequisites)
   - Phase 3+: One phase per user story (priority order)
   - Final: Polish & cross-cutting

5. **Task format** (REQUIRED):
   ```
   - [ ] [TaskID] [P?] [Story?] Description with file path
   ```
   - Checkbox always starts with `- [ ]`
   - Sequential ID: T001, T002...
   - `[P]` only if parallelizable
   - `[US1]`, `[US2]` etc. for user story phases only
   - Clear file path in description

6. **Report**: Path, total count, per-story count, parallel opportunities, MVP scope.

7. Check `hooks.after_tasks` if extensions.yml exists.
