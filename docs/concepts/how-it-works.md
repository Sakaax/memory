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
     ├─ memory context          → injected into Claude, Gemini, Codex...
     ├─ memory daemon           → serves the browser extension
     ├─ memory learn shell      → learns from your behavior
     └─ memory shell install    → redirects wrong commands
```

## Three ways memories get in

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

## How context is injected

Every connector (e.g. `gemini-memory`) runs `memory context` before starting the AI session and prepends the output as system context.

The context output is structured by confidence:

```
=== USER MEMORY CONTEXT ===

[STRONG — treat these as established facts]
- Uses bun as package manager, never npm
- Uses pacman as system package manager

[DEVELOPMENT]
- (preference) Uses docker for containers
- (preference) Deploys with railway

=== END MEMORY CONTEXT ===

=== MEMORY WRITE-BACK ===
WRITE — store new memories proactively...
  memory remember "<content>" --type <type> --domain <domain>
  After storing, briefly confirm to the user: e.g. "Noted — I've saved that."
...
=== END WRITE-BACK ===
```

AIs receive both sections — the memories to use, and the instructions on how to write back.

## Confidence thresholds

| Confidence | Behavior |
|---|---|
| `< 0.5` | Not injected into context |
| `0.5 – 0.79` | Injected, grouped by domain |
| `≥ 0.8` | Injected in `[STRONG]` section — treated as facts |
| `≥ 0.75` | Triggers shell hook generation |
