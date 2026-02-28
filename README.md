# memory

**Persistent cognitive layer for AI systems.**

Your context. One file. Every AI.

---

## The problem

Every AI session starts from zero.
Claude doesn't know what you told Gemini.
Gemini doesn't know what Codex learned.
You keep re-explaining yourself.

**memory** solves this by giving every AI the same shared context — stored locally on your machine.

---

## How it works

```
memory remember "I use Bun, never npm"   ← you, or any AI, writes
        ↓
   ~/.memory/global/memory.json          ← single source of truth
   ↙    ↓    ↘
Claude  Gemini  Codex                    ← all read the same context
   ↘    ↓    ↙
memory remember "..."                    ← AIs write back automatically
```

Context is injected at session start. No API calls. No cloud. No setup beyond the CLI.

AIs with shell access can also write back to memory autonomously during a session.

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
memory recall                  # all memories in active scope
memory recall development      # filter by domain, type, or keyword
```

### Manage

```bash
memory status                  # stats overview
memory forget <id>             # delete by id
memory dump                    # export full JSON
```

### Scopes

Scopes let you maintain independent memory contexts — one for global preferences, one per project.

```bash
memory scope list              # list all scopes, show active
memory scope create <name>     # create a new project scope
memory scope use <name>        # switch active scope
```

All commands (`remember`, `recall`, `forget`, etc.) operate on the active scope automatically.

**Structure on disk:**

```
~/.memory/
├── current_scope              ← active scope name
├── global/
│   └── memory.json            ← default scope
└── projects/
    └── <name>/
        └── memory.json        ← project scope
```

**Example workflow:**

```bash
memory scope create myapp
memory scope use myapp
memory remember "uses PostgreSQL with Prisma" --type project --domain database
memory scope use global        # back to global
```

### Watch

Stream live memory change events from the active scope.

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

Events go to **stdout**. Status messages go to **stderr**. Designed for piping:

```bash
memory watch | grep memory_added
memory watch | awk '{print $3}'
memory watch | while read line; do echo "changed: $line"; done
```

Press `Ctrl+C` to stop.

### Hooks

Run local scripts automatically when memories change.

Place executable scripts in `~/.memory/hooks/`:

```
~/.memory/hooks/
├── on-memory-added.sh
├── on-memory-updated.ts
└── on-memory-deleted.sh
```

**Supported events:**

| Hook | Triggered when |
|---|---|
| `on-memory-added` | A new memory is stored |
| `on-memory-updated` | A memory is modified |
| `on-memory-deleted` | A memory is removed |

**Payload** — passed via stdin as JSON:

```json
{
  "memory": {
    "id": "abc123",
    "type": "preference",
    "content": "I use Bun, never npm or yarn",
    "domain": "development",
    "confidence": 0.8,
    "importance": 0.5,
    "source": "cli",
    "created_at": "2026-02-28T13:33:08.463Z",
    "updated_at": "2026-02-28T13:33:08.463Z"
  },
  "scope": "global",
  "timestamp": "2026-02-28T13:33:08.463Z"
}
```

**Supported formats:** `.ts` (runs with Bun), `.js` (runs with Bun), `.sh` (runs with bash), or any executable with a shebang.

**Example hook** — notify on new memory:

```bash
#!/usr/bin/env bash
PAYLOAD=$(cat)
CONTENT=$(echo "$PAYLOAD" | grep -o '"content": "[^"]*"' | cut -d'"' -f4)
echo "New memory: $CONTENT" | notify-send "memory" -
```

Hooks are:
- **optional** — missing hooks are silently skipped
- **non-blocking** — memory operation completes before the hook runs
- **fail-safe** — if a hook crashes, only a log message is emitted

### AI Write-Back

AIs can write to memory autonomously — no MCP, no API, no extra setup.

Every injected context tells the AI how to store memories, re-read context mid-session, and which type to use:

**Tested with Codex:**

```
Ran memory remember "I want to build mobile apps with Expo Go"
         --type preference --domain development
