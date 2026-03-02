# Desktop App

Native desktop interface for memory — built with Tauri v2 (Rust + React).

Replaces `memory ui`. Smaller, faster, no browser required.

---

## Install

### Arch Linux / AUR

```bash
yay -S memory-desktop
```

### Other Linux / macOS

Download the latest binary from [GitHub Releases](https://github.com/Sakaax/memory/releases).

**Linux (binary)**
```bash
# Download and install
curl -L https://github.com/Sakaax/memory/releases/latest/download/memory-desktop-x86_64 \
  -o ~/.local/bin/memory-desktop
chmod +x ~/.local/bin/memory-desktop
memory-desktop
```

**Build from source**
```bash
# Requirements: Rust, Bun, webkit2gtk-4.1, gtk3
cd ~/Dev/memory/desktop
bun install
bunx tauri build
# Binary at: src-tauri/target/release/memory-desktop
```

---

## Launch

```bash
memory-desktop
```

Or from your app launcher — the `.desktop` entry is installed automatically with the AUR package.

---

## Features

### Sidebar

| Section | Description |
|---|---|
| **Scopes** | Switch between global and project scopes. Create or delete scopes. |
| **Learn** | Run `learn git`, `learn code`, `learn shell` — review and store inferences. |
| **Context** | Preview the context file (`~/.memory/context.md`) that providers receive. Regenerate for any project path. |
| **Providers** | See which connectors are installed. Disconnect any provider with one click. |

### Memories

- Search by content or domain
- Filter by type and domain
- Add, edit, delete, move memories between scopes
- Sorted by confidence × importance

### Learn panel

Runs `memory learn --json` non-interactively and presents results as a checklist. Select which inferences to store, then click **Store selected**.

| Tab | Analyses |
|---|---|
| `git` | Commit conventions, languages, stack — from git log |
| `code` | Imports, tsconfig, code style, file naming — from source files |
| `shell` | Tool preferences — from `~/.zsh_history` / `~/.bash_history` |

### Context viewer

Shows the current `~/.memory/context.md` with section highlighting.

Enter a project path and click **↻ Régénérer** to regenerate — equivalent to:
```bash
memory context --write --cwd /path/to/project
```

### Providers manager

Lists all 11 connectors. For each installed one:
- Shows the command to use (`claude-memory`, `gemini-memory`…)
- Shows the install path (`~/.local/bin/…`)
- **Disconnect** button removes the wrapper script

To connect new providers, use the CLI:
```bash
memory setup
```

---

## Wayland / Hyprland

If the window doesn't open on Wayland, add to your shell config:

```bash
export WEBKIT_DISABLE_COMPOSITING_MODE=1
```

Or force XWayland:
```bash
GDK_BACKEND=x11 memory-desktop
```

---

## Daemon

The desktop app **does not replace the daemon**. `memory daemon start` must still run for the browser extension to work.

The desktop app reads `~/.memory/**/*.json` directly — no daemon required for the desktop UI itself.
