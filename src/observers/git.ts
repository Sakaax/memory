import { join } from "path"
import type { MemoryType } from "../store"

export interface GitInference {
  category:   string
  content:    string
  type:       MemoryType
  domain:     string
  confidence: number
  evidence:   string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function run(cmd: string, cwd: string): string {
  try {
    const proc = Bun.spawnSync(cmd.split(" "), { cwd, stdio: ["ignore", "pipe", "ignore"] })
    return proc.stdout ? new TextDecoder().decode(proc.stdout).trim() : ""
  } catch { return "" }
}

function runArgs(args: string[], cwd: string): string {
  try {
    const proc = Bun.spawnSync(args, { cwd, stdio: ["ignore", "pipe", "ignore"] })
    return proc.stdout ? new TextDecoder().decode(proc.stdout).trim() : ""
  } catch { return "" }
}

// ── Commit convention inference ────────────────────────────────────────────

const CONVENTIONAL_RE = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+?\))?!?:\s/

function inferCommitConvention(messages: string[]): GitInference | null {
  const total       = messages.length
  if (total < 3) return null
  const conventional = messages.filter(m => CONVENTIONAL_RE.test(m)).length
  const ratio        = conventional / total
  if (ratio < 0.6) return null

  const confidence = Math.min(0.95, 0.55 + ratio * 0.4)

  // Detect most used scopes
  const scopes: Record<string, number> = {}
  for (const m of messages) {
    const match = m.match(/^\w+\((.+?)\):/)
    if (match) scopes[match[1]] = (scopes[match[1]] ?? 0) + 1
  }
  const topScopes = Object.entries(scopes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([s]) => s)

  const scopeHint = topScopes.length
    ? ` (common scopes: ${topScopes.join(", ")})`
    : ""

  return {
    category:   "commitConvention",
    content:    `Uses Conventional Commits format${scopeHint}`,
    type:       "preference",
    domain:     "development",
    confidence,
    evidence:   `${conventional}/${total} commits follow the convention`,
  }
}

// ── Language / stack inference ─────────────────────────────────────────────

interface LangRule {
  ext:      string[]
  name:     string
  content:  string
  domain:   string
}

const LANG_RULES: LangRule[] = [
  { ext: ["ts", "tsx"],     name: "TypeScript", content: "Uses TypeScript",                      domain: "development" },
  { ext: ["js", "jsx"],     name: "JavaScript", content: "Uses JavaScript",                      domain: "development" },
  { ext: ["py"],            name: "Python",     content: "Uses Python",                           domain: "development" },
  { ext: ["go"],            name: "Go",         content: "Uses Go",                               domain: "development" },
  { ext: ["rs"],            name: "Rust",       content: "Uses Rust",                             domain: "development" },
  { ext: ["sh", "bash"],    name: "Shell",      content: "Writes shell scripts",                  domain: "development" },
]

const FRAMEWORK_FILES: Array<{ file: string; content: string; domain: string }> = [
  { file: "next.config.ts",    content: "Uses Next.js",                      domain: "development" },
  { file: "next.config.js",    content: "Uses Next.js",                      domain: "development" },
  { file: "package.json",      content: "",                                   domain: "development" }, // parsed separately
  { file: "prisma/schema.prisma", content: "Uses Prisma ORM",                domain: "development" },
  { file: "drizzle.config.ts", content: "Uses Drizzle ORM",                  domain: "development" },
  { file: "expo-env.d.ts",     content: "Uses Expo / React Native",          domain: "development" },
  { file: "tauri.conf.json",   content: "Uses Tauri",                        domain: "development" },
  { file: "docker-compose.yml", content: "Uses Docker Compose",              domain: "development" },
  { file: "Dockerfile",        content: "Uses Docker",                       domain: "development" },
  { file: ".prettierrc",       content: "Uses Prettier for code formatting",  domain: "development" },
  { file: ".eslintrc",         content: "Uses ESLint",                       domain: "development" },
  { file: "eslint.config",     content: "Uses ESLint",                       domain: "development" },
  { file: "biome.json",        content: "Uses Biome for formatting/linting", domain: "development" },
  { file: "vitest.config",     content: "Uses Vitest for testing",           domain: "development" },
  { file: "jest.config",       content: "Uses Jest for testing",             domain: "development" },
]

