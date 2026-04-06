/**
 * Unpark Vehicle Page Object Model
 * 
 * Provides methods for interacting with the Unpark Vehicle screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Unpark Vehicle Page Object
 * 
 * Encapsulates all interactions with the Unpark Vehicle screen including:
 * - Session selection
 * - Session details display
 * - Fee calculation
 * - Unpark operation
 * - Result display
 */
export class UnparkVehiclePage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Session selection
  readonly activeSessionsLabel: any;
  readonly activeSessionsList: any;
  readonly sessionItem: any;
  readonly selectSessionButton: any;

  // Session details
  readonly sessionDetailsSection: any;
  readonly sessionIdLabel: any;
  readonly sessionIdValue: any;
  readonly vehicleTypeLabel: any;
  readonly vehicleTypeValue: any;
  readonly parkingSlotLabel: any;
  readonly parkingSlotValue: any;
  readonly entryTimeLabel: any;
  readonly entryTimeValue: any;
  readonly durationLabel: any;
  readonly durationValue: any;

  // Fee calculation
  readonly feeSection: any;
  readonly feeLabel: any;
  readonly feeValue: any;

  // Submit button
  readonly unparkButton: any;
  readonly unparkButtonText: any;

  // Result display
  readonly resultSection: any;
  readonly finalFeeLabel: any;
  readonly finalFeeValue: any;
  readonly exitTimeLabel: any;
  readonly exitTimeValue: any;

  // Actions
  readonly viewSessionButton: any;
  readonly unparkAnotherButton: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('unpark-vehicle-page'));
    this.title = element(by.text('Unpark Vehicle'));

    // Session selection
    this.activeSessionsLabel = element(by.text('Active Sessions'));
    this.activeSessionsList = element(by.id('active-sessions-list'));
    this.sessionItem = element(by.id('session-item'));
    this.selectSessionButton = element(by.id('select-session-button'));

    // Session details
    this.sessionDetailsSection = element(by.id('session-details-section'));
    this.sessionIdLabel = element(by.text('Session ID'));
    this.sessionIdValue = element(by.id('session-id-value'));
    this.vehicleTypeLabel = element(by.text('Vehicle Type'));
    this.vehicleTypeValue = element(by.id('vehicle-type-value'));
    this.parkingSlotLabel = element(by.text('Parking Slot'));
    this.parkingSlotValue = element(by.id('parking-slot-value'));
    this.entryTimeLabel = element(by.text('Entry Time'));
    this.entryTimeValue = element(by.id('entry-time-value'));
    this.durationLabel = element(by.text('Duration'));
    this.durationValue = element(by.id('duration-value'));

    // Fee calculation
    this.feeSection = element(by.id('fee-section'));
    this.feeLabel = element(by.text('Fee'));
    this.feeValue = element(by.id('fee-value'));

    // Submit button
    this.unparkButton = element(by.id('unpark-button'));
    this.unparkButtonText = element(by.text('Unpark'));

    // Result display
    this.resultSection = element(by.id('unpark-result-section'));
    this.finalFeeLabel = element(by.text('Final Fee'));
    this.finalFeeValue = element(by.id('final-fee-value'));
    this.exitTimeLabel = element(by.text('Exit Time'));
    this.exitTimeValue = element(by.id('exit-time-value'));

    // Actions
    this.viewSessionButton = element(by.id('view-session-button'));
    this.unparkAnotherButton = element(by.id('unpark-another-button'));
  }

  /**
   * Navigate to Unpark Vehicle screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Unpark Vehicle');
    await this.waitForLoad();
  }

  /**
   * Wait for Unpark Vehicle screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Select a session by index
   * @param index - The index of the session (0-based)
   */
  async selectSessionByIndex(index: number): Promise<void> {
    const sessionElement = this.sessionItem.atIndex(index);
    await waitFor(sessionElement)
      .toBeVisible()
      .withTimeout(5000);
    await sessionElement.tap();
    await this.waitForSessionDetails();
  }

  /**
   * Select a session by session ID
   * @param sessionId - The session ID to select
   */
  async selectSessionById(sessionId: string): Promise<void> {
    // Find session with matching ID and tap it
    const sessions = this.activeSessionsList;
    await waitFor(sessions)
      .toBeVisible()
      .withTimeout(5000);
    
    // Scroll through sessions to find the one with matching ID
    await sessions.scrollTo('bottom');
    
    const sessionElement = element(by.text(sessionId));
    await waitFor(sessionElement)
      .toBeVisible()
      .withTimeout(5000);
    await sessionElement.tap();
    await this.waitForSessionDetails();
  }

  /**
   * Wait for session details to be visible
   */
  async waitForSessionDetails(): Promise<void> {
    await waitFor(this.sessionDetailsSection)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Get session ID from selected session
   * @returns The session ID
   */
  async getSessionId(): Promise<string> {
    await waitFor(this.sessionIdValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('session-id-value');
  }

  /**
   * Get vehicle type from selected session
   * @returns The vehicle type
   */
  async getVehicleType(): Promise<string> {
    await waitFor(this.vehicleTypeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('vehicle-type-value');
  }

  /**
   * Get parking slot from selected session
   * @returns The parking slot
   */
  async getParkingSlot(): Promise<string> {
    await waitFor(this.parkingSlotValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('parking-slot-value');
  }

  /**
   * Get entry time from selected session
   * @returns The entry time
   */
  async getEntryTime(): Promise<string> {
    await waitFor(this.entryTimeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('entry-time-value');
  }

  /**
   * Get duration from selected session
   * @returns The duration
   */
  async getDuration(): Promise<string> {
    await waitFor(this.durationValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('duration-value');
  }

  /**
   * Get calculated fee from selected session
   * @returns The calculated fee
   */
  async getFee(): Promise<string> {
    await waitFor(this.feeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('fee-value');
  }

  /**
   * Click Unpark button
   */
  async clickUnpark(): Promise<void> {
    await this.click('unpark-button');
  }

  /**
   * Unpark the selected session
   */
  async unparkVehicle(): Promise<void> {
    await this.clickUnpark();
    await this.waitForLoadingToComplete();
  }

  /**
   * Get final fee after unparking
   * @returns The final fee
   */
  async getFinalFee(): Promise<string> {
    await waitFor(this.finalFeeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('final-fee-value');
  }

  /**
   * Get exit time after unparking
   * @returns The exit time
   */
  async getExitTime(): Promise<string> {
    await waitFor(this.exitTimeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('exit-time-value');
  }

  /**
   * Click View Session button
   */
  async clickViewSession(): Promise<void> {
    await this.click('view-session-button');
  }

  /**
   * Click Unpark Another button
   */
  async clickUnparkAnother(): Promise<void> {
    await this.click('unpark-another-button');
  }

  /**
   * Check if session details are visible
   * @returns True if session details are visible
   */
  async areSessionDetailsVisible(): Promise<boolean> {
    return await this.isVisible('session-details-section');
  }

  /**
   * Check if unpark button is enabled
   * @returns True if unpark button is enabled
   */
  async isUnparkButtonEnabled(): Promise<boolean> {
    return await this.isEnabled('unpark-button');
  }

  /**
   * Check if result section is visible
   * @returns True if result section is visible
   */
  async isResultVisible(): Promise<boolean> {
    return await this.isVisible('unpark-result-section');
  }

  /**
   * Get active sessions count
   * @returns The number of active sessions
   */
  async getActiveSessionsCount(): Promise<number> {
    return await this.getCount('session-item');
  }

  /**
   * Scroll to bottom of sessions list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('active-sessions-list');
  }

  /**
   * Verify unpark vehicle screen is displayed correctly
   */
  async verifyUnparkVehicleScreen(): Promise<void> {
    await this.waitForVisible();
    
    // Verify session list is visible
    await waitFor(this.activeSessionsLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.activeSessionsList)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify unpark button is visible
    await waitFor(this.unparkButton)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Verify unparking result
   * @param expectedFee - Expected final fee
   */
  async verifyUnparkResult(expectedFee: string): Promise<void> {
    await waitFor(this.resultSection)
      .toBeVisible()
      .withTimeout(5000);
    
    const actualFee = await this.getFinalFee();
    
    // Verify fee
    if (actualFee !== expectedFee) {
      throw new Error(`Fee mismatch: expected ${expectedFee}, got ${actualFee}`);
    }
    
    // Verify exit time is displayed
    await waitFor(this.exitTimeValue)
      .toBeVisible()
      .withTimeout(5000);
  }
}
