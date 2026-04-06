import { afterEach, vi, beforeEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as extensions from '@testing-library/jest-dom/matchers';

// Extend the expect with testing-library matchers
expect.extend(extensions);

// Polyfill AbortSignal and AbortController for jsdom (needed by framer-motion)
if (typeof global.AbortController === 'undefined') {
  class AbortController {
    signal: any;
    constructor() {
      this.signal = new AbortSignal();
    }
    abort() {
      this.signal.aborted = true;
    }
  }

  class AbortSignal {
    aborted = false;
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }

  (global as any).AbortController = AbortController;
  (global as any).AbortSignal = AbortSignal;
}

// Ensure document.body exists and is properly accessible
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset document body if needed
  if (typeof document !== 'undefined' && document.body) {
    document.body.innerHTML = '';
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();

  // Reset body HTML
  if (typeof document !== 'undefined' && document.body) {
    document.body.innerHTML = '';
  }
});
