/* HAKR - welcome page script */

function t(key, fallback) {
  try {
    const m = chrome.i18n && chrome.i18n.getMessage(key);
    return m || fallback || key;
  } catch (_) { return fallback || key; }
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = t(key, el.textContent);
    el.textContent = msg;
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    const [attr, key] = spec.split(':');
    if (!attr || !key) return;
    const msg = t(key, el.getAttribute(attr) || '');
    el.setAttribute(attr, msg);
  });

  // Tab title needs explicit handling.
  document.title = t('welcomeHeading', document.title);
}

document.getElementById('cta').addEventListener('click', () => {
  // Close the welcome tab.
  window.close();
});

applyI18n();
