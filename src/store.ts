import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

export const MEMORY_FILE = join(import.meta.dir, "../memory.json")

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

export function loadStore(): MemoryStore {
  if (!existsSync(MEMORY_FILE)) return { memories: [] }
  return JSON.parse(readFileSync(MEMORY_FILE, "utf-8")) as MemoryStore
}

export function saveStore(store: MemoryStore): void {
  writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2) + "\n")
}
