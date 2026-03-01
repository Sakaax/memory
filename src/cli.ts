#!/usr/bin/env bun
import { existsSync, mkdirSync, appendFileSync, symlinkSync, unlinkSync, readFileSync, writeFileSync, watch, rmSync, readdirSync, statSync } from "fs"
import { join } from "path"
import {
  loadStore, saveStore, VALID_TYPES,
  MEMORY_HOME, HOOKS_DIR,
  readCurrentScope, writeCurrentScope, scopeDir, scopeFile, listScopes,
  isWritable, detectScope,
  type Memory, type MemoryType,
} from "./store"
import { runHook } from "./hooks"

const INSTALL_DIR = join(import.meta.dir, "..")
const HOME = process.env.HOME ?? ""
const LOCAL_BIN = join(HOME, ".local/bin")
const BUN_BIN = join(HOME, ".bun/bin")

function parseFlags(args: string[]): {
  content: string
  type: MemoryType
  domain: string
  importance: number
} {
  let content = ""
  let type: MemoryType = "preference"
  let domain = "general"
  let importance = 0.5

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--type" && args[i + 1]) {
      const t = args[++i]
      if (VALID_TYPES.includes(t as MemoryType)) {
        type = t as MemoryType
      } else {
        console.error(`Invalid type: ${t}. Valid: ${VALID_TYPES.join(", ")}`)
        process.exit(1)
      }
    } else if (arg === "--domain" && args[i + 1]) {
      domain = args[++i]
    } else if (arg === "--importance" && args[i + 1]) {
      importance = parseFloat(args[++i])
    } else if (!arg.startsWith("--")) {
      content = arg
    }
  }

  return { content, type, domain, importance }
}

