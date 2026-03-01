# ui

Local web interface to browse, edit, and manage memories visually.

## Usage

```bash
memory ui
```

Opens `http://127.0.0.1:7711` in your browser.

> The daemon also serves this interface — if `memory daemon start` is running, the UI is already available at `http://127.0.0.1:7711` without running `memory ui`.

## Features

**Scope tabs (header)**
- Click any scope tab to switch and reload memories
- `×` on non-global tabs — delete a scope and all its memories (with confirmation)
- Active scope highlighted in green

**Memory cards**
- Browse all memories in a card grid, sorted by importance then confidence
- Live search by content, type, or domain
- Confidence bar and date on each card
- `×` on hover — delete a memory

**Edit modal** (click any card)
- Edit content, type, domain, importance
- **Move to scope** — transfer a memory to another scope
- `Ctrl+Enter` to save · `Escape` to close
