# memory

**Persistent cognitive layer for AI systems.**

Your context. One file. Every AI.

📖 **[Full documentation → sakaax.github.io/memory](https://sakaax.github.io/memory)**

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
~/.memory/global/memory.json             ← single source of truth
        ↓
memory context --write --cwd $(pwd)      ← generates ~/.memory/context.md
  ├── your memories                        (memories + live git + code analysis)
  ├── git analysis of current project
  └── code analysis of source files
        ↓
   ↙    ↓    ↘
Claude  Gemini  Codex                    ← all read the same context
   ↘    ↓    ↙
memory remember "..."                    ← AIs write back automatically
```

Context is injected at session start as a clean markdown file. No API calls. No cloud.

- **Claude** receives a file path — reads `~/.memory/context.md` with its Read tool
- **Others** receive the file content as text — richer than before (includes live stack detection)

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

---

## Quick start

```bash
memory remember "I use Bun, never npm" --type preference --domain development
memory setup                     # configure AI connectors
source ~/.zshrc

cd ~/Dev/myproject
claude-memory                    # launches Claude with context injected
                                 # (memories + live git/code analysis of myproject)

memory learn shell               # infer preferences from shell history
memory learn git                 # infer stack from git repo
memory learn code                # infer patterns from codebase
memory daemon start              # background server (required for browser extension)
memory-desktop                   # desktop app — browse/edit memories, run learn, view context

cat ~/.memory/context.md         # inspect the context file anytime
```

---

## Connectors

| Connector | Command |
|---|---|
| Claude Code | `claude-memory` |
| Gemini CLI | `gemini-memory` |
| Codex CLI | `codex-memory` |
| OpenCode | `opencode-memory` |
| Aider | `aider-memory` |
| ShellGPT | `sgpt-memory` |
| Goose | `goose-memory` |
| Groq | `groq-memory` |
| Ollama | `ollama-memory` |
| Cursor Agent | `cursor-agent-memory` |
| Droid | `droid-memory` |

---

## Browser Extension

Inject your memory context into Claude.ai, ChatGPT, and Gemini with a single click.

- **Chrome / Brave / Arc** — load `extension/` as an unpacked extension
- **Firefox** — load `extension-firefox/manifest.json` via `about:debugging`

Requires `memory daemon start` running locally.

---

## Roadmap

**Done**
- [x] `memory learn git` — infer coding conventions from commit history
- [x] `memory learn code` — infer stack and patterns from a codebase
- [x] Shell hooks — `memory shell install` auto-redirects commands (e.g. npm → bun)
- [x] Shell observer — `memory learn shell` + daemon background inference
- [x] Confidence-weighted context — `[STRONG]` section for high-confidence facts
- [x] `memoryd` — background daemon (`memory daemon start/stop/status/install`)
- [x] Browser extension — Chrome MV3 + Firefox MV2
- [x] `memory harvest` — extract memories from session transcripts
- [x] AI write-back — AIs store memories autonomously
- [x] `memory watch <provider>` — session capture mode
- [x] Scopes — independent memory contexts per project
- [x] Hooks — local scripts triggered on memory events
- [x] 11 connectors
- [x] Desktop app — native UI (Tauri v2), available on AUR

**Next**
- [ ] Confidence decay — memories fade without reinforcement
- [ ] `memoryd` HTTP API
- [ ] Mobile app — persistent memory on phone (local-only)

---

📖 **[Full documentation → sakaax.github.io/memory](https://sakaax.github.io/memory)**

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
