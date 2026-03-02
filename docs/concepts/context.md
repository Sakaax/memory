# Context injection

## How it works

At every connector launch, memory generates a rich context file then tells the AI where to find it.

```
gemini-memory (or claude-memory, codex-memory…)
  │
  ├── memory context --write --cwd "$(pwd)"
  │     ├── stored memories (scope)
  │     ├── live git analysis of current project
  │     ├── live code analysis of current project
  │     └── writes → ~/.memory/context.md
  │
  └── inject into AI
        Claude  → "Read ~/.memory/context.md with your Read tool"  (2 lines)
        Aider   → --read ~/.memory/context.md                      (file flag)
        Others  → inject file content as text                      (richer than before)
```

**File-capable AIs** (Claude Code, Aider) receive a path pointer — short, clean, re-readable anytime.

**Text-injection AIs** (Gemini, Codex, Goose…) receive the file content — same mechanism as before, but now richer since it includes live git/code analysis.

## Context file format

`~/.memory/context.md` — generated fresh at each connector launch:

```markdown
# Memory Context
_Scope: motoalpes · 2026-03-02 14:30 · /home/you/Dev/motoalpes_

## Established facts
- Uses bun as package manager, never npm
- Uses TypeScript strict mode
- Uses Conventional Commits format

## Development
- Uses docker for containers
- Uses git for git operations

## Project: motoalpes
- Uses Next.js (next.config.ts found)
- Uses Drizzle ORM (drizzle.config.ts)
- Uses Tailwind CSS (tailwind.config.ts)
- Uses Conventional Commits (42/60 commits)

## Code conventions
- Uses async/await exclusively (47 vs 11 .then())
- Uses Server Components by default
- Uses kebab-case for file naming

## Memory write-back
Store: `memory remember "..." --type <type> --domain <domain>`
Summarize session: `memory resume "summary of what was done"`
Refresh this file: `memory context --write --cwd $(pwd)`
```

The file is inspectable at any time: `cat ~/.memory/context.md`.

## What gets included

| Section | Source |
|---|---|
| Established facts | Memories with confidence ≥ 0.8 |
| Domain groups | Memories with confidence 0.5–0.79 |
| Project stack | Live `git log` + config file analysis |
| Code conventions | Live scan of source files (imports, style, naming) |
| Write-back instructions | Static — always present |

## Ordering

Memories are ordered by `confidence × (0.5 + importance)`.

High-confidence, high-importance memories appear first and in the `## Established facts` section.

## Refreshing mid-session

For AIs with file access (Claude Code), re-read the file anytime:

```bash
# Regenerate with current project
memory context --write --cwd $(pwd)
# Then read ~/.memory/context.md with your Read tool
```

For targeted search:
```bash
memory recall development
memory recall bun
```

## Scope context

Each connector uses the **active scope** at launch time. Project-specific connectors (`claude-memory-myapp`) inject only that scope's memories.

See [Scopes](../commands/scopes.md).
