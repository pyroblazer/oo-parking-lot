/**
 * API Integration Tests for React Web
 *
 * Note: Full API tests with axios mocking are defined in component tests.
 * These tests verify the API module loads correctly.
 */
import { describe, it, expect } from 'vitest';

describe('API Module', () => {
  it('can import API functions', async () => {
    const api = await import('../api');
    expect(api).toBeDefined();
    expect(api.healthCheck).toBeDefined();
    expect(api.parkVehicle).toBeDefined();
    expect(api.getEntryPoints).toBeDefined();
  });
});
