# memory

> Persistent cognitive layer for AI systems.

One JSON file. One CLI. Your context — everywhere.

---

## The problem

Every AI resets. You explain yourself again and again.
Claude doesn't know what Gemini learned yesterday.
Gemini doesn't know what you told Claude this morning.

**memory** fixes this.

---

## How it works

```
You
 ↓
memory remember "I use Bun for everything"
 ↓
memory.json  ←  single source of truth
 ↓         ↓
Claude    Gemini    (any CLI)
```

Each AI connector reads `memory.json` before responding.
Your context persists across tools, sessions, and reboots.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Sakaax/memory/main/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/Sakaax/memory ~/.memory
cd ~/.memory && bun install
./memory setup
source ~/.zshrc
```

**Requirements:** [Bun](https://bun.sh) (auto-installed if missing), Git

---

## Setup

```bash
memory setup
```

Detects installed AI CLIs and auto-configures connectors. No manual config.

```
memory setup

✓ memory → ~/.local/bin/memory
✓ PATH updated in ~/.zshrc
✓ gemini-memory wrapper installed

── Claude Code ──────────────────────────────
  Add this to ~/.claude/CLAUDE.md:
  ## Memory Context
  Before every response, read `~/.memory/memory.json`
  and use stored memories as context.
─────────────────────────────────────────────
Connectors ready: gemini-memory
Reload shell: source ~/.zshrc
```

---

## Usage

### Store a memory

```bash
memory remember "I use Bun, never npm or yarn" --type preference --domain development
memory remember "My stack: Next.js 15, Neon, Prisma, Railway" --type knowledge --domain development
memory remember "Baby due soon — keep it short and ship" --type constraint --domain personal
```

**Types:** `preference` · `knowledge` · `project` · `decision` · `skill` · `relationship` · `goal` · `constraint`

### Recall memories

```bash
memory recall                  # all memories
memory recall development      # filter by domain/type/content
```

### Manage

```bash
memory status                  # stats
memory forget <id>             # delete by id
memory dump                    # raw JSON
```

---

## Connectors

### Claude Code

Add to `~/.claude/CLAUDE.md`:

```markdown
## Memory Context
Before every response, read `~/.memory/memory.json` and use stored memories as context.
```

Claude will silently use your memories in every project.

### Gemini CLI

After `memory setup`, use the generated wrapper:

```bash
gemini-memory                        # interactive REPL with memory context
gemini-memory "what runtime do I use?"   # one-shot with memory
```

### Adding more connectors

Any CLI that supports stdin injection or an initial prompt flag can be connected.
Connectors follow the same pattern — see `gemini-memory` in `~/.local/bin/`.

---

## Memory schema

```json
{
  "id": "7389c302",
  "type": "preference",
  "content": "I use Bun, never npm or yarn",
  "domain": "development",
  "confidence": 0.9,
  "importance": 0.5,
  "source": "cli",
  "created_at": "2026-02-28T13:33:08.463Z",
  "updated_at": "2026-02-28T13:39:23.581Z"
}
```

`memory.json` is your file. It lives locally, never leaves your machine.

---

## Roadmap

**V2 — Auto-setup & more connectors**
- [ ] `memory setup` — auto-detect all major AI CLIs
- [ ] Copilot CLI connector
- [ ] `aichat` / `sgpt` connectors

**V3 — Bidirectional (write from any CLI)**
- [ ] Post-session harvest: log sessions, extract memories with `memory harvest <logfile>`
- [ ] In-session write: wrappers intercept `!remember <content>` in interactive mode
- [ ] Confidence decay: memories fade without reinforcement

**V4 — Infrastructure**
- [ ] `memoryd` daemon with HTTP API
- [ ] Web SDK (JS)
- [ ] Sync across devices (opt-in, encrypted)

---

## Contributing

```bash
git clone https://github.com/Sakaax/memory
cd memory && bun install
bun run src/cli.ts help
```

PRs welcome. Keep it simple. No cloud dependencies.

---

## License

MIT
