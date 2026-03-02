import { useState } from "react"
import type { Memory } from "../types"

const TYPES = ["preference", "knowledge", "project", "decision", "skill", "relationship", "goal", "constraint"]

export interface MemoryFormData {
  id?: string
  content: string
  type: string
  domain: string
  confidence: number
  importance: number
}

interface Props {
  memory?: Memory
  onSave: (data: MemoryFormData) => void
  onClose: () => void
}

export function MemoryEditModal({ memory, onSave, onClose }: Props) {
  const [content, setContent] = useState(memory?.content ?? "")
  const [type, setType] = useState(memory?.type ?? "preference")
  const [domain, setDomain] = useState(memory?.domain ?? "general")
  const [confidence, setConfidence] = useState(memory?.confidence ?? 0.7)
  const [importance, setImportance] = useState(memory?.importance ?? 0.5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    onSave({ id: memory?.id, content, type, domain, confidence, importance })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{memory ? "Edit memory" : "New memory"}</div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-field">
            <label className="form-label">Content</label>
            <textarea
              autoFocus
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What should be remembered?"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-field">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Domain</label>
              <input
                className="form-input"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. development"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Confidence</label>
            <div className="slider-row">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
              />
              <span className="slider-val">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Importance</label>
            <div className="slider-row">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={importance}
                onChange={(e) => setImportance(parseFloat(e.target.value))}
              />
              <span className="slider-val">{(importance * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {memory ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
