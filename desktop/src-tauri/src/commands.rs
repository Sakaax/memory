use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

// ── Paths ─────────────────────────────────────────────────────────────────────

pub fn memory_home() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join(".memory")
}

fn scope_file(scope: &str) -> PathBuf {
    if scope == "global" {
        memory_home().join("global").join("memory.json")
    } else {
        memory_home().join("projects").join(scope).join("memory.json")
    }
}

fn current_scope_file() -> PathBuf {
    memory_home().join(".scope")
}

fn read_current_scope() -> String {
    let path = current_scope_file();
    if path.exists() {
        fs::read_to_string(path)
            .unwrap_or_default()
            .trim()
            .to_string()
    } else {
        "global".to_string()
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Memory {
    pub id: String,
    #[serde(rename = "type")]
    pub memory_type: String,
    pub content: String,
    pub domain: String,
    pub confidence: f64,
    pub importance: f64,
    pub source: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub scope: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MemoryStore {
    version: Option<String>,
    memories: Vec<Memory>,
}

fn load_store(scope: &str) -> MemoryStore {
    let path = scope_file(scope);
    if !path.exists() {
        return MemoryStore {
            version: Some("1".to_string()),
            memories: vec![],
        };
    }
    let raw = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&raw).unwrap_or(MemoryStore {
        version: Some("1".to_string()),
        memories: vec![],
    })
}

fn save_store(scope: &str, store: &MemoryStore) -> Result<(), String> {
    let path = scope_file(scope);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn iso_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let sec   = secs % 60;
    let min   = (secs / 60) % 60;
    let hr    = (secs / 3600) % 24;
    let days  = secs / 86400;
    let year  = 1970 + days / 365;
    let doy   = days % 365;
    let month = doy / 30 + 1;
    let day   = doy % 30 + 1;
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, hr, min, sec)
}

fn short_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    let s = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{:x}", n ^ (s as u32))
}

// ── Scope commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_scopes() -> Vec<String> {
    let home = memory_home();
    let mut scopes = vec!["global".to_string()];
    let projects_dir = home.join("projects");
    if projects_dir.exists() {
        if let Ok(entries) = fs::read_dir(&projects_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    if let Some(name) = entry.file_name().to_str() {
                        scopes.push(name.to_string());
                    }
                }
            }
        }
    }
    scopes
}

#[tauri::command]
pub fn get_current_scope() -> String {
    read_current_scope()
}

#[tauri::command]
pub fn set_current_scope(scope: String) -> Result<(), String> {
    fs::write(current_scope_file(), &scope).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_scope(name: String) -> Result<(), String> {
    let store = MemoryStore { version: Some("1".to_string()), memories: vec![] };
    save_store(&name, &store)
}

#[tauri::command]
pub fn delete_scope(name: String) -> Result<(), String> {
    if name == "global" {
        return Err("Cannot delete global scope".to_string());
    }
    let dir = memory_home().join("projects").join(&name);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    if read_current_scope() == name {
        let _ = fs::write(current_scope_file(), "global");
    }
    Ok(())
}

// ── Memory CRUD ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_memories(scope: String) -> Vec<Memory> {
    load_store(&scope).memories
}

#[derive(Debug, Deserialize)]
pub struct AddMemoryInput {
    pub scope: String,
    #[serde(rename = "type")]
    pub memory_type: String,
    pub content: String,
    pub domain: String,
    pub confidence: f64,
    pub importance: f64,
}

#[tauri::command]
pub fn add_memory(input: AddMemoryInput) -> Result<Memory, String> {
    let mut store = load_store(&input.scope);
    let now = iso_now();
    let mem = Memory {
        id: short_id(),
        memory_type: input.memory_type,
        content: input.content,
        domain: input.domain,
        confidence: input.confidence,
        importance: input.importance,
        source: Some("desktop".to_string()),
        created_at: now.clone(),
        updated_at: now,
        scope: None,
    };
    store.memories.push(mem.clone());
    save_store(&input.scope, &store)?;
    Ok(mem)
}

#[derive(Debug, Deserialize)]
pub struct UpdateMemoryInput {
    pub scope: String,
    pub id: String,
    pub content: Option<String>,
    #[serde(rename = "type")]
    pub memory_type: Option<String>,
    pub domain: Option<String>,
    pub confidence: Option<f64>,
    pub importance: Option<f64>,
}

