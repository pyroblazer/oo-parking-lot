/**
 * Park Vehicle Page Object Model
 * 
 * Provides methods for interacting with the Park Vehicle screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Park Vehicle Page Object
 * 
 * Encapsulates all interactions with the Park Vehicle screen including:
 * - Vehicle type selection
 * - Entry point selection
 * - Vehicle plate input
 * - Parking operation
 * - Result display
 */
export class ParkVehiclePage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Form inputs
  readonly vehicleTypeLabel: any;
  readonly vehicleTypePicker: any;
  readonly vehicleTypeSmall: any;
  readonly vehicleTypeMedium: any;
  readonly vehicleTypeLarge: any;

  readonly entryPointLabel: any;
  readonly entryPointPicker: any;

  readonly vehiclePlateLabel: any;
  readonly vehiclePlateInput: any;

  // Submit button
  readonly parkButton: any;
  readonly parkButtonText: any;

  // Result display
  readonly resultSection: any;
  readonly sessionIdLabel: any;
  readonly sessionIdValue: any;
  readonly slotLabel: any;
  readonly slotValue: any;
  readonly entryTimeLabel: any;
  readonly entryTimeValue: any;

  // Actions
  readonly viewSessionButton: any;
  readonly parkAnotherButton: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('park-vehicle-page'));
    this.title = element(by.text('Park Vehicle'));

    // Form inputs
    this.vehicleTypeLabel = element(by.text('Vehicle Type'));
    this.vehicleTypePicker = element(by.id('vehicle-type-picker'));
    this.vehicleTypeSmall = element(by.text('Small'));
    this.vehicleTypeMedium = element(by.text('Medium'));
    this.vehicleTypeLarge = element(by.text('Large'));

    this.entryPointLabel = element(by.text('Entry Point'));
    this.entryPointPicker = element(by.id('entry-point-picker'));

    this.vehiclePlateLabel = element(by.text('Vehicle Plate'));
    this.vehiclePlateInput = element(by.id('vehicle-plate-input'));

    // Submit button
    this.parkButton = element(by.id('park-button'));
    this.parkButtonText = element(by.text('Park'));

    // Result display
    this.resultSection = element(by.id('park-result-section'));
    this.sessionIdLabel = element(by.text('Session ID'));
    this.sessionIdValue = element(by.id('session-id-value'));
    this.slotLabel = element(by.text('Parking Slot'));
    this.slotValue = element(by.id('slot-value'));
    this.entryTimeLabel = element(by.text('Entry Time'));
    this.entryTimeValue = element(by.id('entry-time-value'));

    // Actions
    this.viewSessionButton = element(by.id('view-session-button'));
    this.parkAnotherButton = element(by.id('park-another-button'));
  }

  /**
   * Navigate to Park Vehicle screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Park Vehicle');
    await this.waitForLoad();
  }

  /**
   * Wait for Park Vehicle screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Select vehicle type
   * @param vehicleType - The vehicle type to select ('Small', 'Medium', 'Large')
   */
  async selectVehicleType(vehicleType: 'Small' | 'Medium' | 'Large'): Promise<void> {
    await this.selectOption('vehicle-type-picker', vehicleType);
  }

  /**
   * Select entry point
   * @param entryPointName - The entry point name to select
   */
  async selectEntryPoint(entryPointName: string): Promise<void> {
    await this.selectOption('entry-point-picker', entryPointName);
  }

  /**
   * Enter vehicle plate
   * @param plateNumber - The vehicle plate number
   */
  async enterVehiclePlate(plateNumber: string): Promise<void> {
    await this.fill('vehicle-plate-input', plateNumber);
  }

  /**
   * Click Park button
   */
  async clickPark(): Promise<void> {
    await this.click('park-button');
  }

  /**
   * Park a vehicle with specified details
   * @param vehicleType - The vehicle type
   * @param entryPointName - The entry point name
   * @param plateNumber - The vehicle plate number (optional)
   */
  async parkVehicle(
    vehicleType: 'Small' | 'Medium' | 'Large',
    entryPointName: string,
    plateNumber?: string
  ): Promise<void> {
    await this.selectVehicleType(vehicleType);
    await this.selectEntryPoint(entryPointName);
    
    if (plateNumber) {
      await this.enterVehiclePlate(plateNumber);
    }
    
    await this.clickPark();
    await this.waitForLoadingToComplete();
  }

  /**
   * Get session ID from result
   * @returns The session ID
   */
  async getSessionId(): Promise<string> {
    await waitFor(this.sessionIdValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('session-id-value');
  }

  /**
   * Get parking slot from result
   * @returns The parking slot
   */
  async getParkingSlot(): Promise<string> {
    await waitFor(this.slotValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('slot-value');
  }

  /**
   * Get entry time from result
   * @returns The entry time
   */
  async getEntryTime(): Promise<string> {
    await waitFor(this.entryTimeValue)
      .toBeVisible()
      .withTimeout(5000);
    return await this.getText('entry-time-value');
  }

  /**
   * Click View Session button
   */
  async clickViewSession(): Promise<void> {
    await this.click('view-session-button');
  }

  /**
   * Click Park Another button
   */
  async clickParkAnother(): Promise<void> {
    await this.click('park-another-button');
  }

  /**
   * Check if result section is visible
   * @returns True if result section is visible
   */
  async isResultVisible(): Promise<boolean> {
    return await this.isVisible('park-result-section');
  }

  /**
   * Check if park button is enabled
   * @returns True if park button is enabled
   */
  async isParkButtonEnabled(): Promise<boolean> {
    return await this.isEnabled('park-button');
  }

  /**
   * Verify park vehicle screen is displayed correctly
   */
  async verifyParkVehicleScreen(): Promise<void> {
    await this.waitForVisible();
    
    // Verify form elements are visible
    await waitFor(this.vehicleTypeLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.vehicleTypePicker)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.entryPointLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.entryPointPicker)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.vehiclePlateLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.vehiclePlateInput)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.parkButton)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Verify parking result is displayed
   * @param sessionId - Expected session ID
   * @param slotNumber - Expected slot number
   */
  async verifyParkingResult(sessionId: string, slotNumber: string): Promise<void> {
    await waitFor(this.resultSection)
      .toBeVisible()
      .withTimeout(5000);
    
    const actualSessionId = await this.getSessionId();
    const actualSlot = await this.getParkingSlot();
    
    // Verify session ID and slot
    if (actualSessionId !== sessionId) {
      throw new Error(`Session ID mismatch: expected ${sessionId}, got ${actualSessionId}`);
    }
    
    if (!actualSlot.includes(slotNumber)) {
      throw new Error(`Slot mismatch: expected ${slotNumber}, got ${actualSlot}`);
    }
  }
}
