# shell hooks

Auto-redirect shell commands based on your stored preferences.

## Install

```bash
memory shell install
source ~/.zshrc
```

This generates `~/.memory/shell-hooks.sh` and adds a `source` line to your `.zshrc`.

## How it works

When a high-confidence preference (≥ 75%) is stored, memory generates shell functions that intercept conflicting commands:

```bash
# ~/.memory/shell-hooks.sh — auto-generated
npm()  { echo "⚡ memory → bun"; command bun "$@"; }
yarn() { echo "⚡ memory → bun"; command bun "$@"; }
npx()  { echo "⚡ memory → bunx"; command bunx "$@"; }
```

In action:

```bash
npm install lodash
# ⚡ memory → bun
# bun add lodash@4.17.23
```

## Update hooks

Regenerate manually after memory changes:

```bash
memory shell update
```

The daemon also regenerates hooks automatically when confidence updates.

## Disable a hook

If you genuinely need to run the original command:

```bash
command npm install lodash    # bypass memory hook
```

Or temporarily disable all hooks:

```bash
unset -f npm yarn npx
```

## Supported redirects

| Preference | Intercepts | Redirects to |
|---|---|---|
| `bun` as package manager | `npm`, `yarn`, `npx` | `bun`, `bun`, `bunx` |

More redirects are added as the [learn](learn.md) command gains new categories.
