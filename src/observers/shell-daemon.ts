import { watch, existsSync } from "fs"
import { loadStore, saveStore } from "../store"
import { runHook } from "../hooks"
import {
  SHELL_HISTORY_FILE,
  getNewCommands,
  inferFromCommands,
  writeCursor,
  readCursor,
} from "./shell"
import { statSync } from "fs"
import type { Memory } from "../store"

const POLL_INTERVAL_MS = 30_000   // check every 30s
const MIN_NEW_COMMANDS = 10       // only run inference after 10+ new commands

let pendingCommands: string[] = []

function processNewCommands(): void {
  const cmds = getNewCommands()
  if (cmds.length === 0) return

  pendingCommands.push(...cmds)

  if (pendingCommands.length < MIN_NEW_COMMANDS) return

  const inferences = inferFromCommands(pendingCommands)
  pendingCommands  = []

  if (inferences.length === 0) return

  const store    = loadStore()
  const existing = store.memories.map(m => m.content.toLowerCase())
  let added = 0

  for (const inf of inferences) {
    const alreadyExists = existing.some(e =>
      e.includes(inf.content.toLowerCase().slice(0, 40))
    )
    if (alreadyExists) {
      // Bump confidence on existing memory
      const mem = store.memories.find(m =>
        m.content.toLowerCase().includes(inf.content.toLowerCase().slice(0, 40))
      )
      if (mem) {
        mem.confidence = Math.min(0.95, mem.confidence + 0.05)
        mem.updated_at = new Date().toISOString()
      }
      continue
    }

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
    existing.push(mem.content.toLowerCase())
    runHook("on-memory-added", mem)
    added++
  }

  saveStore(store)

  // Regenerate shell hooks if installed
  try {
    const { writeShellHooks, HOOKS_SH } = await import("./shell-hooks")
    const { existsSync } = await import("fs")
    if (existsSync(HOOKS_SH)) writeShellHooks(loadStore().memories)
  } catch {}
}

export function watchShellInBackground(): void {
  if (!existsSync(SHELL_HISTORY_FILE)) return

  // Init cursor to current file size (don't re-analyze full history)
  if (readCursor() === 0) {
    const size = statSync(SHELL_HISTORY_FILE).size
    writeCursor(size)
  }

  // Watch for file changes
  watch(SHELL_HISTORY_FILE, () => {
    processNewCommands()
  })

  // Fallback polling (some systems don't trigger fs.watch on append)
  setInterval(processNewCommands, POLL_INTERVAL_MS)
}
