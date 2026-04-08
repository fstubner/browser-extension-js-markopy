import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  // Inject test-safe env values so import.meta.env reads work in unit tests
  // without requiring a real .env file. These are test-only — never production values.
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:3000'),
    'import.meta.env.VITE_LEMONSQUEEZY_STORE_ID': JSON.stringify('test-store'),
    'import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID': JSON.stringify('test-variant'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Prevent the root Vitest run from executing backend tests (backend has its own Vitest config)
    exclude: [...configDefaults.exclude, 'backend/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Keep coverage focused on the extension codebase
      include: ['src/**'],
      exclude: [
        ...configDefaults.exclude,
        'backend/**',
        'scripts/**',
        'tests/**',
        '**/*.config.*',
        'vite.config.ts',
        'vitest.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
