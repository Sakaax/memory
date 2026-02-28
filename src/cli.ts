#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, symlinkSync, unlinkSync } from "fs"
import { join } from "path"

const MEMORY_FILE = join(import.meta.dir, "../memory.json")
const INSTALL_DIR = join(import.meta.dir, "..")
const HOME = process.env.HOME ?? ""
const LOCAL_BIN = join(HOME, ".local/bin")
const BUN_BIN = join(HOME, ".bun/bin")

type MemoryType =
  | "preference"
  | "knowledge"
  | "project"
  | "decision"
  | "skill"
  | "relationship"
  | "goal"
  | "constraint"

const VALID_TYPES: MemoryType[] = [
  "preference",
  "knowledge",
  "project",
  "decision",
  "skill",
  "relationship",
  "goal",
  "constraint",
]

interface Memory {
  id: string
  type: MemoryType
  content: string
  domain: string
  confidence: number
  importance: number
  source: "cli" | "ai"
  created_at: string
  updated_at: string
}

interface MemoryStore {
  memories: Memory[]
}

function loadStore(): MemoryStore {
  if (!existsSync(MEMORY_FILE)) {
    return { memories: [] }
  }
  return JSON.parse(readFileSync(MEMORY_FILE, "utf-8")) as MemoryStore
}

function saveStore(store: MemoryStore): void {
  writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2) + "\n")
}

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
  store.memories = store.memories.filter((m) => m.id !== id)

  if (store.memories.length === before) {
    console.error(`No memory with id: ${id}`)
    process.exit(1)
  }

  saveStore(store)
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
  gemini: "Google Gemini CLI",
  claude: "Claude Code CLI",
  codex:  "OpenAI Codex CLI",
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
const SUPPORTED_CONNECTORS: Array<{ name: string; bin: string; mode: "flag" | "system-prompt" | "positional" | "stdin"; flag?: string }> = [
  { name: "gemini", bin: join(BUN_BIN, "gemini"), mode: "flag",          flag: "-i"                    },
  { name: "claude", bin: join(BUN_BIN, "claude"), mode: "system-prompt", flag: "--append-system-prompt" },
  { name: "codex",  bin: join(BUN_BIN, "codex"),  mode: "positional"                                   },
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
  let interactiveCmd: string
  let nonInteractiveCmd: string

  if (mode === "system-prompt" && flag) {
    interactiveCmd    = `exec "${binPath}" "${flag}" "$CONTEXT"`
    nonInteractiveCmd = `"${binPath}" -p "${flag}" "$CONTEXT" "$*"`
  } else if (mode === "flag" && flag) {
    interactiveCmd    = `exec "${binPath}" "${flag}" "$CONTEXT"`
    nonInteractiveCmd = `printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"`
  } else if (mode === "positional") {
    interactiveCmd    = `exec "${binPath}" "$CONTEXT"`
    nonInteractiveCmd = `printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"`
  } else {
    interactiveCmd    = `printf '%s\\n\\n' "$CONTEXT" | exec "${binPath}"`
    nonInteractiveCmd = `printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"`
  }

  return `#!/usr/bin/env bash
MEMORY_DIR="${INSTALL_DIR}"
CONTEXT=$("$MEMORY_DIR/memory" context 2>/dev/null)

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

  ${c.green}status${c.reset}   Show statistics.
  ${c.green}dump${c.reset}     Export all memories as JSON.
  ${c.green}setup${c.reset}    Configure AI CLI connectors interactively.

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
  case "setup":     cmdSetup().catch(console.error);      break
  case "help":
  default:          cmdHelp()
}