#[tauri::command]
pub fn update_memory(input: UpdateMemoryInput) -> Result<Memory, String> {
    let mut store = load_store(&input.scope);
    let mem = store
        .memories
        .iter_mut()
        .find(|m| m.id == input.id)
        .ok_or_else(|| format!("Memory {} not found", input.id))?;
    if let Some(v) = input.content   { mem.content      = v; }
    if let Some(v) = input.memory_type { mem.memory_type = v; }
    if let Some(v) = input.domain    { mem.domain       = v; }
    if let Some(v) = input.confidence{ mem.confidence   = v; }
    if let Some(v) = input.importance{ mem.importance   = v; }
    mem.updated_at = iso_now();
    let result = mem.clone();
    save_store(&input.scope, &store)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_memory(scope: String, id: String) -> Result<(), String> {
    let mut store = load_store(&scope);
    let before = store.memories.len();
    store.memories.retain(|m| m.id != id);
    if store.memories.len() == before {
        return Err(format!("Memory {} not found", id));
    }
    save_store(&scope, &store)
}

#[tauri::command]
pub fn move_memory(from_scope: String, to_scope: String, id: String) -> Result<(), String> {
    let mut from = load_store(&from_scope);
    let pos = from.memories.iter().position(|m| m.id == id)
        .ok_or_else(|| format!("Memory {} not found", id))?;
    let mem = from.memories.remove(pos);
    save_store(&from_scope, &from)?;
    let mut to = load_store(&to_scope);
    to.memories.push(mem);
    save_store(&to_scope, &to)
}

// ── Learn ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn run_learn_json(learn_type: String, cwd: String) -> Result<Value, String> {
    let bin = find_memory_bin()?;
    let output = Command::new(&bin)
        .args(["learn", &learn_type, "--json", &cwd])
        .output()
        .map_err(|e| format!("Failed to run memory: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(stdout.trim())
        .map_err(|e| format!("JSON parse error: {} — got: {}", e, stdout.trim()))
}

fn find_memory_bin() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    for p in &[
        format!("{}/.local/bin/memory", home),
        format!("{}/.bun/bin/memory", home),
        "/usr/local/bin/memory".to_string(),
        "/usr/bin/memory".to_string(),
    ] {
        if std::path::Path::new(p).exists() {
            return Ok(p.clone());
        }
    }
    Ok("memory".to_string())
}

#[derive(Debug, Deserialize)]
pub struct StoreInferencesInput {
    pub scope: String,
    pub inferences: Vec<InferenceInput>,
    pub source: String,
}

#[derive(Debug, Deserialize)]
pub struct InferenceInput {
    pub content: String,
    #[serde(rename = "type")]
    pub memory_type: String,
    pub domain: String,
    pub confidence: f64,
}

#[tauri::command]
pub fn store_inferences(input: StoreInferencesInput) -> Result<usize, String> {
    let mut store = load_store(&input.scope);
    let existing: Vec<String> = store.memories.iter().map(|m| m.content.to_lowercase()).collect();
    let now = iso_now();
    let mut count = 0usize;
    for inf in &input.inferences {
        let key: String = inf.content.to_lowercase().chars().take(40).collect();
        if existing.iter().any(|e| e.contains(&key)) {
            continue;
        }
        store.memories.push(Memory {
            id: short_id(),
            memory_type: inf.memory_type.clone(),
            content: inf.content.clone(),
            domain: inf.domain.clone(),
            confidence: inf.confidence,
            importance: 0.6,
            source: Some(input.source.clone()),
            created_at: now.clone(),
            updated_at: now.clone(),
            scope: None,
        });
        count += 1;
    }
    save_store(&input.scope, &store)?;
    Ok(count)
}

// ── Context file ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_context_file() -> Option<String> {
    fs::read_to_string(memory_home().join("context.md")).ok()
}

#[tauri::command]
pub fn regenerate_context(cwd: String) -> Result<String, String> {
    let bin = find_memory_bin()?;
    Command::new(&bin)
        .args(["context", "--write", "--cwd", &cwd])
        .output()
        .map_err(|e| format!("Failed to run memory: {}", e))?;
    fs::read_to_string(memory_home().join("context.md"))
        .map_err(|e| format!("Could not read context.md: {}", e))
}

// ── Providers ─────────────────────────────────────────────────────────────────

const KNOWN_PROVIDERS: &[(&str, &str, &str)] = &[
    ("Claude Code",    "claude-memory",       "claude"),
    ("Gemini CLI",     "gemini-memory",       "gemini"),
    ("Codex CLI",      "codex-memory",        "codex"),
    ("OpenCode",       "opencode-memory",     "opencode"),
    ("Aider",          "aider-memory",        "aider"),
    ("ShellGPT",       "sgpt-memory",         "sgpt"),
    ("Goose",          "goose-memory",        "goose"),
    ("Groq",           "groq-memory",         "groq"),
    ("Ollama",         "ollama-memory",       "ollama"),
    ("Cursor Agent",   "cursor-agent-memory", "cursor-agent"),
    ("Droid",          "droid-memory",        "droid"),
];

#[derive(Debug, Serialize)]
pub struct Provider {
    pub label: String,
    pub bin_name: String,
    pub command: String,
    pub installed: bool,
    pub path: Option<String>,
}

fn bin_dirs() -> Vec<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    vec![
        format!("{}/.local/bin", home),
        format!("{}/.bun/bin", home),
        "/usr/local/bin".to_string(),
    ]
}

#[tauri::command]
pub fn get_providers() -> Vec<Provider> {
    let dirs = bin_dirs();
    KNOWN_PROVIDERS.iter().map(|(label, bin_name, _)| {
        let found = dirs.iter().find_map(|dir| {
            let p = format!("{}/{}", dir, bin_name);
            if std::path::Path::new(&p).exists() { Some(p) } else { None }
        });
        Provider {
            label: label.to_string(),
            bin_name: bin_name.to_string(),
            command: bin_name.to_string(),
            installed: found.is_some(),
            path: found,
        }
    }).collect()
}

#[tauri::command]
pub fn remove_provider(bin_name: String) -> Result<(), String> {
    let dirs = bin_dirs();
    let mut removed = false;
    for dir in &dirs {
        let path = format!("{}/{}", dir, bin_name);
        if std::path::Path::new(&path).exists() {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
            removed = true;
        }
    }
    if removed { Ok(()) } else { Err(format!("{} not found", bin_name)) }
}
