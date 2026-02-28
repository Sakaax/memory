const MEMORY_URL = 'http://localhost:7711'

// ── Textarea detection ────────────────────────────────────────────────────────
const TEXTAREA_SELECTORS = [
  '#prompt-textarea',
  'div.ProseMirror[contenteditable="true"]',
  '.ql-editor[contenteditable="true"]',
  'div[contenteditable="true"]',
]

function getTextarea() {
  for (const sel of TEXTAREA_SELECTORS) {
    const el = document.querySelector(sel)
    if (el && el.getBoundingClientRect().height > 0) return el
  }
  return null
}

// ── Inject text ───────────────────────────────────────────────────────────────
function injectText(el, text) {
  el.focus()
  if (el.tagName === 'TEXTAREA') {
    el.value = text + '\n\n' + el.value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.selectionStart = el.selectionEnd = 0
    return
  }
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  document.getElementById('memory-toast')?.remove()
  const toast = document.createElement('div')
  toast.id = 'memory-toast'
  toast.textContent = msg
  Object.assign(toast.style, {
    position: 'fixed', bottom: '72px', left: '24px', zIndex: '2147483647',
    background: isError ? '#1a0a0a' : '#0e1a0e',
    color:      isError ? '#f87171' : '#4ade80',
    border:     `1px solid ${isError ? '#3a1010' : '#103a10'}`,
    borderRadius: '10px', padding: '8px 14px',
    fontSize: '12px', fontFamily: 'monospace',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    opacity: '0', transition: 'opacity 0.2s',
  })
  document.body.appendChild(toast)
  requestAnimationFrame(() => { toast.style.opacity = '1' })
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200) }, 2500)
}

// ── Scope picker popover ──────────────────────────────────────────────────────
let pickerOpen = false

function closePicker() {
  document.getElementById('memory-picker')?.remove()
  pickerOpen = false
}

async function openPicker(btnRect) {
  if (pickerOpen) { closePicker(); return }

  let scopes
  try {
    const r = await fetch(`${MEMORY_URL}/api/scopes`, { signal: AbortSignal.timeout(2000) })
    const data = await r.json()
    scopes = data.scopes   // [{ name, count }]
  } catch {
    showToast('Cannot reach memory server — run: memory ui', true)
    return
  }

  pickerOpen = true
  const picker = document.createElement('div')
  picker.id = 'memory-picker'

  Object.assign(picker.style, {
    position:     'fixed',
    bottom:       `${window.innerHeight - btnRect.top + 8}px`,
    left:         `${btnRect.left}px`,
    zIndex:       '2147483647',
    background:   '#0e0e1a',
    border:       '1px solid #2a2a48',
    borderRadius: '12px',
    padding:      '5px',
    minWidth:     '180px',
    boxShadow:    '0 10px 40px rgba(0,0,0,0.6)',
    fontFamily:   'monospace',
  })

  // Title
  const title = document.createElement('div')
  title.textContent = 'inject scope'
  Object.assign(title.style, {
    fontSize: '10px', color: '#44445a', textTransform: 'uppercase',
    letterSpacing: '0.7px', fontWeight: '700', padding: '6px 10px 4px',
  })
  picker.appendChild(title)

  for (const { name, count } of scopes) {
    const item = document.createElement('button')
    Object.assign(item.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '8px 10px', border: 'none',
      background: 'none', color: '#e8e8f0', fontSize: '13px',
      fontFamily: 'monospace', cursor: 'pointer', borderRadius: '7px',
      transition: 'background 0.1s',
      gap: '12px',
    })

    const nameSpan = document.createElement('span')
    nameSpan.textContent = name

    const countSpan = document.createElement('span')
    countSpan.textContent = count
    Object.assign(countSpan.style, {
      fontSize: '10px', color: '#44445a',
      background: '#151524', border: '1px solid #1c1c32',
      borderRadius: '4px', padding: '1px 5px',
    })

    item.appendChild(nameSpan)
    item.appendChild(countSpan)

    item.addEventListener('mouseenter', () => { item.style.background = '#151524' })
    item.addEventListener('mouseleave', () => { item.style.background = 'none' })

    item.addEventListener('click', async () => {
      closePicker()
      await doInject(name)
    })

    picker.appendChild(item)
  }

  document.body.appendChild(picker)

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closePicker, { once: true })
  }, 0)
}

// ── Do inject for a given scope ───────────────────────────────────────────────
async function doInject(scope) {
  const textarea = getTextarea()
  if (!textarea) { showToast('No input field found on this page.', true); return }

  let context
  try {
    const url = scope ? `${MEMORY_URL}/api/context?scope=${encodeURIComponent(scope)}` : `${MEMORY_URL}/api/context`
    const r   = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error()
    context = await r.text()
  } catch {
    showToast('Cannot reach memory server — run: memory ui', true)
    return
  }

  injectText(textarea, context)
  showToast(`${scope} context injected ✓`)
}

// ── Server status ─────────────────────────────────────────────────────────────
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

// ── Button ────────────────────────────────────────────────────────────────────
function createButton() {
  const btn = document.createElement('button')
  btn.id = 'memory-inject-btn'
  btn.title = 'Click to select scope and inject memory context'

  const dot = document.createElement('span')
  dot.id = 'memory-dot'
  Object.assign(dot.style, {
    width: '7px', height: '7px', borderRadius: '50%',
    background: '#4ade80', display: 'inline-block', flexShrink: '0',
  })

  const label = document.createElement('span')
  label.textContent = '⊕ memory'

  const chevron = document.createElement('span')
  chevron.textContent = '▾'
  Object.assign(chevron.style, { fontSize: '10px', opacity: '0.5' })

  btn.append(dot, label, chevron)

  Object.assign(btn.style, {
    position: 'fixed', bottom: '24px', left: '24px', zIndex: '2147483647',
    background: '#0e0e1a', color: '#4ade80',
    border: '1px solid #1c1c32', borderRadius: '20px', padding: '7px 14px',
    fontSize: '13px', fontFamily: 'monospace', fontWeight: '600',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    transition: 'all 0.15s', display: 'flex', alignItems: 'center',
    gap: '6px', userSelect: 'none',
  })

  btn.addEventListener('mouseenter', () => {
    btn.style.background  = '#151524'
    btn.style.borderColor = '#2a2a48'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.background  = '#0e0e1a'
    btn.style.borderColor = '#1c1c32'
  })

  btn.addEventListener('click', e => {
    e.stopPropagation()
    openPicker(btn.getBoundingClientRect())
  })

  return btn
}

// ── Mount ─────────────────────────────────────────────────────────────────────
function mount() {
  if (document.getElementById('memory-inject-btn')) return
  document.body.appendChild(createButton())
  checkServer()
  setInterval(checkServer, 15000)
}

const observer = new MutationObserver(() => {
  if (!document.getElementById('memory-inject-btn')) mount()
})
observer.observe(document.documentElement, { childList: true, subtree: true })

mount()
