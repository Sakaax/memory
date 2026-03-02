# Setup

## Install connectors

```bash
memory setup
```

Detects installed AI CLIs and shows an interactive selector:

```
◆  Select connectors to install:
│  ◼ gemini   Google Gemini CLI
│  ◼ claude   Claude Code CLI
│  ◼ codex    OpenAI Codex CLI
└
```

Press `Space` to toggle, `Enter` to confirm.

After install:

```
┌─ Ready to use ──────────────────────────────────────────────┐
│                                                             │
│  gemini-memory   →  launch gemini with your memory context  │
│  claude-memory   →  launch claude with your memory context  │
│  codex-memory    →  launch codex  with your memory context  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## What connectors do

Each connector is a shell wrapper that:

1. Runs `memory context --write --cwd "$(pwd)"` — generates `~/.memory/context.md` with your memories + live git/code analysis of the current project
2. Injects the context into the AI

**Injection method by connector:**

| Connector | Injection |
|---|---|
| `claude-memory` | File path pointer — `"Read ~/.memory/context.md with your Read tool"` |
| `aider-memory` | `--read ~/.memory/context.md` — file passed directly |
| `gemini-memory` | File content injected via `-i` flag |
| `codex-memory` | File content injected as positional argument |
| `goose-memory` | File content via `--system` flag |
| `groq-memory` | File content via `--system` flag |
| `ollama-memory` | File content via Modelfile `SYSTEM` directive |
| Others | File content via stdin or positional |

Claude and Aider receive a **file reference** (short, clean). All others receive the **file content** as text, which is richer than before since it includes live git and code analysis.

## Project-specific setup

```bash
memory setup myapp
```

Creates `claude-memory-myapp`, `gemini-memory-myapp`, etc. — each injecting only the `myapp` scope memories.

```bash
memory scope create myapp
memory setup myapp
claude-memory-myapp   # knows only myapp memories
claude-memory         # knows global memories
```

## Uninstall

```bash
memory uninstall
```

Interactive selector to remove installed connectors.

## Re-run setup to update connectors

If you update memory, re-run setup to get the latest wrapper templates:

```bash
memory setup
source ~/.zshrc
```

## Notes

- `ollama-memory` defaults to your first local model — override with `OLLAMA_MODEL=<model>`
- `cursor-agent-memory` injects context only in headless mode (`-p`)
- `groq-memory` is always interactive — positional args are ignored