→ Stored: [fbf9a100] "I want to build mobile apps with Expo Go" (preference/development)
```

**Tested with Droid** — same result.

Any AI with shell access runs the command directly. Others output it for the user to run.

**Type guide:**

| Type | When to use |
|---|---|
| `preference` | How the user likes to work, tools, style, communication |
| `knowledge` | Facts, domain knowledge, concepts, tech details |
| `project` | Current/past projects, status, stack, goals |
| `decision` | Architectural, technical, or strategic choices made |
| `skill` | Abilities, expertise level, certifications |
| `relationship` | People, teams, collaborators, contacts |
| `goal` | Objectives, targets, things they want to achieve |
| `constraint` | Hard limits, non-negotiables, restrictions |

**Re-read mid-session** — AIs can refresh their context at any point:

```bash
memory context           # full context (all memories, grouped by domain)
memory recall <query>    # search by keyword, type, or domain
```

---

### Connectors

```bash
memory setup                   # detect and install AI connectors interactively
memory uninstall               # remove connectors interactively
```

### Diagnostics

```bash
memory doctor                  # check storage, permissions, scopes
```

Output:

```
  memory doctor  v0.3.0

  ✔ MEMORY_HOME    /home/user/.memory
  ✔ storage        /home/user/.memory/global/memory.json
  ✔ writable
  ✔ memories       42
  ✗ hooks          /home/user/.memory/hooks
  ✔ active scope   global
  ✔ all scopes     global, myapp
  ✔ MEMORY_HOME level  global
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

---

## Connectors

Each connector is a shell wrapper in `~/.local/bin` that injects your memory context before the AI session starts.

| Connector | Command | Injection method |
|---|---|---|
| Claude Code | `claude-memory` | `--append-system-prompt` |
| Gemini CLI | `gemini-memory` | `-i` (interactive context) |
| Codex CLI | `codex-memory` | positional argument |
| OpenCode | `opencode-memory` | `--prompt` (TUI pre-fill) / `run` headless |
| Aider | `aider-memory` | `--read <tmpfile>` (temp file, auto-cleaned) |
| ShellGPT | `sgpt-memory` | context via stdin, query as positional arg |
| Goose | `goose-memory` | `goose run --system` — `-s` interactive / `-t` task |
| Groq | `groq-memory` | `--system` flag — interactive only |
| Ollama | `ollama-memory` | Modelfile `SYSTEM` directive (interactive) / stdin pipe (task) |
| Cursor Agent | `cursor-agent-memory` | `-p` headless — no interactive injection |
| Droid | `droid-memory` | `droid exec` subcommand |

**Usage:**

```bash
gemini-memory                           # interactive session with memory
claude-memory                           # interactive session with memory
aider-memory src/main.ts                # aider with memory context injected
goose-memory                            # interactive goose session with context
ollama-memory "explain this code"       # one-shot with context

OLLAMA_MODEL=mistral ollama-memory      # use a specific local model
```

**Notes:**
- `aider-memory` writes context to a temp file (`/tmp/memory-XXXXXX.md`) and cleans it up on exit
- `ollama-memory` defaults to `llama3.2` — override with `OLLAMA_MODEL=<model>`
- `cursor-agent-memory` injects context only in headless mode (`-p`)
- `groq-memory` is always interactive — positional args are ignored

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
├── src/
│   ├── store.ts            shared data layer + scope resolution
│   ├── cli.ts              all commands
│   ├── hooks.ts            hook runner (fire-and-forget)
│   └── ui/
│       ├── server.ts       Bun HTTP server (127.0.0.1:7711)
│       ├── routes.ts       API routes
│       └── static/
│           └── index.html  local web interface
```

**Runtime directory** (`~/.memory/` by default, override with `MEMORY_HOME`):

```
~/.memory/
├── current_scope           active scope name
├── global/
│   └── memory.json
├── projects/
│   └── <name>/
│       └── memory.json
└── hooks/
    └── on-memory-added.sh  (optional)
```

---

## Roadmap

**Next**
- [ ] `memory harvest` — extract memories from a session transcript
- [ ] `memoryd` — background daemon with HTTP API

**Later**
- [ ] Confidence decay — memories fade without reinforcement
- [ ] Web SDK — JS library for browser integration
- [ ] Device sync — opt-in, encrypted

**Done**
- [x] AI write-back — AIs store memories autonomously via injected context
- [x] Scopes — independent memory contexts per project
- [x] Hooks — local scripts triggered on memory events
- [x] Watch — live memory change stream
- [x] 11 connectors — Claude, Gemini, Codex, OpenCode, Aider, ShellGPT, Goose, Groq, Ollama, Cursor Agent, Droid

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