function cmdRemember(args: string[]): void {
  if (args.length === 0) {
    console.error(
      'Usage: memory remember "<content>" [--type <type>] [--domain <domain>] [--importance <0-1>]'
    )
    process.exit(1)
  }

  const { content, type, domain, importance } = parseFlags(args)

  if (!content) {
    console.error("Error: content is required")
    process.exit(1)
  }

  const store = loadStore()

  const existing = store.memories.find(
    (m) => m.content.toLowerCase() === content.toLowerCase()
  )

  if (existing) {
    existing.confidence = Math.min(1, existing.confidence + 0.1)
    existing.updated_at = new Date().toISOString()
    saveStore(store)
    runHook("on-memory-updated", existing)
    console.log(
      `Updated: [${existing.id}] "${content}" (confidence: ${existing.confidence.toFixed(2)})`
    )
    return
  }

  const memory: Memory = {
    id: crypto.randomUUID().slice(0, 8),
    type,
    content,
    domain,
    confidence: 0.8,
    importance,
    source: "cli",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  store.memories.push(memory)
  saveStore(store)
  runHook("on-memory-added", memory)
  console.log(`Stored: [${memory.id}] "${content}" (${type}/${domain})`)
}

function cmdRecall(args: string[]): void {
  const store = loadStore()
  const query = args[0]?.toLowerCase()

  let results = store.memories

  if (query) {
    results = results.filter(
      (m) =>
        m.content.toLowerCase().includes(query) ||
        m.domain.toLowerCase().includes(query) ||
        m.type.toLowerCase().includes(query)
    )
  }

  results.sort(
    (a, b) => b.importance - a.importance || b.confidence - a.confidence
  )

  if (results.length === 0) {
    console.log(query ? `No memories matching "${query}".` : "No memories stored yet.")
    return
  }

  for (const m of results) {
    const conf = (m.confidence * 100).toFixed(0)
    console.log(`[${m.id}] ${m.content}`)
    console.log(`       ${m.type} · ${m.domain} · confidence: ${conf}%`)
  }
}

function cmdDump(): void {
  const store = loadStore()
  console.log(JSON.stringify(store, null, 2))
}

function cmdStatus(): void {
  const store = loadStore()
  const total = store.memories.length

  if (total === 0) {
    console.log("No memories stored.")
    return
  }

  const byType = store.memories.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1
    return acc
  }, {})

  const byDomain = store.memories.reduce<Record<string, number>>((acc, m) => {
    acc[m.domain] = (acc[m.domain] ?? 0) + 1
    return acc
  }, {})

  const avgConf =
    store.memories.reduce((sum, m) => sum + m.confidence, 0) / total

  console.log(`Total: ${total} memories`)
  console.log(`Avg confidence: ${(avgConf * 100).toFixed(0)}%`)
  console.log(`\nBy type:`)
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`)
  }
  console.log(`\nBy domain:`)
  for (const [domain, count] of Object.entries(byDomain)) {
    console.log(`  ${domain}: ${count}`)
  }
}

function cmdForget(args: string[]): void {
  const id = args[0]
  if (!id) {
    console.error("Usage: memory forget <id>")
    process.exit(1)
  }

  const store = loadStore()
  const before = store.memories.length
  const target = store.memories.find((m) => m.id === id)
  store.memories = store.memories.filter((m) => m.id !== id)

  if (store.memories.length === before) {
    console.error(`No memory with id: ${id}`)
    process.exit(1)
  }

  saveStore(store)
  runHook("on-memory-deleted", target!)
  console.log(`Forgotten: [${id}]`)
}

function cmdResume(args: string[]): void {
  const content = args[0]
  if (!content) {
    console.error('Usage: memory resume "<session summary>"')
    process.exit(1)
  }

  const scope = readCurrentScope()
  const date  = new Date().toISOString().slice(0, 10)
  const store = loadStore()

  const memory: Memory = {
    id:         crypto.randomUUID().slice(0, 8),
    type:       "knowledge",
    content:    `[session ${date}] ${content}`,
    domain:     "session",
    confidence: 0.9,
    importance: 0.7,
    source:     "ai",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  store.memories.push(memory)
  saveStore(store)
  runHook("on-memory-added", memory)
  console.log(`Session summary stored: [${memory.id}] scope=${scope}`)
}

function cmdContext(): void {
  const store = loadStore()
  const scope = readCurrentScope()
  const file  = scopeFile(scope)

  const lines: string[] = [
    "=== USER MEMORY CONTEXT ===",
    "Background knowledge about the user. Use silently — do not repeat back unless asked.\n",
  ]

  if (store.memories.length > 0) {
    // Score = confidence × importance — filters and orders context
    const scored = store.memories
      .filter(m => m.confidence >= 0.5)            // below 0.5 = too uncertain, skip
      .map(m => ({ ...m, score: m.confidence * (0.5 + m.importance) }))
      .sort((a, b) => b.score - a.score)

    // Separate strong facts (≥0.8) from normal ones
    const strong = scored.filter(m => m.confidence >= 0.8)
    const normal = scored.filter(m => m.confidence <  0.8)

    if (strong.length > 0) {
      lines.push("[STRONG — treat these as established facts]")
      for (const m of strong) {
        lines.push(`- ${m.content}`)
      }
      lines.push("")
    }

    if (normal.length > 0) {
      const grouped = normal.reduce<Record<string, typeof normal>>((acc, m) => {
        acc[m.domain] = [...(acc[m.domain] ?? []), m]
        return acc
      }, {})
      for (const [domain, memories] of Object.entries(grouped)) {
        lines.push(`[${domain.toUpperCase()}]`)
        for (const m of memories) {
          lines.push(`- (${m.type}) ${m.content}`)
        }
        lines.push("")
      }
    }
  } else {
    lines.push("(no memories stored yet)\n")
  }

  lines.push("=== END MEMORY CONTEXT ===")
  lines.push("")
  lines.push("=== MEMORY WRITE-BACK ===")
  lines.push("You can read and write the shared memory store at any time.")
  lines.push("")
  lines.push("WRITE — store new memories proactively when you learn something worth remembering:")
  lines.push(`  memory remember "<content>" --type <type> --domain <domain>`)
  lines.push("  After storing, briefly confirm to the user: e.g. \"Noted — I've saved that.\" or \"Got it, stored.\"")
  lines.push("")
  lines.push("RESUME — at end of session, store a summary of what was done:")
  lines.push(`  memory resume "<summary of session goals, decisions, problems solved>"`)
  lines.push("  Be concise. Cover what changed, what was decided, what was built.")
  lines.push("  Note: if context was compacted mid-session, summarize what you remember since then.")
  lines.push("")
  lines.push("READ — refresh your context mid-session:")
  lines.push("  memory context           → full context (all memories, re-read at any time)")
  lines.push("  memory recall <query>    → search by keyword, type, or domain")
  lines.push("")
  lines.push("TYPE GUIDE — pick the most specific type:")
  lines.push("  preference   → how the user likes to work, tools, style, communication")
  lines.push("  knowledge    → facts, domain knowledge, concepts, tech details")
  lines.push("  project      → current/past projects, status, stack, goals")
  lines.push("  decision     → architectural, technical, or strategic choices made")
  lines.push("  skill        → abilities, expertise level, certifications")
  lines.push("  relationship → people, teams, collaborators, contacts")
  lines.push("  goal         → objectives, targets, things they want to achieve")
  lines.push("  constraint   → hard limits, non-negotiables, restrictions")
  lines.push("")
  lines.push("DOMAIN — any label that groups it well (e.g. development, personal, finance)")
  lines.push("")
  lines.push(`Scope: ${scope}  |  File: ${file}`)
  lines.push("")
  lines.push("If you have shell access (e.g. Bash tool), run commands directly without asking.")
  lines.push("=== END WRITE-BACK ===")

  console.log(lines.join("\n"))
}

// ─── setup ───────────────────────────────────────────────────────────────────

// ─── colors (no dep) ─────────────────────────────────────────────────────────

const c = {
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  green:  "\x1b[32m",
  cyan:   "\x1b[36m",
  yellow: "\x1b[33m",
  reset:  "\x1b[0m",
}

const CONNECTOR_HINTS: Record<string, string> = {
  gemini:          "Google Gemini CLI",
  claude:          "Claude Code CLI",
  codex:           "OpenAI Codex CLI",
  opencode:        "OpenCode AI coding agent",
  aider:           "Aider AI pair programmer",
  sgpt:            "ShellGPT",
  goose:           "Block Goose developer agent",
  groq:            "Groq code CLI",
  ollama:          "Ollama local models",
  "cursor-agent":  "Cursor Agent CLI",
  droid:           "Factory Droid agent",
}

function printMemoryAscii(): void {
  const art = [
    "███╗   ███╗███████╗███╗   ███╗ ██████╗ ██████╗ ██╗   ██╗",
    "████╗ ████║██╔════╝████╗ ████║██╔═══██╗██╔══██╗╚██╗ ██╔╝",
    "██╔████╔██║█████╗  ██╔████╔██║██║   ██║██████╔╝ ╚████╔╝ ",
    "██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║██╔══██╗  ╚██╔╝  ",
    "██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝██║  ██║   ██║   ",
    "╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝  ",
  ]
  console.log(`\n${c.cyan}${c.bold}${art.join("\n")}${c.reset}\n`)
}

// mode: how to inject memory context into the CLI
//   flag          → `cli <flag> "<context>"`            (gemini -i)
//   system-prompt → `cli --append-system-prompt "<ctx>"` (claude)
//   positional    → `cli "<context>"`                   (codex)
//   stdin         → pipe context via stdin
const SUPPORTED_CONNECTORS: Array<{ name: string; bin: string; mode: string; flag?: string }> = [
  // ── Existing ─────────────────────────────────────────────────────────────────
  { name: "gemini",         bin: join(BUN_BIN,   "gemini"),        mode: "flag",              flag: "-i"                     },
  { name: "claude",         bin: join(BUN_BIN,   "claude"),        mode: "system-prompt",     flag: "--append-system-prompt" },
  { name: "codex",          bin: join(BUN_BIN,   "codex"),         mode: "positional"                                        },
  // ── New ──────────────────────────────────────────────────────────────────────
  // opencode: --prompt pre-fills TUI; run is headless
  { name: "opencode",       bin: join(BUN_BIN,   "opencode"),      mode: "tui-prompt"                                        },
  // aider: no --system flag; inject via --read <tmpfile>
  { name: "aider",          bin: join(LOCAL_BIN, "aider"),         mode: "read-file",         flag: "--read"                 },
  // sgpt: context via stdin, query as positional arg
  { name: "sgpt",           bin: join(LOCAL_BIN, "sgpt"),          mode: "sgpt"                                              },
  // goose: run --system injects context; -s keeps session open
  { name: "goose",          bin: join(LOCAL_BIN, "goose"),         mode: "goose"                                             },
  // groq: --system flag, interactive only
  { name: "groq",           bin: join(BUN_BIN,   "groq"),          mode: "system-interactive", flag: "--system"              },
  // ollama: no --system flag; positional with model name
  { name: "ollama",         bin: "/usr/local/bin/ollama",          mode: "ollama"                                            },
  // cursor-agent: no system prompt; -p for headless tasks
  { name: "cursor-agent",   bin: join(LOCAL_BIN, "cursor-agent"),  mode: "cursor-agent"                                      },
  // droid: uses exec subcommand
  { name: "droid",          bin: join(BUN_BIN,   "droid"),         mode: "droid"                                             },
]

function isAvailable(bin: string): boolean {
  const r = Bun.spawnSync(["which", bin])
  if (r.exitCode === 0) return true
  return existsSync(bin)
}

function getShellRc(): string {
  const shell = process.env.SHELL ?? ""
  if (shell.includes("zsh")) return join(HOME, ".zshrc")
  if (shell.includes("fish")) return join(HOME, ".config/fish/config.fish")
  return join(HOME, ".bashrc")
}

function ensureInPath(rc: string, dir: string, label: string): boolean {
  const content = existsSync(rc) ? readFileSync(rc, "utf-8") : ""
  if (content.includes(dir)) return false
  appendFileSync(rc, `\n# memory — ${label}\nexport PATH="${dir}:$PATH"\n`)
  return true
}

