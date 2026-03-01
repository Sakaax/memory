import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join, extname, basename } from "path"
import type { MemoryType } from "../store"

export interface CodeInference {
  category:   string
  content:    string
  type:       MemoryType
  domain:     string
  confidence: number
  evidence:   string
}

// ── File walker ────────────────────────────────────────────────────────────

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", ".expo", "dist", "build",
  "out", ".turbo", "coverage", ".cache", "__pycache__", ".venv",
])

function walkFiles(dir: string, maxFiles = 2000): string[] {
  const files: string[] = []
  function recurse(d: string) {
    if (files.length >= maxFiles) return
    let entries: string[]
    try { entries = readdirSync(d) } catch { return }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue
      const full = join(d, entry)
      try {
        const stat = statSync(full)
        if (stat.isDirectory()) recurse(full)
        else files.push(full)
      } catch {}
    }
  }
  recurse(dir)
  return files
}

// ── Naming convention ──────────────────────────────────────────────────────

function detectNaming(files: string[]): CodeInference | null {
  const srcFiles = files.filter(f => /\.(ts|tsx|js|jsx)$/.test(f))
  if (srcFiles.length < 5) return null

  const names = srcFiles.map(f => basename(f, extname(f)))
  let kebab = 0, camel = 0, pascal = 0

  for (const name of names) {
    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) kebab++
    else if (/^[a-z][a-zA-Z0-9]+$/.test(name)) camel++
    else if (/^[A-Z][a-zA-Z0-9]+$/.test(name)) pascal++
  }

  const total = kebab + camel + pascal
  if (total < 5) return null

  const dominant = Math.max(kebab, camel, pascal)
  const ratio = dominant / total
  if (ratio < 0.55) return null

  const name = dominant === kebab ? "kebab-case" : dominant === camel ? "camelCase" : "PascalCase"
  return {
    category:   "naming",
    content:    `Uses ${name} for file naming`,
    type:       "preference",
    domain:     "development",
    confidence: Math.min(0.92, 0.55 + ratio * 0.4),
    evidence:   `${dominant}/${total} files use ${name}`,
  }
}

// ── Import analysis ────────────────────────────────────────────────────────

