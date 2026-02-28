# MEMORY — Schema Definition

## Definition

A Memory represents stabilized cognitive understanding extracted from interaction or experience.

Memory is not raw data or conversation history.

---

## Memory Object

```
Memory {
  id: string
  type: MemoryType
  content: string
  domain: string
  confidence: float
  importance: float
  source: MemorySource
  lifecycle: MemoryLifecycle
  created_at: timestamp
  updated_at: timestamp
  embedding: vector
}
```

---

## Memory Types

- preference
- knowledge
- project
- decision
- skill
- relationship
- goal
- constraint

---

## Memory Lifecycle

### Candidate

Newly detected understanding.

### Validated

Confirmed by repetition or user approval.

### Reinforced

Frequently used memory.

### Fading

Low usage memory.

### Archived

Inactive but preserved.

---

## Memory Rules

- Memory must represent understanding.
- Raw conversations must never be stored.
- Memories must be concise.
- Memories must be editable.
- Memories must be deletable.

---

## Update Behavior

Existing memories should evolve rather than duplicate.

Updates increase confidence.

Contradictions reduce confidence.

---

## Retrieval Rules

Memory retrieval must prioritize:

1. Domain relevance
2. Importance score
3. Confidence score
4. Recency
