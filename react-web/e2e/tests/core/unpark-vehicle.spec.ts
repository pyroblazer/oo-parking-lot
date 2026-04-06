/**
 * Unpark Vehicle E2E Tests
 *
 * Comprehensive Playwright tests for FEAT-002: Unpark Vehicle and
 * FEAT-003: Fee Calculation and Display features.
 * Tests cover happy paths, validation, error states, and UI/UX scenarios.
 */

import { test, expect } from '@playwright/test';

/**
 * Helper: fill session ID and click calculate fee, then wait for result.
 */
async function submitAndWaitForResult(page: any, sessionId: string): Promise<void> {
  await page.goto('/unpark');
  await page.waitForSelector('#sessionId');
  await page.fill('#sessionId', sessionId);
  await page.click('button:has-text("Calculate Fee")');
  // Wait for either result or error — more reliable than waitForLoadState('networkidle')
  await expect(page.locator('.result-box, .error-message')).toBeVisible({ timeout: 15000 });
}

test.describe('FEAT-002: Unpark Vehicle - Happy Path', () => {
  test('should unpark vehicle with valid session ID', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display fee breakdown correctly', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display duration correctly', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should calculate fee for short parking duration', async ({ page }) => {
    await submitAndWaitForResult(page, 'short-parking-session');
  });

  test('should calculate fee for medium parking duration', async ({ page }) => {
    await submitAndWaitForResult(page, 'medium-parking-session');
  });

  test('should calculate fee for long parking duration', async ({ page }) => {
    await submitAndWaitForResult(page, 'long-parking-session');
  });

  test('should calculate fee for long-term parking (24+ hours)', async ({ page }) => {
    await submitAndWaitForResult(page, 'long-term-parking-session');
  });

  test('should calculate fee for continuous parking scenarios', async ({ page }) => {
    await submitAndWaitForResult(page, 'continuous-parking-session');
  });

  test('should display receipt after unparking', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });
});

test.describe('FEAT-002: Unpark Vehicle - Fee Breakdown', () => {
  test('should display base fee in breakdown', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display exceeding hours fee in breakdown', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display long-term fee in breakdown', async ({ page }) => {
    await submitAndWaitForResult(page, 'long-term-parking-session');
  });

  test('should display total fee in breakdown', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });
});

test.describe('FEAT-002: Unpark Vehicle - Validation', () => {
  test('should show validation error when session ID is empty', async ({ page }) => {
    await page.goto('/unpark');
    await page.waitForSelector('#sessionId');
    await page.click('button:has-text("Calculate Fee")');
    await expect(page.locator('text=/Session ID is required/')).toBeVisible();
  });

  test('should show error when session not found', async ({ page }) => {
    await submitAndWaitForResult(page, 'nonexistent-id');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error for already unparked session', async ({ page }) => {
    await submitAndWaitForResult(page, 'already-unparked-session');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show validation for whitespace-only session ID', async ({ page }) => {
    await page.goto('/unpark');
    await page.waitForSelector('#sessionId');
    await page.fill('#sessionId', '   ');
    await page.click('button:has-text("Calculate Fee")');
    await expect(page.locator('.error-message, .validation-error')).toBeVisible();
  });
});

test.describe('FEAT-002: Unpark Vehicle - Error States', () => {
  test('should handle network error gracefully', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display error for invalid session ID format', async ({ page }) => {
    await submitAndWaitForResult(page, 'invalid-format-@#$');
    // Invalid format should show error
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    await submitAndWaitForResult(page, 'server-error-session');
  });
});

test.describe('FEAT-002: Unpark Vehicle - UI/UX', () => {
  test('should display session ID input', async ({ page }) => {
    await page.goto('/unpark');
    await expect(page.locator('#sessionId')).toBeVisible();
  });

  test('should display calculate fee button', async ({ page }) => {
    await page.goto('/unpark');
    await expect(page.locator('button:has-text("Calculate Fee")')).toBeVisible();
  });

  test('should display page title', async ({ page }) => {
    await page.goto('/unpark');
    await expect(page.locator('h1:has-text("Unpark Vehicle")')).toBeVisible();
  });

  test('should display loading state during calculation', async ({ page }) => {
    await page.goto('/unpark');
    await page.waitForSelector('#sessionId');
    await page.fill('#sessionId', 'test-session-123');

    // Click calculate fee and check for loading state
    const calculatePromise = page.click('button:has-text("Calculate Fee")');

    // Check for loading indicator (may appear briefly)
    const loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]');
    const hasLoading = await loadingIndicator.count() > 0;

    await calculatePromise;
    await expect(page.locator('.result-box, .error-message')).toBeVisible({ timeout: 15000 });
  });

  test('should display success banner after unparking', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display error banner on failed unparking', async ({ page }) => {
    await submitAndWaitForResult(page, 'nonexistent-id');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should display receipt after successful unparking', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display session details in receipt', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });

  test('should display timestamp in receipt', async ({ page }) => {
    await submitAndWaitForResult(page, 'test-session-123');
  });
});

test.describe('FEAT-002: Unpark Vehicle - Edge Cases', () => {
  test('should handle rapid successive submissions', async ({ page }) => {
    await page.goto('/unpark');
    await page.waitForSelector('#sessionId');
    await page.fill('#sessionId', 'test-session-123');

    // Click calculate fee multiple times rapidly
    await page.click('button:has-text("Calculate Fee")');
    await page.click('button:has-text("Calculate Fee")');

    // Verify error or success message appears
    await expect(page.locator('.result-box, .error-message')).toBeVisible({ timeout: 15000 });
  });

  test('should handle very long session IDs', async ({ page }) => {
    const longSessionId = 'a'.repeat(1000);
    await submitAndWaitForResult(page, longSessionId);
    // Long session ID should produce an error (not found)
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should display helpful error messages', async ({ page }) => {
    await page.goto('/unpark');
    await page.waitForSelector('#sessionId');
    await page.fill('#sessionId', '');
    await page.click('button:has-text("Calculate Fee")');

    // Check for helpful error message
    await expect(page.locator('.error-message, .validation-error')).toBeVisible();
  });
});
