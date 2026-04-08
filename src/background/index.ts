import { handleCommand } from './commands';
import { ensureContent, trackTabLoading, trackTabRemoval } from './injection';
import { createMenus, handleMenuClick } from './menus';
import { handleMessage } from './messages';
import { checkPremiumStatus } from '../shared/premium';
import { STORAGE_KEYS } from '../shared/constants';

// Register menus on install and on startup (service worker is event-driven)
chrome.runtime.onInstalled.addListener((details) => {
  createMenus();
  // Check license status on extension install/update
  checkPremiumStatus(true).catch(err => console.error('License check on install failed:', err));

  // First-run onboarding: open Options to the Home tab.
  if (details.reason === 'install') {
    chrome.storage.local.get([STORAGE_KEYS.local.ONBOARDING_DONE], (res) => {
      const done = Boolean(res?.[STORAGE_KEYS.local.ONBOARDING_DONE]);
      if (done) return;
      chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html?onboarding=1') });
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  createMenus();
  // Check license status on browser startup
  checkPremiumStatus(false).catch(err => console.error('License check on startup failed:', err));
});

// Recreate context menus when quick actions change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[STORAGE_KEYS.sync.QUICK_ACTIONS]) {
    createMenus().catch(err => console.error('Failed to recreate menus:', err));
  }
  if (area === 'local' && changes[STORAGE_KEYS.local.LICENSE]) {
    createMenus().catch(err => console.error('Failed to recreate menus:', err));
  }
});

// Track tab lifecycle for injection bookkeeping
chrome.tabs.onRemoved.addListener(tabId => trackTabRemoval(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    trackTabLoading(tabId);
  }
});

// Context menus
chrome.contextMenus.onClicked.addListener(handleMenuClick);

// Keyboard shortcuts
chrome.commands.onCommand.addListener(handleCommand);

// Messages from popup/content/offscreen
chrome.runtime.onMessage.addListener(handleMessage);

// Export ensureContent for potential reuse elsewhere (kept for compatibility)
export { ensureContent };
