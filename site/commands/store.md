# remember · recall · forget

## memory remember

Store a new memory.

```bash
memory remember "<content>" [--type <type>] [--domain <domain>] [--importance <0-1>]
```

**Examples:**

```bash
memory remember "I use Bun, never npm or yarn" --type preference --domain development
memory remember "My stack: Next.js 15, Neon, Prisma, Railway" --type knowledge --domain development
memory remember "Ship fast — baby on the way" --type constraint --domain personal
memory remember "Prefer functional components, no classes" --type preference --domain development --importance 0.8
```

**Types:**

| Type | When to use |
|---|---|
| `preference` | How you like to work, tools, style |
| `knowledge` | Facts, domain knowledge, tech details |
| `project` | Current/past projects, status, goals |
| `decision` | Architectural or strategic choices |
| `skill` | Abilities, expertise level |
| `relationship` | People, teams, collaborators |
| `goal` | Objectives and targets |
| `constraint` | Hard limits, non-negotiables |

**Reinforcement:** storing the same content twice increases confidence by `+0.1` automatically.

---

## memory recall

Search and list stored memories.

```bash
memory recall                    # all memories in active scope
memory recall development        # filter by domain
memory recall bun                # filter by keyword
memory recall preference         # filter by type
```

---

## memory forget

Delete a memory by its ID.

```bash
memory forget a1b2c3d4
```

Get IDs from `memory recall`.

---

## memory status

Show statistics for the active scope.

```bash
memory status
```

---

## memory dump

Export all memories as raw JSON.

```bash
memory dump
memory dump > backup.json
```
