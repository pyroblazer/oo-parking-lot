/**
 * Bun test preload setup
 *
 * Loaded by bun test via bunfig.toml [test] preload.
 * This file initializes the DOM environment and sets up test utilities.
 */

import { afterEach, beforeEach, expect } from 'bun:test';
import * as extensions from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// When using happy-dom environment in bunfig.toml, Bun automatically provides
// global window, document, and other DOM APIs. We just need to set up testing utilities.

// Polyfill AbortSignal and AbortController for framer-motion compatibility
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

// Ensure document.body exists and is clean before each test
beforeEach(() => {
  if (typeof document !== 'undefined' && document.body) {
    document.body.innerHTML = '';
  }
});

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

// Polyfill additional globals
(global as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(cb, 0);
(global as any).cancelAnimationFrame ??= clearTimeout;
(global as any).IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(global as any).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Extend expect with testing-library matchers
expect.extend(extensions);

// @testing-library/react cleanup after every test
afterEach(() => {
  cleanup();

  // Reset document body
  if (global.document && global.document.body) {
    global.document.body.innerHTML = '';
  }
});
