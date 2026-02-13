import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object Model
 * 
 * Represents the Dashboard page at '/' which displays real-time monitoring
 * of the parking lot including statistics, slot grid, activity feed, and health status.
 */
export class DashboardPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Stats cards
  readonly totalSlotsCard: Locator;
  readonly availableSlotsCard: Locator;
  readonly occupiedSlotsCard: Locator;
  readonly activeSessionsCard: Locator;
  readonly totalRevenueCard: Locator;

  // Stats values
  readonly totalSlotsValue: Locator;
  readonly availableSlotsValue: Locator;
  readonly occupiedSlotsValue: Locator;
  readonly activeSessionsValue: Locator;
  readonly totalRevenueValue: Locator;

  // Slot grid
  readonly slotGrid: Locator;
  readonly slotItem: Locator;
  readonly availableSlot: Locator;
  readonly occupiedSlot: Locator;
  readonly maintenanceSlot: Locator;

  // Activity feed
  readonly activityFeed: Locator;
  readonly activityFeedItem: Locator;
  readonly activityTimestamp: Locator;
  readonly activityMessage: Locator;

  // Health status
  readonly healthBadge: Locator;
  readonly healthStatusText: Locator;
  readonly apiHealthIndicator: Locator;
  readonly dbHealthIndicator: Locator;

  // Quick actions
  readonly parkVehicleButton: Locator;
  readonly unparkVehicleButton: Locator;
  readonly viewSessionsButton: Locator;
  readonly manageSlotsButton: Locator;

  // Navigation
  readonly navDashboard: Locator;
  readonly navPark: Locator;
  readonly navUnpark: Locator;
  readonly navSessions: Locator;
  readonly navSlots: Locator;
  readonly navConfiguration: Locator;
  readonly navSettings: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /dashboard/i }).or(
      page.locator('h1').filter({ hasText: /dashboard/i })
    );

    // Stats cards
    this.totalSlotsCard = page.getByTestId('total-slots-card').or(
      page.locator('[data-testid*="total-slots"]')
    );
    this.availableSlotsCard = page.getByTestId('available-slots-card').or(
      page.locator('[data-testid*="available-slots"]')
    );
    this.occupiedSlotsCard = page.getByTestId('occupied-slots-card').or(
      page.locator('[data-testid*="occupied-slots"]')
    );
    this.activeSessionsCard = page.getByTestId('active-sessions-card').or(
      page.locator('[data-testid*="active-sessions"]')
    );
    this.totalRevenueCard = page.getByTestId('total-revenue-card').or(
      page.locator('[data-testid*="total-revenue"]')
    );

    // Stats values
    this.totalSlotsValue = page.getByTestId('total-slots-value').or(
      this.totalSlotsCard.locator('.value, [data-value]')
    );
    this.availableSlotsValue = page.getByTestId('available-slots-value').or(
      this.availableSlotsCard.locator('.value, [data-value]')
    );
    this.occupiedSlotsValue = page.getByTestId('occupied-slots-value').or(
      this.occupiedSlotsCard.locator('.value, [data-value]')
    );
    this.activeSessionsValue = page.getByTestId('active-sessions-value').or(
      this.activeSessionsCard.locator('.value, [data-value]')
    );
    this.totalRevenueValue = page.getByTestId('total-revenue-value').or(
      this.totalRevenueCard.locator('.value, [data-value]')
    );

    // Slot grid
    this.slotGrid = page.getByTestId('slot-grid').or(
      page.locator('[data-testid*="slot-grid"], .slot-grid')
    );
    this.slotItem = page.getByTestId('slot-item').or(
      this.slotGrid.locator('.slot, [data-slot-id]')
    );
    this.availableSlot = page.locator('.slot.available, [data-status="available"]');
    this.occupiedSlot = page.locator('.slot.occupied, [data-status="occupied"]');
    this.maintenanceSlot = page.locator('.slot.maintenance, [data-status="maintenance"]');

    // Activity feed
    this.activityFeed = page.getByTestId('activity-feed').or(
      page.locator('[data-testid*="activity-feed"], .activity-feed')
    );
    this.activityFeedItem = this.activityFeed.locator('.activity-item, [data-activity-id]');
    this.activityTimestamp = this.activityFeedItem.locator('.timestamp, [data-timestamp]');
    this.activityMessage = this.activityFeedItem.locator('.message, [data-message]');

    // Health status
    this.healthBadge = page.getByTestId('health-badge').or(
      page.locator('[data-testid*="health"], .health-badge')
    );
    this.healthStatusText = this.healthBadge.locator('.status-text, [data-status]');
    this.apiHealthIndicator = page.getByTestId('api-health').or(
      page.locator('[data-testid*="api-health"]')
    );
    this.dbHealthIndicator = page.getByTestId('db-health').or(
      page.locator('[data-testid*="db-health"]')
    );

    // Quick actions
    this.parkVehicleButton = page.getByRole('button', { name: /park vehicle/i }).or(
      page.locator('a[href="/park"], button:has-text("Park Vehicle")')
    );
    this.unparkVehicleButton = page.getByRole('button', { name: /unpark vehicle/i }).or(
      page.locator('a[href="/unpark"], button:has-text("Unpark Vehicle")')
    );
    this.viewSessionsButton = page.getByRole('button', { name: /view sessions/i }).or(
      page.locator('a[href="/sessions"], button:has-text("Sessions")')
    );
    this.manageSlotsButton = page.getByRole('button', { name: /manage slots/i }).or(
      page.locator('a[href="/slots"], a[href="/manage/slots"]')
    );

    // Navigation
    this.navDashboard = page.locator('nav a[href="/"]');
    this.navPark = page.locator('nav a[href="/park"]');
    this.navUnpark = page.locator('nav a[href="/unpark"]');
    this.navSessions = page.locator('nav a[href="/sessions"]');
    this.navSlots = page.locator('nav a[href="/slots"], nav a[href="/manage/slots"]');
    this.navConfiguration = page.locator('nav a[href="/configuration"]');
    this.navSettings = page.locator('nav a[href="/settings"]');
  }

  /**
   * Navigate to the Dashboard page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/');
  }

  /**
   * Verify that the dashboard page has loaded
   * @returns True if the page is loaded and visible
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the dashboard to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 2000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the total slots count
   * @returns The total number of slots
   */
  async getTotalSlots(): Promise<number> {
    const text = await this.getText(this.totalSlotsValue);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the available slots count
   * @returns The number of available slots
   */
  async getAvailableSlots(): Promise<number> {
    const text = await this.getText(this.availableSlotsValue);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the occupied slots count
   * @returns The number of occupied slots
   */
  async getOccupiedSlots(): Promise<number> {
    const text = await this.getText(this.occupiedSlotsValue);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the active sessions count
   * @returns The number of active sessions
   */
  async getActiveSessions(): Promise<number> {
    const text = await this.getText(this.activeSessionsValue);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the total revenue
   * @returns The total revenue amount
   */
  async getTotalRevenue(): Promise<number> {
    const text = await this.getText(this.totalRevenueValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the count of available slots in the grid
   * @returns The number of available slots displayed
   */
  async getAvailableSlotCount(): Promise<number> {
    return await this.availableSlot.count();
  }

  /**
   * Get the count of occupied slots in the grid
   * @returns The number of occupied slots displayed
   */
  async getOccupiedSlotCount(): Promise<number> {
    return await this.occupiedSlot.count();
  }

  /**
   * Get the count of maintenance slots in the grid
   * @returns The number of maintenance slots displayed
   */
  async getMaintenanceSlotCount(): Promise<number> {
    return await this.maintenanceSlot.count();
  }

  /**
   * Get all activity feed items
   * @returns Array of activity feed item locators
   */
  async getActivityFeedItems(): Promise<Locator[]> {
    const count = await this.activityFeedItem.count();
    const items: Locator[] = [];
    for (let i = 0; i < count; i++) {
      items.push(this.activityFeedItem.nth(i));
    }
    return items;
  }

  /**
   * Get the latest activity message
   * @returns The text of the latest activity message
   */
  async getLatestActivityMessage(): Promise<string> {
    const firstItem = this.activityFeedItem.first();
    await this.waitForElement(firstItem);
    return await this.getText(firstItem.locator(this.activityMessage));
  }

  /**
   * Get the health status
   * @returns The health status text (e.g., 'Healthy', 'Degraded', 'Down')
   */
  async getHealthStatus(): Promise<string> {
    return await this.getText(this.healthStatusText);
  }

  /**
   * Check if API health indicator shows healthy status
   * @returns True if API is healthy
   */
  async isApiHealthy(): Promise<boolean> {
    const text = await this.getText(this.apiHealthIndicator);
    return text.toLowerCase().includes('healthy') || text.toLowerCase().includes('up');
  }

  /**
   * Check if database health indicator shows healthy status
   * @returns True if database is healthy
   */
  async isDatabaseHealthy(): Promise<boolean> {
    const text = await this.getText(this.dbHealthIndicator);
    return text.toLowerCase().includes('healthy') || text.toLowerCase().includes('up');
  }

  /**
   * Navigate to Park Vehicle page
   */
  async goToParkVehicle(): Promise<void> {
    await this.click(this.parkVehicleButton);
    await this.page.waitForURL(/\/park/);
  }

  /**
   * Navigate to Unpark Vehicle page
   */
  async goToUnparkVehicle(): Promise<void> {
    await this.click(this.unparkVehicleButton);
    await this.page.waitForURL(/\/unpark/);
  }

  /**
   * Navigate to Sessions page
   */
  async goToSessions(): Promise<void> {
    await this.click(this.viewSessionsButton);
    await this.page.waitForURL(/\/sessions/);
  }

  /**
   * Navigate to Slots Management page
   */
  async goToManageSlots(): Promise<void> {
    await this.click(this.manageSlotsButton);
    await this.page.waitForURL(/\/(slots|manage\/slots)/);
  }

  /**
   * Navigate to Configuration page
   */
  async goToConfiguration(): Promise<void> {
    await this.click(this.navConfiguration);
    await this.page.waitForURL(/\/configuration/);
  }

  /**
   * Navigate to Settings page
   */
  async goToSettings(): Promise<void> {
    await this.click(this.navSettings);
    await this.page.waitForURL(/\/settings/);
  }

  /**
   * Verify that all stats cards are displayed
   * @returns True if all stats cards are visible
   */
  async verifyStatsCardsDisplayed(): Promise<boolean> {
    const totalSlotsVisible = await this.isVisible(this.totalSlotsCard);
    const availableSlotsVisible = await this.isVisible(this.availableSlotsCard);
    const occupiedSlotsVisible = await this.isVisible(this.occupiedSlotsCard);
    const activeSessionsVisible = await this.isVisible(this.activeSessionsCard);
    const totalRevenueVisible = await this.isVisible(this.totalRevenueCard);

    return totalSlotsVisible && availableSlotsVisible && occupiedSlotsVisible &&
           activeSessionsVisible && totalRevenueVisible;
  }

  /**
   * Verify that the slot grid is displayed
   * @returns True if the slot grid is visible
   */
  async verifySlotGridDisplayed(): Promise<boolean> {
    return await this.isVisible(this.slotGrid);
  }

  /**
   * Verify that the activity feed is displayed
   * @returns True if the activity feed is visible
   */
  async verifyActivityFeedDisplayed(): Promise<boolean> {
    return await this.isVisible(this.activityFeed);
  }

  /**
   * Verify that the health badge is displayed
   * @returns True if the health badge is visible
   */
  async verifyHealthBadgeDisplayed(): Promise<boolean> {
    return await this.isVisible(this.healthBadge);
  }

  /**
   * Verify dashboard data matches expected values
   * @param expectedData - Object containing expected values
   */
  async verifyDashboardData(expectedData: {
    totalSlots?: number;
    availableSlots?: number;
    occupiedSlots?: number;
    activeSessions?: number;
    totalRevenue?: number;
  }): Promise<boolean> {
    if (expectedData.totalSlots !== undefined) {
      const actual = await this.getTotalSlots();
      if (actual !== expectedData.totalSlots) return false;
    }
    if (expectedData.availableSlots !== undefined) {
      const actual = await this.getAvailableSlots();
      if (actual !== expectedData.availableSlots) return false;
    }
    if (expectedData.occupiedSlots !== undefined) {
      const actual = await this.getOccupiedSlots();
      if (actual !== expectedData.occupiedSlots) return false;
    }
    if (expectedData.activeSessions !== undefined) {
      const actual = await this.getActiveSessions();
      if (actual !== expectedData.activeSessions) return false;
    }
    if (expectedData.totalRevenue !== undefined) {
      const actual = await this.getTotalRevenue();
      if (actual !== expectedData.totalRevenue) return false;
    }
    return true;
  }

  /**
   * Click on a specific slot by its slot number
   * @param slotNumber - The slot number to click
   */
  async clickSlot(slotNumber: string): Promise<void> {
    const slot = this.slotItem.filter({ hasText: slotNumber });
    await this.click(slot);
  }

  /**
   * Get slot information by slot number
   * @param slotNumber - The slot number to get info for
   * @returns Object containing slot status and type
   */
  async getSlotInfo(slotNumber: string): Promise<{ status: string; type: string }> {
    const slot = this.slotItem.filter({ hasText: slotNumber });
    const status = await slot.getAttribute('data-status') || '';
    const type = await slot.getAttribute('data-type') || '';
    return { status, type };
  }

  /**
   * Refresh the dashboard data
   */
  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }
}
