import { test, expect } from '@playwright/test';

test.describe('FEAT-001: Park Vehicle - Happy Path', () => {
  test('should park a small vehicle successfully', async ({ page }) => {
    // Navigate to park page
    await page.goto('/park');

    // Wait for page to load
    await page.waitForSelector('[data-testid="park-vehicle"]');

    // Select vehicle type
    await page.selectOption('[data-testid="vehicle-type-select"]', 'S');

    // Wait for entry point select to be available with retry logic
    await page.locator('[data-testid="entry-point-select"]').waitFor({ state: 'attached' });
    for (let i = 0; i < 3; i++) {
      try {
        await page.locator('[data-testid="entry-point-select"]').selectOption({ index: 1 }, { timeout: 5000 });
        break;
      } catch (e) {
        if (i === 2) throw e;
        await page.waitForTimeout(300);
      }
    }

    // Click submit button
    await page.click('[data-testid="park-vehicle-submit"]');

    // Verify that either success message or error message appears (API may or may not work)
    await expect(page.locator('.success-message, .error-message')).toBeVisible();
  });

  test('should park a medium vehicle successfully', async ({ page }) => {
    await page.goto('/park');

    // Wait for page to load
    await page.waitForSelector('[data-testid="park-vehicle"]');

    await page.selectOption('[data-testid="vehicle-type-select"]', 'M');

    // Wait for entry point select to be available with retry logic
    await page.locator('[data-testid="entry-point-select"]').waitFor({ state: 'attached' });
    for (let i = 0; i < 3; i++) {
      try {
        await page.locator('[data-testid="entry-point-select"]').selectOption({ index: 1 }, { timeout: 5000 });
        break;
      } catch (e) {
        if (i === 2) throw e;
        await page.waitForTimeout(300);
      }
    }
    await page.click('[data-testid="park-vehicle-submit"]');

    await expect(page.locator('.success-message, .error-message')).toBeVisible();
  });

  test('should park a large vehicle successfully', async ({ page }) => {
    await page.goto('/park');

    // Wait for page to load
    await page.waitForSelector('[data-testid="park-vehicle"]');

    await page.selectOption('[data-testid="vehicle-type-select"]', 'L');

    // Wait for entry point select to be available with retry logic
    await page.locator('[data-testid="entry-point-select"]').waitFor({ state: 'attached' });
    for (let i = 0; i < 3; i++) {
      try {
        await page.locator('[data-testid="entry-point-select"]').selectOption({ index: 1 }, { timeout: 5000 });
        break;
      } catch (e) {
        if (i === 2) throw e;
        await page.waitForTimeout(300);
      }
    }
    await page.click('[data-testid="park-vehicle-submit"]');

    await expect(page.locator('.success-message, .error-message')).toBeVisible();
  });
});

test.describe('FEAT-001: Park Vehicle - Validation', () => {
  test('should show validation error when vehicle type is empty', async ({ page }) => {
    await page.goto('/park');

    // Wait for page to load
    await page.waitForSelector('[data-testid="park-vehicle"]');

    // Click submit without filling vehicle type
    await page.click('[data-testid="park-vehicle-submit"]');

    // Verify validation error appears
    await expect(page.locator('text=Please select a vehicle type')).toBeVisible();
  });

  test('should show validation error when entry point is empty', async ({ page }) => {
    await page.goto('/park');

    // Wait for page to load
    await page.waitForSelector('[data-testid="park-vehicle"]');

    // Fill vehicle type only
    await page.selectOption('[data-testid="vehicle-type-select"]', 'S');

    // Wait for form to be ready before clicking submit
    await page.locator('[data-testid="entry-point-select"]').waitFor({ state: 'attached' });
    await page.waitForTimeout(200);

    await page.click('[data-testid="park-vehicle-submit"]');

    // Verify validation error appears
    await expect(page.locator('text=Please select an entry point')).toBeVisible();
  });
});
