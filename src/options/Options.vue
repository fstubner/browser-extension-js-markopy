<template>
  <div class="h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex overflow-hidden">
    <aside class="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 space-y-2 flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div class="flex items-center gap-2 mb-4">
        <img src="/assets/icon-48.png" alt="Logo" class="w-6 h-6" />
        <h1 class="text-lg font-bold">Markopy</h1>
      </div>

      <nav ref="navRef" class="space-y-1 flex-1 overflow-y-auto scroll-shadow-top scroll-shadow-bottom" :class="{ 'has-scroll-top': navHasScrollTop, 'has-scroll-bottom': navHasScrollBottom }">
        <button
          v-for="link in mainNavLinks"
          :key="link.id"
          class="w-full flex items-center gap-2 px-3 py-2 rounded transition-colors text-left"
          :class="[
            link.id === 'premium' ? 'premium-nav-item' : 
            link.id === 'history' ? 'text-slate-600 dark:text-slate-400' :
            activeTab === link.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          ]"
          @click="activeTab = link.id"
        >
          <span>{{ link.icon }}</span>
          <span class="text-sm font-medium">{{ link.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        <HomeSection v-if="activeTab === 'home'" :theme="theme" @switch-tab="(tab) => activeTab = tab" />
        <GeneralSettingsSection v-else-if="activeTab === 'general'" :settings="settings" :theme="theme" @update-theme="handleThemeUpdate" />
        <OperationSection v-else-if="activeTab === 'selection'" operation="selection" :settings="settings" :templates="templates" />
        <OperationSection v-else-if="activeTab === 'page'" operation="page" :settings="settings" :templates="templates" />
        <OperationSection v-else-if="activeTab === 'links'" operation="links" :settings="settings" :templates="templates" />
        <QuickActionsSection v-else-if="activeTab === 'actions'" :settings="settings" :templates="templates" />
        <TemplatesSection v-else-if="activeTab === 'templates'" :templates="templates" />
        <ShortcutsSection v-else-if="activeTab === 'shortcuts'" />
        <PremiumSection v-else-if="activeTab === 'premium'" />
        <HistorySection v-else-if="activeTab === 'history'" :history="history" :stats="stats" />
        <DataManagementSection v-else-if="activeTab === 'data'" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { DEFAULTS } from '../shared/constants';
import { useExtensionData } from '../composables/useExtensionData';
import HomeSection from './components/HomeSection.vue';
import GeneralSettingsSection from './components/GeneralSettingsSection.vue';
import OperationSection from './components/OperationSection.vue';
import QuickActionsSection from './components/QuickActionsSection.vue';
import TemplatesSection from './components/TemplatesSection.vue';
import ShortcutsSection from './components/ShortcutsSection.vue';
import PremiumSection from './components/PremiumSection.vue';
import HistorySection from './components/HistorySection.vue';
import DataManagementSection from './components/DataManagementSection.vue';
import { updateSettings } from '../shared/storage';

const { settings, templates, history, stats, theme, loading, error, loadAll } = useExtensionData();
const activeTab = ref('home');
const navHasScrollTop = ref(false);
const navHasScrollBottom = ref(false);
const navRef = ref<HTMLElement | null>(null);

const mainNavLinks = computed(() => [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'general', icon: '⚙️', label: 'General' },
  { id: 'selection', icon: '✂️', label: 'Copy Selection' },
  { id: 'page', icon: '📄', label: 'Copy Page' },
  { id: 'links', icon: '🔗', label: 'Copy Links' },
  { id: 'actions', icon: '⚡', label: 'Quick Actions' },
  { id: 'templates', icon: '📋', label: 'Templates' },
  { id: 'shortcuts', icon: '⌨️', label: 'Shortcuts' },
  { id: 'premium', icon: '⭐', label: 'Premium' },
  { id: 'history', icon: '📚', label: 'History' },
  { id: 'data', icon: '💾', label: 'Data' },
]);

watch(navRef, () => {
  checkNavScroll();
});

function checkNavScroll() {
  if (!navRef.value) return;
  navHasScrollTop.value = navRef.value.scrollTop > 0;
  navHasScrollBottom.value = navRef.value.scrollTop < navRef.value.scrollHeight - navRef.value.clientHeight - 5;
}

function handleNavScroll() {
  checkNavScroll();
}

async function handleThemeUpdate(newTheme: 'light' | 'dark') {
  const newSettings = { ...settings.value };
  await updateSettings(newSettings);
}

onMounted(() => {
  // Handle hash-based navigation
  const hash = window.location.hash.slice(1) || '';
  if (hash) {
    activeTab.value = hash;
  }

  // For onboarding flow
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('onboarding')) {
    activeTab.value = 'home';
  }

  // Add scroll listener
  if (navRef.value) {
    navRef.value.addEventListener('scroll', handleNavScroll);
    checkNavScroll();
  }
});
</script>

<style scoped>
.premium-nav-item {
  background: linear-gradient(135deg, rgb(249, 115, 22), rgb(234, 179, 8));
  color: white;
  font-weight: 600;
}
</style>
