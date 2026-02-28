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
    // Get active tab and run inject via content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   async (url) => {
        // Re-use the same logic as content.js handleInject
        const SELECTORS = [
          '#prompt-textarea',
          'div.ProseMirror[contenteditable="true"]',
          '.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"]',
        ]
        let textarea = null
        for (const sel of SELECTORS) {
          const el = document.querySelector(sel)
          if (el && el.getBoundingClientRect().height > 0) { textarea = el; break }
        }
        if (!textarea) return 'no_textarea'

        const r = await fetch(`${url}/api/context`)
        const context = await r.text()

        textarea.focus()
        if (textarea.tagName === 'TEXTAREA') {
          textarea.value = context + '\n\n' + textarea.value
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
        } else {
          const sel = window.getSelection()
          if (sel) {
            const range = document.createRange()
            range.setStart(textarea, 0)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          }
          document.execCommand('insertText', false, context + '\n\n')
        }
        return 'ok'
      },
      args: [MEMORY_URL],
    })
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
