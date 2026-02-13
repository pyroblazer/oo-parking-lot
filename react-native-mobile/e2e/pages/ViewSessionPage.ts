/**
 * View Session Page Object Model
 * 
 * Provides methods for interacting with the View Session screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * View Session Page Object
 * 
 * Encapsulates all interactions with the View Session screen including:
 * - Session details display
 * - Session actions
 * - Navigation
 */
export class ViewSessionPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Session details
  readonly sessionIdLabel: any;
  readonly sessionIdValue: any;
  readonly copySessionIdButton: any;

  readonly vehicleTypeLabel: any;
  readonly vehicleTypeValue: any;

  readonly vehiclePlateLabel: any;
  readonly vehiclePlateValue: any;

  readonly parkingSlotLabel: any;
  readonly parkingSlotValue: any;

  readonly entryPointLabel: any;
  readonly entryPointValue: any;

  readonly entryTimeLabel: any;
  readonly entryTimeValue: any;

  readonly exitTimeLabel: any;
  readonly exitTimeValue: any;

  readonly durationLabel: any;
  readonly durationValue: any;

  readonly statusLabel: any;
  readonly statusValue: any;

  readonly feeLabel: any;
  readonly feeValue: any;

  // Actions
  readonly parkVehicleButton: any;
  readonly unparkVehicleButton: any;
  readonly sessionsListButton: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('view-session-page'));
    this.title = element(by.text('View Session'));

    // Session details
    this.sessionIdLabel = element(by.text('Session ID'));
    this.sessionIdValue = element(by.id('session-id-value'));
    this.copySessionIdButton = element(by.id('copy-session-id-button'));

    this.vehicleTypeLabel = element(by.text('Vehicle Type'));
    this.vehicleTypeValue = element(by.id('vehicle-type-value'));

    this.vehiclePlateLabel = element(by.text('Vehicle Plate'));
    this.vehiclePlateValue = element(by.id('vehicle-plate-value'));

    this.parkingSlotLabel = element(by.text('Parking Slot'));
    this.parkingSlotValue = element(by.id('parking-slot-value'));

    this.entryPointLabel = element(by.text('Entry Point'));
    this.entryPointValue = element(by.id('entry-point-value'));

    this.entryTimeLabel = element(by.text('Entry Time'));
    this.entryTimeValue = element(by.id('entry-time-value'));

    this.exitTimeLabel = element(by.text('Exit Time'));
    this.exitTimeValue = element(by.id('exit-time-value'));

    this.durationLabel = element(by.text('Duration'));
    this.durationValue = element(by.id('duration-value'));

    this.statusLabel = element(by.text('Status'));
    this.statusValue = element(by.id('status-value'));

    this.feeLabel = element(by.text('Fee'));
    this.feeValue = element(by.id('fee-value'));

    // Actions
    this.parkVehicleButton = element(by.id('park-vehicle-button'));
    this.unparkVehicleButton = element(by.id('unpark-vehicle-button'));
    this.sessionsListButton = element(by.id('sessions-list-button'));
  }

  /**
   * Navigate to View Session screen with session ID
   * @param sessionId - The session ID to view
   */
  async navigate(sessionId: string): Promise<void> {
    // First navigate to sessions list
    await this.navigateTo('Sessions');
    await this.waitForLoad();
    
    // Then navigate to specific session
    const sessionElement = element(by.text(sessionId));
    await waitFor(sessionElement)
      .toBeVisible()
      .withTimeout(5000);
    await sessionElement.tap();
    await this.waitForLoad();
  }

  /**
   * Wait for View Session screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Get session ID
   * @returns The session ID
   */
  async getSessionId(): Promise<string> {
    await waitFor(this.sessionIdValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('session-id-value');
  }

  /**
   * Get vehicle type
   * @returns The vehicle type
   */
  async getVehicleType(): Promise<string> {
    await waitFor(this.vehicleTypeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('vehicle-type-value');
  }

  /**
   * Get vehicle plate
   * @returns The vehicle plate
   */
  async getVehiclePlate(): Promise<string> {
    await waitFor(this.vehiclePlateValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('vehicle-plate-value');
  }

  /**
   * Get parking slot
   * @returns The parking slot
   */
  async getParkingSlot(): Promise<string> {
    await waitFor(this.parkingSlotValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('parking-slot-value');
  }

  /**
   * Get entry point
   * @returns The entry point
   */
  async getEntryPoint(): Promise<string> {
    await waitFor(this.entryPointValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('entry-point-value');
  }

  /**
   * Get entry time
   * @returns The entry time
   */
  async getEntryTime(): Promise<string> {
    await waitFor(this.entryTimeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('entry-time-value');
  }

  /**
   * Get exit time
   * @returns The exit time
   */
  async getExitTime(): Promise<string> {
    if (await this.isVisible('exit-time-value')) {
      await waitFor(this.exitTimeValue)
        .toBeVisible()
        .withTimeout(5000);
      return await this.getText('exit-time-value');
    }
    return '';
  }

  /**
   * Get duration
   * @returns The duration
   */
  async getDuration(): Promise<string> {
    await waitFor(this.durationValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('duration-value');
  }

  /**
   * Get status
   * @returns The status
   */
  async getStatus(): Promise<string> {
    await waitFor(this.statusValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('status-value');
  }

  /**
   * Get fee
   * @returns The fee
   */
  async getFee(): Promise<string> {
    if (await this.isVisible('fee-value')) {
      await waitFor(this.feeValue)
        .toBeVisible()
        .withTimeout(5000);
      return await this.getText('fee-value');
    }
    return '';
  }

  /**
   * Click copy session ID button
   */
  async clickCopySessionId(): Promise<void> {
    await this.click('copy-session-id-button');
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
   * Click Sessions List button
   */
  async clickSessionsList(): Promise<void> {
    await this.click('sessions-list-button');
  }

  /**
   * Check if session is active
   * @returns True if session is active
   */
  async isSessionActive(): Promise<boolean> {
    const status = await this.getStatus();
    return status.toLowerCase() === 'active';
  }

  /**
   * Check if session is completed
   * @returns True if session is completed
   */
  async isSessionCompleted(): Promise<boolean> {
    const status = await this.getStatus();
    return status.toLowerCase() === 'completed';
  }

  /**
   * Check if exit time is visible
   * @returns True if exit time is visible
   */
  async isExitTimeVisible(): Promise<boolean> {
    return await this.isVisible('exit-time-value');
  }

  /**
   * Check if fee is visible
   * @returns True if fee is visible
   */
  async isFeeVisible(): Promise<boolean> {
    return await this.isVisible('fee-value');
  }

  /**
   * Verify view session screen is displayed correctly
   * @param sessionId - Expected session ID
   */
  async verifyViewSessionScreen(sessionId: string): Promise<void> {
    await this.waitForVisible();
    
    const actualSessionId = await this.getSessionId();
    
    // Verify session ID
    if (actualSessionId !== sessionId) {
      throw new Error(`Session ID mismatch: expected ${sessionId}, got ${actualSessionId}`);
    }
    
    // Verify session details are visible
    await waitFor(this.vehicleTypeValue)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.parkingSlotValue)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.entryPointValue)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.entryTimeValue)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.statusValue)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.durationValue)
      .toBeVisible()
      .withTimeout(5000);
  }
}
