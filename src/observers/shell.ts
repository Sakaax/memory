import { existsSync, readFileSync, statSync, writeFileSync } from "fs"
import { join } from "path"
import { MEMORY_HOME } from "../store"
import type { MemoryType } from "../store"

export const SHELL_HISTORY_FILE =
  process.env.HISTFILE ??
  (existsSync(join(process.env.HOME ?? "", ".zsh_history"))
    ? join(process.env.HOME ?? "", ".zsh_history")
    : join(process.env.HOME ?? "", ".bash_history"))

const CURSOR_FILE = join(MEMORY_HOME, "shell-observer.cursor")

// ── Parse zsh/bash history ─────────────────────────────────────────────────

export function parseHistoryLines(raw: string): string[] {
  return raw
    .split("\n")
    .map(line => {
      // zsh extended format: ": timestamp:elapsed;command"
      const zsh = line.match(/^:\s*\d+:\d+;(.+)/)
      if (zsh) return zsh[1].trim()
      // plain bash / fallback
      return line.trim()
    })
    .filter(Boolean)
}

// ── Inference categories ───────────────────────────────────────────────────

interface Category {
  name:      string
  domain:    string
  type:      MemoryType
  tools:     Record<string, RegExp[]>
  template:  (winner: string, loser: string[]) => string
}

const CATEGORIES: Category[] = [
  {
    name:   "packageManager",
    domain: "development",
    type:   "preference",
    tools: {
      bun:  [/^bun\s/, /^bunx\s/],
      npm:  [/^npm\s/],
      yarn: [/^yarn\s/],
      pnpm: [/^pnpm\s/],
    },
    template: (w, l) =>
      `Uses ${w} as package manager${l.length ? `, never ${l.join(" or ")}` : ""}`,
  },
  {
    name:   "deploy",
    domain: "development",
    type:   "preference",
    tools: {
      railway: [/^railway\s/],
      vercel:  [/^vercel\s/],
      netlify: [/^netlify\s/],
      fly:     [/^fly\s/, /^flyctl\s/],
    },
    template: (w) => `Deploys with ${w}`,
  },
  {
    name:   "gitTool",
    domain: "development",
    type:   "preference",
    tools: {
      gh:    [/^gh\s/],
      git:   [/^git\s/],
      gitui: [/^gitui$/],
      lazygit: [/^lazygit$/],
    },
    template: (w) => `Uses ${w} for git operations`,
  },
  {
    name:   "editor",
    domain: "development",
    type:   "preference",
    tools: {
      nvim:   [/^nvim\s/, /^nvim$/],
      vim:    [/^vim\s/, /^vim$/],
      code:   [/^code\s/, /^code$/],
      cursor: [/^cursor\s/, /^cursor$/],
      nano:   [/^nano\s/],
      hx:     [/^hx\s/, /^hx$/],
    },
    template: (w) => `Uses ${w} as code editor`,
  },
  {
    name:   "runtime",
    domain: "development",
    type:   "knowledge",
    tools: {
      bun:    [/^bun\s run/, /^bun\s test/],
      node:   [/^node\s/],
      deno:   [/^deno\s/],
      python: [/^python\s/, /^python3\s/],
    },
    template: (w) => `Uses ${w} as primary runtime`,
  },
  {
    name:   "containerTool",
    domain: "development",
    type:   "preference",
    tools: {
      docker:  [/^docker\s/],
      podman:  [/^podman\s/],
    },
    template: (w) => `Uses ${w} for containers`,
  },
  {
    name:   "systemPackager",
    domain: "system",
    type:   "knowledge",
    tools: {
      pacman: [/^sudo pacman\s/, /^pacman\s/],
      yay:    [/^yay\s/],
      apt:    [/^apt\s/, /^sudo apt\s/],
      brew:   [/^brew\s/],
      dnf:    [/^dnf\s/, /^sudo dnf\s/],
    },
    template: (w) => `Uses ${w} as system package manager`,
  },
]

// ── Analyze a list of commands ─────────────────────────────────────────────

export interface ShellInference {
  category: string
  content:  string
  type:     MemoryType
  domain:   string
  count:    number
  confidence: number
}

export function inferFromCommands(commands: string[]): ShellInference[] {
  const inferences: ShellInference[] = []

  for (const cat of CATEGORIES) {
    const counts: Record<string, number> = {}
    for (const tool of Object.keys(cat.tools)) counts[tool] = 0

    for (const cmd of commands) {
      for (const [tool, patterns] of Object.entries(cat.tools)) {
        if (patterns.some(p => p.test(cmd))) {
          counts[tool]++
          break
        }
      }
    }

    const sorted = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a)

    if (sorted.length === 0) continue

    const [winner, winCount] = sorted[0]
    const losers = sorted.slice(1).map(([t]) => t)

    // Need at least 3 uses to infer
    if (winCount < 3) continue

    // confidence: 0.5 base + up to 0.45 from frequency (caps at 50 uses)
    const confidence = Math.min(0.95, 0.5 + (winCount / 50) * 0.45)

    inferences.push({
      category:   cat.name,
      content:    cat.template(winner, losers),
      type:       cat.type,
      domain:     cat.domain,
      count:      winCount,
      confidence,
    })
  }

  return inferences
}

// ── Cursor management (for daemon incremental watching) ───────────────────

export function readCursor(): number {
  if (!existsSync(CURSOR_FILE)) return 0
  const n = parseInt(readFileSync(CURSOR_FILE, "utf8").trim(), 10)
  return isNaN(n) ? 0 : n
}

export function writeCursor(pos: number): void {
  writeFileSync(CURSOR_FILE, String(pos))
}

export function getNewCommands(): string[] {
  if (!existsSync(SHELL_HISTORY_FILE)) return []
  const raw  = readFileSync(SHELL_HISTORY_FILE, "utf8")
  const size = statSync(SHELL_HISTORY_FILE).size
  const cursor = readCursor()
  if (size <= cursor) return []
  const newRaw = raw.slice(cursor)
  writeCursor(size)
  return parseHistoryLines(newRaw)
}
