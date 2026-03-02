import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { LearnType, LearnResult, Inference } from "../types"

interface Props {
  currentScope: string
  onChange: () => void
}

export function LearnPanel({ currentScope, onChange }: Props) {
  const [tab, setTab] = useState<LearnType>("git")
  const [cwd, setCwd] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LearnResult | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    setResult(null)
    setSaved(false)
    try {
      const r = await invoke<LearnResult>("run_learn_json", {
        learnType: tab,
        cwd: cwd || ".",
      })
      setResult(r)
      // Select all by default
      setSelected(new Set(r.inferences.map((_, i) => i)))
    } catch (e) {
      console.error(e)
      setResult({ type: tab, inferences: [] } as LearnResult)
    } finally {
      setLoading(false)
    }
  }

  const handleStore = async () => {
    if (!result) return
    const inferences = result.inferences.filter((_, i) => selected.has(i))
    await invoke("store_inferences", {
      input: {
        scope: currentScope,
        inferences,
        source: `${tab}-observer`,
      },
    })
    onChange()
    setSaved(true)
  }

  const toggleAll = () => {
    if (!result) return
    if (selected.size === result.inferences.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(result.inferences.map((_, i) => i)))
    }
  }

  return (
    <div className="learn-panel">
      <div className="learn-tabs">
        {(["git", "code", "shell"] as LearnType[]).map((t) => (
          <button
            key={t}
            className={`learn-tab ${tab === t ? "active" : ""}`}
            onClick={() => {
              setTab(t)
              setResult(null)
              setSaved(false)
            }}
          >
            {t === "git" && "⎇ git"}
            {t === "code" && "〈/〉 code"}
            {t === "shell" && "$ shell"}
          </button>
        ))}
      </div>

      <div className="learn-content">
        {/* CWD input (not needed for shell) */}
        {tab !== "shell" && (
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>
              {tab === "git" ? "Repository path" : "Project path"}
            </div>
            <div className="learn-cwd-row">
              <input
                className="learn-cwd-input"
                placeholder="/home/you/Dev/myproject"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
                {loading ? <span className="spinner" /> : "Analyze"}
              </button>
            </div>
          </div>
        )}

        {tab === "shell" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>
              Analyzes your shell history (~/.zsh_history or ~/.bash_history)
            </span>
            <button className="btn btn-primary" onClick={handleRun} disabled={loading} style={{ marginLeft: "auto" }}>
              {loading ? <span className="spinner" /> : "Analyze"}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                {result.inferences.length === 0
                  ? "No new inferences found"
                  : `${result.inferences.length} inference${result.inferences.length === 1 ? "" : "s"} found`}
                {result.type === "git" && result.repoName && (
                  <span style={{ marginLeft: 8, color: "var(--accent)" }}>{result.repoName}</span>
                )}
                {result.type === "code" && result.fileCount !== undefined && (
                  <span style={{ marginLeft: 8, color: "var(--text-3)" }}>{result.fileCount} files scanned</span>
                )}
              </div>
              {result.inferences.length > 0 && (
                <button className="btn" onClick={toggleAll}>
                  {selected.size === result.inferences.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {result.inferences.length > 0 && (
              <div className="learn-inference-list">
                {result.inferences.map((inf: Inference, i: number) => (
                  <label key={i} className="inference-item" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      className="inference-check"
                      checked={selected.has(i)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(i)
                        else next.delete(i)
                        setSelected(next)
                      }}
                    />
                    <span className="inference-content">{inf.content}</span>
                    <span className="inference-meta">
                      {inf.type} · {(inf.confidence * 100).toFixed(0)}%
                      {inf.evidence && ` · ${inf.evidence}`}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {result.inferences.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {saved ? (
                  <span style={{ color: "var(--accent)", fontSize: 13 }}>
                    ✓ Stored {selected.size} memor{selected.size === 1 ? "y" : "ies"}
                  </span>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleStore}
                    disabled={selected.size === 0}
                  >
                    Store {selected.size} selected
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!result && !loading && (
          <div className="learn-empty">
            <span style={{ fontSize: 20 }}>
              {tab === "git" && "⎇"}
              {tab === "code" && "〈/〉"}
              {tab === "shell" && "$"}
            </span>
            <span>
              {tab === "git" && "Infer stack and conventions from git history"}
              {tab === "code" && "Infer patterns from source files"}
              {tab === "shell" && "Infer tool preferences from shell history"}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

