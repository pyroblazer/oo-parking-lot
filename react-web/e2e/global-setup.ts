/**
 * Global Setup for Playwright E2E Tests
 *
 * Initializes the parking lot system once before all tests run.
 * This avoids per-test initialization which was causing connection issues in CI.
 */

import { chromium } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8082';
const MAX_RETRIES = 30;
const RETRY_DELAY = 2000;

async function waitForApiReady() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        console.log('✓ API is ready');
        // Additional wait to ensure API is fully ready for requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
    } catch (error) {
      console.log(`Waiting for API... (${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error(`API did not become ready after ${MAX_RETRIES} retries`);
}

async function initializeSystem(apiBaseUrl: string) {
  const initData = {
    entry_points: [
      { identifier: 'A', name: 'Entry Point A' },
      { identifier: 'B', name: 'Entry Point B' },
      { identifier: 'C', name: 'Entry Point C' },
    ],
    parking_slots: [
      { slot_label: 'SP-1', slot_type: 'SP', distances: [5, 15, 25] },
      { slot_label: 'SP-2', slot_type: 'SP', distances: [10, 5, 15] },
      { slot_label: 'SP-3', slot_type: 'SP', distances: [15, 5, 5] },
      { slot_label: 'MP-1', slot_type: 'MP', distances: [10, 10, 20] },
      { slot_label: 'MP-2', slot_type: 'MP', distances: [20, 10, 10] },
      { slot_label: 'LP-1', slot_type: 'LP', distances: [15, 15, 15] },
      { slot_label: 'LP-2', slot_type: 'LP', distances: [2, 5, 6] },
    ],
  };

  const MAX_INIT_RETRIES = 5;
  const INIT_RETRY_DELAY = 1000;

  for (let i = 0; i < MAX_INIT_RETRIES; i++) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initData),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Initialization attempt ${i + 1}/${MAX_INIT_RETRIES} failed (${response.status}):`, error);
        if (i < MAX_INIT_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY));
          continue;
        }
        throw new Error(`Failed to initialize system: ${response.status} ${error}`);
      }

      const result = await response.json();
      console.log('✓ System initialized:', result);

      // Additional delay after successful initialization to ensure data is committed
      await new Promise(resolve => setTimeout(resolve, 2000));
      return result;
    } catch (error) {
      console.error(`Initialization attempt ${i + 1}/${MAX_INIT_RETRIES} error:`, error);
      if (i < MAX_INIT_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

export default async function globalSetup() {
  console.log('\n=== Global Setup: Initializing Parking Lot System ===\n');

  try {
    // Wait for API to be ready
    await waitForApiReady();

    // Initialize the system
    await initializeSystem(API_BASE_URL);

    console.log('✓ Global setup completed successfully\n');
  } catch (error) {
    console.error('✗ Global setup failed:', error);
    process.exit(1);
  }
}
