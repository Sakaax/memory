import { useState } from "react"

type View = "memories" | "learn"

interface Props {
  scopes: string[]
  currentScope: string
  view: View
  onScopeChange: (scope: string) => void
  onScopeCreate: (name: string) => void
  onScopeDelete: (name: string) => void
  onViewChange: (view: View) => void
}

export function Sidebar({
  scopes,
  currentScope,
  view,
  onScopeChange,
  onScopeCreate,
  onScopeDelete,
  onViewChange,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim().toLowerCase().replace(/\s+/g, "-")
    if (!name) return
    onScopeCreate(name)
    setNewName("")
    setCreating(false)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">Scopes</div>

      {scopes.map((scope) => (
        <div key={scope} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button
            className={`sidebar-item ${currentScope === scope && view === "memories" ? "active" : ""}`}
            onClick={() => {
              onScopeChange(scope)
              onViewChange("memories")
            }}
            style={{ flex: 1 }}
          >
            <span className="dot" />
            {scope}
          </button>
          {scope !== "global" && (
            <button
              className="icon-btn danger"
              title="Delete scope"
              style={{ position: "absolute", right: 4, opacity: 0, transition: "opacity 0.1s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0")}
              onClick={(e) => {
                e.stopPropagation()
                onScopeDelete(scope)
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {creating ? (
        <form onSubmit={handleCreate} style={{ padding: "4px 8px" }}>
          <input
            autoFocus
            className="search-input"
            placeholder="scope name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => { if (!newName.trim()) setCreating(false) }}
            onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
          />
        </form>
      ) : (
        <button className="sidebar-add-scope" onClick={() => setCreating(true)}>
          + new scope
        </button>
      )}

      <div className="sidebar-divider" />

      <div className="sidebar-section-label">Tools</div>

      <button
        className={`sidebar-nav-item ${view === "learn" ? "active" : ""}`}
        onClick={() => onViewChange("learn")}
      >
        <span style={{ fontSize: 14 }}>⚡</span>
        Learn
      </button>
    </aside>
  )
}
