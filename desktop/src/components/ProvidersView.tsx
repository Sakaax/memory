import { useState, useEffect, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"

interface Provider {
  label: string
  bin_name: string
  command: string
  installed: boolean
  path: string | null
}

const PROVIDER_ICONS: Record<string, string> = {
  "claude-memory":       "✦",
  "gemini-memory":       "◈",
  "codex-memory":        "⬡",
  "opencode-memory":     "⊕",
  "aider-memory":        "⟁",
  "sgpt-memory":         "◎",
  "goose-memory":        "◇",
  "groq-memory":         "⚡",
  "ollama-memory":       "◉",
  "cursor-agent-memory": "⌘",
  "droid-memory":        "◐",
}

export function ProvidersView() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const load = useCallback(async () => {
    const list = await invoke<Provider[]>("get_providers")
    setProviders(list)
  }, [])

  useEffect(() => { load() }, [load])

  const handleRemove = async (binName: string) => {
    setRemoving(binName)
    try {
      await invoke("remove_provider", { binName })
      await load()
    } finally {
      setRemoving(null)
      setConfirmRemove(null)
    }
  }

  const connected = providers.filter((p) => p.installed)
  const available = providers.filter((p) => !p.installed)

  return (
    <div className="providers-view">
      {/* Connected */}
      <div className="providers-section">
        <div className="providers-section-header">
          <span className="providers-section-title">Connectés</span>
          <span className="providers-count">{connected.length}</span>
        </div>

        {connected.length === 0 ? (
          <div className="providers-empty">
            Aucun provider connecté.{" "}
            Lance <code>memory setup</code> dans le terminal.
          </div>
        ) : (
          <div className="providers-grid">
            {connected.map((p) => (
              <div key={p.bin_name} className="provider-card provider-card--connected">
                <div className="provider-card-icon">{PROVIDER_ICONS[p.bin_name] ?? "◆"}</div>
                <div className="provider-card-info">
                  <div className="provider-card-label">{p.label}</div>
                  <code className="provider-card-cmd">{p.command}</code>
                  {p.path && (
                    <div className="provider-card-path">{p.path}</div>
                  )}
                </div>
                <div className="provider-card-actions">
                  {confirmRemove === p.bin_name ? (
                    <div className="provider-confirm">
                      <span className="provider-confirm-text">Déconnecter ?</span>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        disabled={removing === p.bin_name}
                        onClick={() => handleRemove(p.bin_name)}
                      >
                        {removing === p.bin_name ? <span className="spinner" style={{ width: 10, height: 10 }} /> : "Oui"}
                      </button>
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={() => setConfirmRemove(null)}
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: 11 }}
                      onClick={() => setConfirmRemove(p.bin_name)}
                    >
                      Déconnecter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Not installed */}
      {available.length > 0 && (
        <div className="providers-section">
          <div className="providers-section-header">
            <span className="providers-section-title" style={{ color: "var(--text-3)" }}>
              Disponibles
            </span>
            <span className="providers-count" style={{ background: "var(--surface3)" }}>
              {available.length}
            </span>
          </div>
          <div className="providers-grid">
            {available.map((p) => (
              <div key={p.bin_name} className="provider-card provider-card--available">
                <div className="provider-card-icon" style={{ color: "var(--text-3)" }}>
                  {PROVIDER_ICONS[p.bin_name] ?? "◆"}
                </div>
                <div className="provider-card-info">
                  <div className="provider-card-label" style={{ color: "var(--text-2)" }}>
                    {p.label}
                  </div>
                  <code className="provider-card-cmd" style={{ color: "var(--text-3)" }}>
                    {p.command}
                  </code>
                </div>
              </div>
            ))}
          </div>
          <div className="providers-install-hint">
            Pour connecter un provider : <code>memory setup</code> dans le terminal
          </div>
        </div>
      )}
    </div>
  )
}
