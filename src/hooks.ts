import { existsSync } from "fs"
import { join } from "path"
import { HOOKS_DIR, readCurrentScope, type Memory } from "./store"

// ── Types ─────────────────────────────────────────────────────────────────────

export type HookEvent =
  | "on-memory-added"
  | "on-memory-updated"
  | "on-memory-deleted"

export interface HookPayload {
  memory:    Memory
  scope:     string
  timestamp: string
}

// ── Resolution ────────────────────────────────────────────────────────────────

// Supported extensions in priority order
const EXTENSIONS = [".ts", ".js", ".sh", ""]

function findHook(event: HookEvent): string | null {
  for (const ext of EXTENSIONS) {
    const path = join(HOOKS_DIR, `${event}${ext}`)
    if (existsSync(path)) return path
  }
  return null
}

function buildCmd(hookPath: string): string[] {
  if (hookPath.endsWith(".ts") || hookPath.endsWith(".js")) {
    // Use the current Bun executable — no PATH dependency
    return [process.execPath, "run", hookPath]
  }
  if (hookPath.endsWith(".sh")) {
    return ["bash", hookPath]
  }
  // Assume executable with shebang
  return [hookPath]
}

// ── Runner ────────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget hook execution.
 * - Never throws
 * - Never blocks the calling operation
 * - Passes JSON payload via stdin
 * - Logs errors only
 */
export function runHook(event: HookEvent, memory: Memory): void {
  const hookPath = findHook(event)
  if (!hookPath) return

  const payload: HookPayload = {
    memory,
    scope:     readCurrentScope(),
    timestamp: new Date().toISOString(),
  }

  const payloadJson = JSON.stringify(payload, null, 2)

  try {
    Bun.spawn(buildCmd(hookPath), {
      stdin:  Buffer.from(payloadJson),
      stdout: "ignore",
      stderr: "ignore",
    })
    // Intentionally not awaited — fire and forget
  } catch (err) {
    // Log only — never surface to the user
    console.error(`[memory] hook ${event} failed to start:`, err)
  }
}
