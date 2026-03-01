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

---

## Key features

| Feature | Description |
|---|---|
| **AI write-back** | AIs store memories autonomously during sessions |
| **Shell observer** | Learns your preferences from shell history |
| **Shell hooks** | Auto-redirects commands (e.g. `npm` → `bun`) |
| **Scopes** | Independent memory contexts per project |
| **Browser extension** | Inject context into Claude.ai, ChatGPT, Gemini |
| **Daemon** | Background server, always available |
| **Harvest** | Extract memories from past session transcripts |
| **11 connectors** | Claude, Gemini, Codex, Aider, Goose, and more |

---

## Quick start

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/Sakaax/memory/main/install.sh | bash

# Store your first memory
memory remember "I use Bun, never npm" --type preference --domain development

# Set up AI connectors
memory setup

# Launch Claude with your memory
claude-memory

# Learn from your shell history
memory learn shell

# Install shell hooks (auto-redirect npm → bun etc.)
memory shell install
```

> **100% local.** Your memories never leave your machine.
