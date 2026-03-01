# learn

Analyse your environment and infer preferences automatically — no manual input needed.

## memory learn shell

Analyse your shell history (`~/.zsh_history` or `~/.bash_history`) and extract usage patterns.

```bash
memory learn shell
```

An interactive selector shows what memory inferred, with confidence scores. You choose what to store.

**What it detects:**

| Category | Examples |
|---|---|
| Package manager | `bun`, `npm`, `yarn`, `pnpm` |
| Deploy tool | `railway`, `vercel`, `netlify`, `fly` |
| Git tool | `gh`, `git`, `lazygit`, `gitui` |
| Editor | `nvim`, `vim`, `code`, `cursor`, `nano` |
| Runtime | `bun`, `node`, `deno`, `python` |
| Containers | `docker`, `podman` |
| System packages | `pacman`, `yay`, `apt`, `brew`, `dnf` |

**Confidence scoring:**

Confidence scales with frequency:

```
seen 3x   → 50%  (minimum threshold to infer)
seen 10x  → 59%
seen 25x  → 73%
seen 50x+ → 95%  (cap)
```

**Conflict prevention:**

- A tool must be used **2× more** than the runner-up to be inferred
- `python3 -c "..."` inline scripts are excluded from runtime inference
- Memories below `0.5` confidence are not injected into AI context

**Background learning:**

The daemon runs this continuously as you work. Every 10 new shell commands, inference runs automatically and confidence is updated. See [Daemon](daemon.md).

---

## memory learn git

Analyse a git repository — commit history, file extensions, config files, and `package.json` — to infer your stack and conventions.

```bash
memory learn git              # analyse current directory
memory learn git /path/to/repo
```

**What it detects:**

| Category | Examples |
|---|---|
| Commit convention | Conventional Commits, common scopes |
| Languages | TypeScript, JavaScript, Python, Go, Rust, Shell |
| Frameworks | Next.js, React Native, Expo, Tauri, Docker |
| ORM / DB | Prisma, Drizzle |
| Auth | NextAuth.js, Auth.js |
| Tooling | Tailwind CSS, Zod, Stripe, Resend, Upstash |
| Linting / formatting | ESLint, Prettier, Biome |
| Testing | Vitest, Jest |
| Package manager | Bun, pnpm, Yarn (from lockfile) |

**Evidence:**

Each inference shows what was found — e.g. `"drizzle-orm in package.json"`, `"42/60 commits follow Conventional Commits"`.

---

## memory learn code

Analyse the source files in a codebase — imports, code style, TypeScript config, and directory structure.

```bash
memory learn code             # analyse current directory
memory learn code /path/to/project
```

**What it detects:**

| Category | Examples |
|---|---|
| TypeScript config | Strict mode, `@/*` path alias |
| Directory structure | `src/app`, `src/components`, `src/actions`, `src/schemas` |
| Libraries (imports) | React, Next.js, Prisma, Zod, Stripe, Resend, Zustand, TanStack Query, Framer Motion, Sentry, PostHog... |
| Code style | async/await vs `.then()`, arrow vs regular functions, Server Components ratio |
| File naming | kebab-case, camelCase, PascalCase |

Up to 2000 files are walked (ignoring `node_modules`, `.git`, `dist`, etc.). Imports are scanned across up to 500 source files.

**Evidence:**

Each inference includes what was found — e.g. `"imported in 18 files"`, `"42 arrow vs 3 function declarations"`, `"tsconfig.json: strict: true"`.
