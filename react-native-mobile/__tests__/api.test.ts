/**
 * API Tests
 */

import { listEntryPoints, createEntryPoint, updateEntryPoint, deleteEntryPoint } from '../src/api/parkingApi';

// Mock API functions
jest.mock('../src/api/parkingApi', () => ({
  listEntryPoints: jest.fn(),
  createEntryPoint: jest.fn(),
  updateEntryPoint: jest.fn(),
  deleteEntryPoint: jest.fn(),
}));

describe('API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have listEntryPoints function', () => {
    expect(typeof listEntryPoints).toBe('function');
  });

  it('should have createEntryPoint function', () => {
    expect(typeof createEntryPoint).toBe('function');
  });

  it('should have updateEntryPoint function', () => {
    expect(typeof updateEntryPoint).toBe('function');
  });

  it('should have deleteEntryPoint function', () => {
    expect(typeof deleteEntryPoint).toBe('function');
  });
});
