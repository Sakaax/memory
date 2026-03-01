# scope

Scopes let you maintain independent memory contexts — one global, one per project.

## Commands

```bash
memory scope list              # list all scopes, show active
memory scope create <name>     # create a new project scope
memory scope use <name>        # switch active scope
memory scope delete <name>     # delete a scope and all its memories
```

## How it works

All commands (`remember`, `recall`, `forget`, `learn`...) operate on the **active scope** automatically.

```bash
memory scope create myapp
memory scope use myapp
memory remember "uses PostgreSQL with Prisma" --type project --domain database
memory scope use global        # back to global
```

## File structure

```
~/.memory/
├── current_scope           ← active scope name
├── global/
│   └── memory.json         ← default scope
└── projects/
    └── myapp/
        └── memory.json     ← project scope
```

## Project-specific connectors

Create connectors that inject only one scope's memories:

```bash
memory setup myapp
# creates: claude-memory-myapp, gemini-memory-myapp, codex-memory-myapp...

claude-memory-myapp    # only knows myapp memories
claude-memory          # knows global memories
```

## Browser extension

The extension supports scope selection — click the **⊕ memory** button to choose which scope to inject. See [Browser Extension](../extension/index.md).
