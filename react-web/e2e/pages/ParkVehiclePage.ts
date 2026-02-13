import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Park Vehicle Page Object Model
 * 
 * Represents the Park Vehicle page at '/park' which allows users to park
 * incoming vehicles by selecting vehicle type and entry point.
 */
export class ParkVehiclePage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Form elements
  readonly vehiclePlateInput: Locator;
  readonly vehicleTypeSelect: Locator;
  readonly entryPointSelect: Locator;
  readonly parkButton: Locator;
  readonly resetButton: Locator;

  // Vehicle type options
  readonly smallVehicleOption: string;
  readonly mediumVehicleOption: string;
  readonly largeVehicleOption: string;

  // Success/Error banners
  readonly successBanner: Locator;
  readonly errorBanner: Locator;

  // Session ID display
  readonly sessionIdDisplay: Locator;
  readonly sessionIdLabel: Locator;
  readonly sessionIdValue: Locator;

  // Session details card
  readonly sessionDetailsCard: Locator;
  readonly sessionSlotNumber: Locator;
  readonly sessionVehicleType: Locator;
  readonly sessionEntryPoint: Locator;
  readonly sessionEntryTime: Locator;

  // View Session button
  readonly viewSessionButton: Locator;

  // Available slots preview
  readonly availableSlotsPreview: Locator;
  readonly availableSlotsCount: Locator;

  // Entry points info
  readonly entryPointsInfo: Locator;
  readonly entryPointItem: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /park vehicle/i }).or(
      page.locator('h1, h2').filter({ hasText: /park vehicle/i })
    );

    // Form elements
    this.vehiclePlateInput = page.getByTestId('vehicle-plate-input').or(
      page.locator('input[name="plateNumber"], input[placeholder*="plate"], input[placeholder*="Plate"]')
    );
    this.vehicleTypeSelect = page.getByTestId('vehicle-type-select').or(
      page.locator('select[name="vehicleType"], select[aria-label*="vehicle type"]')
    );
    this.entryPointSelect = page.getByTestId('entry-point-select').or(
      page.locator('select[name="entryPoint"], select[aria-label*="entry point"]')
    );
    this.parkButton = page.getByTestId('park-button').or(
      page.locator('button[type="submit"]:has-text("Park"), button:has-text("Park Vehicle")')
    );
    this.resetButton = page.getByTestId('reset-button').or(
      page.locator('button:has-text("Reset"), button:has-text("Clear")')
    );

    // Vehicle type options (values to select)
    this.smallVehicleOption = 'small';
    this.mediumVehicleOption = 'medium';
    this.largeVehicleOption = 'large';

    // Success/Error banners
    this.successBanner = page.getByTestId('success-message').or(
      page.locator('[data-testid*="success"], .success-banner, .alert-success')
    );
    this.errorBanner = page.getByTestId('error-message').or(
      page.locator('[data-testid*="error"], .error-banner, .alert-error')
    );

    // Session ID display
    this.sessionIdDisplay = page.getByTestId('session-id-display').or(
      page.locator('[data-testid*="session-id"], .session-id-display')
    );
    this.sessionIdLabel = this.sessionIdDisplay.locator('label, .label, [data-label]');
    this.sessionIdValue = this.sessionIdDisplay.locator('.value, [data-value], code, strong');

    // Session details card
    this.sessionDetailsCard = page.getByTestId('session-details').or(
      page.locator('[data-testid*="session-details"], .session-details-card')
    );
    this.sessionSlotNumber = this.sessionDetailsCard.locator('[data-slot-number], .slot-number');
    this.sessionVehicleType = this.sessionDetailsCard.locator('[data-vehicle-type], .vehicle-type');
    this.sessionEntryPoint = this.sessionDetailsCard.locator('[data-entry-point], .entry-point');
    this.sessionEntryTime = this.sessionDetailsCard.locator('[data-entry-time], .entry-time');

    // View Session button
    this.viewSessionButton = page.getByTestId('view-session-button').or(
      page.locator('a:has-text("View Session"), button:has-text("View Session")')
    );

    // Available slots preview
    this.availableSlotsPreview = page.getByTestId('available-slots-preview').or(
      page.locator('[data-testid*="available-slots"], .available-slots-preview')
    );
    this.availableSlotsCount = this.availableSlotsPreview.locator('.count, [data-count]');

    // Entry points info
    this.entryPointsInfo = page.getByTestId('entry-points-info').or(
      page.locator('[data-testid*="entry-points"], .entry-points-info')
    );
    this.entryPointItem = this.entryPointsInfo.locator('.entry-point-item, [data-entry-point-id]');
  }

  /**
   * Navigate to the Park Vehicle page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/park');
  }

  /**
   * Verify that the park vehicle page has loaded
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
   * Wait for the park vehicle page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Fill in the vehicle plate number
   * @param plateNumber - The vehicle plate number
   */
  async fillVehiclePlate(plateNumber: string): Promise<void> {
    await this.clear(this.vehiclePlateInput);
    await this.fill(this.vehiclePlateInput, plateNumber);
  }

  /**
   * Select the vehicle type
   * @param vehicleType - The vehicle type ('small', 'medium', or 'large')
   */
  async selectVehicleType(vehicleType: 'small' | 'medium' | 'large'): Promise<void> {
    await this.selectOption(this.vehicleTypeSelect, vehicleType);
  }

  /**
   * Select the entry point
   * @param entryPointId - The entry point ID or name
   */
  async selectEntryPoint(entryPointId: string): Promise<void> {
    await this.selectOption(this.entryPointSelect, entryPointId);
  }

  /**
   * Click the Park button to submit the form
   */
  async clickParkButton(): Promise<void> {
    await this.click(this.parkButton);
  }

  /**
   * Click the Reset button to clear the form
   */
  async clickResetButton(): Promise<void> {
    await this.click(this.resetButton);
  }

  /**
   * Park a vehicle with the given parameters
   * @param vehicleType - The vehicle type ('small', 'medium', or 'large')
   * @param entryPointId - The entry point ID or name
   * @param plateNumber - Optional vehicle plate number (auto-generated if not provided)
   * @returns The session ID if successful
   */
  async parkVehicle(
    vehicleType: 'small' | 'medium' | 'large',
    entryPointId: string,
    plateNumber?: string
  ): Promise<string> {
    // Fill in the form
    if (plateNumber) {
      await this.fillVehiclePlate(plateNumber);
    }
    await this.selectVehicleType(vehicleType);
    await this.selectEntryPoint(entryPointId);

    // Submit the form
    await this.clickParkButton();

    // Wait for success message
    await this.waitForSuccessMessage();

    // Get and return the session ID
    return await this.getSessionId();
  }

  /**
   * Get the session ID from the success display
   * @returns The session ID
   */
  async getSessionId(): Promise<string> {
    await this.waitForElement(this.sessionIdValue);
    return await this.getText(this.sessionIdValue);
  }

  /**
   * Get the slot number from the session details
   * @returns The slot number
   */
  async getSessionSlotNumber(): Promise<string> {
    return await this.getText(this.sessionSlotNumber);
  }

  /**
   * Get the vehicle type from the session details
   * @returns The vehicle type
   */
  async getSessionVehicleType(): Promise<string> {
    return await this.getText(this.sessionVehicleType);
  }

  /**
   * Get the entry point from the session details
   * @returns The entry point
   */
  async getSessionEntryPoint(): Promise<string> {
    return await this.getText(this.sessionEntryPoint);
  }

  /**
   * Get the entry time from the session details
   * @returns The entry time
   */
  async getSessionEntryTime(): Promise<string> {
    return await this.getText(this.sessionEntryTime);
  }

  /**
   * Verify that the success message is displayed
   * @returns True if success message is visible
   */
  async isSuccessDisplayed(): Promise<boolean> {
    return await this.isVisible(this.successBanner);
  }

  /**
   * Verify that the error message is displayed
   * @returns True if error message is visible
   */
  async isErrorDisplayed(): Promise<boolean> {
    return await this.isVisible(this.errorBanner);
  }

  /**
   * Get the success message text
   * @returns The success message text
   */
  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successBanner);
  }

  /**
   * Get the error message text
   * @returns The error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorBanner);
  }

  /**
   * Verify that the session was created successfully with the given session ID
   * @param sessionId - The expected session ID
   * @returns True if the session ID matches
   */
  async verifySuccess(sessionId: string): Promise<boolean> {
    const actualSessionId = await this.getSessionId();
    return actualSessionId === sessionId;
  }

  /**
   * Verify that the error message contains the expected text
   * @param expectedMessage - The expected error message (or part of it)
   * @returns True if the error message contains the expected text
   */
  async verifyError(expectedMessage: string): Promise<boolean> {
    const actualMessage = await this.getErrorMessage();
    return actualMessage.toLowerCase().includes(expectedMessage.toLowerCase());
  }

  /**
   * Click the View Session button to navigate to the session details page
   */
  async clickViewSession(): Promise<void> {
    await this.click(this.viewSessionButton);
    await this.page.waitForURL(/\/session\//);
  }

  /**
   * Get the available slots count
   * @returns The number of available slots
   */
  async getAvailableSlotsCount(): Promise<number> {
    const text = await this.getText(this.availableSlotsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get all available entry points
   * @returns Array of entry point names/IDs
   */
  async getAvailableEntryPoints(): Promise<string[]> {
    const options = await this.entryPointSelect.locator('option').allTextContents();
    return options.filter(option => option && option.trim() !== '');
  }

  /**
   * Check if the park button is enabled
   * @returns True if the park button is enabled
   */
  async isParkButtonEnabled(): Promise<boolean> {
    return await this.isEnabled(this.parkButton);
  }

  /**
   * Check if the form is valid (park button enabled)
   * @returns True if the form is valid
   */
  async isFormValid(): Promise<boolean> {
    return await this.isParkButtonEnabled();
  }

  /**
   * Verify that all form fields are present
   * @returns True if all form fields are visible
   */
  async verifyFormFieldsPresent(): Promise<boolean> {
    const plateVisible = await this.isVisible(this.vehiclePlateInput);
    const typeVisible = await this.isVisible(this.vehicleTypeSelect);
    const entryPointVisible = await this.isVisible(this.entryPointSelect);
    const parkButtonVisible = await this.isVisible(this.parkButton);

    return plateVisible && typeVisible && entryPointVisible && parkButtonVisible;
  }

  /**
   * Verify that session details are displayed
   * @returns True if session details are visible
   */
  async verifySessionDetailsDisplayed(): Promise<boolean> {
    return await this.isVisible(this.sessionDetailsCard);
  }

  /**
   * Clear the form
   */
  async clearForm(): Promise<void> {
    await this.clickResetButton();
  }

  /**
   * Get the current value of the vehicle plate input
   * @returns The current vehicle plate value
   */
  async getVehiclePlateValue(): Promise<string> {
    return await this.getValue(this.vehiclePlateInput);
  }

  /**
   * Get the current selected vehicle type
   * @returns The selected vehicle type
   */
  async getSelectedVehicleType(): Promise<string> {
    return await this.getValue(this.vehicleTypeSelect);
  }

  /**
   * Get the current selected entry point
   * @returns The selected entry point
   */
  async getSelectedEntryPoint(): Promise<string> {
    return await this.getValue(this.entryPointSelect);
  }
}
