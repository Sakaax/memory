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

## Project-specific setup

```bash
memory setup myapp
```

Creates `claude-memory-myapp`, `gemini-memory-myapp`, etc. — each injecting only the `myapp` scope.

## Uninstall

```bash
memory uninstall
```

Interactive selector to remove installed connectors.

## Notes

- `aider-memory` writes context to `/tmp/memory-XXXXXX.md` and cleans it up on exit
- `ollama-memory` defaults to `llama3.2` — override with `OLLAMA_MODEL=<model>`
- `cursor-agent-memory` injects context only in headless mode (`-p`)
- `groq-memory` is always interactive — positional args are ignored
