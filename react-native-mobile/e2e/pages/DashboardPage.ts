/**
 * Dashboard Page Object Model
 * 
 * Provides methods for interacting with the Dashboard screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Dashboard Page Object
 * 
 * Encapsulates all interactions with the Dashboard screen including:
 * - Viewing statistics
 * - Quick actions
 * - Recent sessions
 * - Refresh functionality
 */
export class DashboardPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;
  readonly totalSessionsCard: any;
  readonly activeSessionsCard: any;
  readonly availableSlotsCard: any;
  readonly totalRevenueCard: any;

  // Statistics values
  readonly totalSessionsValue: any;
  readonly activeSessionsValue: any;
  readonly availableSlotsValue: any;
  readonly totalRevenueValue: any;

  // Quick actions
  readonly parkVehicleButton: any;
  readonly unparkVehicleButton: any;
  readonly viewSessionsButton: any;
  readonly configureButton: any;

  // Recent sessions
  readonly recentSessionsSection: any;
  readonly recentSessionsList: any;
  readonly recentSessionItem: any;

  // Refresh
  readonly refreshButton: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('dashboard-page'));
    this.title = element(by.text('Dashboard'));

    // Statistics cards
    this.totalSessionsCard = element(by.id('total-sessions-card'));
    this.activeSessionsCard = element(by.id('active-sessions-card'));
    this.availableSlotsCard = element(by.id('available-slots-card'));
    this.totalRevenueCard = element(by.id('total-revenue-card'));

    // Statistics values
    this.totalSessionsValue = element(by.id('total-sessions-value'));
    this.activeSessionsValue = element(by.id('active-sessions-value'));
    this.availableSlotsValue = element(by.id('available-slots-value'));
    this.totalRevenueValue = element(by.id('total-revenue-value'));

    // Quick actions
    this.parkVehicleButton = element(by.id('park-vehicle-button'));
    this.unparkVehicleButton = element(by.id('unpark-vehicle-button'));
    this.viewSessionsButton = element(by.id('view-sessions-button'));
    this.configureButton = element(by.id('configure-button'));

    // Recent sessions
    this.recentSessionsSection = element(by.id('recent-sessions-section'));
    this.recentSessionsList = element(by.id('recent-sessions-list'));
    this.recentSessionItem = element(by.id('recent-session-item'));

    // Refresh
    this.refreshButton = element(by.id('dashboard-refresh-button'));
  }

  /**
   * Navigate to Dashboard screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Dashboard');
    await this.waitForLoad();
  }

  /**
   * Wait for Dashboard to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Get total sessions count
   * @returns The total sessions count
   */
  async getTotalSessions(): Promise<string> {
    return await this.getText('total-sessions-value');
  }

  /**
   * Get active sessions count
   * @returns The active sessions count
   */
  async getActiveSessions(): Promise<string> {
    return await this.getText('active-sessions-value');
  }

  /**
   * Get available slots count
   * @returns The available slots count
   */
  async getAvailableSlots(): Promise<string> {
    return await this.getText('available-slots-value');
  }

  /**
   * Get total revenue
   * @returns The total revenue
   */
  async getTotalRevenue(): Promise<string> {
    return await this.getText('total-revenue-value');
  }

  /**
   * Click Park Vehicle button
   */
  async clickParkVehicle(): Promise<void> {
    await this.click('park-vehicle-button');
  }

  /**
   * Click Unpark Vehicle button
   */
  async clickUnparkVehicle(): Promise<void> {
    await this.click('unpark-vehicle-button');
  }

  /**
   * Click View Sessions button
   */
  async clickViewSessions(): Promise<void> {
    await this.click('view-sessions-button');
  }

  /**
   * Click Configure button
   */
  async clickConfigure(): Promise<void> {
    await this.click('configure-button');
  }

  /**
   * Click Refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.click('dashboard-refresh-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Tap on a recent session item
   * @param index - The index of the session item (0-based)
   */
  async tapRecentSession(index: number): Promise<void> {
    const sessionElement = this.recentSessionItem.atIndex(index);
    await waitFor(sessionElement)
      .toBeVisible()
      .withTimeout(5000);
    await sessionElement.tap();
  }

  /**
   * Check if statistics are visible
   * @returns True if statistics are visible
   */
  async areStatisticsVisible(): Promise<boolean> {
    return await this.isVisible('total-sessions-card');
  }

  /**
   * Check if quick actions are visible
   * @returns True if quick actions are visible
   */
  async areQuickActionsVisible(): Promise<boolean> {
    return await this.isVisible('park-vehicle-button');
  }

  /**
   * Check if recent sessions section is visible
   * @returns True if recent sessions are visible
   */
  async areRecentSessionsVisible(): Promise<boolean> {
    return await this.isVisible('recent-sessions-section');
  }

  /**
   * Check if refresh button is visible
   * @returns True if refresh button is visible
   */
  async isRefreshButtonVisible(): Promise<boolean> {
    return await this.isVisible('dashboard-refresh-button');
  }

  /**
   * Get recent sessions count
   * @returns The number of recent sessions
   */
  async getRecentSessionsCount(): Promise<number> {
    return await this.getCount('recent-session-item');
  }

  /**
   * Scroll to bottom of recent sessions
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('recent-sessions-list');
  }

  /**
   * Verify dashboard is displayed correctly
   */
  async verifyDashboard(): Promise<void> {
    await this.waitForVisible();
    
    // Verify statistics cards are visible
    await waitFor(this.totalSessionsCard)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.activeSessionsCard)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.availableSlotsCard)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.totalRevenueCard)
      .toBeVisible()
      .withTimeout(5000);

    // Verify quick actions are visible
    await waitFor(this.parkVehicleButton)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.unparkVehicleButton)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.viewSessionsButton)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.configureButton)
      .toBeVisible()
      .withTimeout(5000);
  }
}
