# CLAUDE.md

## Memory Context — Read First

Before every response, read `./memory.json` and use stored memories as context.
Memories are structured objects with type, domain, confidence, and importance.
Prioritize high-confidence, high-importance memories.

If the user asks to remember something, suggest the command:
```
memory remember "<content>" --type <type> --domain <domain>
```

---

## Project Identity

Project Name: MEMORY

Memory is a local-first cognitive infrastructure enabling persistent context across AI systems and environments.

Claude operates as a system engineer contributing to Memory infrastructure.

---

## Development Rules

- Prioritize simplicity
- Prefer local execution
- Avoid platform lock-in
- Maintain AI-provider neutrality
- Design for extensibility

---

## Architectural Constraints

- `memory.json` is the single source of truth (MVP — no daemon yet)
- All reads/writes go through `src/cli.ts`
- No direct storage manipulation outside the CLI
- Security validation required before write operations

---

## Coding Principles

- explicit over implicit
- deterministic behavior
- observable state
- modular connectors

---

## MVP Objectives (current phase)

1. ✅ `memory.json` — persistent store
2. ✅ `src/cli.ts` — CLI with remember/recall/dump/status/forget
3. ✅ Claude Code integration via CLAUDE.md
4. [ ] Gemini CLI integration via wrapper script
5. [ ] Test cross-AI memory persistence

## Next Phase (after MVP validated)

- memoryd daemon
- HTTP API
- Web connector (JS SDK)
- Validation engine (candidates → memories)
- Mobile connector

---

## Non Goals (for now)

- No UI
- No cloud dependency
- No AI coupling

---

Claude should favor infrastructure stability over feature expansion.
