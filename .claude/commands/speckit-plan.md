Execute the implementation planning workflow to generate design artifacts.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run from repo root and parse JSON:
   ```bash
   bash .specify/scripts/bash/setup-plan.sh --json
   ```
   Extract: FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH.

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template.

3. **Execute plan workflow** following the IMPL_PLAN template:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running:
     ```bash
     bash .specify/scripts/bash/update-agent-context.sh __AGENT__
     ```
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 1. Report branch, IMPL_PLAN path, and generated artifacts.

### Phase 0: Outline & Research

- Extract unknowns from Technical Context → research tasks
- For each dependency → best practices task
- Consolidate findings in `research.md` (Decision, Rationale, Alternatives)

### Phase 1: Design & Contracts

- Extract entities from spec → `data-model.md`
- Define interface contracts (if applicable) → `/contracts/`
- Generate `quickstart.md`
- Run agent context update script

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
