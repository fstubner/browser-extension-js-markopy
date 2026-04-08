import { MESSAGE_TYPES, MAX_CONTENT_READY_ATTEMPTS, CONTENT_READY_RETRY_DELAY_MS } from '../shared/constants';
import contentScript from '../content/index.ts?script';

const injectedTabs = new Set<number>();
const injectionPromises = new Map<number, Promise<boolean>>();

function canInject(url?: string): boolean {
  if (!url) return false;
  const blocked = ['chrome://', 'edge://', 'about:', 'moz-extension://', 'chrome-extension://', 'view-source:'];
  if (blocked.some(prefix => url.startsWith(prefix))) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

async function pingContent(tabId: number): Promise<boolean> {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.PING });
    return Boolean(resp?.ready);
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForContentReady(tabId: number, maxAttempts = MAX_CONTENT_READY_ATTEMPTS): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const ready = await pingContent(tabId);
    if (ready) return true;
    await delay(CONTENT_READY_RETRY_DELAY_MS * (i + 1));
  }
  return false;
}

async function performInjection(tabId: number, url?: string): Promise<boolean> {
  // Fast path: check if already injected
  if (injectedTabs.has(tabId)) {
    const ready = await waitForContentReady(tabId);
    if (ready) return true;
    injectedTabs.delete(tabId);
  }

  if (!canInject(url)) return false;

  try {
    // Check if already ready (another injection might have succeeded)
    const alreadyReady = await waitForContentReady(tabId);
    if (alreadyReady) {
      injectedTabs.add(tabId);
      return true;
    }

    // Perform injection
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [contentScript],
    });

    const ready = await waitForContentReady(tabId);
    if (ready) {
      injectedTabs.add(tabId);
      return true;
    }
    return false;
  } catch (e: unknown) {
    // Silently fail - this is expected for some pages
    if (import.meta.env.DEV) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.warn('Failed to inject content script:', message);
    }
    return false;
  }
}

export async function ensureContent(tabId: number, url?: string): Promise<boolean> {
  // Deduplicate concurrent injections
  if (injectionPromises.has(tabId)) {
    return injectionPromises.get(tabId)!;
  }

  const promise = performInjection(tabId, url)
    .then(result => {
      if (injectionPromises.get(tabId) === promise) {
        injectionPromises.delete(tabId);
      }
      return result;
    })
    .catch(error => {
      if (injectionPromises.get(tabId) === promise) {
        injectionPromises.delete(tabId);
      }
      throw error;
    });

  injectionPromises.set(tabId, promise);
  return promise;
}

// Clean up tracking when tabs are removed
export function trackTabRemoval(tabId: number): void {
  injectedTabs.delete(tabId);
  injectionPromises.delete(tabId);
}

// Clean up tracking when tab starts loading
export function trackTabLoading(tabId: number): void {
  injectedTabs.delete(tabId);
  injectionPromises.delete(tabId);
}
