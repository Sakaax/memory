const MEMORY_URL = 'http://localhost:7711'

// ── Textarea detection (ordered by specificity) ───────────────────────────────
const TEXTAREA_SELECTORS = [
  '#prompt-textarea',                          // ChatGPT
  'div.ProseMirror[contenteditable="true"]',   // Claude.ai
  '.ql-editor[contenteditable="true"]',        // Gemini
  'div[contenteditable="true"]',               // generic fallback
]

function getTextarea() {
  for (const sel of TEXTAREA_SELECTORS) {
    const el = document.querySelector(sel)
    if (el && el.getBoundingClientRect().height > 0) return el
  }
  return null
}

// ── Inject text at start of contenteditable / textarea ────────────────────────
function injectText(el, text) {
  el.focus()

  if (el.tagName === 'TEXTAREA') {
    const before = el.value
    el.value     = text + '\n\n' + before
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.selectionStart = el.selectionEnd = 0
    return
  }

  // contenteditable: move cursor to start and insert
  const sel = window.getSelection()
  if (sel) {
    const range = document.createRange()
    range.setStart(el, 0)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  document.execCommand('insertText', false, text + '\n\n')
}

// ── Button ────────────────────────────────────────────────────────────────────
function createButton() {
  const btn = document.createElement('button')
  btn.id = 'memory-inject-btn'
  btn.textContent = '⊕ memory'
  btn.title = 'Inject memory context'

  Object.assign(btn.style, {
    position:        'fixed',
    bottom:          '24px',
    left:            '24px',
    zIndex:          '2147483647',
    background:      '#0e0e1a',
    color:           '#4ade80',
    border:          '1px solid #1c1c32',
    borderRadius:    '20px',
    padding:         '7px 14px',
    fontSize:        '13px',
    fontFamily:      'monospace',
    fontWeight:      '600',
    cursor:          'pointer',
    boxShadow:       '0 4px 20px rgba(0,0,0,0.5)',
    transition:      'all 0.15s',
    display:         'flex',
    alignItems:      'center',
    gap:             '6px',
    letterSpacing:   '0.2px',
    userSelect:      'none',
  })

  // Status dot
  const dot = document.createElement('span')
  dot.id = 'memory-dot'
  Object.assign(dot.style, {
    width:        '7px',
    height:       '7px',
    borderRadius: '50%',
    background:   '#4ade80',
    display:      'inline-block',
    flexShrink:   '0',
  })
  btn.prepend(dot)

  btn.addEventListener('mouseenter', () => {
    btn.style.background   = '#151524'
    btn.style.borderColor  = '#2a2a48'
    btn.style.boxShadow    = '0 6px 28px rgba(0,0,0,0.6)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.background   = '#0e0e1a'
    btn.style.borderColor  = '#1c1c32'
    btn.style.boxShadow    = '0 4px 20px rgba(0,0,0,0.5)'
  })

  return btn
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  document.getElementById('memory-toast')?.remove()

  const toast = document.createElement('div')
  toast.id = 'memory-toast'
  toast.textContent = msg

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '68px',
    left:         '24px',
    zIndex:       '2147483647',
    background:   isError ? '#1a0a0a' : '#0e1a0e',
    color:        isError ? '#f87171' : '#4ade80',
    border:       `1px solid ${isError ? '#3a1010' : '#103a10'}`,
    borderRadius: '10px',
    padding:      '8px 14px',
    fontSize:     '12px',
    fontFamily:   'monospace',
    boxShadow:    '0 4px 20px rgba(0,0,0,0.5)',
    opacity:      '0',
    transition:   'opacity 0.2s',
  })

  document.body.appendChild(toast)
  requestAnimationFrame(() => { toast.style.opacity = '1' })
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 200)
  }, 2500)
}

// ── Check server & update dot ─────────────────────────────────────────────────
async function checkServer() {
  const dot = document.getElementById('memory-dot')
  if (!dot) return
  try {
    const r = await fetch(`${MEMORY_URL}/api/scopes`, { signal: AbortSignal.timeout(1500) })
    dot.style.background = r.ok ? '#4ade80' : '#f87171'
  } catch {
    dot.style.background = '#f87171'
  }
}

// ── Inject handler ────────────────────────────────────────────────────────────
async function handleInject() {
  const textarea = getTextarea()
  if (!textarea) {
    showToast('No input field found on this page.', true)
    return
  }

  let context
  try {
    const r = await fetch(`${MEMORY_URL}/api/context`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error(`Server error: ${r.status}`)
    context = await r.text()
  } catch (err) {
    showToast('Cannot reach memory server — run: memory ui', true)
    return
  }

  injectText(textarea, context)
  showToast('Memory context injected ✓')
}

// ── Mount button & observe SPA navigation ────────────────────────────────────
function mount() {
  if (document.getElementById('memory-inject-btn')) return

  const btn = createButton()
  btn.addEventListener('click', handleInject)
  document.body.appendChild(btn)
  checkServer()

  // Re-check server every 15s
  setInterval(checkServer, 15000)
}

// Observe DOM for SPA page transitions
const observer = new MutationObserver(() => {
  if (!document.getElementById('memory-inject-btn')) mount()
})
observer.observe(document.documentElement, { childList: true, subtree: true })

mount()