function makeWrapper(binPath: string, mode: string, flag?: string, scopeOverride?: string): string {
  const scopeLine = scopeOverride ? `export MEMORY_SCOPE="${scopeOverride}"\n` : ""
  const header = `#!/usr/bin/env bash
MEMORY_DIR="${INSTALL_DIR}"
${scopeLine}CONTEXT=$("$MEMORY_DIR/memory" context 2>/dev/null)
`
  // ── Modes with fully custom templates ───────────────────────────────────────

  if (mode === "read-file" && flag) {
    // aider: no system-prompt flag — inject context via --read <tmpfile>
    // uses trap (not exec) so temp file is cleaned up on exit
    return header + `
if [ -z "$CONTEXT" ]; then
  exec "${binPath}" "$@"
else
  TMPFILE=$(mktemp /tmp/memory-XXXXXX.md)
  printf '%s\\n' "$CONTEXT" > "$TMPFILE"
  trap 'rm -f "$TMPFILE"' EXIT
  "${binPath}" ${flag} "$TMPFILE" "$@"
fi
`
  }

  if (mode === "ollama") {
    // ollama has no --system CLI flag
    // non-interactive: pipe context+task via stdin
    // interactive: create a temp model with context as SYSTEM prompt via Modelfile
    return header + `
MODEL=\${OLLAMA_MODEL:-$(ollama list 2>/dev/null | awk 'NR==2{print \$1}')}
if [ -z "$MODEL" ]; then
  printf '[memory] ollama: no model found. Set OLLAMA_MODEL=<model> or run: ollama pull llama3.2\\n' >&2
  exit 1
fi
if [ -z "$CONTEXT" ]; then
  exec "${binPath}" run "$MODEL" "$@"
elif [ "$#" -gt 0 ]; then
  printf 'Context:\\n%s\\n\\nTask: %s\\n' "$CONTEXT" "$*" | "${binPath}" run "$MODEL"
else
  TMPFILE=$(mktemp /tmp/Modelfile-XXXXXX)
  TMPMODEL="memory-session-$$"
  printf 'FROM %s\\nSYSTEM """\\n%s\\n"""\\n' "$MODEL" "$CONTEXT" > "$TMPFILE"
  "${binPath}" create "$TMPMODEL" -f "$TMPFILE" > /dev/null 2>&1
  trap '"${binPath}" rm "$TMPMODEL" > /dev/null 2>&1; rm -f "$TMPFILE"' EXIT
  "${binPath}" run "$TMPMODEL"
fi
`
  }

  // ── Standard template modes ──────────────────────────────────────────────────

  let interactiveCmd: string
  let nonInteractiveCmd: string

  if (mode === "system-prompt" && flag) {
    interactiveCmd    = `exec "${binPath}" "${flag}" "$CONTEXT"`
    nonInteractiveCmd = `"${binPath}" -p "${flag}" "$CONTEXT" "$*"`

  } else if (mode === "flag" && flag) {
    interactiveCmd    = `exec "${binPath}" "${flag}" "$CONTEXT"`
    nonInteractiveCmd = `printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"`

  } else if (mode === "system-interactive" && flag) {
    // CLIs with --system flag but no non-interactive mode (groq)
    interactiveCmd    = `exec "${binPath}" "${flag}" "$CONTEXT"`
    nonInteractiveCmd = `exec "${binPath}" "${flag}" "$CONTEXT"`

  } else if (mode === "goose") {
    // goose run --system injects context; -s keeps the session open
    interactiveCmd    = `exec "${binPath}" run --system "$CONTEXT" -s`
    nonInteractiveCmd = `exec "${binPath}" run --system "$CONTEXT" -t "$*"`

  } else if (mode === "tui-prompt") {
    // opencode: --prompt pre-fills the TUI; run is headless batch mode
    interactiveCmd    = `exec "${binPath}" --prompt "$CONTEXT"`
    nonInteractiveCmd = `exec "${binPath}" run "$CONTEXT — $*"`

  } else if (mode === "sgpt") {
    // sgpt: context piped via stdin, user query as positional arg
    // --repl starts persistent interactive session (no context injection possible)
    interactiveCmd    = `exec "${binPath}" --repl memory-session`
    nonInteractiveCmd = `printf '%s\\n' "$CONTEXT" | "${binPath}" "$*"`

  } else if (mode === "cursor-agent") {
    // cursor-agent accepts a positional prompt → inject context as initial prompt
    // -p is headless (print) mode
    interactiveCmd    = `exec "${binPath}" "$CONTEXT"`
    nonInteractiveCmd = `exec "${binPath}" -p "Context: $CONTEXT — $*"`

  } else if (mode === "droid") {
    // droid accepts prompt positionally for interactive sessions
    // droid exec subcommand + stdin for non-interactive tasks
    interactiveCmd    = `exec "${binPath}" "$CONTEXT"`
    nonInteractiveCmd = `printf 'Context:\\n%s\\n\\nTask: %s\\n' "$CONTEXT" "$*" | "${binPath}" exec -`

  } else if (mode === "positional") {
    interactiveCmd    = `exec "${binPath}" "$CONTEXT"`
    nonInteractiveCmd = `printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"`

  } else {
    // stdin fallback
    interactiveCmd    = `printf '%s\\n\\n' "$CONTEXT" | exec "${binPath}"`
    nonInteractiveCmd = `printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"`
  }

  return header + `
if [ -z "$CONTEXT" ]; then
  exec "${binPath}" "$@"
elif [ "$#" -gt 0 ]; then
  ${nonInteractiveCmd}
else
  ${interactiveCmd}
fi
`
}

async function cmdSetup(args: string[]): Promise<void> {
  const { intro, outro, multiselect, spinner, note, isCancel } = await import("@clack/prompts")

  // Optional scope argument: `memory setup <scope>` creates project-specific connectors
  const scopeArg = args[0] && !args[0].startsWith("--") ? args[0] : undefined
  const suffix   = scopeArg ? `-${scopeArg}` : ""
  const label    = scopeArg ? ` (scope: ${scopeArg})` : ""

  if (scopeArg && !existsSync(scopeDir(scopeArg))) {
    console.error(`Scope "${scopeArg}" not found. Run: memory scope create ${scopeArg}`)
    process.exit(1)
  }

  intro(`${c.bold}  memory setup${label}  ${c.reset}`)

  // 1. Detect available CLIs
  const available = SUPPORTED_CONNECTORS.filter(
    (conn) => isAvailable(conn.bin) || isAvailable(conn.name)
  )

  if (available.length === 0) {
    note("No supported AI CLIs found.\nInstall gemini, claude, or codex first.", "Warning")
    outro("Nothing to configure.")
    return
  }

  // 2. Interactive multi-select
  const selected = await multiselect({
    message: `Select connectors to install${label}:`,
    options: available.map((conn) => ({
      value: conn.name,
      label: `${c.bold}${conn.name}${c.reset}`,
      hint:  CONNECTOR_HINTS[conn.name] ?? conn.name,
    })),
    initialValues: available.map((conn) => conn.name),
  })

  if (isCancel(selected) || (selected as string[]).length === 0) {
    outro("Setup cancelled.")
    return
  }

  const selectedNames = selected as string[]

  // 3. Base setup
  const s = spinner()
  s.start("Configuring base install...")

  if (!existsSync(LOCAL_BIN)) mkdirSync(LOCAL_BIN, { recursive: true })

  const memoryLink = join(LOCAL_BIN, "memory")
  if (existsSync(memoryLink)) unlinkSync(memoryLink)
  symlinkSync(join(INSTALL_DIR, "memory"), memoryLink)

  const rc = getShellRc()
  ensureInPath(rc, LOCAL_BIN, "local bin")
  ensureInPath(rc, BUN_BIN, "bun bin")

  s.stop("Base install ready")

  // 4. Install selected connectors
  const installedNames: string[] = []

  for (const name of selectedNames) {
    const conn = SUPPORTED_CONNECTORS.find((c) => c.name === name)!
    const cs = spinner()
    const wrapperName = `${name}-memory${suffix}`
    cs.start(`Installing ${wrapperName}...`)

    const binPath = existsSync(conn.bin)
      ? conn.bin
      : new TextDecoder().decode(Bun.spawnSync(["which", conn.name]).stdout).trim()

    writeFileSync(
      join(LOCAL_BIN, wrapperName),
      makeWrapper(binPath, conn.mode, conn.flag, scopeArg),
      { mode: 0o755 }
    )

    cs.stop(`${c.green}✓${c.reset} ${wrapperName}`)
    installedNames.push(wrapperName)
  }

  // 5. Big ASCII art
  printMemoryAscii()

  // 6. Show how to launch
  const launchLines = installedNames
    .map((n) => `  ${c.green}${c.bold}${n}-memory${c.reset}   →  launch ${n} with your memory context`)
    .join("\n")

  note(launchLines, "Ready to use")

  outro(`${c.dim}Reload shell: source ${rc}${c.reset}`)
}

