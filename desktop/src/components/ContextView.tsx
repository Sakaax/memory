import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"

interface Props {
  currentScope: string
}

export function ContextView({ currentScope }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [cwd, setCwd] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<string | null>("get_context_file").then(setContent).catch(() => setContent(null))
  }, [])

  const handleRegenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoke<string>("regenerate_context", { cwd: cwd || "." })
      setContent(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  // Render markdown-ish content with section highlighting
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## "))
        return <div key={i} className="ctx-heading2">{line.slice(3)}</div>
      if (line.startsWith("# "))
        return <div key={i} className="ctx-heading1">{line.slice(2)}</div>
      if (line.startsWith("- "))
        return <div key={i} className="ctx-item"><span className="ctx-bullet">·</span>{line.slice(2)}</div>
      if (line.startsWith("_") && line.endsWith("_"))
        return <div key={i} className="ctx-meta">{line.slice(1, -1)}</div>
      if (line.startsWith("`") || line.includes("`memory "))
        return <div key={i} className="ctx-code">{line}</div>
      if (line.trim() === "")
        return <div key={i} style={{ height: 6 }} />
      return <div key={i} className="ctx-line">{line}</div>
    })
  }

  return (
    <div className="context-view">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Project path (e.g. ~/Dev/myapp)"
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegenerate()}
          style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
        />
        <button className="btn btn-primary" onClick={handleRegenerate} disabled={loading}>
          {loading ? <span className="spinner" /> : "↻ Régénérer"}
        </button>
      </div>

      <div className="context-body">
        {error && (
          <div className="ctx-error">{error}</div>
        )}

        {content === null && !error ? (
          <div className="learn-empty">
            <span style={{ fontSize: 20 }}>📄</span>
            <span>Aucun fichier context.md trouvé</span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              Lance <code>memory context --write</code> ou régénère ci-dessus
            </span>
          </div>
        ) : content ? (
          <div className="ctx-content">
            <div className="ctx-scope-bar">
              <span className="ctx-scope-label">Scope : {currentScope}</span>
              <span className="ctx-path">~/.memory/context.md</span>
            </div>
            {renderContent(content)}
          </div>
        ) : null}
      </div>
    </div>
  )
}
