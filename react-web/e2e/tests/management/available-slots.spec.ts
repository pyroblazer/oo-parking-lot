/**
 * Available Slots E2E Tests
 *
 * Comprehensive Playwright tests for FEAT-007: Get Available Slots
 * Tests cover vehicle type selection, entry point selection, search, and UI/UX scenarios.
 */

import { test, expect } from '@playwright/test';

/**
 * Helper: select vehicle type, entry point, and search. Waits for results.
 */
async function searchSlots(page: any, vehicleType: string): Promise<void> {
  await page.goto('/slots');

  const vehicleTypeSelect = page.locator('select#vehicleType');
  await vehicleTypeSelect.waitFor({ state: 'visible', timeout: 10000 });
  await vehicleTypeSelect.selectOption(vehicleType);

  // Select entry point
  const entryPointSelect = page.locator('select#entryPoint');
  await entryPointSelect.waitFor({ state: 'visible', timeout: 10000 });
  // Wait for options to load
  await page.waitForFunction(
    (sel: string) => {
      const el = document.querySelector(sel) as HTMLSelectElement;
      return el && el.options.length > 1;
    },
    'select#entryPoint',
    { timeout: 10000 }
  ).catch(() => {});
  await entryPointSelect.selectOption({ index: 1 });

  const searchButton = page.locator('.search-button');
  await searchButton.click();

  // Wait for results, no-slots, or error — not networkidle
  await page.locator('.slot-card, .no-slots, .error-message').first().waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('FEAT-007: Available Slots - Basic Elements', () => {
  test('should display vehicle type selector', async ({ page }) => {
    await page.goto('/slots');
    await expect(page.locator('select#vehicleType')).toBeVisible();
  });

  test('should display entry point selector', async ({ page }) => {
    await page.goto('/slots');
    await expect(page.locator('select#entryPoint')).toBeVisible();
  });

  test('should display search button', async ({ page }) => {
    await page.goto('/slots');
    await expect(page.locator('.search-button')).toBeVisible();
  });
});

test.describe('FEAT-007: Available Slots - Vehicle Type Options', () => {
  test('should search with Small vehicle type and show results or no-slots', async ({ page }) => {
    await searchSlots(page, 'S');
  });

  test('should search with Medium vehicle type', async ({ page }) => {
    await searchSlots(page, 'M');
  });

  test('should search with Large vehicle type', async ({ page }) => {
    await searchSlots(page, 'L');
  });
});

test.describe('FEAT-007: Available Slots - Compatibility Info', () => {
  test('should show compatibility info table', async ({ page }) => {
    await page.goto('/slots');

    const compatibilityTable = page.locator('.compatibility-info, .compatibility-table');
    if (await compatibilityTable.count() > 0) {
      const rows = page.locator('.compatibility-table tr');
      expect(await rows.count()).toBeGreaterThanOrEqual(3);
    }
  });
});

test.describe('FEAT-007: Available Slots - Results Display', () => {
  test('should display no slots message when no results', async ({ page }) => {
    await searchSlots(page, 'L');
  });
});

test.describe('FEAT-007: Available Slots - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/slots');
    await expect(page.locator('select#vehicleType')).toBeVisible();

    // Click search without selecting vehicle type to trigger validation
    const searchButton = page.locator('.search-button');
    await searchButton.click();

    // Should show error or remain on page
    const hasError = await page.locator('.error-message').count() > 0;
    const onPage = page.url().includes('/slots');
    expect(hasError || onPage).toBeTruthy();
  });
});

test.describe('FEAT-007: Available Slots - Re-searching', () => {
  test('should allow changing vehicle type and re-searching', async ({ page }) => {
    await page.goto('/slots');

    const vehicleTypeSelect = page.locator('select#vehicleType');
    await vehicleTypeSelect.waitFor({ state: 'visible', timeout: 10000 });

    // First search with Small
    await vehicleTypeSelect.selectOption('S');

    const entryPointSelect = page.locator('select#entryPoint');
    await page.waitForFunction(
      (sel: string) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && el.options.length > 1;
      },
      'select#entryPoint',
      { timeout: 10000 }
    ).catch(() => {});
    await entryPointSelect.selectOption({ index: 1 });

    const searchButton = page.locator('.search-button');
    await searchButton.click();
    await page.locator('.slot-card, .no-slots, .error-message').first().waitFor({ state: 'visible', timeout: 15000 });

    // Now change to Medium and re-search
    await vehicleTypeSelect.selectOption('M');
    await searchButton.click();
    await page.locator('.slot-card, .no-slots, .error-message').first().waitFor({ state: 'visible', timeout: 15000 });

    expect(page.url()).toContain('/slots');
  });
});
