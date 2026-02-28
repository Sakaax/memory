# memory

**Persistent cognitive layer for AI systems.**

Your context. One file. Every AI.

---

## The problem

Every AI session starts from zero.
Claude doesn't know what you told Gemini.
Gemini doesn't know what Codex learned.
You keep re-explaining yourself.

**memory** solves this by giving every AI the same shared context — a single JSON file on your machine.

---

## How it works

```
memory remember "I use Bun, never npm"
        ↓
   memory.json          ← single source of truth
   ↙    ↓    ↘
Claude  Gemini  Codex   ← all read the same context
```

Context is injected at session start. No API calls. No cloud. No setup beyond the CLI.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Sakaax/memory/main/install.sh | bash
```

Then configure your AI connectors:

```bash
memory setup
```

Requires [Bun](https://bun.sh) — installed automatically if missing.

**Manual install:**

```bash
git clone https://github.com/Sakaax/memory ~/.memory
cd ~/.memory
bun install
./memory setup
source ~/.zshrc
```

---

## Commands

### Store

```bash
memory remember "I use Bun, never npm or yarn" --type preference --domain development
memory remember "My stack: Next.js 15, Neon, Prisma, Railway" --type knowledge --domain development
memory remember "Ship fast — baby on the way" --type constraint --domain personal
```

Storing the same content twice increases confidence automatically.

**Available types:**
`preference` · `knowledge` · `project` · `decision` · `skill` · `relationship` · `goal` · `constraint`

### Recall

```bash
memory recall                  # all memories
memory recall development      # filter by domain, type, or keyword
```

### Manage

```bash
memory status                  # stats overview
memory forget <id>             # delete by id
memory dump                    # export full JSON
```

### Connectors

```bash
memory setup                   # detect and install AI connectors interactively
memory uninstall               # remove connectors interactively
```

### UI

```bash
memory ui                      # open local web interface at http://127.0.0.1:7711
```

### Help

```bash
memory help
```

---

## Setup

`memory setup` detects which AI CLIs are installed and shows an interactive selector:

```
◆  Select connectors to install:
│  ◼ gemini   Google Gemini CLI
│  ◼ claude   Claude Code CLI
│  ◼ codex    OpenAI Codex CLI
└
```

Press `Space` to toggle, `Enter` to confirm.

After install, it shows exactly which commands to run:

```
┌─ Ready to use ────────────────────────────────────────────┐
│                                                           │
│  gemini-memory   →  launch gemini with your memory context│
│  claude-memory   →  launch claude with your memory context│
│  codex-memory    →  launch codex  with your memory context│
│                                                           │
└───────────────────────────────────────────────────────────┘
```

To remove connectors:

```bash
memory uninstall
```

Same interface — select which wrappers to delete.

---

## Connectors

Each connector is a shell wrapper in `~/.local/bin` that injects your memory context before the AI session starts.

| Connector | Command | Injection method |
|---|---|---|
| Claude Code | `claude-memory` | `--append-system-prompt` |
| Gemini CLI | `gemini-memory` | `-i` (interactive context) |
| Codex CLI | `codex-memory` | positional argument |

**Usage:**

```bash
gemini-memory                           # interactive session with memory
claude-memory                           # interactive session with memory
codex-memory                            # interactive session with memory

gemini-memory "what runtime do I use?"  # one-shot query
```

---

## Local UI

```bash
memory ui
```

Opens a local web interface at `http://127.0.0.1:7711`.

- Browse all memories in a card grid
- Live search by content, type, or domain
- Edit memory content, type, domain, and importance
- Delete memories
- Confidence bar and date on each card

Press `Ctrl+C` to stop the server. No background process.

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

`memory.json` stays on your machine. It is excluded from git by default.

---

## Project structure

```
memory/
├── install.sh              one-liner installer
├── memory                  shell wrapper (entry point)
├── memory.json             your data (gitignored)
├── src/
│   ├── store.ts            shared data layer
│   ├── cli.ts              all commands
│   └── ui/
│       ├── server.ts       Bun HTTP server (127.0.0.1:7711)
│       ├── routes.ts       API routes
│       └── static/
│           └── index.html  local web interface
└── docs/                   architecture and design notes
```

---

## Roadmap

**Next**
- [ ] `memory harvest` — extract memories from a session transcript
- [ ] In-session write — wrappers detect `!remember <content>` and store directly
- [ ] More connectors — Copilot CLI, aichat, sgpt

**Later**
- [ ] `memoryd` — background daemon with HTTP API
- [ ] Confidence decay — memories fade without reinforcement
- [ ] Web SDK — JS library for browser integration
- [ ] Device sync — opt-in, encrypted

---

## Contributing

```bash
git clone https://github.com/Sakaax/memory
cd memory
bun install
bun run src/cli.ts help
```

Keep it simple. No cloud. No heavy dependencies. PRs welcome.

---

## License

MIT
