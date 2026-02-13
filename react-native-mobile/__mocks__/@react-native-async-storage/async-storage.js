/**
 * Mock for @react-native-async-storage/async-storage
 */

const mockStorage = {};

const AsyncStorage = {
  getItem: jest.fn((key) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiGet: jest.fn((keys) => {
    const values = keys.map(key => [key, mockStorage[key] || null]);
    return Promise.resolve(values);
  }),
  multiSet: jest.fn((keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      mockStorage[key] = value;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach(key => delete mockStorage[key]);
    return Promise.resolve();
  }),
  multiMerge: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  flushGetRequests: jest.fn(() => Promise.resolve()),
};

// Clear mock storage before each test
beforeEach(() => {
  AsyncStorage.getItem.mockClear();
  AsyncStorage.setItem.mockClear();
  AsyncStorage.removeItem.mockClear();
  AsyncStorage.clear.mockClear();
  AsyncStorage.getAllKeys.mockClear();
  AsyncStorage.multiGet.mockClear();
  AsyncStorage.multiSet.mockClear();
  AsyncStorage.multiRemove.mockClear();
  AsyncStorage.multiMerge.mockClear();
  AsyncStorage.mergeItem.mockClear();
  AsyncStorage.flushGetRequests.mockClear();
  
  // Clear storage data
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
});

module.exports = AsyncStorage;
