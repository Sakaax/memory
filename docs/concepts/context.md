# Context injection

## What gets injected

Every connector runs `memory context` before starting the AI. The output contains:

1. **Memory context** — your stored memories, filtered and ordered by confidence
2. **Write-back instructions** — how the AI should store new memories during the session

## Format

```
=== USER MEMORY CONTEXT ===
Background knowledge about the user. Use silently — do not repeat back unless asked.

[STRONG — treat these as established facts]
- Uses bun as package manager, never npm
- Uses pacman as system package manager

[DEVELOPMENT]
- (preference) Uses docker for containers
- (preference) Uses git for git operations

[PERSONAL]
- (constraint) Ship fast — baby on the way

=== END MEMORY CONTEXT ===

=== MEMORY WRITE-BACK ===
You can read and write the shared memory store at any time.

WRITE — store new memories proactively when you learn something worth remembering:
  memory remember "<content>" --type <type> --domain <domain>
  After storing, briefly confirm to the user: e.g. "Noted — I've saved that."

RESUME — at end of session, store a summary:
  memory resume "<summary>"

READ — refresh your context mid-session:
  memory context
  memory recall <query>
...
=== END WRITE-BACK ===
```

## Ordering

Memories are ordered by `confidence × importance`:

```
score = confidence × (0.5 + importance)
```

High-confidence, high-importance memories appear first.

## Re-reading mid-session

AIs can refresh their context at any point during a session:

```bash
memory context           # full context
memory recall <query>    # targeted search
```

## Scope context

Each connector uses the **active scope** at launch time. Project-specific connectors (`claude-memory-myapp`) inject only that scope's memories.

See [Scopes](../commands/scopes.md).
