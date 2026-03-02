import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { Memory } from "../types"
import { MemoryCard } from "./MemoryCard"
import { MemoryEditModal, type MemoryFormData } from "./MemoryEditModal"

const TYPES = ["preference", "knowledge", "project", "decision", "skill", "relationship", "goal", "constraint"]

interface Props {
  memories: Memory[]
  currentScope: string
  scopes: string[]
  onChange: () => void
}

export function MemoryList({ memories, currentScope, scopes, onChange }: Props) {
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterDomain, setFilterDomain] = useState("all")
  const [editing, setEditing] = useState<Memory | null>(null)
  const [creating, setCreating] = useState(false)

  const domains = Array.from(new Set(memories.map((m) => m.domain))).sort()

  const filtered = memories.filter((m) => {
    const matchesSearch =
      !search ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.domain.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === "all" || m.type === filterType
    const matchesDomain = filterDomain === "all" || m.domain === filterDomain
    return matchesSearch && matchesType && matchesDomain
  })

  // Sort by confidence × importance desc
  const sorted = [...filtered].sort(
    (a, b) => b.confidence * (0.5 + b.importance) - a.confidence * (0.5 + a.importance)
  )

  const handleDelete = async (id: string) => {
    await invoke("delete_memory", { scope: currentScope, id })
    onChange()
  }

  const handleMove = async (id: string, toScope: string) => {
    await invoke("move_memory", { fromScope: currentScope, toScope, id })
    onChange()
  }

  const handleSave = async (data: MemoryFormData) => {
    if (data.id) {
      await invoke("update_memory", { input: { scope: currentScope, ...data } })
    } else {
      await invoke("add_memory", { input: { scope: currentScope, ...data } })
    }
    setEditing(null)
    setCreating(false)
    onChange()
  }

  return (
    <>
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search memories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
        >
          <option value="all">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New
        </button>
      </div>

      <div className="memory-list">
        {sorted.length === 0 ? (
          <div className="memory-list-empty">
            {search || filterType !== "all" || filterDomain !== "all" ? (
              <span>No memories match your filters</span>
            ) : (
              <>
                <span>No memories in <strong>{currentScope}</strong> yet</span>
                <button className="btn btn-primary" onClick={() => setCreating(true)}>
                  Add first memory
                </button>
              </>
            )}
          </div>
        ) : (
          sorted.map((m) => (
            <MemoryCard
              key={m.id}
              memory={m}
              scopes={scopes.filter((s) => s !== currentScope)}
              onEdit={() => setEditing(m)}
              onMove={(toScope) => handleMove(m.id, toScope)}
            />
          ))
        )}
      </div>

      {(editing || creating) && (
        <MemoryEditModal
          memory={editing ?? undefined}
          onSave={handleSave}
          onDelete={editing ? () => { handleDelete(editing.id); setEditing(null) } : undefined}
          onClose={() => { setEditing(null); setCreating(false) }}
        />
      )}
    </>
  )
}
