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
 ↓         ↓         ↓
Claude    Gemini    Codex    (any CLI)
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

Detects installed AI CLIs and shows an interactive list — select the connectors you want with `Space`, confirm with `Enter`. No manual config.

```
◆  Select connectors to install:
│  ◼ gemini   Google Gemini CLI
│  ◼ claude   Claude Code CLI
│  ◼ codex    OpenAI Codex CLI
└
```

When done, memory shows which commands to run:

```
┌─ Ready to use ──────────────────────────┐
│                                         │
│  gemini-memory  →  launch gemini with your memory context
│  claude-memory  →  launch claude with your memory context
│  codex-memory   →  launch codex  with your memory context
│                                         │
└─────────────────────────────────────────┘
```

---

## Uninstall connectors

```bash
memory uninstall
```

Same interactive flow — select connectors to remove. Run `memory setup` to reinstall anytime.

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
memory recall development      # filter by domain, type or content keyword
```

### Manage

```bash
memory status                  # stats
memory forget <id>             # delete by id
memory dump                    # raw JSON export
```

### Help

```bash
memory help
```

Displays all commands with the MEMORY banner.

---

## Connectors

### Claude Code

```bash
claude-memory                          # interactive with memory context
```

Context is injected via `--append-system-prompt`. No config file needed.

### Gemini CLI

```bash
gemini-memory                          # interactive REPL with memory context
gemini-memory "what runtime do I use?" # one-shot
```

### Codex CLI

```bash
codex-memory                           # interactive with memory context
```

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
