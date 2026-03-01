# harvest

Extract memories from a past session transcript — no AI API call, no extra tokens.

## Usage

```bash
memory harvest --last              # most recent Claude Code session
memory harvest session.jsonl       # explicit Claude Code session file
memory harvest transcript.txt      # any plain text transcript
```

## How it works

**`.jsonl` mode** (Claude Code sessions):
- Detects `memory remember` bash calls already executed — marks as "already stored"
- Scans user messages for preference/decision patterns

**Plain text mode** (any AI):
- Same heuristic patterns applied line by line
- Works with any transcript you copy/paste or export manually

**Heuristic patterns:**

```
I use / I prefer / I want / I need / I always / I never
my stack / my setup / my project / my workflow
always use / never use
important: / remember this
```

An interactive selector lets you review candidates before anything is written. Harvested memories are stored with `confidence: 0.6`.

## Notes

- `--last` is Claude Code only — walks `~/.claude/projects/` for the newest session
- For other AIs, use [watch](watch.md) during the session or copy the transcript manually
- Already-stored memories are shown separately and skipped automatically
