import { useState, useEffect, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Sidebar } from "./components/Sidebar"
import { MemoryList } from "./components/MemoryList"
import { LearnPanel } from "./components/LearnPanel"
import { ContextView } from "./components/ContextView"
import { ProvidersView } from "./components/ProvidersView"
import type { Memory } from "./types"

type View = "memories" | "learn" | "context" | "providers"

export default function App() {
  const [scopes, setScopes] = useState<string[]>(["global"])
  const [currentScope, setCurrentScopeState] = useState("global")
  const [memories, setMemories] = useState<Memory[]>([])
  const [view, setView] = useState<View>("memories")

  const loadScopes = useCallback(async () => {
    const s = await invoke<string[]>("get_scopes")
    setScopes(s)
  }, [])

  const loadCurrentScope = useCallback(async () => {
    const s = await invoke<string>("get_current_scope")
    setCurrentScopeState(s)
  }, [])

  const loadMemories = useCallback(async (scope: string) => {
    const m = await invoke<Memory[]>("get_memories", { scope })
    setMemories(m)
  }, [])

  useEffect(() => {
    loadScopes()
    loadCurrentScope()
  }, [loadScopes, loadCurrentScope])

  useEffect(() => {
    loadMemories(currentScope)
  }, [currentScope, loadMemories])

  // Re-fetch on window focus
  useEffect(() => {
    const handler = () => {
      loadScopes()
      loadMemories(currentScope)
    }
    window.addEventListener("focus", handler)
    return () => window.removeEventListener("focus", handler)
  }, [currentScope, loadScopes, loadMemories])

  const handleScopeChange = async (scope: string) => {
    await invoke("set_current_scope", { scope })
    setCurrentScopeState(scope)
  }

  const handleScopeCreate = async (name: string) => {
    await invoke("create_scope", { name })
    await loadScopes()
  }

  const handleScopeDelete = async (name: string) => {
    if (!confirm(`Delete scope "${name}" and all its memories?`)) return
    await invoke("delete_scope", { name })
    await loadScopes()
    if (currentScope === name) {
      await invoke("set_current_scope", { scope: "global" })
      setCurrentScopeState("global")
    }
  }

  const handleMemoryChange = () => loadMemories(currentScope)

  return (
    <div className="layout">
      {/* Titlebar */}
      <div className="titlebar">
        <span className="titlebar-logo">memory</span>
        <span className="titlebar-scope">{currentScope}</span>
        <span className="titlebar-spacer" />
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          {memories.length} memor{memories.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {/* Sidebar */}
      <Sidebar
        scopes={scopes}
        currentScope={currentScope}
        view={view}
        onScopeChange={handleScopeChange}
        onScopeCreate={handleScopeCreate}
        onScopeDelete={handleScopeDelete}
        onViewChange={setView}
      />

      {/* Main */}
      <main className="main">
        {view === "memories" && (
          <MemoryList
            memories={memories}
            currentScope={currentScope}
            scopes={scopes}
            onChange={handleMemoryChange}
          />
        )}
        {view === "learn" && (
          <LearnPanel
            currentScope={currentScope}
            onChange={handleMemoryChange}
          />
        )}
        {view === "context" && (
          <ContextView currentScope={currentScope} />
        )}
        {view === "providers" && (
          <ProvidersView />
        )}
      </main>
    </div>
  )
}