// ── Daemon ────────────────────────────────────────────────────────────────────
const DAEMON_PID_FILE = join(MEMORY_HOME, "daemon.pid")
const DAEMON_LOG_FILE = join(MEMORY_HOME, "daemon.log")

function daemonPid(): number | null {
  if (!existsSync(DAEMON_PID_FILE)) return null
  const pid = parseInt(readFileSync(DAEMON_PID_FILE, "utf8").trim(), 10)
  if (isNaN(pid)) return null
  // Check if process is actually running
  try { process.kill(pid, 0); return pid } catch { return null }
}

async function cmdDaemon(args: string[]): Promise<void> {
  const sub = args[0]

  if (sub === "stop") {
    const pid = daemonPid()
    if (!pid) { console.log(`${c.dim}memoryd is not running${c.reset}`); return }
    process.kill(pid, "SIGTERM")
    unlinkSync(DAEMON_PID_FILE)
    console.log(`${c.green}✓${c.reset} memoryd stopped (pid ${pid})`)
    return
  }

  if (sub === "status") {
    const pid = daemonPid()
    if (pid) {
      console.log(`${c.green}●${c.reset} memoryd running  pid=${pid}  http://127.0.0.1:7711`)
    } else {
      console.log(`${c.dim}○ memoryd stopped${c.reset}`)
    }
    return
  }

  if (sub === "install") {
    const bunBin = Bun.which("bun") ?? join(HOME, ".bun/bin/bun")
    const cliPath = join(INSTALL_DIR, "src/cli.ts")
    const unit = `[Unit]
Description=Memory daemon — local AI context server
After=network.target

[Service]
Type=simple
ExecStart=${bunBin} run ${cliPath} daemon start --foreground
Restart=on-failure
RestartSec=5
Environment=HOME=${HOME}

[Install]
WantedBy=default.target
`
    const systemdDir = join(HOME, ".config/systemd/user")
    mkdirSync(systemdDir, { recursive: true })
    const unitPath = join(systemdDir, "memoryd.service")
    writeFileSync(unitPath, unit)
    console.log(`${c.green}✓${c.reset} Unit written: ${unitPath}`)
    console.log(`\nEnable & start:`)
    console.log(`  ${c.cyan}systemctl --user daemon-reload${c.reset}`)
    console.log(`  ${c.cyan}systemctl --user enable --now memoryd${c.reset}`)
    return
  }

  // Default: start
  const foreground = args.includes("--foreground")

  if (!foreground) {
    const existing = daemonPid()
    if (existing) {
      console.log(`${c.green}●${c.reset} memoryd already running (pid ${existing})`)
      return
    }

    // Spawn detached process
    const self = join(INSTALL_DIR, "src/cli.ts")
    const proc = Bun.spawn(["bun", "run", self, "daemon", "start", "--foreground"], {
      detached: true,
      stdio: ["ignore", Bun.file(DAEMON_LOG_FILE), Bun.file(DAEMON_LOG_FILE)],
    })
    proc.unref()
    // Give it a moment to bind
    await Bun.sleep(400)
    const pid = daemonPid()
    if (pid) {
      console.log(`${c.green}✓${c.reset} memoryd started  pid=${pid}  http://127.0.0.1:7711`)
    } else {
      console.log(`${c.red}✗${c.reset} memoryd failed to start — check ${DAEMON_LOG_FILE}`)
    }
    return
  }

  // --foreground: actually run the server (used by systemd + detached spawn)
  const { startServer, PORT } = await import("./ui/server")
  const { watchShellInBackground } = await import("./observers/shell-daemon")
  writeFileSync(DAEMON_PID_FILE, String(process.pid))
  const server = startServer()
  watchShellInBackground()
  process.on("SIGTERM", () => {
    server.stop()
    try { unlinkSync(DAEMON_PID_FILE) } catch {}
    process.exit(0)
  })
  process.on("SIGINT", () => {
    server.stop()
    try { unlinkSync(DAEMON_PID_FILE) } catch {}
    process.exit(0)
  })
  // Keep alive
  await new Promise(() => {})
}

// ── memory learn ──────────────────────────────────────────────────────────

async function cmdShell(args: string[]): Promise<void> {
  const sub = args[0]
  const { writeShellHooks, installShellHooks, HOOKS_SH } = await import("./observers/shell-hooks")

  if (sub === "install") {
    const store = loadStore()
    writeShellHooks(store.memories)
    const { alreadyInstalled, rcFile } = installShellHooks()

    if (alreadyInstalled) {
      console.log(`${c.green}✓${c.reset} Shell hooks already sourced from ${rcFile}`)
    } else {
      console.log(`${c.green}✓${c.reset} Added to ${rcFile}`)
    }
    console.log(`${c.green}✓${c.reset} Hooks written to ${HOOKS_SH}`)
    console.log(`\n  Reload your shell: ${c.cyan}source ~/${rcFile.split("/").pop()}${c.reset}`)
    return
  }

  if (sub === "update") {
    const store = loadStore()
    writeShellHooks(store.memories)
    console.log(`${c.green}✓${c.reset} Shell hooks updated`)
    return
  }

  console.error(`Usage: memory shell install | update`)
  process.exit(1)
}

