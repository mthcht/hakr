# HAKR - Live Page Editor

A browser extension that lets you click any text or image on any webpage and modify it locally. No DevTools required.

All changes are **local-only** - only you see them, nothing is saved or sent anywhere, and reloading the page restores the original.


## On the Chrome WebStore

https://chromewebstore.google.com/detail/hakr-%E2%80%94-live-page-editor/hbaoklfnekfckialgdndflbpfkkpfilo

## Install manually (Chrome / Edge / Brave / Opera / Arc - anything Chromium)

1. Unzip `hakr-extension.zip` somewhere on your disk.
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`, etc.)
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and select the unzipped `hakr-extension` folder.
5. The HAKR icon appears in your toolbar. A welcome tab opens explaining how it works.

## Use it

1. Open any webpage.
2. Click the HAKR icon → press **Start editing**.
   Or press **Ctrl+Shift+H** (⌘+Shift+H on Mac) anywhere as a shortcut.
3. Click any text → edit inline. Click any image → swap source dialog (URL or file upload).
4. Open the popup again to stop, or reset the page to undo everything.

A green **"ON"** badge appears on the toolbar icon while edit mode is active on a tab, so you don't forget.

## Languages

Auto-detected from the browser language. Currently bundled:

- English (`en`)
- Français (`fr`)
- Español (`es`)
- Deutsch (`de`)
- Italiano (`it`)
- Português do Brasil (`pt_BR`)
- 日本語 (`ja`)
- 简体中文 (`zh_CN`)

To add a language, copy `_locales/en/messages.json` into a new locale folder (e.g. `_locales/nl/messages.json`) and translate each `message` value.

## Caveats

- Modifications are **client-side only**.
- Some sites re-render content on a timer (live tickers, feeds) - your edits may get overwritten. Re-edit and screenshot quickly.
- Doesn't work on `chrome://`, `about:`, `view-source:`, or extension-store pages - Chrome blocks content scripts there.
- `srcset` and `<picture>` source elements are stripped when you swap an image so your replacement actually wins against responsive image rules.

## Files

```
hakr-extension/
├── manifest.json          MV3 manifest, references __MSG_*__ keys
├── background.js          opens welcome page on install + manages toolbar badge
├── content.js             injected into every page; click-to-edit + image-swap modal
├── popup.html / popup.js  toolbar popup (control panel)
├── welcome.html / welcome.js   first-install onboarding tab
├── icon{16,48,128}.png    extension icons
└── _locales/<lang>/messages.json   translations (one per language)
```

## License

Do what you want with it.
