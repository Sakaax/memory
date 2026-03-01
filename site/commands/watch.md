# watch

Two modes depending on usage.

## Stream memory events

Watch for real-time changes to the memory store.

```bash
memory watch
```

Output:

```
watching scope=global
file=/home/user/.memory/global/memory.json

EVENT memory_added   id=abc123 scope=global
EVENT memory_updated id=abc123 scope=global
EVENT memory_deleted id=def456 scope=global
```

Events go to **stdout** — designed for piping:

```bash
memory watch | grep memory_added
memory watch | awk '{print $3}'
memory watch | while read line; do notify-send "memory" "$line"; done
```

Press `Ctrl+C` to stop.

---

## Session capture

Wrap any AI provider CLI and harvest memories from the conversation on exit.

```bash
memory watch <provider> [scope]
```

**Examples:**

```bash
memory watch gemini              # launch gemini-memory
memory watch codex               # launch codex-memory
memory watch claude              # launch claude-memory
memory watch gemini monprojet    # launch gemini-memory-monprojet
```

**How it works:**

1. Launches the provider's memory connector (`gemini-memory`, `codex-memory`...)
2. Captures the full TTY session via `script` — user input and AI output
3. On exit, strips ANSI codes and applies harvest heuristics
4. Shows an interactive selector to pick which candidates to store

You interact with the AI normally — nothing changes during the session.

**Supported providers:**

`gemini` · `codex` · `claude` · `opencode` · `aider` · `goose` · `groq` · `ollama` · `sgpt` · `droid`

> The provider connector must be installed first. Run `memory setup` to install connectors.
