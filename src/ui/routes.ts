import { join } from "path"
import { existsSync } from "fs"
import { loadStore, saveStore, VALID_TYPES, type MemoryType } from "../store"
import { runHook } from "../hooks"

const STATIC_DIR = join(import.meta.dir, "static")

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const { pathname } = url

  // ── API ──────────────────────────────────────────────────────────────────

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
