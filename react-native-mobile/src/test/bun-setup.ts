/**
 * Bun test preload setup
 *
 * This file is loaded by bun test via bunfig.toml [test] preload.
 * It sets up jsdom globals so @testing-library/react can find `document`
 * and `window`, and bridges vitest's `vi` helpers so existing test files
 * that import { vi } from 'vitest' continue to work.
 */

import { JSDOM } from 'jsdom';
import { afterEach, beforeEach } from 'bun:test';

// ── jsdom environment ────────────────────────────────────────────────────────
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

// Populate globals that @testing-library/react expects
(global as any).window   = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).Element    = dom.window.Element;
(global as any).Node       = dom.window.Node;
(global as any).Event      = dom.window.Event;
(global as any).MouseEvent = dom.window.MouseEvent;
(global as any).KeyboardEvent = dom.window.KeyboardEvent;
(global as any).MutationObserver = dom.window.MutationObserver;
(global as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
(global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
(global as any).cancelAnimationFrame  = clearTimeout;
(global as any).IntersectionObserver  = class {
  observe()   {}
  unobserve() {}
  disconnect() {}
};
(global as any).ResizeObserver = class {
  observe()   {}
  unobserve() {}
  disconnect() {}
};

// ── @testing-library cleanup ─────────────────────────────────────────────────
// Defer the import so it resolves after globals are in place
afterEach(async () => {
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});