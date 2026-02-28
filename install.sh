#!/usr/bin/env bash
set -e

REPO="https://github.com/sakaax/memory"
INSTALL_DIR="${MEMORY_DIR:-$HOME/.memory}"

echo "memory — installing..."
echo ""

# ── Check / install bun ───────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "→ Bun not found. Installing..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
else
  echo "✓ Bun $(bun --version)"
fi

# ── Clone or update ───────────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "→ Updating $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --quiet
else
  echo "→ Cloning to $INSTALL_DIR..."
  git clone --quiet "$REPO" "$INSTALL_DIR"
fi

# ── Install dependencies ──────────────────────────────────────────────────────
cd "$INSTALL_DIR"
bun install --silent

# ── Run setup ────────────────────────────────────────────────────────────────
echo ""
bun run src/cli.ts setup

echo ""
echo "Done. memory is installed at $INSTALL_DIR"
