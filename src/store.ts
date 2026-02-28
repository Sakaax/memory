import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, accessSync, constants } from "fs"
import { join } from "path"

const HOME = process.env.HOME ?? ""
const PROJECT_LOCAL = join(import.meta.dir, "../memory.json")

// ── MEMORY_HOME resolution ────────────────────────────────────────────────────
// Priority: MEMORY_HOME env > ~/.memory > project-local fallback

function resolveMemoryHome(): string {
  if (process.env.MEMORY_HOME) return process.env.MEMORY_HOME
  return join(HOME, ".memory")
}

export const MEMORY_HOME        = resolveMemoryHome()
export const HOOKS_DIR          = join(MEMORY_HOME, "hooks")
export const CURRENT_SCOPE_FILE = join(MEMORY_HOME, "current_scope")

// ── Scope helpers ─────────────────────────────────────────────────────────────

export function readCurrentScope(): string {
  // MEMORY_SCOPE env var has highest priority (used by project-specific connectors)
  const envScope = process.env.MEMORY_SCOPE?.trim()
  if (envScope) return envScope
  if (existsSync(CURRENT_SCOPE_FILE)) {
    const val = readFileSync(CURRENT_SCOPE_FILE, "utf-8").trim()
    if (val) return val
  }
  return "global"
}

export function writeCurrentScope(scope: string): void {
  writeFileSync(CURRENT_SCOPE_FILE, scope + "\n")
}

export function scopeDir(scope: string): string {
  if (scope === "global") return join(MEMORY_HOME, "global")
  return join(MEMORY_HOME, "projects", scope)
}

export function scopeFile(scope: string): string {
  return join(scopeDir(scope), "memory.json")
}

export function listScopes(): string[] {
  const scopes: string[] = []

  const globalDir = join(MEMORY_HOME, "global")
  if (existsSync(globalDir)) scopes.push("global")

  const projectsDir = join(MEMORY_HOME, "projects")
  if (existsSync(projectsDir)) {
    for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) scopes.push(entry.name)
    }
  }

  return scopes
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Auto-create MEMORY_HOME if missing
if (!existsSync(MEMORY_HOME)) {
  mkdirSync(MEMORY_HOME, { recursive: true })
}

// Auto-create global scope dir
const GLOBAL_DIR = join(MEMORY_HOME, "global")
if (!existsSync(GLOBAL_DIR)) {
  mkdirSync(GLOBAL_DIR, { recursive: true })
}

// Migrate ~/.memory/memory.json → ~/.memory/global/memory.json (v0.2 → v0.3)
const OLD_FLAT_FILE   = join(MEMORY_HOME, "memory.json")
const GLOBAL_FILE     = join(GLOBAL_DIR, "memory.json")
if (!existsSync(GLOBAL_FILE) && existsSync(OLD_FLAT_FILE)) {
  renameSync(OLD_FLAT_FILE, GLOBAL_FILE)
}

// Migrate project-local memory.json → global scope (first-run fallback)
if (!existsSync(GLOBAL_FILE) && existsSync(PROJECT_LOCAL)) {
  renameSync(PROJECT_LOCAL, GLOBAL_FILE)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryType =
  | "preference"
  | "knowledge"
  | "project"
  | "decision"
  | "skill"
  | "relationship"
  | "goal"
  | "constraint"

export const VALID_TYPES: MemoryType[] = [
  "preference",
  "knowledge",
  "project",
  "decision",
  "skill",
  "relationship",
  "goal",
  "constraint",
]

export interface Memory {
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

export interface MemoryStore {
  memories: Memory[]
}

// ── Store I/O ─────────────────────────────────────────────────────────────────

export function loadStore(scopeOverride?: string): MemoryStore {
  const file = scopeFile(scopeOverride ?? readCurrentScope())
  if (!existsSync(file)) return { memories: [] }
  return JSON.parse(readFileSync(file, "utf-8")) as MemoryStore
}

export function saveStore(store: MemoryStore, scopeOverride?: string): void {
  const scope = scopeOverride ?? readCurrentScope()
  const dir   = scopeDir(scope)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(scopeFile(scope), JSON.stringify(store, null, 2) + "\n")
}

// ── Diagnostics helpers ───────────────────────────────────────────────────────

export function isWritable(path: string): boolean {
  try {
    accessSync(path, constants.W_OK)
    return true
  } catch {
    return false
  }
}

export function detectScope(): "custom" | "global" | "local" {
  if (process.env.MEMORY_HOME) return "custom"
  if (MEMORY_HOME === join(HOME, ".memory")) return "global"
  return "local"
}
