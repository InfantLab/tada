Create or update the feature specification from a natural language feature description.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

The text the user typed after the command **is** the feature description.

Given that feature description:

1. **Generate a concise short name** (2-4 words) for the branch in action-noun format.

2. **Create the feature branch** (do NOT pass `--number` — auto-detected):
   ```bash
   bash .specify/scripts/bash/create-new-feature.sh --json --short-name "short-name" "Feature description"
   ```

3. Load `.specify/templates/spec-template.md` for required sections.

4. Parse description, extract actors/actions/data/constraints. Make informed guesses for unclear aspects. Mark max 3 items with `[NEEDS CLARIFICATION]` only if the choice significantly impacts scope, has multiple reasonable interpretations, and no reasonable default exists.

5. Write the spec to SPEC_FILE using the template. Focus on **WHAT** and **WHY**, not HOW. Written for business stakeholders.

6. **Validate** against quality criteria. Create checklist at `FEATURE_DIR/checklists/requirements.md`. If items fail, fix and re-validate (max 3 iterations). If clarifications remain (max 3), present questions with options.

7. Report completion with branch name, spec file path, checklist results, and next step (`/speckit-clarify` or `/speckit-plan`).

**NOTE:** The script creates and checks out the new branch and initializes the spec file before writing.
