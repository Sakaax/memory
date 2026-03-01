# Confidence scoring

Confidence represents how certain memory is about a stored fact. It drives what gets injected, how it's presented, and what shell hooks are generated.

## Scale

| Value | Meaning | Source |
|---|---|---|
| `0.6` | Inferred from transcript (harvest/watch) | Uncertain — you confirmed it |
| `0.6` | Shell observer, 3 observations | Early inference |
| `0.8` | Manual `memory remember` | Explicit declaration |
| `0.85` | Shell observer, ~40 observations | Strong pattern |
| `0.95` | Shell observer, 50+ observations | Established fact |

## How it evolves

**Goes up:**
- Storing the same content again: `+0.1` per repetition
- Shell observer sees the pattern more: recalculated from frequency
- Daemon bumps confidence on existing memories when new observations match: `+0.05`

**Stays fixed:**
- Manual `memory remember` starts at `0.8`
- Harvest/watch starts at `0.6`

## Frequency formula (shell observer)

```
confidence = min(0.95,  0.5 + (count / 50) * 0.45)
```

Examples:
- 3 uses → 0.50 + (3/50)*0.45 = **0.53**
- 10 uses → 0.50 + (10/50)*0.45 = **0.59**
- 25 uses → 0.50 + (25/50)*0.45 = **0.73**
- 50 uses → **0.95** (cap)

## Effect on context

```
< 0.5  → filtered out, never shown to AIs
0.5–0.79 → shown in domain group
≥ 0.8  → shown in [STRONG] section
```

## Effect on shell hooks

```
< 0.75 → no shell hook generated
≥ 0.75 → shell hook generated and active
```
