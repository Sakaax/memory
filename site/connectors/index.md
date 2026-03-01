# Connectors

Connectors are shell wrappers in `~/.local/bin` that inject your memory context before an AI session starts.

## Available connectors

| Connector | Command | Injection method |
|---|---|---|
| Claude Code | `claude-memory` | `--append-system-prompt` |
| Gemini CLI | `gemini-memory` | `-i` (interactive context) |
| Codex CLI | `codex-memory` | positional argument |
| OpenCode | `opencode-memory` | `--prompt` / `run` headless |
| Aider | `aider-memory` | `--read <tmpfile>` |
| ShellGPT | `sgpt-memory` | context via stdin |
| Goose | `goose-memory` | `goose run --system` |
| Groq | `groq-memory` | `--system` flag |
| Ollama | `ollama-memory` | Modelfile `SYSTEM` / stdin |
| Cursor Agent | `cursor-agent-memory` | `-p` headless |
| Droid | `droid-memory` | `droid exec` |

## Usage

```bash
gemini-memory                        # interactive session with memory
claude-memory                        # interactive session with memory
aider-memory src/main.ts             # aider with memory context
goose-memory                         # interactive goose with context
ollama-memory "explain this code"    # one-shot with context

OLLAMA_MODEL=mistral ollama-memory   # use a specific model
```

## Project-specific connectors

```bash
memory setup myapp
# → creates claude-memory-myapp, gemini-memory-myapp, etc.

claude-memory-myapp    # only injects myapp scope memories
```

## Session capture

Wrap any connector with `memory watch` to harvest memories from the conversation on exit:

```bash
memory watch gemini            # launch gemini-memory + capture
memory watch claude myapp      # launch claude-memory-myapp + capture
```

See [watch](../commands/watch.md).
