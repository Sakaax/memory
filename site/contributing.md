# Contributing

## Setup

```bash
git clone https://github.com/Sakaax/memory
cd memory
bun install
bun run src/cli.ts help
```

## Project structure

```
memory/
├── install.sh              one-liner installer
├── memory                  shell entry point
├── src/
│   ├── store.ts            shared data layer + scope resolution
│   ├── cli.ts              all commands
│   ├── hooks.ts            hook runner (fire-and-forget)
│   ├── observers/
│   │   ├── shell.ts        shell history parser + inference engine
│   │   ├── shell-daemon.ts background shell watcher
│   │   └── shell-hooks.ts  shell hook generator
│   └── ui/
│       ├── server.ts       Bun HTTP server (127.0.0.1:7711)
│       ├── routes.ts       API routes
│       └── static/
│           └── index.html  local web UI
├── extension/              Chrome MV3
├── extension-firefox/      Firefox MV2
├── site/                   this documentation
└── docs/                   internal design docs
```

## Runtime directory

```
~/.memory/
├── current_scope
├── global/memory.json
├── projects/<name>/memory.json
├── hooks/                  user-defined event hooks
├── daemon.pid
├── daemon.log
├── shell-hooks.sh          auto-generated
└── shell-observer.cursor   incremental watcher position
```

## Principles

- **Simple over clever** — the store is a plain JSON file, not a database
- **Local first** — no network calls, no cloud dependency
- **Provider neutral** — works with any AI that has a CLI
- **Observable state** — every operation is transparent and reversible

## Adding a connector

1. Add an entry to the `CONNECTORS` array in `src/cli.ts`
2. Define the `mode` (flag / positional / stdin / tui-prompt / aider / ollama / droid)
3. Test with `memory setup`

## Adding a shell inference category

1. Add an entry to `CATEGORIES` in `src/observers/shell.ts`
2. Define `tools`, `template`, and `domain`
3. Add a redirect rule to `REDIRECT_RULES` in `src/observers/shell-hooks.ts` if applicable

## Issues & PRs

[github.com/Sakaax/memory/issues](https://github.com/Sakaax/memory/issues)

Keep it simple. No cloud. No heavy dependencies. PRs welcome.
