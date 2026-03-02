# Getting Started

## Requirements

- [Bun](https://bun.sh) — installed automatically if missing
- macOS, Linux, or WSL

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Sakaax/memory/main/install.sh | bash
```

Then reload your shell:

```bash
source ~/.zshrc   # or ~/.bashrc
```

### Manual install

```bash
git clone https://github.com/Sakaax/memory ~/.memory-repo
cd ~/.memory-repo
bun install
./memory setup
source ~/.zshrc
```

---

## First steps

### 1. Store a memory

```bash
memory remember "I use Bun, never npm or yarn" --type preference --domain development
```

### 2. Set up connectors

```bash
memory setup
```

Select which AI CLIs to connect. After setup:

```bash
claude-memory     # Claude with your memory context
gemini-memory     # Gemini with your memory context
codex-memory      # Codex with your memory context
```

### 3. Learn from your shell history

```bash
memory learn shell
```

Memory analyses your command history and infers preferences (package manager, editor, deploy tools...). You choose what to store.

### 4. Install shell hooks

```bash
memory shell install
source ~/.zshrc
```

Now `npm install foo` → `⚡ memory → bun` automatically.

### 5. Start the daemon

```bash
memory daemon start
```

Runs the API server in the background — required for the browser extension and continuous shell observation.

### 6. Open the desktop app *(optional)*

```bash
memory-desktop
```

Browse and edit memories, run `learn`, view the context file, manage providers — all in a local native UI.

Install: [GitHub Releases](https://github.com/Sakaax/memory/releases) or `yay -S memory-desktop` on Arch.

---

## Verify everything works

```bash
memory doctor       # check storage, permissions, daemon
memory recall       # list all stored memories
memory context      # preview what AIs will see
```
