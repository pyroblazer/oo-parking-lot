import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Unpark Vehicle Page Object Model
 * 
 * Represents the Unpark Vehicle page at '/unpark' which allows users to process
 * vehicle exits and calculate parking fees.
 */
export class UnparkVehiclePage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Session lookup form
  readonly sessionIdInput: Locator;
  readonly lookupButton: Locator;
  readonly clearButton: Locator;

  // Session details card
  readonly sessionDetailsCard: Locator;
  readonly sessionSlotNumber: Locator;
  readonly sessionVehiclePlate: Locator;
  readonly sessionVehicleType: Locator;
  readonly sessionEntryPoint: Locator;
  readonly sessionEntryTime: Locator;
  readonly sessionDuration: Locator;
  readonly sessionStatus: Locator;

  // Fee calculation section
  readonly calculateFeeButton: Locator;
  readonly feeBreakdownCard: Locator;
  readonly baseFeeRow: Locator;
  readonly baseFeeValue: Locator;
  readonly exceedingHoursRow: Locator;
  readonly exceedingHoursValue: Locator;
  readonly longTermFeeRow: Locator;
  readonly longTermFeeValue: Locator;
  readonly totalFeeRow: Locator;
  readonly totalFeeValue: Locator;

  // Continuous parking badge
  readonly continuousParkingBadge: Locator;
  readonly continuousParkingText: Locator;

  // Unpark action
  readonly unparkButton: Locator;
  readonly confirmUnparkButton: Locator;
  readonly cancelUnparkButton: Locator;

  // Success/Error banners
  readonly successBanner: Locator;
  readonly errorBanner: Locator;

  // Receipt section
  readonly receiptCard: Locator;
  readonly receiptSessionId: Locator;
  readonly receiptTotalFee: Locator;
  readonly receiptExitTime: Locator;
  readonly printReceiptButton: Locator;
  readonly doneButton: Locator;

  // Active sessions list (for quick selection)
  readonly activeSessionsList: Locator;
  readonly activeSessionItem: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /unpark vehicle/i }).or(
      page.locator('h1, h2').filter({ hasText: /unpark vehicle/i })
    );

    // Session lookup form
    this.sessionIdInput = page.getByTestId('session-id-input').or(
      page.locator('input[name="sessionId"], input[placeholder*="session"], input[placeholder*="Session"]')
    );
    this.lookupButton = page.getByTestId('lookup-button').or(
      page.locator('button:has-text("Lookup"), button:has-text("Find"), button:has-text("Search")')
    );
    this.clearButton = page.getByTestId('clear-button').or(
      page.locator('button:has-text("Clear"), button:has-text("Reset")')
    );

    // Session details card
    this.sessionDetailsCard = page.getByTestId('session-details').or(
      page.locator('[data-testid*="session-details"], .session-details-card')
    );
    this.sessionSlotNumber = this.sessionDetailsCard.locator('[data-slot-number], .slot-number');
    this.sessionVehiclePlate = this.sessionDetailsCard.locator('[data-vehicle-plate], .vehicle-plate');
    this.sessionVehicleType = this.sessionDetailsCard.locator('[data-vehicle-type], .vehicle-type');
    this.sessionEntryPoint = this.sessionDetailsCard.locator('[data-entry-point], .entry-point');
    this.sessionEntryTime = this.sessionDetailsCard.locator('[data-entry-time], .entry-time');
    this.sessionDuration = this.sessionDetailsCard.locator('[data-duration], .duration');
    this.sessionStatus = this.sessionDetailsCard.locator('[data-status], .status-badge');

    // Fee calculation section
    this.calculateFeeButton = page.getByTestId('calculate-fee-button').or(
      page.locator('button:has-text("Calculate Fee"), button:has-text("Calculate")')
    );
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

    // Continuous parking badge
    this.continuousParkingBadge = page.getByTestId('continuous-parking-badge').or(
      page.locator('[data-testid*="continuous"], .continuous-parking-badge')
    );
    this.continuousParkingText = this.continuousParkingBadge.locator('.badge-text, [data-text]');

    // Unpark action
    this.unparkButton = page.getByTestId('unpark-button').or(
      page.locator('button:has-text("Unpark"), button:has-text("Complete Exit")')
    );
    this.confirmUnparkButton = page.getByTestId('confirm-unpark-button').or(
      page.locator('button:has-text("Confirm"), button:has-text("Yes")')
    );
    this.cancelUnparkButton = page.getByTestId('cancel-unpark-button').or(
      page.locator('button:has-text("Cancel"), button:has-text("No")')
    );

    // Success/Error banners
    this.successBanner = page.getByTestId('success-message').or(
      page.locator('[data-testid*="success"], .success-banner, .alert-success')
    );
    this.errorBanner = page.getByTestId('error-message').or(
      page.locator('[data-testid*="error"], .error-banner, .alert-error')
    );

    // Receipt section
    this.receiptCard = page.getByTestId('receipt').or(
      page.locator('[data-testid*="receipt"], .receipt-card')
    );
    this.receiptSessionId = this.receiptCard.locator('[data-session-id], .session-id');
    this.receiptTotalFee = this.receiptCard.locator('[data-total-fee], .total-fee');
    this.receiptExitTime = this.receiptCard.locator('[data-exit-time], .exit-time');
    this.printReceiptButton = page.getByTestId('print-receipt-button').or(
      page.locator('button:has-text("Print")')
    );
    this.doneButton = page.getByTestId('done-button').or(
      page.locator('button:has-text("Done"), button:has-text("Close")')
    );

    // Active sessions list
    this.activeSessionsList = page.getByTestId('active-sessions-list').or(
      page.locator('[data-testid*="active-sessions"], .active-sessions-list')
    );
    this.activeSessionItem = this.activeSessionsList.locator('.session-item, [data-session-id]');
  }

  /**
   * Navigate to the Unpark Vehicle page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/unpark');
  }

  /**
   * Verify that the unpark vehicle page has loaded
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
   * Wait for the unpark vehicle page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Fill in the session ID
   * @param sessionId - The session ID to look up
   */
  async fillSessionId(sessionId: string): Promise<void> {
    await this.clear(this.sessionIdInput);
    await this.fill(this.sessionIdInput, sessionId);
  }

  /**
   * Click the Lookup button to find the session
   */
  async clickLookupButton(): Promise<void> {
    await this.click(this.lookupButton);
  }

  /**
   * Click the Clear button to reset the form
   */
  async clickClearButton(): Promise<void> {
    await this.click(this.clearButton);
  }

  /**
   * Look up a session by ID
   * @param sessionId - The session ID to look up
   */
  async lookupSession(sessionId: string): Promise<void> {
    await this.fillSessionId(sessionId);
    await this.clickLookupButton();
    await this.waitForElement(this.sessionDetailsCard);
  }

  /**
   * Get the session slot number
   * @returns The slot number
   */
  async getSessionSlotNumber(): Promise<string> {
    return await this.getText(this.sessionSlotNumber);
  }

  /**
   * Get the session vehicle plate
   * @returns The vehicle plate number
   */
  async getSessionVehiclePlate(): Promise<string> {
    return await this.getText(this.sessionVehiclePlate);
  }

  /**
   * Get the session vehicle type
   * @returns The vehicle type
   */
  async getSessionVehicleType(): Promise<string> {
    return await this.getText(this.sessionVehicleType);
  }

  /**
   * Get the session entry point
   * @returns The entry point
   */
  async getSessionEntryPoint(): Promise<string> {
    return await this.getText(this.sessionEntryPoint);
  }

  /**
   * Get the session entry time
   * @returns The entry time
   */
  async getSessionEntryTime(): Promise<string> {
    return await this.getText(this.sessionEntryTime);
  }

  /**
   * Get the session duration
   * @returns The duration text
   */
  async getSessionDuration(): Promise<string> {
    return await this.getText(this.sessionDuration);
  }

  /**
   * Get the session status
   * @returns The session status
   */
  async getSessionStatus(): Promise<string> {
    return await this.getText(this.sessionStatus);
  }

  /**
   * Click the Calculate Fee button
   */
  async clickCalculateFeeButton(): Promise<void> {
    await this.click(this.calculateFeeButton);
    await this.waitForElement(this.feeBreakdownCard);
  }

  /**
   * Get the base fee
   * @returns The base fee amount
   */
  async getBaseFee(): Promise<number> {
    const text = await this.getText(this.baseFeeValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the exceeding hours fee
   * @returns The exceeding hours fee amount
   */
  async getExceedingHoursFee(): Promise<number> {
    const text = await this.getText(this.exceedingHoursValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the long-term fee
   * @returns The long-term fee amount
   */
  async getLongTermFee(): Promise<number> {
    const text = await this.getText(this.longTermFeeValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the total fee
   * @returns The total fee amount
   */
  async getTotalFee(): Promise<number> {
    const text = await this.getText(this.totalFeeValue);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Check if continuous parking badge is displayed
   * @returns True if continuous parking badge is visible
   */
  async isContinuousParkingBadgeDisplayed(): Promise<boolean> {
    return await this.isVisible(this.continuousParkingBadge);
  }

  /**
   * Get the continuous parking badge text
   * @returns The badge text
   */
  async getContinuousParkingBadgeText(): Promise<string> {
    return await this.getText(this.continuousParkingText);
  }

  /**
   * Click the Unpark button to start the unpark process
   */
  async clickUnparkButton(): Promise<void> {
    await this.click(this.unparkButton);
  }

  /**
   * Confirm the unpark action
   */
  async confirmUnpark(): Promise<void> {
    await this.click(this.confirmUnparkButton);
    await this.waitForElement(this.receiptCard);
  }

  /**
   * Cancel the unpark action
   */
  async cancelUnpark(): Promise<void> {
    await this.click(this.cancelUnparkButton);
  }

  /**
   * Unpark a vehicle by session ID
   * @param sessionId - The session ID to unpark
   */
  async unparkVehicle(sessionId: string): Promise<void> {
    await this.lookupSession(sessionId);
    await this.clickCalculateFeeButton();
    await this.clickUnparkButton();
    await this.confirmUnpark();
  }

  /**
   * Verify that the fee matches the expected amount
   * @param expectedFee - The expected total fee
   * @returns True if the fee matches
   */
  async verifyFee(expectedFee: number): Promise<boolean> {
    const actualFee = await this.getTotalFee();
    return Math.abs(actualFee - expectedFee) < 0.01;
  }

  /**
   * Verify that the duration matches the expected hours
   * @param expectedHours - The expected duration in hours
   * @returns True if the duration matches (within tolerance)
   */
  async verifyDuration(expectedHours: number): Promise<boolean> {
    const durationText = await this.getSessionDuration();
    const durationMatch = durationText.match(/(\d+\.?\d*)\s*hours?/i);
    if (!durationMatch) return false;
    
    const actualHours = parseFloat(durationMatch[1]);
    return Math.abs(actualHours - expectedHours) < 0.1;
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
   * Verify that receipt is displayed
   * @returns True if receipt is visible
   */
  async verifyReceiptDisplayed(): Promise<boolean> {
    return await this.isVisible(this.receiptCard);
  }

  /**
   * Get the receipt session ID
   * @returns The session ID from the receipt
   */
  async getReceiptSessionId(): Promise<string> {
    return await this.getText(this.receiptSessionId);
  }

  /**
   * Get the receipt total fee
   * @returns The total fee from the receipt
   */
  async getReceiptTotalFee(): Promise<number> {
    const text = await this.getText(this.receiptTotalFee);
    return parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
  }

  /**
   * Get the receipt exit time
   * @returns The exit time from the receipt
   */
  async getReceiptExitTime(): Promise<string> {
    return await this.getText(this.receiptExitTime);
  }

  /**
   * Click the Print Receipt button
   */
  async clickPrintReceipt(): Promise<void> {
    await this.click(this.printReceiptButton);
  }

  /**
   * Click the Done button to close the receipt
   */
  async clickDone(): Promise<void> {
    await this.click(this.doneButton);
  }

  /**
   * Get the count of active sessions
   * @returns The number of active sessions
   */
  async getActiveSessionsCount(): Promise<number> {
    return await this.activeSessionItem.count();
  }

  /**
   * Select an active session from the list
   * @param index - The index of the session to select (0-based)
   */
  async selectActiveSession(index: number): Promise<void> {
    const sessionItem = this.activeSessionItem.nth(index);
    await this.click(sessionItem);
  }

  /**
   * Get the session ID of an active session
   * @param index - The index of the session (0-based)
   * @returns The session ID
   */
  async getActiveSessionId(index: number): Promise<string> {
    const sessionItem = this.activeSessionItem.nth(index);
    return await sessionItem.getAttribute('data-session-id') || '';
  }

  /**
   * Check if the unpark button is enabled
   * @returns True if the unpark button is enabled
   */
  async isUnparkButtonEnabled(): Promise<boolean> {
    return await this.isEnabled(this.unparkButton);
  }

  /**
   * Get the success message
   * @returns The success message text
   */
  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successBanner);
  }

  /**
   * Get the error message
   * @returns The error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorBanner);
  }

  /**
   * Clear the lookup form
   */
  async clearForm(): Promise<void> {
    await this.clickClearButton();
  }
}
