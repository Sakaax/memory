#!/usr/bin/env bun
import { existsSync, mkdirSync, appendFileSync, symlinkSync, unlinkSync, readFileSync, writeFileSync, watch } from "fs"
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

function cmdContext(): void {
  const store = loadStore()

  if (store.memories.length === 0) return

  const sorted = [...store.memories].sort(
    (a, b) => b.importance - a.importance || b.confidence - a.confidence
  )

  const grouped = sorted.reduce<Record<string, Memory[]>>((acc, m) => {
    acc[m.domain] = [...(acc[m.domain] ?? []), m]
    return acc
  }, {})

  const lines: string[] = [
    "=== USER MEMORY CONTEXT ===",
    "Background knowledge about the user. Use silently — do not repeat back unless asked.\n",
  ]

  for (const [domain, memories] of Object.entries(grouped)) {
    lines.push(`[${domain.toUpperCase()}]`)
    for (const m of memories) {
      lines.push(`- (${m.type}) ${m.content}`)
    }
    lines.push("")
  }

  lines.push("=== END MEMORY CONTEXT ===")
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

function makeWrapper(binPath: string, mode: string, flag?: string): string {
  const header = `#!/usr/bin/env bash
MEMORY_DIR="${INSTALL_DIR}"
CONTEXT=$("$MEMORY_DIR/memory" context 2>/dev/null)
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
    // ollama has no --system CLI flag; inject context as initial positional prompt
    // model name is configurable via OLLAMA_MODEL env var
    return header + `
MODEL=\${OLLAMA_MODEL:-llama3.2}
if [ -z "$CONTEXT" ]; then
  exec "${binPath}" run "$MODEL" "$@"
elif [ "$#" -gt 0 ]; then
  exec "${binPath}" run "$MODEL" "Context: $CONTEXT\\n\\nTask: $*"
else
  exec "${binPath}" run "$MODEL"
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
    // cursor-agent: no system-prompt flag; -p is headless mode
    // interactive mode starts without context injection
    interactiveCmd    = `exec "${binPath}"`
    nonInteractiveCmd = `exec "${binPath}" -p "Context: $CONTEXT — $*"`

  } else if (mode === "droid") {
    // droid uses exec subcommand for task execution
    interactiveCmd    = `exec "${binPath}" exec "$CONTEXT"`
    nonInteractiveCmd = `exec "${binPath}" exec "$CONTEXT — $*"`

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

async function cmdSetup(): Promise<void> {
  const { intro, outro, multiselect, spinner, note, isCancel } = await import("@clack/prompts")

  intro(`${c.bold}  memory setup  ${c.reset}`)

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
    message: "Select connectors to install:",
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
    cs.start(`Installing ${name}-memory...`)

    const binPath = existsSync(conn.bin)
      ? conn.bin
      : new TextDecoder().decode(Bun.spawnSync(["which", conn.name]).stdout).trim()

    writeFileSync(
      join(LOCAL_BIN, `${name}-memory`),
      makeWrapper(binPath, conn.mode, conn.flag),
      { mode: 0o755 }
    )

    cs.stop(`${c.green}✓${c.reset} ${name}-memory`)
    installedNames.push(name)
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

    default: {
      console.log(`Usage: memory scope <list|use|create> [name]

  ${c.green}scope list${c.reset}           Show all scopes
  ${c.green}scope use${c.reset}  ${c.dim}<name>${c.reset}    Switch active scope
  ${c.green}scope create${c.reset} ${c.dim}<name>${c.reset}  Create a new project scope`)
      break
    }
  }
}

async function cmdWatch(): Promise<void> {
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

  ${c.green}recall${c.reset}   ${c.dim}[query]${c.reset}
      Search memories by content, type or domain.

  ${c.green}forget${c.reset}   ${c.dim}<id>${c.reset}
      Delete a memory by id.

  ${c.green}status${c.reset}     Show statistics.
  ${c.green}dump${c.reset}       Export all memories as JSON.
  ${c.green}watch${c.reset}      Stream live memory change events.
  ${c.green}doctor${c.reset}     Diagnose storage, permissions, and scopes.
  ${c.green}scope${c.reset}      ${c.dim}list | use <name> | create <name>${c.reset}
  ${c.green}setup${c.reset}      Configure AI CLI connectors interactively.
  ${c.green}uninstall${c.reset}  Remove connectors interactively.
  ${c.green}ui${c.reset}         Launch local web interface at http://127.0.0.1:7711.

${c.bold}TYPES${c.reset}
  ${c.dim}${VALID_TYPES.join(" · ")}${c.reset}

${c.bold}EXAMPLES${c.reset}
  ${c.dim}memory remember "I use Bun for everything" --type preference --domain development${c.reset}
  ${c.dim}memory recall development${c.reset}
  ${c.dim}memory forget a1b2c3d4${c.reset}
  ${c.dim}memory setup${c.reset}
`)
}

const args = process.argv.slice(2)
const [command = "help", ...rest] = args

switch (command) {
  case "remember":  cmdRemember(rest);                    break
  case "recall":    cmdRecall(rest);                      break
  case "dump":      cmdDump();                            break
  case "status":    cmdStatus();                          break
  case "forget":    cmdForget(rest);                      break
  case "context":   cmdContext();                         break
  case "watch":     cmdWatch().catch(console.error);      break
  case "doctor":    cmdDoctor();                          break
  case "scope":     cmdScope(rest);                       break
  case "setup":     cmdSetup().catch(console.error);      break
  case "uninstall": cmdUninstall().catch(console.error);  break
  case "ui":        cmdUI().catch(console.error);         break
  case "help":
  default:          cmdHelp()
}
