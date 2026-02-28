# MEMORY — Developer Guide

## Installation

Start daemon:

memoryd start

Verify:

memory status

---

## Storing Memory

memory remember "User prefers Bun runtime"

---

## Query Memory

memory recall development

---

## SDK Example (JavaScript)

memory.store({
type: "preference",
value: "code-first architecture"
})

---

## AI Integration Flow

1. User prompt received
2. Connector queries memory
3. Context injected
4. AI response returned
5. Valid insights stored

---

## Connector Philosophy

Integration must require minimal configuration.

Memory should enhance existing workflows without replacement.
