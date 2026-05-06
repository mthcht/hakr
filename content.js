/* HAKR - content script
 * Tracks edit-mode state per page; intercepts clicks to make elements
 * editable; opens an image-replace modal in a Shadow DOM. No on-page UI
 * other than the modal - the popup drives everything else.
 */
(function () {
  'use strict';

  if (window.__hakrLoaded) return;
  window.__hakrLoaded = true;

  // Translation helper - falls back to default text if the locale is missing
  // (e.g. content script in a context where i18n isn't available).
  const t = (key, fallback) => {
    try {
      const m = chrome.i18n && chrome.i18n.getMessage(key);
      return m || fallback || key;
    } catch (_) { return fallback || key; }
  };

  // ───── state ─────
  let editMode = false;
  let editCount = 0;
  let hoveredEl = null;
  let modalHost = null;

  // ───── styles applied to host page (only while edit mode is on) ─────
  const hostStyle = document.createElement('style');
  hostStyle.id = '__hakr-host-style';
  hostStyle.textContent = `
    .__hakr-hover {
      outline: 2px dashed #00ff41 !important;
      outline-offset: 2px !important;
      cursor: text !important;
      box-shadow: 0 0 12px rgba(0,255,65,0.5) !important;
    }
    .__hakr-hover-img {
      outline: 2px dashed #00ff41 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
      box-shadow: 0 0 12px rgba(0,255,65,0.5) !important;
    }
    .__hakr-editing {
      outline: 2px solid #00ff41 !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 16px rgba(0,255,65,0.8), inset 0 0 8px rgba(0,255,65,0.2) !important;
      background-color: rgba(0,255,65,0.05) !important;
    }
  `;

  function setBadge(on) {
    try { chrome.runtime.sendMessage({ type: 'SET_BADGE', on }); } catch (_) {}
  }

  function setEditMode(on) {
    if (editMode === on) return;
    editMode = on;
    if (editMode) {
      if (!hostStyle.parentNode) (document.head || document.documentElement).appendChild(hostStyle);
      attachListeners();
    } else {
      if (hostStyle.parentNode) hostStyle.remove();
      detachListeners();
      clearHover();
      closeModal();
    }
    setBadge(editMode);
  }

  function isOurEl(el) {
    return el && (el.id === '__hakr-modal-host' || (el.closest && el.closest('#__hakr-modal-host')));
  }
  function clearHover() {
    if (hoveredEl) {
      hoveredEl.classList.remove('__hakr-hover', '__hakr-hover-img');
      hoveredEl = null;
    }
  }

  function onMouseOver(e) {
    if (!editMode || isOurEl(e.target)) return;
    clearHover();
    hoveredEl = e.target;
    if (e.target.tagName === 'IMG') hoveredEl.classList.add('__hakr-hover-img');
    else hoveredEl.classList.add('__hakr-hover');
  }
  function onMouseOut(e) {
    if (!editMode) return;
    if (e.target === hoveredEl) clearHover();
  }
  function onClick(e) {
    if (!editMode || isOurEl(e.target)) return;
    const el = e.target;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    e.stopPropagation();
    clearHover();
    if (tag === 'IMG') openImageModal(el);
    else makeEditable(el);
  }

  function makeEditable(el) {
    if (el.isContentEditable) return;
    el.setAttribute('contenteditable', 'true');
    el.classList.add('__hakr-editing');
    el.focus({ preventScroll: true });
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}

    const finish = () => {
      el.removeAttribute('contenteditable');
      el.classList.remove('__hakr-editing');
      editCount++;
      el.removeEventListener('blur', finish);
      el.removeEventListener('keydown', onKey);
    };
    const onKey = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); el.blur(); }
    };
    el.addEventListener('blur', finish);
    el.addEventListener('keydown', onKey);
  }

  function closeModal() {
    if (modalHost) { modalHost.remove(); modalHost = null; }
  }

  function openImageModal(img) {
    closeModal();

    // Localized strings (resolved at modal-open time).
    const txt = {
      title:       t('modalTitle',          'Replace image'),
      placeholder: t('modalUrlPlaceholder', 'Image URL or data URI'),
      or:          t('modalOr',             'or'),
      upload:      t('modalUpload',         'Upload from your computer'),
      apply:       t('modalApply',          'Apply'),
      cancel:      t('modalCancel',         'Cancel'),
    };

    modalHost = document.createElement('div');
    modalHost.id = '__hakr-modal-host';
    modalHost.style.cssText =
      'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
    const sr = modalHost.attachShadow({ mode: 'closed' });
    sr.innerHTML = `
      <style>
        :host, * { box-sizing: border-box; }
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.7);
          pointer-events: auto;
          backdrop-filter: blur(2px);
        }
        .modal {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: #050805;
          border: 1px solid #00ff41;
          padding: 20px;
          width: 420px; max-width: 90vw;
          font-family: 'Courier New', 'Consolas', 'Menlo', monospace;
          color: #00ff41;
          font-size: 13px;
          box-shadow: 0 0 30px rgba(0, 255, 65, 0.45);
          pointer-events: auto;
        }
        h3 { margin: 0 0 14px; font-size: 14px; letter-spacing: 1px; font-weight: 700; }
        input[type=text] {
          width: 100%;
          background: #000;
          border: 1px solid #00ff41;
          color: #00ff41;
          font-family: inherit;
          padding: 7px 9px;
          font-size: 12px;
          margin-bottom: 8px;
          outline: none;
        }
        input[type=text]:focus { box-shadow: 0 0 8px rgba(0,255,65,0.4); }
        .or {
          text-align: center;
          opacity: 0.5;
          margin: 6px 0;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        button {
          width: 100%;
          background: transparent;
          border: 1px solid #00ff41;
          color: #00ff41;
          font-family: inherit;
          font-size: 12px;
          padding: 9px 12px;
          cursor: pointer;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          transition: all 0.12s;
          font-weight: 600;
        }
        button:hover { background: #00ff41; color: #000; }
        button.danger { border-color: #ff4141; color: #ff4141; }
        button.danger:hover { background: #ff4141; color: #000; }
        .actions { display: flex; gap: 8px; margin-top: 10px; }
        .actions button { margin-bottom: 0; }
      </style>
      <div class="backdrop" id="bd"></div>
      <div class="modal">
        <h3>${txt.title}</h3>
        <input type="text" id="url" placeholder="${txt.placeholder}" spellcheck="false" />
        <div class="or">${txt.or}</div>
        <button id="up" type="button">${txt.upload}</button>
        <input type="file" id="file" accept="image/*" style="display:none" />
        <div class="actions">
          <button id="ok" type="button">${txt.apply}</button>
          <button class="danger" id="no" type="button">${txt.cancel}</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(modalHost);

    const $ = (id) => sr.getElementById(id);
    const url = $('url');
    const file = $('file');

    url.value = img.src;
    setTimeout(() => { url.focus(); url.select(); }, 0);

    let pending = null;
    $('up').addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { pending = r.result; url.value = `[file: ${f.name}]`; };
      r.readAsDataURL(f);
    });

    const apply = () => {
      const src = pending || url.value.trim();
      if (src && !src.startsWith('[file:')) {
        img.src = src;
        img.removeAttribute('srcset');
        if (img.parentElement && img.parentElement.tagName === 'PICTURE') {
          img.parentElement.querySelectorAll('source').forEach((s) => s.remove());
        }
        editCount++;
      } else if (pending) {
        img.src = pending;
        img.removeAttribute('srcset');
        editCount++;
      }
      closeModal();
    };

    $('ok').addEventListener('click', apply);
    $('no').addEventListener('click', closeModal);
    $('bd').addEventListener('click', closeModal);
    url.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    });
  }

  function onGlobalKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
      e.preventDefault();
      setEditMode(!editMode);
      return;
    }
    if (e.key === 'Escape' && editMode) {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable) return;
      if (modalHost) { closeModal(); return; }
      setEditMode(false);
    }
  }

  function attachListeners() {
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
  }
  function detachListeners() {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
  }

  document.addEventListener('keydown', onGlobalKey, true);

  // popup ↔ content messaging
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'GET_STATE') {
        sendResponse({ editMode, editCount });
      } else if (msg.type === 'TOGGLE') {
        setEditMode(!editMode);
        sendResponse({ editMode, editCount });
      } else if (msg.type === 'RESET') {
        location.reload();
        sendResponse({ ok: true });
      }
      return true;
    });
  }
})();
