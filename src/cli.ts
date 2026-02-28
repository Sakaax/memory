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

// flags: interactive flag to inject context ("-i", "--context", etc.)
// flags = "" → fallback to stdin injection (works with most CLIs)
const SUPPORTED_CONNECTORS: Array<{ name: string; bin: string; flags: string }> = [
  { name: "gemini", bin: join(BUN_BIN, "gemini"), flags: "-i" },
  { name: "codex",  bin: join(BUN_BIN, "codex"),  flags: ""   },
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

function makeWrapper(binPath: string, interactiveFlag: string): string {
  const interactiveCmd = interactiveFlag
    ? `exec "${binPath}" "${interactiveFlag}" "$CONTEXT"`
    : `printf '%s\\n\\n' "$CONTEXT" | exec "${binPath}"`

  return `#!/usr/bin/env bash
MEMORY_DIR="${INSTALL_DIR}"
CONTEXT=$("$MEMORY_DIR/memory" context 2>/dev/null)

if [ -z "$CONTEXT" ]; then
  exec "${binPath}" "$@"
elif [ "$#" -gt 0 ]; then
  printf '%s\\n\\nUser query: %s\\n' "$CONTEXT" "$*" | "${binPath}" -p "$*"
else
  ${interactiveCmd}
fi
`
}

function cmdSetup(): void {
  console.log("memory setup\n")

  // 1. Create ~/.local/bin
  if (!existsSync(LOCAL_BIN)) {
    mkdirSync(LOCAL_BIN, { recursive: true })
    console.log(`✓ Created ${LOCAL_BIN}`)
  }

  // 2. Symlink memory binary
  const memoryLink = join(LOCAL_BIN, "memory")
  const memoryScript = join(INSTALL_DIR, "memory")
  if (existsSync(memoryLink)) {
    unlinkSync(memoryLink)
  }
  symlinkSync(memoryScript, memoryLink)
  console.log(`✓ memory → ${memoryLink}`)

  // 3. Patch shell rc for PATH
  const rc = getShellRc()
  const addedLocal = ensureInPath(rc, LOCAL_BIN, "local bin")
  const addedBun = ensureInPath(rc, BUN_BIN, "bun bin")
  if (addedLocal || addedBun) {
    console.log(`✓ PATH updated in ${rc}`)
  } else {
    console.log(`  PATH already configured`)
  }

  // 4. Detect CLIs and generate wrappers
  console.log("\nDetecting AI CLIs...")
  const installed: string[] = []
  const missing: string[] = []

  for (const connector of SUPPORTED_CONNECTORS) {
    if (isAvailable(connector.bin) || isAvailable(connector.name)) {
      const binPath = existsSync(connector.bin)
        ? connector.bin
        : Bun.spawnSync(["which", connector.name]).stdout
            ? new TextDecoder().decode(Bun.spawnSync(["which", connector.name]).stdout).trim()
            : connector.bin

      const wrapperPath = join(LOCAL_BIN, `${connector.name}-memory`)
      writeFileSync(wrapperPath, makeWrapper(binPath, connector.flags), { mode: 0o755 })
      console.log(`✓ ${connector.name}-memory wrapper installed`)
      installed.push(connector.name)
    } else {
      console.log(`  ${connector.name} — not found (skipped)`)
      missing.push(connector.name)
    }
  }

  // 5. Claude Code instructions (don't auto-modify global CLAUDE.md)
  const claudeGlobal = join(HOME, ".claude/CLAUDE.md")
  const alreadyConfigured = existsSync(claudeGlobal) &&
    readFileSync(claudeGlobal, "utf-8").includes("memory.json")

  console.log("\n── Claude Code ──────────────────────────────")
  if (alreadyConfigured) {
    console.log("  Already configured.")
  } else {
    console.log(`  Add this to ~/.claude/CLAUDE.md:\n`)
    console.log(`  ## Memory Context`)
    console.log(`  Before every response, read \`${MEMORY_FILE}\``)
    console.log(`  and use stored memories as context.\n`)
  }

  // 6. Summary
  console.log("─────────────────────────────────────────────")
  if (installed.length > 0) {
    console.log(`Connectors ready: ${installed.map((n) => `${n}-memory`).join(", ")}`)
  }
  if (missing.length > 0) {
    console.log(`Not installed:    ${missing.join(", ")}`)
  }
  console.log(`\nReload shell: source ${rc}`)
}

// ─── router ──────────────────────────────────────────────────────────────────

function cmdHelp(): void {
  console.log(`memory v0.2.0 — persistent cognitive layer

Commands:
  remember "<content>" [--type <type>] [--domain <domain>] [--importance <0-1>]
      Store a memory (updates confidence if duplicate)

  recall [query]
      Retrieve memories filtered by content/type/domain

  forget <id>
      Delete a memory by id

  status
      Show memory statistics

  dump
      Print all memories as JSON

  context
      Output formatted context (used internally by connectors)

  setup
      Auto-detect AI CLIs and configure connectors

Types: ${VALID_TYPES.join(" | ")}

Examples:
  memory remember "I use Bun for everything" --type preference --domain development
  memory recall development
  memory forget a1b2c3d4
  memory setup`)
}

const args = process.argv.slice(2)
const [command = "help", ...rest] = args

switch (command) {
  case "remember":  cmdRemember(rest); break
  case "recall":    cmdRecall(rest);   break
  case "dump":      cmdDump();         break
  case "status":    cmdStatus();       break
  case "forget":    cmdForget(rest);   break
  case "context":   cmdContext();      break
  case "setup":     cmdSetup();        break
  case "help":
  default:          cmdHelp()
}
