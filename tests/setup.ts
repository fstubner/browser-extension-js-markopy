import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/dom';

afterEach(() => {
  cleanup();
});

// Mock chrome API for tests
if (typeof global.chrome === 'undefined') {
  global.chrome = {
    storage: {
      sync: {
        get: vi.fn((keys, callback) => {
          callback({});
        }),
        set: vi.fn((obj, callback) => {
          callback();
        }),
      },
      local: {
        get: vi.fn((keys, callback) => {
          callback({});
        }),
        set: vi.fn((obj, callback) => {
          callback();
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    runtime: {
      getURL: vi.fn((path) => path),
      sendMessage: vi.fn(async () => ({ success: true })),
    },
  } as any;
}
