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

## Coming soon

```bash
memory learn git    # infer conventions from commit history and diffs
memory learn code   # infer stack and patterns from a codebase
```
