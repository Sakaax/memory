# How it works

## Overview

```
 You / Any AI
     │
     ▼
memory remember "..."
     │
     ▼
~/.memory/global/memory.json   ← single source of truth
     │
     ├─ memory context --write  → generates ~/.memory/context.md
     │                             (memories + live git + code analysis)
     │                             injected into Claude, Gemini, Codex...
     ├─ memory daemon            → serves the browser extension
     ├─ memory learn shell       → learns from your shell history
     ├─ memory learn git         → infers stack from git repo
     ├─ memory learn code        → infers patterns from source files
     └─ memory shell install     → redirects wrong commands
```

## Four ways memories get in

**1. Manual** — you type it:
```bash
memory remember "I use Railway for deploys" --type preference --domain development
```

**2. AI write-back** — an AI runs it during a session:
```
Claude runs: memory remember "prefers Server Components over client components"
Claude says: "Noted — I've saved that."
```

**3. Observed** — the shell observer infers it from your behavior:
```
bun typed 39x → "Uses bun as package manager, never npm" (confidence: 85%)
```

**4. Learned** — analysed from your environment:
```bash
memory learn shell     # shell history → tool preferences
memory learn git       # git log → stack, conventions, languages
memory learn code      # source files → imports, style, naming
```

## How context is injected

At each connector launch, memory generates a context file and injects it into the AI.

```bash
# What happens inside claude-memory (or gemini-memory, codex-memory…):
memory context --write --cwd "$(pwd)"   # generates ~/.memory/context.md
                                        # includes memories + live git + code analysis

# Claude → receives file path (2 lines — reads it with Read tool)
claude --append-system-prompt "Memory context: ~/.memory/context.md — read this file first."

# Others → receive file content as text
gemini -i "$(cat ~/.memory/context.md)"
```

The context file includes your stored memories **plus** a live analysis of the current project — so Claude always knows your stack without you having to run `learn` first.

## Confidence thresholds

| Confidence | Behavior |
|---|---|
| `< 0.5` | Not injected into context |
| `0.5 – 0.79` | In context, grouped by domain |
| `≥ 0.8` | In `## Established facts` — treated as hard facts |
| `≥ 0.75` | Triggers shell hook generation |

## The context file

`~/.memory/context.md` is regenerated fresh at every connector launch with:
- Your stored memories (filtered + ordered by confidence)
- Live git analysis of your current working directory
- Live code analysis of your source files

Inspect it anytime:
```bash
cat ~/.memory/context.md
```
