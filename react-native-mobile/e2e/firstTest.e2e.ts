/**
 * First Detox E2E Test
 * 
 * A simple smoke test to verify that Detox is properly configured
 * and the app can be launched and interacted with.
 */

import { expect, element, by } from 'detox';

describe('First Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have welcome screen', async () => {
    // This is a placeholder test
    // In a real app, you would verify the welcome screen is visible
    // For now, we'll just verify the app launches successfully
    
    const appElement = element(by.id('app-root'));
    await expect(appElement).toBeVisible();
  });

  it('should display dashboard', async () => {
    // Navigate to dashboard and verify it's visible
    const dashboardElement = element(by.text('Dashboard'));
    await expect(dashboardElement).toBeVisible();
    await dashboardElement.tap();
    
    const pageTitle = element(by.id('header-title'));
    await expect(pageTitle).toHaveText('Dashboard');
  });

  it('should navigate between screens', async () => {
    // Test basic navigation
    const sessionsElement = element(by.text('Sessions'));
    await expect(sessionsElement).toBeVisible();
    await sessionsElement.tap();
    
    const backElement = element(by.id('header-back-button'));
    await expect(backElement).toBeVisible();
    await backElement.tap();
    
    const dashboardElement = element(by.text('Dashboard'));
    await expect(dashboardElement).toBeVisible();
  });
});
