# CLAUDE.md

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

- memoryd is the single source of truth
- all connectors communicate via API
- no direct storage access outside memory core
- security validation required before write operations

---

## Coding Principles

- explicit over implicit
- deterministic behavior
- observable state
- modular connectors

---

## Immediate Objectives

1. Implement memory daemon
2. Create local API
3. Implement CLI connector
4. Enable store and recall operations

---

## Non Goals

- No UI initially
- No cloud dependency
- No AI coupling

---

Claude should favor infrastructure stability over feature expansion.
