import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * View Session Page Object Model
 * 
 * Represents the View Session page at '/session/:id' which displays
 * detailed information about a specific parking session.
 */
export class ViewSessionPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Session lookup form
  readonly sessionIdInput: Locator;
  readonly viewButton: Locator;
  readonly clearButton: Locator;

  // Session details card
  readonly sessionDetailsCard: Locator;
  readonly sessionIdDisplay: Locator;
  readonly sessionSlotNumber: Locator;
  readonly sessionVehiclePlate: Locator;
  readonly sessionVehicleType: Locator;
  readonly sessionEntryPoint: Locator;
  readonly sessionEntryTime: Locator;
  readonly sessionExitTime: Locator;
  readonly sessionDuration: Locator;
  readonly sessionStatus: Locator;
  readonly sessionFee: Locator;

  // Status badges
  readonly activeStatusBadge: Locator;
  readonly completedStatusBadge: Locator;
  readonly cancelledStatusBadge: Locator;

  // Fee breakdown section (for completed sessions)
  readonly feeBreakdownCard: Locator;
  readonly baseFeeRow: Locator;
  readonly baseFeeValue: Locator;
  readonly exceedingHoursRow: Locator;
  readonly exceedingHoursValue: Locator;
  readonly longTermFeeRow: Locator;
  readonly longTermFeeValue: Locator;
  readonly totalFeeRow: Locator;
  readonly totalFeeValue: Locator;

  // Unpark action (for active sessions)
  readonly unparkButton: Locator;
  readonly calculateFeeButton: Locator;

  // Actions section
  readonly actionsCard: Locator;
  readonly backToSessionsButton: Locator;
  readonly backToDashboardButton: Locator;

  // Error/Loading states
  readonly notFoundMessage: Locator;
  readonly loadingState: Locator;

  // Session history/timeline
  readonly timeline: Locator;
  readonly timelineItem: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /session details/i }).or(
      page.locator('h1, h2').filter({ hasText: /session details|view session/i })
    );

    // Session lookup form
    this.sessionIdInput = page.getByTestId('session-id-input').or(
      page.locator('input[name="sessionId"], input[placeholder*="session"], input[placeholder*="Session"]')
    );
    this.viewButton = page.getByTestId('view-button').or(
      page.locator('button:has-text("View"), button:has-text("Find"), button:has-text("Search")')
    );
    this.clearButton = page.getByTestId('clear-button').or(
      page.locator('button:has-text("Clear"), button:has-text("Reset")')
    );

    // Session details card
    this.sessionDetailsCard = page.getByTestId('session-details').or(
      page.locator('[data-testid*="session-details"], .session-details-card')
    );
    this.sessionIdDisplay = this.sessionDetailsCard.locator('[data-session-id], .session-id');
    this.sessionSlotNumber = this.sessionDetailsCard.locator('[data-slot-number], .slot-number');
    this.sessionVehiclePlate = this.sessionDetailsCard.locator('[data-vehicle-plate], .vehicle-plate');
    this.sessionVehicleType = this.sessionDetailsCard.locator('[data-vehicle-type], .vehicle-type');
    this.sessionEntryPoint = this.sessionDetailsCard.locator('[data-entry-point], .entry-point');
    this.sessionEntryTime = this.sessionDetailsCard.locator('[data-entry-time], .entry-time');
    this.sessionExitTime = this.sessionDetailsCard.locator('[data-exit-time], .exit-time');
    this.sessionDuration = this.sessionDetailsCard.locator('[data-duration], .duration');
    this.sessionStatus = this.sessionDetailsCard.locator('[data-status], .status-badge');
    this.sessionFee = this.sessionDetailsCard.locator('[data-fee], .fee-amount');

    // Status badges
    this.activeStatusBadge = page.locator('.status-badge.active, [data-status="active"]');
    this.completedStatusBadge = page.locator('.status-badge.completed, [data-status="completed"]');
    this.cancelledStatusBadge = page.locator('.status-badge.cancelled, [data-status="cancelled"]');

    // Fee breakdown section
    this.feeBreakdownCard = page.getByTestId('fee-breakdown').or(
      page.locator('[data-testid*="fee-breakdown"], .fee-breakdown-card')
    );
    this.baseFeeRow = this.feeBreakdownCard.locator('[data-fee-type="base"], .fee-row:has-text("Base")');
    this.baseFeeValue = this.baseFeeRow.locator('.fee-value, [data-value]');
    this.exceedingHoursRow = this.feeBreakdownCard.locator('[data-fee-type="exceeding"], .fee-row:has-text("Exceeding")');
    this.exceedingHoursValue = this.exceedingHoursRow.locator('.fee-value, [data-value]');
    this.longTermFeeRow = this.feeBreakdownCard.locator('[data-fee-type="long-term"], .fee-row:has-text("Long-term")');
    this.longTermFeeValue = this.longTermFeeRow.locator('.fee-value, [data-value]');
    this.totalFeeRow = this.feeBreakdownCard.locator('[data-fee-type="total"], .fee-row.total, .total-fee');
    this.totalFeeValue = this.totalFeeRow.locator('.fee-value, [data-value]');

    // Unpark action
    this.unparkButton = page.getByTestId('unpark-button').or(
      page.locator('button:has-text("Unpark"), button:has-text("Complete Exit")')
    );
    this.calculateFeeButton = page.getByTestId('calculate-fee-button').or(
      page.locator('button:has-text("Calculate Fee"), button:has-text("Calculate")')
    );

    // Actions section
    this.actionsCard = page.getByTestId('actions').or(
      page.locator('[data-testid*="actions"], .actions-card')
    );
    this.backToSessionsButton = page.locator('a[href="/sessions"], button:has-text("Back to Sessions")');
    this.backToDashboardButton = page.locator('a[href="/"], button:has-text("Back to Dashboard")');

    // Error/Loading states
    this.notFoundMessage = page.getByTestId('not-found').or(
      page.locator('[data-testid*="not-found"], .not-found-message')
    );
    this.loadingState = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading-state')
    );

    // Session history/timeline
    this.timeline = page.getByTestId('timeline').or(
      page.locator('[data-testid*="timeline"], .session-timeline')
    );
    this.timelineItem = this.timeline.locator('.timeline-item, [data-timeline-item]');
  }

  /**
   * Navigate to the View Session page
   * @param sessionId - Optional session ID to navigate directly to
   */
  async goto(sessionId?: string): Promise<void> {
    const path = sessionId ? `/session/${sessionId}` : '/session';
    await this.navigateTo(path);
  }

  /**
   * Navigate to a specific session by ID
   * @param sessionId - The session ID to view
   */
  async gotoSession(sessionId: string): Promise<void> {
    await this.navigateTo(`/session/${sessionId}`);
  }

  /**
   * Verify that the view session page has loaded
   * @returns True if the page is loaded and visible
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the view session page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Fill in the session ID
   * @param sessionId - The session ID to view
   */
  async fillSessionId(sessionId: string): Promise<void> {
    await this.clear(this.sessionIdInput);
    await this.fill(this.sessionIdInput, sessionId);
  }

  /**
   * Click the View button to look up the session
   */
  async clickViewButton(): Promise<void> {
    await this.click(this.viewButton);
  }

  /**
   * Click the Clear button to reset the form
   */
  async clickClearButton(): Promise<void> {
    await this.click(this.clearButton);
  }

  /**
   * View a session by ID
   * @param sessionId - The session ID to view
   */
  async viewSession(sessionId: string): Promise<void> {
    await this.fillSessionId(sessionId);
    await this.clickViewButton();
    await this.waitForElement(this.sessionDetailsCard);
  }

  /**
   * Get the session ID from the details card
   * @returns The session ID
   */
  async getSessionId(): Promise<string> {
    return await this.getText(this.sessionIdDisplay);
  }

  /**
   * Get the slot number
   * @returns The slot number
   */
  async getSlotNumber(): Promise<string> {
    return await this.getText(this.sessionSlotNumber);
  }

  /**
   * Get the vehicle plate number
   * @returns The vehicle plate number
   */
  async getVehiclePlate(): Promise<string> {
    return await this.getText(this.sessionVehiclePlate);
  }

  /**
   * Get the vehicle type
   * @returns The vehicle type
   */
  async getVehicleType(): Promise<string> {
    return await this.getText(this.sessionVehicleType);
  }

  /**
   * Get the entry point
   * @returns The entry point
   */
  async getEntryPoint(): Promise<string> {
    return await this.getText(this.sessionEntryPoint);
  }

  /**
   * Get the entry time
   * @returns The entry time
   */
  async getEntryTime(): Promise<string> {
    return await this.getText(this.sessionEntryTime);
  }

  /**
   * Get the exit time
   * @returns The exit time (empty string if session is active)
   */
  async getExitTime(): Promise<string> {
    return await this.getText(this.sessionExitTime);
  }

  /**
   * Get the duration
   * @returns The duration text
   */
  async getDuration(): Promise<string> {
    return await this.getText(this.sessionDuration);
  }

  /**
   * Get the session status
   * @returns The session status
   */
  async getStatus(): Promise<string> {
    return await this.getText(this.sessionStatus);
  }

  /**
   * Get the session fee
   * @returns The fee amount (0 if session is active)
   */
  async getFee(): Promise<number> {
    const text = await this.getText(this.sessionFee);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Check if the session is active
   * @returns True if the session status is active
   */
  async isSessionActive(): Promise<boolean> {
    return await this.isVisible(this.activeStatusBadge);
  }

  /**
   * Check if the session is completed
   * @returns True if the session status is completed
   */
  async isSessionCompleted(): Promise<boolean> {
    return await this.isVisible(this.completedStatusBadge);
  }

  /**
   * Check if the session is cancelled
   * @returns True if the session status is cancelled
   */
  async isSessionCancelled(): Promise<boolean> {
    return await this.isVisible(this.cancelledStatusBadge);
  }

  /**
   * Click the Unpark button
   */
  async clickUnparkButton(): Promise<void> {
    await this.click(this.unparkButton);
  }

  /**
   * Click the Calculate Fee button
   */
  async clickCalculateFeeButton(): Promise<void> {
    await this.click(this.calculateFeeButton);
    await this.waitForElement(this.feeBreakdownCard);
  }

  /**
   * Get the base fee from the fee breakdown
   * @returns The base fee amount
   */
  async getBaseFee(): Promise<number> {
    const text = await this.getText(this.baseFeeValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the exceeding hours fee from the fee breakdown
   * @returns The exceeding hours fee amount
   */
  async getExceedingHoursFee(): Promise<number> {
    const text = await this.getText(this.exceedingHoursValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the long-term fee from the fee breakdown
   * @returns The long-term fee amount
   */
  async getLongTermFee(): Promise<number> {
    const text = await this.getText(this.longTermFeeValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the total fee from the fee breakdown
   * @returns The total fee amount
   */
  async getTotalFee(): Promise<number> {
    const text = await this.getText(this.totalFeeValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Verify that session details are displayed
   * @returns True if session details are visible
   */
  async verifySessionDetailsDisplayed(): Promise<boolean> {
    return await this.isVisible(this.sessionDetailsCard);
  }

  /**
   * Verify that fee breakdown is displayed
   * @returns True if fee breakdown is visible
   */
  async verifyFeeBreakdownDisplayed(): Promise<boolean> {
    return await this.isVisible(this.feeBreakdownCard);
  }

  /**
   * Verify that the session status matches the expected status
   * @param expectedStatus - The expected status ('active', 'completed', or 'cancelled')
   * @returns True if the status matches
   */
  async verifyStatus(expectedStatus: 'active' | 'completed' | 'cancelled'): Promise<boolean> {
    const actualStatus = (await this.getStatus()).toLowerCase();
    return actualStatus === expectedStatus.toLowerCase();
  }

  /**
   * Verify session details match expected data
   * @param expectedData - Object containing expected session data
   * @returns True if all fields match
   */
  async verifySessionDetails(expectedData: {
    sessionId?: string;
    slotNumber?: string;
    vehiclePlate?: string;
    vehicleType?: string;
    entryPoint?: string;
    status?: 'active' | 'completed' | 'cancelled';
  }): Promise<boolean> {
    if (expectedData.sessionId !== undefined) {
      const actual = await this.getSessionId();
      if (actual !== expectedData.sessionId) return false;
    }
    if (expectedData.slotNumber !== undefined) {
      const actual = await this.getSlotNumber();
      if (actual !== expectedData.slotNumber) return false;
    }
    if (expectedData.vehiclePlate !== undefined) {
      const actual = await this.getVehiclePlate();
      if (actual !== expectedData.vehiclePlate) return false;
    }
    if (expectedData.vehicleType !== undefined) {
      const actual = await this.getVehicleType();
      if (actual.toLowerCase() !== expectedData.vehicleType.toLowerCase()) return false;
    }
    if (expectedData.entryPoint !== undefined) {
      const actual = await this.getEntryPoint();
      if (actual !== expectedData.entryPoint) return false;
    }
    if (expectedData.status !== undefined) {
      const actual = await this.getStatus();
      if (actual.toLowerCase() !== expectedData.status.toLowerCase()) return false;
    }
    return true;
  }

  /**
   * Click the Back to Sessions button
   */
  async clickBackToSessions(): Promise<void> {
    await this.click(this.backToSessionsButton);
    await this.page.waitForURL(/\/sessions/);
  }

  /**
   * Click the Back to Dashboard button
   */
  async clickBackToDashboard(): Promise<void> {
    await this.click(this.backToDashboardButton);
    await this.page.waitForURL(/\//);
  }

  /**
   * Check if the not found message is displayed
   * @returns True if not found message is visible
   */
  async isNotFound(): Promise<boolean> {
    return await this.isVisible(this.notFoundMessage);
  }

  /**
   * Get the not found message text
   * @returns The not found message text
   */
  async getNotFoundMessage(): Promise<string> {
    return await this.getText(this.notFoundMessage);
  }

  /**
   * Get the count of timeline items
   * @returns The number of timeline items
   */
  async getTimelineItemCount(): Promise<number> {
    return await this.timelineItem.count();
  }

  /**
   * Check if the unpark button is visible
   * @returns True if unpark button is visible
   */
  async isUnparkButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.unparkButton);
  }

  /**
   * Check if the calculate fee button is visible
   * @returns True if calculate fee button is visible
   */
  async isCalculateFeeButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.calculateFeeButton);
  }

  /**
   * Clear the lookup form
   */
  async clearForm(): Promise<void> {
    await this.clickClearButton();
  }
}
