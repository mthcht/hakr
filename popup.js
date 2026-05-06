/* HAKR - popup script */

const $ = (id) => document.getElementById(id);

let available = true;

// ───── i18n helpers ─────
function t(key, fallback) {
  try {
    const m = chrome.i18n && chrome.i18n.getMessage(key);
    return m || fallback || key;
  } catch (_) { return fallback || key; }
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = t(key, el.textContent);
    el.textContent = msg;
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    // format: "attrName:messageKey"
    const spec = el.getAttribute('data-i18n-attr');
    const [attr, key] = spec.split(':');
    if (!attr || !key) return;
    const msg = t(key, el.getAttribute(attr) || '');
    el.setAttribute(attr, msg);
  });
}

// Detect Mac for the right shortcut hint.
function applyShortcutTip() {
  const isMac = /Mac/i.test(navigator.platform || navigator.userAgent || '');
  $('tip').textContent = t(isMac ? 'tipShortcutMac' : 'tipShortcut',
                           isMac ? 'Toggle: ⌘+Shift+H' : 'Toggle: Ctrl+Shift+H');
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setIndicator(state) {
  $('indicator').className = 'indicator ' + state; // 'on' | 'off' | 'warn'
}

function renderUnavailable() {
  available = false;
  $('target-host').textContent = t('valDash', '-');
  $('target-host').classList.add('muted');

  setIndicator('warn');
  $('status-line').className = 'val warn';
  $('status-value').textContent = t('statusRestricted', 'Restricted page');

  $('edit-count').textContent = t('valDash', '-');

  $('toggle').textContent = t('btnUnavailable', 'Not available here');
  $('toggle').disabled = true;
  $('reset').disabled = true;
}

function render(state, hostname) {
  // host
  $('target-host').textContent = hostname || t('valDash', '-');
  $('target-host').classList.remove('muted');

  // edits
  $('edit-count').textContent = state.editCount;
  if (state.editCount > 0) $('edit-count').classList.remove('muted');
  else $('edit-count').classList.add('muted');

  // status
  if (state.editMode) {
    setIndicator('on');
    $('status-line').className = 'val';
    $('status-value').textContent = t('statusActive', 'Active');
    $('toggle').textContent = t('btnStop', 'Stop editing');
  } else {
    setIndicator('off');
    $('status-line').className = 'val offline';
    $('status-value').textContent = t('statusInactive', 'Inactive');
    $('toggle').textContent = t('btnStart', 'Start editing');
  }

  $('toggle').disabled = false;
  $('reset').disabled = false;
}

async function loadState() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) { renderUnavailable(); return; }

  // Block known-restricted URL schemes early.
  if (/^(chrome|edge|brave|opera|about|chrome-extension|moz-extension|view-source):/i.test(tab.url || '')) {
    renderUnavailable();
    return;
  }

  let hostname = '';
  try { hostname = new URL(tab.url).hostname || tab.url; }
  catch (_) { hostname = tab.url || ''; }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
    if (res && typeof res.editMode === 'boolean') render(res, hostname);
    else renderUnavailable();
  } catch (_) {
    renderUnavailable();
  }
}

// ───── wiring ─────
$('toggle').addEventListener('click', async () => {
  if (!available) return;
  const tab = await getActiveTab();
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE' });
    window.close();
  } catch (_) {
    renderUnavailable();
  }
});

$('reset').addEventListener('click', async () => {
  if (!available) return;
  const tab = await getActiveTab();
  try {
    await chrome.tabs.reload(tab.id);
    window.close();
  } catch (_) {}
});

$('help-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  window.close();
});

$('github-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/mthcht/hakr' });
  window.close();
});

// Run i18n + load state.
applyStaticI18n();
applyShortcutTip();
loadState();
