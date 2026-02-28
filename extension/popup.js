// Firefox uses browser.*, Chrome uses chrome.* — normalise
const ext = typeof browser !== 'undefined' ? browser : chrome

const dot        = document.getElementById('dot')
const statusText = document.getElementById('status-text')
const scopeEl    = document.getElementById('scope')
const countEl    = document.getElementById('count')
const errorMsg   = document.getElementById('error-msg')
const btnInject  = document.getElementById('btn-inject')
const btnUi      = document.getElementById('btn-ui')

async function init() {
  const res = await new Promise(resolve =>
    ext.runtime.sendMessage({ action: 'getScopes' }, resolve)
  )

  if (res?.ok) {
    const { scopes, active } = res.data
    const activeScope = scopes.find(s => s.name === active)
    const count       = activeScope?.count ?? 0

    dot.className          = 'dot online'
    statusText.textContent = 'connected'
    scopeEl.textContent    = active
    countEl.textContent    = `${count} memor${count === 1 ? 'y' : 'ies'}`
    btnInject.disabled     = false
    errorMsg.style.display = 'none'
  } else {
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
    const res = await new Promise(resolve =>
      ext.runtime.sendMessage({ action: 'getContext' }, resolve)
    )
    if (res?.ok) {
      const [tab] = await ext.tabs.query({ active: true, currentWindow: true })
      ext.tabs.sendMessage(tab.id, { action: 'inject', context: res.text })
    }
  } catch (err) {
    console.error('Inject failed:', err)
  }

  btnInject.textContent = '⊕ Inject context'
  btnInject.disabled    = false
  window.close()
})

btnUi.addEventListener('click', () => {
  ext.tabs.create({ url: 'http://localhost:7711' })
})

init()
