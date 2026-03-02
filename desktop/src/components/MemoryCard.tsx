import { useState } from "react"
import type { Memory } from "../types"

interface Props {
  memory: Memory
  scopes: string[]
  onEdit: () => void
  onMove: (toScope: string) => void
}

export function MemoryCard({ memory: m, scopes, onEdit, onMove }: Props) {
  const [showMove, setShowMove] = useState(false)

  const confLevel = m.confidence >= 0.8 ? "high" : m.confidence >= 0.5 ? "mid" : "low"

  return (
    <>
      <div className="memory-card" onClick={onEdit}>
        <div>
          <div className="memory-card-content">{m.content}</div>
          <div className="memory-card-meta">
            <span className="badge badge-type">{m.type}</span>
            <span className="badge badge-domain">{m.domain}</span>
            <div className="conf-bar" title={`Confidence: ${(m.confidence * 100).toFixed(0)}%`}>
              <div
                className={`conf-bar-fill ${confLevel}`}
                style={{ width: `${m.confidence * 100}%` }}
              />
            </div>
            {m.source && (
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{m.source}</span>
            )}
          </div>
        </div>

        <div className="memory-card-actions" onClick={(e) => e.stopPropagation()}>
          {scopes.length > 0 && (
            <button
              className="icon-btn"
              title="Move to scope"
              onClick={() => setShowMove(true)}
            >
              ↗
            </button>
          )}
          <button className="icon-btn" title="Edit" onClick={onEdit}>
            ✎
          </button>
        </div>
      </div>

      {showMove && (
        <div className="modal-overlay" onClick={() => setShowMove(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Move to scope</div>
            <div className="move-scope-list">
              {scopes.map((s) => (
                <button
                  key={s}
                  className="move-scope-item"
                  onClick={() => {
                    onMove(s)
                    setShowMove(false)
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowMove(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
