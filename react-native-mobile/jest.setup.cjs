/**
 * Jest setup file for React Native tests
 */

// Set up globals for React Native testing
// Only define properties that don't already exist
if (!global.__DEV__) {
  Object.defineProperty(global, '__DEV__', {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  });
}

if (!global.cancelAnimationFrame) {
  Object.defineProperty(global, 'cancelAnimationFrame', {
    configurable: true,
    enumerable: true,
    value: (id) => clearTimeout(id),
    writable: true,
  });
}

if (!global.performance) {
  Object.defineProperty(global, 'performance', {
    configurable: true,
    enumerable: true,
    value: {
      now: () => Date.now(),
    },
    writable: true,
  });
}

if (!global.requestAnimationFrame) {
  Object.defineProperty(global, 'requestAnimationFrame', {
    configurable: true,
    enumerable: true,
    value: (callback) => setTimeout(() => callback(Date.now()), 0),
    writable: true,
  });
}

// window is already defined by jsdom, so we don't need to redefine it

// Mock pulseAnimation to prevent "pulseAnimation.start is not a function" errors
global.pulseAnimation = {
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
};
