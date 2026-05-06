/* HAKR - background service worker
 * Two responsibilities:
 *   1. Open the welcome page once on first install.
 *   2. Paint the per-tab toolbar-icon badge while edit mode is active.
 */

// Open welcome page on first install only (not on update / browser restart).
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Per-tab badge: 'ON' when edit mode is active. Sent from content.js.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'SET_BADGE' || !sender.tab) return;
  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ text: msg.on ? 'ON' : '', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#00cc33', tabId });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: '#000000', tabId });
  }
});

// Clear the badge when a tab navigates - content-script state resets too.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
