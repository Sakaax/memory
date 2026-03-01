const MEMORY_URL = 'http://localhost:7711'
const ext = typeof browser !== 'undefined' ? browser : chrome

// All fetch calls to localhost go through here — bypasses page CSP
ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'getScopes') {
    fetch(`${MEMORY_URL}/api/scopes`, { signal: AbortSignal.timeout(2000) })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(() => sendResponse({ ok: false }))
    return true // keep channel open for async response
  }

  if (msg.action === 'getContext') {
    const url = msg.scope
      ? `${MEMORY_URL}/api/context?scope=${encodeURIComponent(msg.scope)}`
      : `${MEMORY_URL}/api/context`
    fetch(url, { signal: AbortSignal.timeout(3000) })
      .then(r => r.text())
      .then(text => sendResponse({ ok: true, text }))
      .catch(() => sendResponse({ ok: false }))
    return true
  }
})
