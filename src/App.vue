<script setup lang="ts">
const features = [
  'Copy selection, full page, or just links',
  'Template library with placeholders and per-operation defaults',
  'Quick actions wired to Chrome command slots',
  'Offscreen clipboard fallback for restricted pages',
  'History, stats, and theme settings (sync + local storage)',
];

const entryPoints = [
  { label: 'Popup UI', path: '/src/popup/index.html' },
  { label: 'Options UI', path: '/src/options/index.html' },
  { label: 'Content script', path: '/src/content/index.ts' },
  { label: 'Background service worker', path: '/src/background/index.ts' },
];
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div class="brand">
        <img src="/assets/icon-48.png" alt="Markopy icon" class="logo" />
  <div>
          <p class="eyebrow">Markopy browser extension</p>
          <h1>Developer harness</h1>
          <p class="lede">
            This page exists only for the Vite dev server. The real UX lives in the popup and options pages
            delivered by the extension build.
          </p>
        </div>
      </div>
    </header>

    <section class="card">
      <h2>What's implemented</h2>
      <ul>
        <li v-for="item in features" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section class="card">
      <h2>Where to look</h2>
      <div class="grid">
        <a v-for="item in entryPoints" :key="item.path" :href="item.path" class="link-card">
          <span class="label">{{ item.label }}</span>
          <code>{{ item.path }}</code>
    </a>
  </div>
    </section>

    <section class="card">
      <h2>Run locally</h2>
      <ol>
        <li>Install deps: <code>npm install</code></li>
        <li>Dev with HMR: <code>npm run dev</code> (loads the CRX dev server)</li>
        <li>Production bundle: <code>npm run build</code> then load <code>dist/</code> as unpacked</li>
      </ol>
      <p class="note">
        Tip: use the popup and options pages during dev; this landing page is just a friendly placeholder so the
        starter "Hello World" is gone.
      </p>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  background: #0f172a;
  color: #e2e8f0;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
}

.shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
}

.brand {
  display: flex;
  gap: 16px;
  align-items: center;
}

.logo {
  width: 56px;
  height: 56px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  font-size: 12px;
  margin: 0 0 4px;
}

h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}

.lede {
  margin: 6px 0 0;
  color: #cbd5e1;
}

.card {
  background: #0b1220;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 12px;
}

ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.link-card {
  display: block;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  background: #11182a;
  transition: border-color 0.2s, transform 0.2s;
}

.link-card:hover {
  border-color: #60a5fa;
  transform: translateY(-1px);
}

.label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
}

code {
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 13px;
  color: #e2e8f0;
}

ol {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

.note {
  margin-top: 12px;
  color: #94a3b8;
}
</style>
