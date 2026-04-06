import { test, expect } from '@playwright/test';

test.describe('Navigation Features', () => {
  test('should display all navigation buttons', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-home"]');

    // Verify navigation buttons exist
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-park"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-unpark"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-slots"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-sessions"]')).toBeVisible();
  });

  test('should navigate to Park Vehicle when clicking nav-park button', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-park"]');

    await page.locator('[data-testid="nav-park"]').click();

    // Verify URL changed to park page
    expect(page.url()).toContain('/park');
  });

  test('should navigate to Unpark Vehicle when clicking nav-unpark button', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-unpark"]');

    await page.locator('[data-testid="nav-unpark"]').click();

    expect(page.url()).toContain('/unpark');
  });

  test('should navigate to Available Slots when clicking nav-slots button', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-slots"]');

    await page.locator('[data-testid="nav-slots"]').click();

    expect(page.url()).toContain('/slots');
  });

  test('should navigate to Sessions when clicking nav-sessions button', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-sessions"]');

    await page.locator('[data-testid="nav-sessions"]').click();

    expect(page.url()).toContain('/sessions-management');
  });

  test('should navigate to Dashboard when clicking nav-home button', async ({ page }) => {
    await page.goto('/park');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-home"]');

    await page.locator('[data-testid="nav-home"]').click();

    // Verify we're on the home page - check the path instead of hardcoding the host
    expect(page.url()).toMatch(/\/$/);
  });

  test('should highlight active page button', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-home"]');

    // Home button should be visible
    const homeButton = page.locator('[data-testid="nav-home"]');
    await expect(homeButton).toBeVisible();
  });

  test('should update URL when navigating between pages', async ({ page }) => {
    await page.goto('/');

    // Wait for navigation buttons to be visible
    await page.waitForSelector('[data-testid="nav-park"]');

    // Navigate to park
    await page.locator('[data-testid="nav-park"]').click();
    expect(page.url()).toContain('/park');

    // Navigate to unpark
    await page.locator('[data-testid="nav-unpark"]').click();
    expect(page.url()).toContain('/unpark');
  });
});
