<template>
  <div class="min-h-screen w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
    <header class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="/assets/icon-32.png" alt="Logo" class="w-5 h-5" />
        <span class="font-semibold">Markopy</span>
      </div>
      <button @click="showOptions" class="hover:bg-blue-700 px-2 py-1 rounded text-sm transition-colors">
        ⚙️ Settings
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      <!-- Copy actions -->
      <div class="space-y-2">
        <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</h3>
        <div class="grid grid-cols-2 gap-2">
          <button @click="copySelection" class="flex items-center justify-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-2 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium">
            ✂️ Selection
          </button>
          <button @click="copyPage" class="flex items-center justify-center gap-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 px-3 py-2 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm font-medium">
            📄 Page
          </button>
          <button @click="copyLinks" class="flex items-center justify-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-3 py-2 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm font-medium">
            🔗 Links
          </button>
          <button @click="includeSourceToggle" class="flex items-center justify-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-3 py-2 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors text-sm font-medium">
            🔄 Source
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="stats.totalCopies > 0" class="bg-slate-100 dark:bg-slate-800 p-3 rounded space-y-1">
        <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Stats</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ stats.totalCopies }}</div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Copies</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.totalLinks }}</div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Links</div>
          </div>
        </div>
      </div>

      <!-- History preview -->
      <div v-if="history.length > 0" class="space-y-2">
        <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Recent</h3>
        <div class="space-y-1 max-h-32 overflow-y-auto">
          <div v-for="item in history.slice(0, 3)" :key="item.timestamp" class="text-xs p-2 bg-slate-100 dark:bg-slate-800 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" @click="copyToClipboard(item.text)">
            <div class="font-medium truncate">{{ item.title || item.url || 'Copied item' }}</div>
            <div class="text-slate-600 dark:text-slate-400 truncate">{{ item.text.substring(0, 40) }}...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-600 dark:text-slate-400">
      <button @click="showHistory" class="text-blue-600 dark:text-blue-400 hover:underline">View History</button>
      <span class="mx-1">•</span>
      <button @click="showOptions" class="text-blue-600 dark:text-blue-400 hover:underline">Settings</button>
    </footer>

    <Toast v-if="showToast" :message="toastMessage" :type="toastType" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { MESSAGE_TYPES } from '../shared/constants';
import { useExtensionData } from '../composables/useExtensionData';
import { updateSettings } from '../shared/storage';
import Toast from './Toast.vue';

const { settings, history, stats } = useExtensionData();
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

function displayToast(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
}

async function sendMessageToTab(message: any) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    displayToast('No active tab', 'error');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    if (response?.success) {
      displayToast('Copied to clipboard!', 'success');
    } else if (response?.error) {
      displayToast(response.error, 'error');
    } else {
      displayToast('Copy failed', 'error');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    displayToast(message, 'error');
  }
}

function copySelection() {
  sendMessageToTab({ type: MESSAGE_TYPES.COPY_SELECTION });
}

function copyPage() {
  sendMessageToTab({ type: MESSAGE_TYPES.COPY_PAGE });
}

function copyLinks() {
  sendMessageToTab({ type: MESSAGE_TYPES.COPY_LINKS });
}

function showOptions() {
  chrome.runtime.openOptionsPage();
}

function showHistory() {
  chrome.runtime.openOptionsPage();
  // Note: the options page should handle showing history when opened from popup
}

async function includeSourceToggle() {
  const newSettings = { ...settings.value };
  newSettings.includeSource = !newSettings.includeSource;
  await updateSettings(newSettings);
  displayToast(`Attribution ${newSettings.includeSource ? 'enabled' : 'disabled'}`);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    displayToast('Copied!');
  } catch {
    displayToast('Copy failed', 'error');
  }
}

onMounted(() => {
  // Auto-hide popup after copy (optional)
  // setTimeout(() => window.close(), 1000);
});
</script>