async function cmdLearn(args: string[]): Promise<void> {
  const { intro, outro, multiselect, spinner, isCancel } = await import("@clack/prompts")
  const sub = args[0]

  if (sub === "git") {
    const { analyzeGitRepo } = await import("./observers/git")
    const { intro, outro, multiselect, spinner, isCancel, note } = await import("@clack/prompts")

    const cwd = args[1] ?? process.cwd()
    intro(`${c.bold}  memory learn git  ${c.reset}`)

    const s = spinner()
    s.start(`Analysing ${cwd}…`)

    const { inferences, repoName, commits } = analyzeGitRepo(cwd)
    s.stop(`Analysed ${commits} commits in ${c.cyan}${repoName}${c.reset}`)

    // Dedup against existing store
    const store    = loadStore()
    const existing = store.memories.map(m => m.content.toLowerCase())
    const fresh    = inferences.filter(inf =>
      !existing.some(e => e.includes(inf.content.toLowerCase().slice(0, 40)))
    )

    if (fresh.length === 0) {
      outro("Nothing new — store already up to date.")
      return
    }

    const selected = await multiselect({
      message: "Select inferences to store:",
      options: fresh.map((inf, i) => ({
        value: String(i),
        label: `"${inf.content}"`,
        hint:  `${inf.type} · ${inf.domain} · ${inf.evidence} · ${(inf.confidence * 100).toFixed(0)}%`,
      })),
      initialValues: fresh.map((_, i) => String(i)),
    })

    if (isCancel(selected) || (selected as string[]).length === 0) {
      outro("Nothing stored.")
      return
    }

    const indices = (selected as string[]).map(Number)
    for (const i of indices) {
      const inf = fresh[i]
      const mem: Memory = {
        id:         crypto.randomUUID().slice(0, 8),
        type:       inf.type,
        content:    inf.content,
        domain:     inf.domain,
        confidence: inf.confidence,
        importance: 0.6,
        source:     "git-observer",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      store.memories.push(mem)
      runHook("on-memory-added", mem)
    }
    saveStore(store)

    outro(`${c.green}✓${c.reset} Stored ${indices.length} inference${indices.length === 1 ? "" : "s"}`)
    return
  }

  if (sub !== "shell") {
    console.error(`Usage: memory learn shell|git [path]`)
    process.exit(1)
  }

  const { parseHistoryLines, inferFromCommands, SHELL_HISTORY_FILE } =
    await import("./observers/shell")

  intro(`${c.bold}  memory learn shell  ${c.reset}`)

  const s = spinner()
  s.start(`Reading ${SHELL_HISTORY_FILE}…`)

  if (!existsSync(SHELL_HISTORY_FILE)) {
    s.stop("History file not found")
    outro("Nothing to learn.")
    return
  }

  const raw        = readFileSync(SHELL_HISTORY_FILE, "utf8")
  const commands   = parseHistoryLines(raw)
  const inferences = inferFromCommands(commands)

  s.stop(`Analysed ${commands.length} commands`)

  // Dedup against existing store
  const store    = loadStore()
  const existing = store.memories.map(m => m.content.toLowerCase())
  const fresh    = inferences.filter(inf =>
    !existing.some(e => e.includes(inf.content.toLowerCase().slice(0, 40)))
  )

  if (fresh.length === 0) {
    outro("Nothing new — store already up to date.")
    return
  }

  const selected = await multiselect({
    message: "Select inferences to store:",
    options: fresh.map((inf, i) => ({
      value: String(i),
      label: `"${inf.content}"`,
      hint:  `${inf.type} · ${inf.domain} · seen ${inf.count}x · confidence ${(inf.confidence * 100).toFixed(0)}%`,
    })),
    initialValues: fresh.map((_, i) => String(i)),
  })

  if (isCancel(selected) || (selected as string[]).length === 0) {
    outro("Nothing stored.")
    return
  }

  const indices = (selected as string[]).map(Number)
  for (const i of indices) {
    const inf = fresh[i]
    const mem: Memory = {
      id:         crypto.randomUUID().slice(0, 8),
      type:       inf.type,
      content:    inf.content,
      domain:     inf.domain,
      confidence: inf.confidence,
      importance: 0.6,
      source:     "shell-observer",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.memories.push(mem)
    runHook("on-memory-added", mem)
  }
  saveStore(store)

  outro(`${c.green}✓${c.reset} Stored ${indices.length} inference${indices.length === 1 ? "" : "s"}`)
}

async function cmdUI(): Promise<void> {
  const { startServer, PORT } = await import("./ui/server")
  const url = `http://127.0.0.1:${PORT}`

  const server = startServer()

  // Auto-open browser
  const opener = process.platform === "darwin" ? "open" : "xdg-open"
  Bun.spawnSync([opener, url])

  console.log(`\n  ${c.cyan}${c.bold}memory ui${c.reset}  →  ${c.green}${url}${c.reset}`)
  console.log(`  ${c.dim}Press Ctrl+C to stop${c.reset}\n`)

  process.on("SIGINT", () => {
    server.stop()
    console.log(`\n  ${c.dim}memory ui stopped${c.reset}`)
    process.exit(0)
  })

  // Keep process alive
  await new Promise(() => {})
}

async function cmdUninstall(): Promise<void> {
  const { intro, outro, multiselect, spinner, note, isCancel } = await import("@clack/prompts")

  intro(`${c.bold}  memory uninstall  ${c.reset}`)

  // Detect which connectors are currently installed
  const installed = SUPPORTED_CONNECTORS.filter((conn) =>
    existsSync(join(LOCAL_BIN, `${conn.name}-memory`))
  )

  if (installed.length === 0) {
    note("No connectors installed.", "Nothing to remove")
    outro("Done.")
    return
  }

  const selected = await multiselect({
    message: "Select connectors to uninstall:",
    options: installed.map((conn) => ({
      value: conn.name,
      label: `${c.bold}${conn.name}-memory${c.reset}`,
      hint:  CONNECTOR_HINTS[conn.name] ?? conn.name,
    })),
    initialValues: [],
  })

  if (isCancel(selected) || (selected as string[]).length === 0) {
    outro("Nothing removed.")
    return
  }

  const selectedNames = selected as string[]

  const s = spinner()
  s.start("Removing connectors...")

  const removed: string[] = []
  for (const name of selectedNames) {
    const wrapperPath = join(LOCAL_BIN, `${name}-memory`)
    if (existsSync(wrapperPath)) {
      unlinkSync(wrapperPath)
      removed.push(`${name}-memory`)
    }
  }

  s.stop("Done")

  note(removed.map((n) => `  ${c.yellow}✕${c.reset} ${n} removed`).join("\n"), "Uninstalled")
  outro(`Run ${c.green}memory setup${c.reset} to reinstall anytime.`)
}

function cmdDoctor(): void {
  const ok  = `${c.green}✔${c.reset}`
  const err = `${c.yellow}✗${c.reset}`

  const activeScope = readCurrentScope()
  const activeFile  = scopeFile(activeScope)
  const homeOk      = existsSync(MEMORY_HOME)
  const fileOk      = existsSync(activeFile)
  const writable    = homeOk && isWritable(MEMORY_HOME)
  const hooksOk     = existsSync(HOOKS_DIR)
  const scopes      = listScopes()
  const envScope    = detectScope()

  const store = fileOk ? loadStore() : { memories: [] }
  const count = store.memories.length

  let version = "unknown"
  try {
    const pkg = JSON.parse(readFileSync(join(INSTALL_DIR, "package.json"), "utf-8"))
    version = pkg.version ?? "unknown"
  } catch { /* ignore */ }

  console.log(`\n  ${c.bold}memory doctor${c.reset}  ${c.dim}v${version}${c.reset}\n`)
  console.log(`  ${homeOk   ? ok : err} MEMORY_HOME    ${c.dim}${MEMORY_HOME}${c.reset}`)
  console.log(`  ${fileOk   ? ok : err} storage        ${c.dim}${activeFile}${c.reset}`)
  console.log(`  ${writable ? ok : err} writable`)
  console.log(`  ${ok} memories       ${c.dim}${count}${c.reset}`)
  console.log(`  ${hooksOk  ? ok : err} hooks          ${c.dim}${HOOKS_DIR}${c.reset}`)
  console.log(`  ${ok} active scope   ${c.dim}${activeScope}${c.reset}`)
  console.log(`  ${ok} all scopes     ${c.dim}${scopes.join(", ") || "none"}${c.reset}`)
  console.log(`  ${ok} MEMORY_HOME level  ${c.dim}${envScope}${c.reset}`)

  if (!homeOk || !fileOk || !writable) {
    console.log(`\n  ${c.yellow}Run ${c.bold}memory setup${c.reset}${c.yellow} to initialize.${c.reset}`)
  }

  console.log()
}

function cmdScope(args: string[]): void {
  const [sub, name] = args

  switch (sub) {
    case "list": {
      const scopes  = listScopes()
      const current = readCurrentScope()
      if (scopes.length === 0) {
        console.log("No scopes found.")
        return
      }
      for (const s of scopes) {
        const active = s === current ? `  ${c.green}← active${c.reset}` : ""
        console.log(`  ${s}${active}`)
      }
      break
    }

    case "use": {
      if (!name) {
        console.error("Usage: memory scope use <name>")
        process.exit(1)
      }
      if (!existsSync(scopeDir(name))) {
        console.error(`Scope "${name}" not found. Run: memory scope create ${name}`)
        process.exit(1)
      }
      writeCurrentScope(name)
      console.log(`Switched to scope: ${c.green}${name}${c.reset}`)
      break
    }

    case "create": {
      if (!name) {
        console.error("Usage: memory scope create <name>")
        process.exit(1)
      }
      if (name === "global") {
        console.error(`"global" is a reserved scope name.`)
        process.exit(1)
      }
      const dir = scopeDir(name)
      if (existsSync(dir)) {
        console.log(`Scope "${name}" already exists.`)
        return
      }
      mkdirSync(dir, { recursive: true })
      console.log(`Created scope: ${c.green}${name}${c.reset}`)
      console.log(`${c.dim}Switch to it: memory scope use ${name}${c.reset}`)
      break
    }

    case "delete": {
      if (!name) {
        console.error("Usage: memory scope delete <name>")
        process.exit(1)
      }
      if (name === "global") {
        console.error(`Cannot delete the "global" scope.`)
        process.exit(1)
      }
      if (name === readCurrentScope()) {
        console.error(`Cannot delete the active scope. Switch first: memory scope use global`)
        process.exit(1)
      }
      const dir = scopeDir(name)
      if (!existsSync(dir)) {
        console.error(`Scope "${name}" not found.`)
        process.exit(1)
      }
      rmSync(dir, { recursive: true, force: true })
      console.log(`Deleted scope: ${c.yellow}${name}${c.reset}`)
      break
    }

    default: {
      console.log(`Usage: memory scope <list|use|create|delete> [name]

  ${c.green}scope list${c.reset}           Show all scopes
  ${c.green}scope use${c.reset}  ${c.dim}<name>${c.reset}    Switch active scope
  ${c.green}scope create${c.reset} ${c.dim}<name>${c.reset}  Create a new project scope
  ${c.green}scope delete${c.reset} ${c.dim}<name>${c.reset}  Delete a project scope and its memories`)
      break
    }
  }
}

// ─── harvest ─────────────────────────────────────────────────────────────────

interface HarvestCandidate {
  text:   string
  source: "user" | "bash"
  type:   MemoryType
  domain: string
}

function findLastClaudeSession(): string | null {
  const claudeProjects = join(HOME, ".claude", "projects")
  if (!existsSync(claudeProjects)) return null

  let newest: { path: string; mtime: number } | null = null

  try {
    for (const proj of readdirSync(claudeProjects, { withFileTypes: true })) {
      if (!proj.isDirectory()) continue
      const projDir = join(claudeProjects, proj.name)
      try {
        for (const f of readdirSync(projDir)) {
          if (!f.endsWith(".jsonl")) continue
          const fp = join(projDir, f)
          try {
            const mtime = statSync(fp).mtimeMs
            if (!newest || mtime > newest.mtime) newest = { path: fp, mtime }
          } catch { /* unreadable — skip */ }
        }
      } catch { /* unreadable dir — skip */ }
    }
  } catch { /* ~/.claude/projects unreadable */ }

  return newest?.path ?? null
}

function inferType(text: string): MemoryType {
  const t = text.toLowerCase()
  if (/\b(prefer|like|always|never|style|workflow|tool)\b/.test(t)) return "preference"
  if (/\b(project|app|building|built|working on)\b/.test(t))        return "project"
  if (/\b(decided|decision|chose|choosing|picked)\b/.test(t))       return "decision"
  if (/\b(want|goal|aim|target|objective)\b/.test(t))               return "goal"
  if (/\b(constraint|limit|restriction|must not|cannot)\b/.test(t)) return "constraint"
  if (/\b(can|skill|know how|expert|familiar)\b/.test(t))           return "skill"
  return "knowledge"
}

function inferDomain(text: string): string {
  const t = text.toLowerCase()
  if (/\b(code|dev|develop|typescript|javascript|bun|npm|git|framework|api|database|sql|prisma|next|react)\b/.test(t)) return "development"
  if (/\b(design|ui|ux|css|tailwind|color|font|layout)\b/.test(t))  return "design"
  if (/\b(mobile|expo|react native|ios|android)\b/.test(t))          return "mobile"
  if (/\b(work|job|team|meeting|client|deadline)\b/.test(t))         return "work"
  if (/\b(personal|life|family|health|baby)\b/.test(t))              return "personal"
  return "general"
}

const HARVEST_PATTERNS = [
  /\bi (use|prefer|want|need|always|never)\b/i,
  /\bmy (stack|setup|project|app|preference|workflow|tool)\b/i,
  /\b(always|never) use\b/i,
  /\bimportant[:\s]/i,
  /\bremember (this|that)\b/i,
]

function extractFromJSONL(raw: string): {
  candidates:    HarvestCandidate[]
  alreadyStored: string[]
  parsed:        number
} {
  const candidates:    HarvestCandidate[] = []
  const alreadyStored: string[]           = []
  let parsed = 0

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    let entry: any
    try { entry = JSON.parse(line) } catch { continue }
    parsed++

    const { type, message } = entry
    if (!message) continue

    // ── assistant: look for memory remember bash calls ────────────────────────
    if (type === "assistant" && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type !== "tool_use" || block.name !== "Bash") continue
        const cmd: string = block.input?.command ?? ""
        const m = cmd.match(/memory remember\s+"([^"]+)"/)
        if (m) alreadyStored.push(m[1])
      }
    }

    // ── user: apply heuristic patterns ───────────────────────────────────────
    if (type === "user") {
      let text = ""
      if (typeof message.content === "string") {
        text = message.content
      } else if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === "text") text += block.text + " "
        }
      }
      text = text.trim()
      if (!text || text.length < 10 || text.length > 500) continue

      for (const pattern of HARVEST_PATTERNS) {
        if (!pattern.test(text)) continue
        const sentences = text.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 8 && s.length < 200)
        for (const sentence of sentences) {
          if (pattern.test(sentence)) {
            candidates.push({ text: sentence, source: "user", type: inferType(sentence), domain: inferDomain(sentence) })
          }
        }
        break
      }
    }
  }

  return { candidates, alreadyStored, parsed }
}

