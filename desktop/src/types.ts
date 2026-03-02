export interface Memory {
  id: string
  type: string
  content: string
  domain: string
  confidence: number
  importance: number
  source?: string
  created_at: string
  updated_at: string
  scope?: string
}

export interface AddMemoryInput {
  scope: string
  type: string
  content: string
  domain: string
  confidence: number
  importance: number
}

export interface UpdateMemoryInput {
  scope: string
  id: string
  content?: string
  type?: string
  domain?: string
  confidence?: number
  importance?: number
}

export interface Inference {
  content: string
  type: string
  domain: string
  confidence: number
  evidence?: string
  count?: number
}

export interface LearnResult {
  type: "git" | "code" | "shell"
  cwd?: string
  repoName?: string
  commits?: number
  fileCount?: number
  commandCount?: number
  inferences: Inference[]
}

export type LearnType = "git" | "code" | "shell"
