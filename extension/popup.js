const MEMORY_URL = 'http://localhost:7711'

const dot        = document.getElementById('dot')
const statusText = document.getElementById('status-text')
const scopeEl    = document.getElementById('scope')
const countEl    = document.getElementById('count')
const errorMsg   = document.getElementById('error-msg')
const btnInject  = document.getElementById('btn-inject')
const btnUi      = document.getElementById('btn-ui')

async function init() {
  try {
    const r = await fetch(`${MEMORY_URL}/api/scopes`, { signal: AbortSignal.timeout(2000) })
    if (!r.ok) throw new Error()
    const { scopes, active } = await r.json()

    const activeScope = scopes.find(s => s.name === active)
    const count       = activeScope?.count ?? 0

    dot.className        = 'dot online'
    statusText.textContent = 'connected'
    scopeEl.textContent  = active
    countEl.textContent  = `${count} memor${count === 1 ? 'y' : 'ies'}`
    btnInject.disabled   = false
    errorMsg.style.display = 'none'
  } catch {
    dot.className          = 'dot offline'
    statusText.textContent = 'offline'
    scopeEl.textContent    = '—'
    countEl.textContent    = '—'
    btnInject.disabled     = true
    errorMsg.style.display = 'block'
  }
}

btnInject.addEventListener('click', async () => {
  btnInject.textContent = 'Injecting…'
  btnInject.disabled    = true

  try {
    // Fetch context via background (bypasses page CSP)
    const res = await new Promise(resolve =>
      chrome.runtime.sendMessage({ action: 'getContext' }, resolve)
    )
    if (res?.ok) {
      // Send context to content script to do the DOM injection
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      chrome.tabs.sendMessage(tab.id, { action: 'inject', context: res.text })
    }
  } catch (err) {
    console.error('Inject failed:', err)
  }

  btnInject.textContent = '⊕ Inject context'
  btnInject.disabled    = false
  window.close()
})

btnUi.addEventListener('click', () => {
  chrome.tabs.create({ url: MEMORY_URL })
})

init()