function extractFromText(raw: string): { candidates: HarvestCandidate[]; parsed: number } {
  const candidates: HarvestCandidate[] = []
  let parsed = 0

  for (const line of raw.split("\n")) {
    const text = line.trim()
    parsed++
    if (!text || text.length < 10 || text.length > 300) continue

    for (const pattern of HARVEST_PATTERNS) {
      if (pattern.test(text)) {
        candidates.push({ text, source: "user", type: inferType(text), domain: inferDomain(text) })
        break
      }
    }
  }

  return { candidates, parsed }
}

async function cmdHarvest(args: string[]): Promise<void> {
  const { intro, outro, multiselect, spinner, note, isCancel } = await import("@clack/prompts")

  let filePath: string | null = null
  let useLast = false

  for (const arg of args) {
    if (arg === "--last") useLast = true
    else filePath = arg
  }

  if (useLast) {
    filePath = findLastClaudeSession()
    if (!filePath) {
      console.error("No Claude Code session found in ~/.claude/projects/")
      process.exit(1)
    }
  }

  if (!filePath) {
    console.error(`Usage:
  memory harvest <session.jsonl>    parse a Claude Code session (structured)
  memory harvest <transcript.txt>   parse any plain text transcript
  memory harvest --last             parse the most recent Claude Code session

Note: --last is Claude Code only. For other AIs, use write-back during session.`)
    process.exit(1)
  }

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  intro(`${c.bold}  memory harvest  ${c.reset}`)

  const s = spinner()
  s.start("Parsing session…")

  const raw    = readFileSync(filePath, "utf-8")
  const isJsonl = filePath.endsWith(".jsonl")

  let allCandidates: HarvestCandidate[] = []
  let alreadyStored: string[]           = []
  let parsed = 0

  if (isJsonl) {
    const result  = extractFromJSONL(raw)
    allCandidates = result.candidates
    alreadyStored = result.alreadyStored
    parsed        = result.parsed
  } else {
    const result  = extractFromText(raw)
    allCandidates = result.candidates
    parsed        = result.parsed
  }

  // Dedup within candidates
  const seen = new Set<string>()
  allCandidates = allCandidates.filter(cand => {
    const key = cand.text.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Dedup against existing store
  const store    = loadStore()
  const existing = store.memories.map(m => m.content.toLowerCase())
  allCandidates  = allCandidates.filter(cand =>
    !existing.some(e => e.includes(cand.text.toLowerCase().slice(0, 40)))
  )

  s.stop(`Parsed ${parsed} entries`)

  if (alreadyStored.length > 0) {
    note(
      alreadyStored.map(t => `${c.green}✔${c.reset}  "${t.slice(0, 70)}"`).join("\n"),
      `already in store (${alreadyStored.length})`
    )
  }

  if (allCandidates.length === 0) {
    outro("No new memories found.")
    return
  }

  const selected = await multiselect({
    message: "Select memories to store:",
    options: allCandidates.map((cand, i) => ({
      value: String(i),
      label: `"${cand.text.slice(0, 80)}"`,
      hint:  `${cand.type} · ${cand.domain}`,
    })),
    initialValues: allCandidates.map((_, i) => String(i)),
  })

  if (isCancel(selected) || (selected as string[]).length === 0) {
    outro("Nothing stored.")
    return
  }

  const toStore = (selected as string[]).map(i => allCandidates[parseInt(i)])
  const scope   = readCurrentScope()

  for (const cand of toStore) {
    const memory: Memory = {
      id:         crypto.randomUUID().slice(0, 8),
      type:       cand.type,
      content:    cand.text,
      domain:     cand.domain,
      confidence: 0.6,
      importance: 0.5,
      source:     "ai",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.memories.push(memory)
    runHook("on-memory-added", memory)
  }

  saveStore(store)
  outro(`${c.green}✓${c.reset}  Stored ${toStore.length} memor${toStore.length === 1 ? "y" : "ies"} → scope: ${scope}`)
}

async function cmdWatchSession(provider: string, scopeArg?: string): Promise<void> {
  const { intro, outro, multiselect, spinner, note, isCancel } = await import("@clack/prompts")

  // Resolve binary: memory watch gemini [scope] → gemini-memory[-scope]
  const bin = scopeArg ? `${provider}-memory-${scopeArg}` : `${provider}-memory`

  if (!Bun.which(bin)) {
    console.error(`${c.red}✗${c.reset} Command not found: ${bin}`)
    console.error(`  Run: ${c.cyan}memory setup${scopeArg ? ` ${scopeArg}` : ""}${c.reset}`)
    process.exit(1)
  }

  // Temp file to capture session output
  const tmpFile = `/tmp/memory-session-${Date.now()}.txt`

  console.log(`\n  ${c.cyan}${c.bold}memory watch${c.reset}  →  launching ${c.green}${bin}${c.reset}`)
  console.log(`  ${c.dim}Session will be analysed for memories on exit${c.reset}\n`)

  // Use `script` to capture the full TTY session (user + AI output)
  const proc = Bun.spawnSync(
    ["script", "-q", "-c", bin, tmpFile],
    { stdio: ["inherit", "inherit", "inherit"] }
  )

  // Session ended — harvest from captured file
  console.log(`\n  ${c.dim}Session ended — analysing…${c.reset}\n`)

  if (!existsSync(tmpFile)) {
    console.error("Session file not found — nothing to analyse.")
    return
  }

  intro(`${c.bold}  memory watch  ${c.reset}`)

  const s = spinner()
  s.start("Parsing session…")

  // Strip ANSI escape codes and control chars
  const raw   = readFileSync(tmpFile, "utf-8")
  const clean = raw.replace(/\x1b\[[0-9;]*[mGKHF]/g, "").replace(/\r/g, "")

  try { unlinkSync(tmpFile) } catch {}

  const { candidates: allCandidatesRaw, parsed } = extractFromText(clean)

  // Dedup within candidates
  const seen = new Set<string>()
  let allCandidates = allCandidatesRaw.filter(cand => {
    const key = cand.text.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Dedup against existing store
  const store    = loadStore()
  const existing = store.memories.map(m => m.content.toLowerCase())
  allCandidates  = allCandidates.filter(cand =>
    !existing.some(e => e.includes(cand.text.toLowerCase().slice(0, 40)))
  )

  s.stop(`Parsed ${parsed} lines`)

  if (allCandidates.length === 0) {
    outro("No new memories found.")
    return
  }

  const selected = await multiselect({
    message: "Select memories to store:",
    options: allCandidates.map((cand, i) => ({
      value: String(i),
      label: `"${cand.text.slice(0, 80)}"`,
      hint:  `${cand.type} · ${cand.domain}`,
    })),
    initialValues: allCandidates.map((_, i) => String(i)),
  })

  if (isCancel(selected) || (selected as string[]).length === 0) {
    outro("Nothing stored.")
    return
  }

  const indices = (selected as string[]).map(Number)
  const toStore = indices.map(i => allCandidates[i])
  const targetScope = scopeArg ?? readCurrentScope()

  for (const cand of toStore) {
    const s2 = loadStore(targetScope)
    const memory: Memory = {
      id:         crypto.randomUUID().slice(0, 8),
      type:       cand.type,
      content:    cand.text,
      domain:     cand.domain,
      confidence: 0.6,
      importance: 0.5,
      source:     "watch",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    s2.memories.push(memory)
    saveStore(s2, targetScope)
    runHook("on-memory-added", memory)
  }

  outro(`${c.green}✓${c.reset} Stored ${toStore.length} memor${toStore.length === 1 ? "y" : "ies"} in scope ${c.cyan}${targetScope}${c.reset}`)
}

async function cmdWatch(args: string[]): Promise<void> {
  // memory watch <provider> [scope] → session capture mode
  const knownProviders = ["claude", "gemini", "codex", "opencode", "aider", "goose", "groq", "ollama", "sgpt", "droid"]
  if (args.length > 0 && knownProviders.includes(args[0])) {
    return cmdWatchSession(args[0], args[1])
  }

  // memory watch (no args) → stream memory change events
  const scope = readCurrentScope()
  const file  = scopeFile(scope)
  const dir   = scopeDir(scope)

  // Ensure file exists before watching
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({ memories: [] }, null, 2) + "\n")

  let prev = loadStore()

  // Status info → stderr so stdout stays clean for piping
  process.stderr.write(`watching scope=${scope}\nfile=${file}\n\n`)

  watch(file, () => {
    let next: ReturnType<typeof loadStore>
    try {
      next = loadStore()
    } catch {
      return // file mid-write — skip, next event will catch it
    }

    const prevMap = new Map(prev.memories.map((m) => [m.id, m]))
    const nextMap = new Map(next.memories.map((m) => [m.id, m]))

    for (const id of nextMap.keys()) {
      if (!prevMap.has(id)) emit("memory_added",   id, scope)
    }
    for (const id of prevMap.keys()) {
      if (!nextMap.has(id)) emit("memory_deleted", id, scope)
    }
    for (const [id, m] of nextMap) {
      const old = prevMap.get(id)
      if (old && old.updated_at !== m.updated_at) emit("memory_updated", id, scope)
    }

    prev = next
  })

  process.on("SIGINT", () => {
    process.stderr.write("\nwatch stopped\n")
    process.exit(0)
  })

  await new Promise(() => {}) // keep process alive
}

function emit(event: string, id: string, scope: string): void {
  process.stdout.write(`EVENT ${event} id=${id} scope=${scope}\n`)
}

// ─── router ──────────────────────────────────────────────────────────────────

function cmdHelp(): void {
  printMemoryAscii()
  console.log(`${c.dim}Persistent cognitive layer for AI systems.${c.reset}
${c.dim}Your context — everywhere.${c.reset}

${c.bold}COMMANDS${c.reset}

  ${c.green}remember${c.reset} ${c.dim}"<content>" [--type <type>] [--domain <domain>]${c.reset}
      Store a memory. Repeating it increases confidence.

  ${c.green}resume${c.reset}   ${c.dim}"<session summary>"${c.reset}
      Store a session summary (for AIs to call at end of session).

  ${c.green}harvest${c.reset}  ${c.dim}<file.jsonl|file.txt>${c.reset}
      Extract memories from a session transcript (heuristic, no AI call).
      ${c.dim}--last${c.reset}   Auto-detect the most recent Claude Code session.
      Supports .jsonl (Claude Code, structured) or any plain text file.

  ${c.green}recall${c.reset}   ${c.dim}[query]${c.reset}
      Search memories by content, type or domain.

  ${c.green}forget${c.reset}   ${c.dim}<id>${c.reset}
      Delete a memory by id.

  ${c.green}status${c.reset}     Show statistics.
  ${c.green}dump${c.reset}       Export all memories as JSON.
  ${c.green}watch${c.reset}      ${c.dim}[provider] [scope]${c.reset}  Stream memory events, or wrap a provider CLI and harvest memories on exit.
  ${c.green}doctor${c.reset}     Diagnose storage, permissions, and scopes.
  ${c.green}scope${c.reset}      ${c.dim}list | use <name> | create <name>${c.reset}
  ${c.green}setup${c.reset}      ${c.dim}[scope]${c.reset}  Configure connectors. Pass scope to create project-specific wrappers.
  ${c.green}uninstall${c.reset}  Remove connectors interactively.
  ${c.green}ui${c.reset}         Launch local web interface at http://127.0.0.1:7711.
  ${c.green}daemon${c.reset}     ${c.dim}start | stop | status | install${c.reset}  Background API server.
  ${c.green}learn${c.reset}      ${c.dim}shell | git [path]${c.reset}  Analyse shell history or git repo and infer preferences.
  ${c.green}shell${c.reset}      ${c.dim}install | update${c.reset}  Install shell hooks (auto-redirect commands).

${c.bold}TYPES${c.reset}
  ${c.dim}${VALID_TYPES.join(" · ")}${c.reset}

${c.bold}EXAMPLES${c.reset}
  ${c.dim}memory remember "I use Bun for everything" --type preference --domain development${c.reset}
  ${c.dim}memory resume "Built auth flow with NextAuth + Google OAuth, deployed on Railway"${c.reset}
  ${c.dim}memory recall development${c.reset}
  ${c.dim}memory forget a1b2c3d4${c.reset}
  ${c.dim}memory setup${c.reset}
  ${c.dim}memory setup myproject    # project-specific connectors: gemini-memory-myproject${c.reset}
  ${c.dim}memory harvest --last     # extract memories from last Claude Code session${c.reset}
  ${c.dim}memory harvest session.txt  # extract from any plain text transcript${c.reset}
`)
}

const args = process.argv.slice(2)
const [command = "help", ...rest] = args

switch (command) {
  case "remember":  cmdRemember(rest);                         break
  case "resume":    cmdResume(rest);                           break
  case "harvest":   cmdHarvest(rest).catch(console.error);     break
  case "recall":    cmdRecall(rest);                           break
  case "dump":      cmdDump();                                 break
  case "status":    cmdStatus();                               break
  case "forget":    cmdForget(rest);                           break
  case "context":   cmdContext();                              break
  case "watch":     cmdWatch(rest).catch(console.error);        break
  case "doctor":    cmdDoctor();                               break
  case "scope":     cmdScope(rest);                            break
  case "setup":     cmdSetup(rest).catch(console.error);       break
  case "uninstall": cmdUninstall().catch(console.error);       break
  case "ui":        cmdUI().catch(console.error);              break
  case "daemon":    cmdDaemon(rest).catch(console.error);      break
  case "learn":     cmdLearn(rest).catch(console.error);       break
  case "shell":     cmdShell(rest).catch(console.error);       break
  case "help":
  default:          cmdHelp()
}