const IMPORT_RULES: Array<{ pattern: RegExp; content: string }> = [
  { pattern: /from ['"]react['"]/,                content: "Uses React"                      },
  { pattern: /from ['"]next\//,                   content: "Uses Next.js"                    },
  { pattern: /from ['"]@prisma\/client['"]/,      content: "Uses Prisma ORM"                 },
  { pattern: /from ['"]drizzle-orm/,              content: "Uses Drizzle ORM"                },
  { pattern: /from ['"]zod['"]/,                  content: "Uses Zod for validation"         },
  { pattern: /from ['"]@trpc\//,                  content: "Uses tRPC"                       },
  { pattern: /from ['"]stripe['"]/,               content: "Uses Stripe for payments"        },
  { pattern: /from ['"]resend['"]/,               content: "Uses Resend for email"           },
  { pattern: /from ['"]next-auth/,                content: "Uses NextAuth.js"                },
  { pattern: /from ['"]@auth\//,                  content: "Uses Auth.js"                    },
  { pattern: /from ['"]zustand['"]/,              content: "Uses Zustand for state"          },
  { pattern: /from ['"]jotai['"]/,                content: "Uses Jotai for state"            },
  { pattern: /from ['"]@tanstack\/react-query/,   content: "Uses TanStack Query"             },
  { pattern: /from ['"]framer-motion['"]/,        content: "Uses Framer Motion for animations"},
  { pattern: /from ['"]@upstash\//,               content: "Uses Upstash"                    },
  { pattern: /from ['"]posthog/,                  content: "Uses PostHog for analytics"      },
  { pattern: /from ['"]@sentry\//,                content: "Uses Sentry for monitoring"      },
]

function detectImports(files: string[]): CodeInference[] {
  const srcFiles = files.filter(f => /\.(ts|tsx|js|jsx)$/.test(f))
  const counts: Record<string, number> = {}
  const fileCount = Math.min(srcFiles.length, 500)

  for (let i = 0; i < fileCount; i++) {
    try {
      const src = readFileSync(srcFiles[i], "utf8")
      for (const rule of IMPORT_RULES) {
        if (rule.pattern.test(src)) {
          counts[rule.content] = (counts[rule.content] ?? 0) + 1
        }
      }
    } catch {}
  }

  return Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .map(([content, n]) => ({
      category:   "import",
      content,
      type:       "knowledge" as MemoryType,
      domain:     "development",
      confidence: Math.min(0.92, 0.6 + (n / fileCount) * 0.35),
      evidence:   `imported in ${n} files`,
    }))
}

// ── Code style patterns ────────────────────────────────────────────────────

function detectCodeStyle(files: string[]): CodeInference[] {
  const srcFiles = files.filter(f => /\.(ts|tsx|js|jsx)$/.test(f))
  const sample   = srcFiles.slice(0, 100)
  const inferences: CodeInference[] = []

  let asyncAwait = 0, thenChain = 0
  let arrowFn = 0, regularFn = 0
  let useClient = 0, noUseClient = 0
  let totalSrc = 0

  for (const f of sample) {
    let src: string
    try { src = readFileSync(f, "utf8") } catch { continue }
    totalSrc++

    // async/await vs .then()
    const awaitCount = (src.match(/\bawait\b/g) ?? []).length
    const thenCount  = (src.match(/\.then\(/g)  ?? []).length
    asyncAwait += awaitCount
    thenChain  += thenCount

    // Arrow vs regular functions
    arrowFn    += (src.match(/=>\s*[{(]/g) ?? []).length
    regularFn  += (src.match(/function\s+\w+/g) ?? []).length

    // Server vs Client components (Next.js)
    if (/"use client"/.test(src) || /'use client'/.test(src)) useClient++
    else if (/\.(tsx|jsx)$/.test(f)) noUseClient++
  }

  if (totalSrc < 5) return inferences

  // async/await preference
  if (asyncAwait + thenChain > 20) {
    const ratio = asyncAwait / (asyncAwait + thenChain)
    if (ratio > 0.8) {
      inferences.push({
        category:   "style",
        content:    "Uses async/await exclusively, not .then() chains",
        type:       "preference",
        domain:     "development",
        confidence: Math.min(0.9, 0.6 + ratio * 0.3),
        evidence:   `${asyncAwait} await vs ${thenChain} .then()`,
      })
    }
  }

  // Arrow functions preference
  if (arrowFn + regularFn > 20) {
    const ratio = arrowFn / (arrowFn + regularFn)
    if (ratio > 0.7) {
      inferences.push({
        category:   "style",
        content:    "Prefers arrow functions over regular function declarations",
        type:       "preference",
        domain:     "development",
        confidence: Math.min(0.88, 0.55 + ratio * 0.35),
        evidence:   `${arrowFn} arrow vs ${regularFn} function declarations`,
      })
    }
  }

  // Server Components default (Next.js)
  if (useClient + noUseClient > 5) {
    const serverRatio = noUseClient / (useClient + noUseClient)
    if (serverRatio > 0.6) {
      inferences.push({
        category:   "style",
        content:    "Uses Server Components by default, 'use client' only when needed",
        type:       "preference",
        domain:     "development",
        confidence: Math.min(0.88, 0.55 + serverRatio * 0.35),
        evidence:   `${noUseClient} server vs ${useClient} client components`,
      })
    }
  }

  return inferences
}

// ── TypeScript config ──────────────────────────────────────────────────────

function detectTsConfig(cwd: string): CodeInference[] {
  const inferences: CodeInference[] = []
  const tsconfigPath = join(cwd, "tsconfig.json")
  if (!existsSync(tsconfigPath)) return inferences

  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"))
    const opts = tsconfig.compilerOptions ?? {}

    if (opts.strict === true) {
      inferences.push({
        category:   "tsconfig",
        content:    "Uses TypeScript strict mode",
        type:       "preference",
        domain:     "development",
        confidence: 0.95,
        evidence:   "tsconfig.json: strict: true",
      })
    }

    if (opts.paths?.["@/*"]) {
      inferences.push({
        category:   "tsconfig",
        content:    "Uses @/* path alias for imports",
        type:       "preference",
        domain:     "development",
        confidence: 0.92,
        evidence:   'tsconfig.json: paths @/*',
      })
    }
  } catch {}

  return inferences
}

// ── Directory structure ────────────────────────────────────────────────────

function detectStructure(cwd: string): CodeInference[] {
  const inferences: CodeInference[] = []

  const checks: Array<[string, string]> = [
    ["src/app",        "Uses Next.js App Router structure (src/app)"],
    ["app",            "Uses Next.js App Router structure (app/)"],
    ["src/components", "Organises components in src/components/"],
    ["src/lib",        "Organises utilities in src/lib/"],
    ["src/hooks",      "Organises custom hooks in src/hooks/"],
    ["src/actions",    "Uses Server Actions in src/actions/"],
    ["src/schemas",    "Organises Zod schemas in src/schemas/"],
  ]

  for (const [path, content] of checks) {
    if (existsSync(join(cwd, path))) {
      inferences.push({
        category:   "structure",
        content,
        type:       "knowledge",
        domain:     "development",
        confidence: 0.88,
        evidence:   `${path}/ exists`,
      })
    }
  }

  return inferences
}

// ── Main entry ─────────────────────────────────────────────────────────────

export function analyzeCodebase(cwd: string): {
  inferences: CodeInference[]
  fileCount:  number
} {
  const files = walkFiles(cwd)

  const inferences: CodeInference[] = [
    ...detectTsConfig(cwd),
    ...detectStructure(cwd),
    ...detectImports(files),
    ...detectCodeStyle(files),
  ]

  const naming = detectNaming(files)
  if (naming) inferences.push(naming)

  // Dedup by content
  const seen = new Set<string>()
  return {
    fileCount: files.length,
    inferences: inferences.filter(inf => {
      if (seen.has(inf.content)) return false
      seen.add(inf.content)
      return true
    }),
  }
}
