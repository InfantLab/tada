# Terminal Behavior with Dev Containers & Agents

This repo runs inside a dev container. Terminals opened in VS Code (manual or automation) run inside the container by default. AI agents (Copilot Chat, etc.) and VS Code Tasks spawn their own automation terminals and do not type into your existing panes unless explicitly configured to reuse a panel.

## Expected Behavior

- **Isolation:** Automation terminals are separate from your interactive terminal. They inherit the container environment but not your shell session.
- **Port conflicts:** If automation starts another dev server on the same port (e.g., 3000), the existing server can fail. This is a port issue, not terminal reuse.
- **Tasks & panel reuse:** VS Code Tasks can reuse a panel if configured, but you can force new/dedicated panels.

## Recommendations

- Keep your dev server in a dedicated terminal; run other commands elsewhere.
- For Tasks/automation, set `presentation.panel` to `"new"` or `"dedicated"` to avoid reuse of your server pane.
- Avoid running scripts that start another dev server while one is active.
- If you need different shells for automation vs. interactive, configure `terminal.integrated.automationProfile.*` (or `automationShell.*`).

## Example Task Snippet (safe panel)

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "lint",
      "type": "shell",
      "command": "bun run lint",
      "presentation": {
        "reveal": "always",
        "panel": "new" // or "dedicated"
      }
    }
  ]
}
```

## Reference Docs

- VS Code Tasks: https://code.visualstudio.com/docs/editor/tasks
- Automation terminals: https://code.visualstudio.com/docs/terminal/basics
- Copilot Chat running commands: https://code.visualstudio.com/docs/copilot/copilot-chat
- Dev containers terminals: https://code.visualstudio.com/docs/devcontainers/containers#_opening-a-terminal
