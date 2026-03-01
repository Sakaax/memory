# Browser Extension

Inject your memory context into Claude.ai, ChatGPT, and Gemini with one click.

100% local — the extension talks only to `localhost:7711`. Nothing leaves your machine.

## Prerequisites

The daemon must be running:

```bash
memory daemon start
```

## Install

**Chrome / Brave / Arc:**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from the repo

**Firefox:**
1. Go to `about:debugging`
2. Click **This Firefox** → **Load Temporary Add-on**
3. Select `extension-firefox/manifest.json`

## Usage

A floating **⊕ memory** button appears at the bottom-left of supported AI sites.

- **Green dot** — daemon running, ready to inject
- **Red dot** — daemon offline, run `memory daemon start`

**Click the button** → scope picker appears → select a scope → context is injected into the chat input, ready to send.

The toolbar popup shows:
- Server status and active scope
- Memory count
- **Inject context** button
- **Open memory UI** link

## Supported sites

| Site | URL |
|---|---|
| Claude.ai | `claude.ai` |
| ChatGPT | `chat.openai.com` / `chatgpt.com` |
| Gemini | `gemini.google.com` |

## Add a new site

In `extension/manifest.json` (Chrome) or `extension-firefox/manifest.json` (Firefox), add the URL to `host_permissions` and `content_scripts.matches`, then reload the extension.

## Store listings

- Firefox Add-ons (AMO) — submitted, pending review
- Chrome Web Store — submitted, pending review
