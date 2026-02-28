import { join } from "path"
import { existsSync, rmSync } from "fs"
import {
  loadStore, saveStore, VALID_TYPES,
  listScopes, readCurrentScope, writeCurrentScope, scopeDir,
  type MemoryType,
} from "../store"
import { runHook } from "../hooks"

const STATIC_DIR = join(import.meta.dir, "static")

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function handleRequest(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  const res = await _handleRequest(req)
  // Attach CORS headers to every response
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

async function _handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const { pathname } = url

  // ── API ──────────────────────────────────────────────────────────────────

  // GET /api/context[?scope=name]  — plain text context for browser extension injection
  if (pathname === "/api/context" && req.method === "GET") {
    const scopeParam = url.searchParams.get("scope") ?? undefined
    const store = loadStore(scopeParam)
    const scope = scopeParam ?? readCurrentScope()
    const lines: string[] = [
      "This is the user's persistent memory context. Use it silently as background knowledge.\n",
    ]

    if (store.memories.length > 0) {
      const sorted  = [...store.memories].sort((a, b) => b.importance - a.importance || b.confidence - a.confidence)
      const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, m) => {
        acc[m.domain] = [...(acc[m.domain] ?? []), m]
        return acc
      }, {})
      for (const [domain, mems] of Object.entries(grouped)) {
        lines.push(`[${domain.toUpperCase()}]`)
        for (const m of mems) lines.push(`- (${m.type}) ${m.content}`)
        lines.push("")
      }
    } else {
      lines.push("(no memories stored yet)")
    }

    lines.push(`scope: ${scope}`)
    return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  // GET /api/scopes
  if (pathname === "/api/scopes" && req.method === "GET") {
    const active = readCurrentScope()
    const scopes = listScopes().map(name => ({
      name,
      count: loadStore(name).memories.length,
    }))
    return Response.json({ scopes, active })
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
