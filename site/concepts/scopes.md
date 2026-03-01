# Scopes

Scopes are independent memory stores. Use them to keep global preferences separate from project-specific context.

## Structure

```
~/.memory/
├── current_scope       ← "global" or "myapp"
├── global/
│   └── memory.json     ← default, always exists
└── projects/
    ├── myapp/
    │   └── memory.json
    └── otherproject/
        └── memory.json
```

## Typical usage

**Global scope** — things true across all projects:
- Package manager preference (`bun`)
- Editor, shell, OS tools
- Personal constraints

**Project scope** — things specific to one codebase:
- Stack details (PostgreSQL, Prisma, Next.js 15...)
- Architecture decisions
- Active tasks and goals

## Switching scope

```bash
memory scope use myapp
memory remember "uses Stripe for payments" --type knowledge --domain payments
memory scope use global
```

All commands operate on the active scope automatically.

## Scope-aware connectors

```bash
memory setup myapp
```

Creates wrappers like `claude-memory-myapp` that inject only `myapp` scope memories. The global scope is not included — keeping project context clean.

```bash
claude-memory          # global memories only
claude-memory-myapp    # myapp memories only
```

## Browser extension scope picker

The extension lets you choose which scope to inject per session — click the **⊕ memory** button and select from the dropdown.
