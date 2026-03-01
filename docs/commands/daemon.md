# daemon

Run the memory API server as a background process.

Without the daemon, the browser extension won't work and shell observation stops.

## Commands

```bash
memory daemon start            # start in background
memory daemon stop             # stop
memory daemon status           # show status + pid
memory daemon install          # generate systemd user service
```

## Start / Stop

```bash
memory daemon start
# ✓ memoryd started  pid=12345  http://127.0.0.1:7711

memory daemon status
# ● memoryd running  pid=12345  http://127.0.0.1:7711

memory daemon stop
# ✓ memoryd stopped (pid 12345)
```

## Auto-start at login (systemd)

```bash
memory daemon install
systemctl --user daemon-reload
systemctl --user enable --now memoryd
```

This creates `~/.config/systemd/user/memoryd.service`.

## What the daemon does

| Task | Details |
|---|---|
| **HTTP API** | Serves `localhost:7711` for the browser extension |
| **Shell observer** | Watches `~/.zsh_history`, runs inference every 10 new commands |
| **Shell hooks** | Regenerates `~/.memory/shell-hooks.sh` when confidence updates |

## Logs

```bash
cat ~/.memory/daemon.log
```
