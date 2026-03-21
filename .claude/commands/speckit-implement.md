Execute the implementation plan by processing and executing all tasks defined in tasks.md.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

Check if `.specify/extensions.yml` exists. If so, check `hooks.before_implement` for enabled hooks. Execute mandatory hooks; display optional hooks.

## Outline

1. **Setup**: Run from repo root:
   ```bash
   bash .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```
   Parse FEATURE_DIR and AVAILABLE_DOCS.

2. **Check checklists** (if FEATURE_DIR/checklists/ exists):
   - Count total/completed/incomplete items per checklist
   - If incomplete: STOP and ask user to proceed or halt
   - If all complete: proceed automatically

3. **Load context**: tasks.md (required), plan.md (required), plus data-model.md, contracts/, research.md, quickstart.md if they exist.

4. **Project setup verification**: Create/verify ignore files (.gitignore, .dockerignore, etc.) based on detected tech stack.

5. **Parse tasks.md**: Extract phases, dependencies, parallel markers.

6. **Execute phase-by-phase**:
   - Complete each phase before moving to next
   - Respect sequential dependencies; run parallel [P] tasks together
   - Follow TDD if tests exist
   - Mark completed tasks as `[X]` in tasks.md

7. **Progress tracking**: Report after each task. Halt on non-parallel failures. Clear error messages.

8. **Completion validation**: Verify all tasks done, features match spec, tests pass.

9. Check `hooks.after_implement` if extensions.yml exists.
