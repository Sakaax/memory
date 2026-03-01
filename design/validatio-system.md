# MEMORY — Validation System

## Overview

AI systems must never directly create persistent memories.

All memories originate as Memory Candidates.

Only validated candidates become Memories.

---

## Memory Creation Flow

Interaction
→ Candidate Extraction
→ Validation Engine
→ Memory Store

---

## Memory Candidate

A candidate represents potential understanding detected during interaction.

Structure:

```
Candidate {
 content: string
 type: MemoryType
 domain: string
 source: string
 occurrences: integer
 first_seen: timestamp
 last_seen: timestamp
}
```

---

## Validation Rules

A candidate becomes a Memory only if validation criteria are satisfied.

---

### Repetition Rule

Candidate must appear multiple times.

Minimum occurrences: 3

---

### Temporal Stability Rule

Occurrences must span multiple sessions or time periods.

---

### Impact Rule

Memory must influence future system behavior.

Low-impact information must be rejected.

---

### Behavioral Reinforcement

Observed user actions increase validation score.

---

### User Confirmation (Optional)

User approval may be required depending on privacy mode.

---

## Rejection Rules

Reject if:

- temporary emotion
- single-session statement
- speculative discussion
- AI assumption
- joke or hypothetical

---

## Memory Promotion

Validated candidates are promoted to Memory objects.

Confidence score increases proportionally to validation strength.

---

## Continuous Reevaluation

Memories may be downgraded if no reinforcement occurs.

Validation is continuous.
