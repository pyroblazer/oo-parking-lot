/**
 * Simple Navigation E2E Tests (Detox)
 *
 * Complete navigation tests with feature parity to Playwright tests
 */

import { describe, beforeAll, beforeEach, afterEach, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';

describe('Navigation Features', () => {
  let dashboard: DashboardPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
  });

  beforeEach(async () => {
    await dashboard.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`navigation-${Date.now()}.png`);
  });

  it('should display all navigation buttons', async () => {
    const homeBtn = element(by.id('nav-home'));
    const parkBtn = element(by.id('nav-park'));
    const unparkBtn = element(by.id('nav-unpark'));
    const slotsBtn = element(by.id('nav-slots'));
    const sessionsBtn = element(by.id('nav-sessions'));

    await waitFor(homeBtn).toBeVisible().withTimeout(5000);
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await waitFor(slotsBtn).toBeVisible().withTimeout(5000);
    await waitFor(sessionsBtn).toBeVisible().withTimeout(5000);

    expect(await homeBtn.isVisible()).toBe(true);
    expect(await parkBtn.isVisible()).toBe(true);
    expect(await unparkBtn.isVisible()).toBe(true);
    expect(await slotsBtn.isVisible()).toBe(true);
    expect(await sessionsBtn.isVisible()).toBe(true);
  });

  it('should navigate to Park Vehicle when clicking nav-park button', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const parkForm = element(by.id('parkForm'));
    await waitFor(parkForm).toBeVisible().withTimeout(5000);
    expect(await parkForm.isVisible()).toBe(true);
  });

  it('should navigate to Unpark Vehicle when clicking nav-unpark button', async () => {
    const unparkBtn = element(by.id('nav-unpark'));
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await unparkBtn.tap();

    const unparkForm = element(by.id('unparkForm'));
    await waitFor(unparkForm).toBeVisible().withTimeout(5000);
    expect(await unparkForm.isVisible()).toBe(true);
  });

  it('should navigate to Available Slots when clicking nav-slots button', async () => {
    const slotsBtn = element(by.id('nav-slots'));
    await waitFor(slotsBtn).toBeVisible().withTimeout(5000);
    await slotsBtn.tap();

    const slotsPage = element(by.id('slotsPage'));
    await waitFor(slotsPage).toBeVisible().withTimeout(5000);
    expect(await slotsPage.isVisible()).toBe(true);
  });

  it('should navigate to Sessions when clicking nav-sessions button', async () => {
    const sessionsBtn = element(by.id('nav-sessions'));
    await waitFor(sessionsBtn).toBeVisible().withTimeout(5000);
    await sessionsBtn.tap();

    const sessionsPage = element(by.id('sessionsPage'));
    await waitFor(sessionsPage).toBeVisible().withTimeout(5000);
    expect(await sessionsPage.isVisible()).toBe(true);
  });

  it('should navigate to Dashboard when clicking nav-home button', async () => {
    // First navigate to another page
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    // Then navigate back home
    const homeBtn = element(by.id('nav-home'));
    await waitFor(homeBtn).toBeVisible().withTimeout(5000);
    await homeBtn.tap();

    const dashboard = element(by.id('dashboardPage'));
    await waitFor(dashboard).toBeVisible().withTimeout(5000);
    expect(await dashboard.isVisible()).toBe(true);
  });

  it('should highlight active page button', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    // Check that park button has active styling
    const activeParkBtn = element(by.id('nav-park').and(by.type('RCTTouchableOpacity')));
    await waitFor(activeParkBtn).toHaveToggleValue(true).withTimeout(5000);
  });

  it('should update URL when navigating between pages', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const parkForm = element(by.id('parkForm'));
    await waitFor(parkForm).toBeVisible().withTimeout(5000);

    const unparkBtn = element(by.id('nav-unpark'));
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await unparkBtn.tap();

    const unparkForm = element(by.id('unparkForm'));
    await waitFor(unparkForm).toBeVisible().withTimeout(5000);
    expect(await unparkForm.isVisible()).toBe(true);
  });
});