function inferStack(cwd: string): GitInference[] {
  const inferences: GitInference[] = []

  // Check config files
  for (const rule of FRAMEWORK_FILES) {
    if (rule.content === "") continue
    const exists = Bun.spawnSync(["test", "-e", rule.file], { cwd }).exitCode === 0
    if (exists) {
      inferences.push({
        category:   "framework",
        content:    rule.content,
        type:       "knowledge",
        domain:     rule.domain,
        confidence: 0.9,
        evidence:   `${rule.file} found`,
      })
    }
  }

  // Parse package.json for stack details
  try {
    const pkgPath = join(cwd, "package.json")
    const pkg = JSON.parse(Bun.file(pkgPath).toString())
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }

    const depMap: Array<[string, string, string]> = [
      ["next",             "Uses Next.js",            "development"],
      ["react-native",     "Uses React Native",       "development"],
      ["expo",             "Uses Expo",               "development"],
      ["@prisma/client",   "Uses Prisma ORM",         "development"],
      ["drizzle-orm",      "Uses Drizzle ORM",        "development"],
      ["zod",              "Uses Zod for validation", "development"],
      ["stripe",           "Uses Stripe for payments","development"],
      ["@auth/core",       "Uses Auth.js",            "development"],
      ["next-auth",        "Uses NextAuth.js",        "development"],
      ["tailwindcss",      "Uses Tailwind CSS",       "development"],
      ["@upstash/redis",   "Uses Upstash Redis",      "development"],
      ["resend",           "Uses Resend for email",   "development"],
    ]

    for (const [dep, content, domain] of depMap) {
      if (allDeps[dep]) {
        inferences.push({
          category:   "dependency",
          content,
          type:       "knowledge",
          domain,
          confidence: 0.9,
          evidence:   `${dep} in package.json`,
        })
      }
    }

    // Detect package manager from lockfile
    const hasBunLock   = Bun.spawnSync(["test", "-e", "bun.lock"],          { cwd }).exitCode === 0
    const hasBunLockb  = Bun.spawnSync(["test", "-e", "bun.lockb"],         { cwd }).exitCode === 0
    const hasPnpmLock  = Bun.spawnSync(["test", "-e", "pnpm-lock.yaml"],    { cwd }).exitCode === 0
    const hasYarnLock  = Bun.spawnSync(["test", "-e", "yarn.lock"],         { cwd }).exitCode === 0

    if (hasBunLock || hasBunLockb) {
      inferences.push({
        category: "packageManager",
        content:  "Uses Bun as package manager for this project",
        type:     "knowledge",
        domain:   "development",
        confidence: 0.92,
        evidence: "bun.lock(b) found",
      })
    } else if (hasPnpmLock) {
      inferences.push({
        category: "packageManager",
        content:  "Uses pnpm as package manager for this project",
        type:     "knowledge",
        domain:   "development",
        confidence: 0.92,
        evidence: "pnpm-lock.yaml found",
      })
    } else if (hasYarnLock) {
      inferences.push({
        category: "packageManager",
        content:  "Uses Yarn as package manager for this project",
        type:     "knowledge",
        domain:   "development",
        confidence: 0.92,
        evidence: "yarn.lock found",
      })
    }
  } catch {}

  return inferences
}

// ── File extension stats ───────────────────────────────────────────────────

function inferLanguages(cwd: string): GitInference[] {
  const raw = runArgs(
    ["git", "log", "--name-only", "--format=", "--diff-filter=A"],
    cwd
  )
  if (!raw) return []

  const extCounts: Record<string, number> = {}
  for (const line of raw.split("\n")) {
    const ext = line.trim().split(".").pop()?.toLowerCase()
    if (ext && ext.length <= 5 && /^[a-z]+$/.test(ext)) {
      extCounts[ext] = (extCounts[ext] ?? 0) + 1
    }
  }

  const total = Object.values(extCounts).reduce((a, b) => a + b, 0)
  if (total === 0) return []

  const inferences: GitInference[] = []

  for (const rule of LANG_RULES) {
    const count = rule.ext.reduce((s, e) => s + (extCounts[e] ?? 0), 0)
    const ratio = count / total
    if (ratio < 0.05 || count < 3) continue
    const confidence = Math.min(0.92, 0.55 + ratio * 0.4)
    inferences.push({
      category:   "language",
      content:    rule.content,
      type:       "knowledge",
      domain:     rule.domain,
      confidence,
      evidence:   `${count} ${rule.ext.join("/")} files (${(ratio * 100).toFixed(0)}%)`,
    })
  }

  return inferences
}

// ── Main entry point ───────────────────────────────────────────────────────

export function analyzeGitRepo(cwd: string): {
  inferences: GitInference[]
  repoName:   string
  commits:    number
} {
  const repoName = run("git rev-parse --show-toplevel", cwd).split("/").pop() ?? cwd

  const logRaw = runArgs(
    ["git", "log", "--format=%s", "--max-count=200"],
    cwd
  )
  const messages = logRaw ? logRaw.split("\n").filter(Boolean) : []
  const commits  = parseInt(run("git rev-list --count HEAD", cwd) || "0", 10)

  const inferences: GitInference[] = []

  const conv = inferCommitConvention(messages)
  if (conv) inferences.push(conv)

  inferences.push(...inferStack(cwd))
  inferences.push(...inferLanguages(cwd))

  // Dedup by content
  const seen = new Set<string>()
  return {
    repoName,
    commits,
    inferences: inferences.filter(inf => {
      if (seen.has(inf.content)) return false
      seen.add(inf.content)
      return true
    }),
  }
}
