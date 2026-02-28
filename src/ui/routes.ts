import { join } from "path"
import { existsSync, rmSync } from "fs"
import {
  loadStore, saveStore, VALID_TYPES,
  listScopes, readCurrentScope, writeCurrentScope, scopeDir,
  type MemoryType,
} from "../store"
import { runHook } from "../hooks"

const STATIC_DIR = join(import.meta.dir, "static")

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const { pathname } = url

  // ── API ──────────────────────────────────────────────────────────────────

  // GET /api/scopes
  if (pathname === "/api/scopes" && req.method === "GET") {
    return Response.json({ scopes: listScopes(), active: readCurrentScope() })
  }

  // DELETE /api/scopes/:name
  if (pathname.match(/^\/api\/scopes\/[^/]+$/) && req.method === "DELETE") {
    const name = decodeURIComponent(pathname.split("/")[3])
    if (name === "global") {
      return Response.json({ error: "cannot delete the global scope" }, { status: 400 })
    }
    if (name === readCurrentScope()) {
      return Response.json({ error: "cannot delete the active scope — switch to another first" }, { status: 400 })
    }
    const dir = scopeDir(name)
    if (!existsSync(dir)) {
      return Response.json({ error: "scope not found" }, { status: 404 })
    }
    rmSync(dir, { recursive: true, force: true })
    return Response.json({ ok: true })
  }

  // POST /api/scope  { scope: string }
  if (pathname === "/api/scope" && req.method === "POST") {
    const body = (await req.json()) as { scope?: string }
    if (!body.scope?.trim()) return Response.json({ error: "scope required" }, { status: 400 })
    if (!existsSync(scopeDir(body.scope))) {
      return Response.json({ error: `scope "${body.scope}" not found` }, { status: 404 })
    }
    writeCurrentScope(body.scope)
    const store = loadStore()
    return Response.json({ scope: body.scope, count: store.memories.length })
  }

  // GET /api/memories[?q=query]
  if (pathname === "/api/memories" && req.method === "GET") {
    const store = loadStore()
    const q = url.searchParams.get("q")?.toLowerCase()

    let memories = store.memories
    if (q) {
      memories = memories.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.domain.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q)
      )
    }

    memories = memories.sort(
      (a, b) => b.importance - a.importance || b.confidence - a.confidence
    )

    return Response.json(memories)
  }

  // POST /api/memories/:id/move  { targetScope: string }
  if (pathname.match(/^\/api\/memories\/[^/]+\/move$/) && req.method === "POST") {
    const id = pathname.split("/")[3]
    const body = (await req.json()) as { targetScope?: string }

    if (!body.targetScope?.trim()) {
      return Response.json({ error: "targetScope required" }, { status: 400 })
    }
    if (!existsSync(scopeDir(body.targetScope))) {
      return Response.json({ error: `scope "${body.targetScope}" not found` }, { status: 404 })
    }

    const srcStore = loadStore()
    const memory   = srcStore.memories.find((m) => m.id === id)
    if (!memory) return Response.json({ error: "not found" }, { status: 404 })

    // Remove from source scope
    srcStore.memories = srcStore.memories.filter((m) => m.id !== id)
    saveStore(srcStore)
    runHook("on-memory-deleted", memory)

    // Add to target scope
    const dstStore = loadStore(body.targetScope)
    dstStore.memories.push(memory)
    saveStore(dstStore, body.targetScope)
    runHook("on-memory-added", memory)

    return Response.json({ ok: true, scope: body.targetScope })
  }

  // DELETE /api/memories/:id
  if (pathname.startsWith("/api/memories/") && req.method === "DELETE") {
    const id = pathname.split("/").pop()!
    const store = loadStore()
    const target = store.memories.find((m) => m.id === id)
    store.memories = store.memories.filter((m) => m.id !== id)

    if (!target) {
      return Response.json({ error: "not found" }, { status: 404 })
    }

    saveStore(store)
    runHook("on-memory-deleted", target)
    return Response.json({ ok: true })
  }

  // PUT /api/memories/:id
  if (pathname.startsWith("/api/memories/") && req.method === "PUT") {
    const id = pathname.split("/").pop()!
    const store = loadStore()
    const memory = store.memories.find((m) => m.id === id)

    if (!memory) {
      return Response.json({ error: "not found" }, { status: 404 })
    }

    const body = (await req.json()) as Partial<{
      content: string
      type: MemoryType
      domain: string
      importance: number
    }>

    if (body.content?.trim()) memory.content = body.content.trim()
    if (body.domain?.trim()) memory.domain = body.domain.trim()
    if (body.type && VALID_TYPES.includes(body.type)) memory.type = body.type
    if (body.importance !== undefined) {
      memory.importance = Math.min(1, Math.max(0, body.importance))
    }
    memory.updated_at = new Date().toISOString()

    saveStore(store)
    runHook("on-memory-updated", memory)
    return Response.json(memory)
  }

  // ── Static files ─────────────────────────────────────────────────────────

  if (pathname === "/" || pathname === "/index.html") {
    return new Response(Bun.file(join(STATIC_DIR, "index.html")), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const filePath = join(STATIC_DIR, pathname)
  if (existsSync(filePath)) {
    return new Response(Bun.file(filePath))
  }

  return new Response("Not Found", { status: 404 })
}
