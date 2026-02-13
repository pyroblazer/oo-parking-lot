/**
 * Bun test preload setup
 *
 * Loaded by bun test via bunfig.toml [test] preload.
 * This file initializes the DOM environment and sets up test utilities.
 */

import { afterEach, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';

// Initialize DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
});

// Set global DOM objects
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator as any;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;

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

// @testing-library/react cleanup after every test
afterEach(async () => {
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});
