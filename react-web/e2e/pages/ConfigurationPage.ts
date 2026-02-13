import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Configuration Page Object Model
 * 
 * Represents the Configuration page at '/configuration' which allows
 * system initialization and configuration management.
 */
export class ConfigurationPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Tabs
  readonly entryPointsTab: Locator;
  readonly parkingSlotsTab: Locator;
  readonly systemTab: Locator;

  // Entry Points tab content
  readonly entryPointsList: Locator;
  readonly entryPointItem: Locator;
  readonly entryPointName: Locator;
  readonly entryPointLocation: Locator;
  readonly addEntryPointButton: Locator;
  readonly editEntryPointButton: Locator;
  readonly deleteEntryPointButton: Locator;

  // Parking Slots tab content
  readonly slotsList: Locator;
  readonly slotItem: Locator;
  readonly slotNumber: Locator;
  readonly slotType: Locator;
  readonly slotFloor: Locator;
  readonly slotStatus: Locator;
  readonly addSlotButton: Locator;
  readonly editSlotButton: Locator;
  readonly deleteSlotButton: Locator;

  // System tab content - Initialize form
  readonly initializeForm: Locator;
  readonly totalSlotsInput: Locator;
  readonly smallSlotsInput: Locator;
  readonly mediumSlotsInput: Locator;
  readonly largeSlotsInput: Locator;
  readonly entryPointsInput: Locator;
  readonly entryPointsTagInput: Locator;
  readonly entryPointsTagList: Locator;
  readonly entryPointsTagItem: Locator;
  readonly entryPointsTagRemove: Locator;
  readonly initializeButton: Locator;
  readonly resetButton: Locator;

  // Health check card
  readonly healthCheckCard: Locator;
  readonly apiHealthStatus: Locator;
  readonly dbHealthStatus: Locator;
  readonly overallHealthStatus: Locator;
  readonly healthStatusBadge: Locator;
  readonly lastHealthCheckTime: Locator;
  readonly runHealthCheckButton: Locator;

  // System status
  readonly initializationStatus: Locator;
  readonly initializationTime: Locator;
  readonly reinitializeButton: Locator;

  // Modals
  readonly entryPointModal: Locator;
  readonly slotModal: Locator;
  readonly modalTitle: Locator;
  readonly modalSaveButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalCloseButton: Locator;

  // Delete confirmation modal
  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Success/Error banners
  readonly successBanner: Locator;
  readonly errorBanner: Locator;

  // Loading state
  readonly loadingIndicator: Locator;

  // Navigation
  readonly backToDashboardButton: Locator;
  readonly goToSettingsButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /configuration/i }).or(
      page.locator('h1, h2').filter({ hasText: /configuration|system configuration/i })
    );

    // Tabs
    this.entryPointsTab = page.getByRole('tab', { name: /entry points/i }).or(
      page.locator('button:has-text("Entry Points"), [data-tab="entry-points"]')
    );
    this.parkingSlotsTab = page.getByRole('tab', { name: /parking slots/i }).or(
      page.locator('button:has-text("Parking Slots"), [data-tab="parking-slots"]')
    );
    this.systemTab = page.getByRole('tab', { name: /system/i }).or(
      page.locator('button:has-text("System"), [data-tab="system"]')
    );

    // Entry Points tab content
    this.entryPointsList = page.getByTestId('entry-points-list').or(
      page.locator('[data-testid*="entry-points-list"], .entry-points-list')
    );
    this.entryPointItem = page.getByTestId('entry-point-item').or(
      page.locator('[data-testid*="entry-point-item"], .entry-point-item')
    );
    this.entryPointName = this.entryPointItem.locator('[data-name], .name');
    this.entryPointLocation = this.entryPointItem.locator('[data-location], .location');
    this.addEntryPointButton = page.getByTestId('add-entry-point-button').or(
      page.locator('button:has-text("Add"), button:has-text("Create")')
    );
    this.editEntryPointButton = page.getByTestId('edit-entry-point-button').or(
      page.locator('button:has-text("Edit"), button[aria-label*="edit"]')
    );
    this.deleteEntryPointButton = page.getByTestId('delete-entry-point-button').or(
      page.locator('button:has-text("Delete"), button[aria-label*="delete"]')
    );

    // Parking Slots tab content
    this.slotsList = page.getByTestId('slots-list').or(
      page.locator('[data-testid*="slots-list"], .slots-list')
    );
    this.slotItem = page.getByTestId('slot-item').or(
      page.locator('[data-testid*="slot-item"], .slot-item')
    );
    this.slotNumber = this.slotItem.locator('[data-slot-number], .slot-number');
    this.slotType = this.slotItem.locator('[data-slot-type], .slot-type');
    this.slotFloor = this.slotItem.locator('[data-slot-floor], .slot-floor');
    this.slotStatus = this.slotItem.locator('[data-slot-status], .slot-status');
    this.addSlotButton = page.getByTestId('add-slot-button').or(
      page.locator('button:has-text("Add"), button:has-text("Create")')
    );
    this.editSlotButton = page.getByTestId('edit-slot-button').or(
      page.locator('button:has-text("Edit"), button[aria-label*="edit"]')
    );
    this.deleteSlotButton = page.getByTestId('delete-slot-button').or(
      page.locator('button:has-text("Delete"), button[aria-label*="delete"]')
    );

    // System tab content - Initialize form
    this.initializeForm = page.getByTestId('initialize-form').or(
      page.locator('[data-testid*="initialize-form"], .initialize-form')
    );
    this.totalSlotsInput = page.getByTestId('total-slots-input').or(
      page.locator('input[name="totalSlots"], input[aria-label*="total slots"]')
    );
    this.smallSlotsInput = page.getByTestId('small-slots-input').or(
      page.locator('input[name="smallSlots"], input[aria-label*="small slots"]')
    );
    this.mediumSlotsInput = page.getByTestId('medium-slots-input').or(
      page.locator('input[name="mediumSlots"], input[aria-label*="medium slots"]')
    );
    this.largeSlotsInput = page.getByTestId('large-slots-input').or(
      page.locator('input[name="largeSlots"], input[aria-label*="large slots"]')
    );
    this.entryPointsInput = page.getByTestId('entry-points-input').or(
      page.locator('input[name="entryPoints"], input[aria-label*="entry points"]')
    );
    this.entryPointsTagInput = page.getByTestId('entry-points-tag-input').or(
      page.locator('input[placeholder*="entry point"]')
    );
    this.entryPointsTagList = page.getByTestId('entry-points-tag-list').or(
      page.locator('.tag-list, [data-tag-list]')
    );
    this.entryPointsTagItem = this.entryPointsTagList.locator('.tag-item, [data-tag-item]');
    this.entryPointsTagRemove = this.entryPointsTagItem.locator('.tag-remove, button:has-text("×")');
    this.initializeButton = page.getByTestId('initialize-button').or(
      page.locator('button:has-text("Initialize"), button[type="submit"]')
    );
    this.resetButton = page.getByTestId('reset-button').or(
      page.locator('button:has-text("Reset"), button:has-text("Clear")')
    );

    // Health check card
    this.healthCheckCard = page.getByTestId('health-check-card').or(
      page.locator('[data-testid*="health-check"], .health-check-card')
    );
    this.apiHealthStatus = this.healthCheckCard.locator('[data-api-health], .api-health');
    this.dbHealthStatus = this.healthCheckCard.locator('[data-db-health], .db-health');
    this.overallHealthStatus = this.healthCheckCard.locator('[data-overall-health], .overall-health');
    this.healthStatusBadge = this.healthCheckCard.locator('.health-badge, [data-health-status]');
    this.lastHealthCheckTime = this.healthCheckCard.locator('[data-last-check], .last-check-time');
    this.runHealthCheckButton = this.healthCheckCard.locator('button:has-text("Run Health Check")');

    // System status
    this.initializationStatus = page.getByTestId('initialization-status').or(
      page.locator('[data-testid*="initialization-status"], .initialization-status')
    );
    this.initializationTime = page.getByTestId('initialization-time').or(
      page.locator('[data-testid*="initialization-time"], .initialization-time')
    );
    this.reinitializeButton = page.getByTestId('reinitialize-button').or(
      page.locator('button:has-text("Reinitialize")')
    );

    // Modals
    this.entryPointModal = page.getByTestId('entry-point-modal').or(
      page.locator('[data-testid*="entry-point-modal"], .modal, [role="dialog"]')
    );
    this.slotModal = page.getByTestId('slot-modal').or(
      page.locator('[data-testid*="slot-modal"], .modal, [role="dialog"]')
    );
    this.modalTitle = page.locator('.modal-title, h2, h3');
    this.modalSaveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    this.modalCancelButton = page.locator('button:has-text("Cancel")');
    this.modalCloseButton = page.locator('button:has-text("Close"), button[aria-label="close"]');

    // Delete confirmation modal
    this.deleteModal = page.getByTestId('delete-modal').or(
      page.locator('[data-testid*="delete-modal"], .delete-modal')
    );
    this.deleteConfirmButton = this.deleteModal.locator('button:has-text("Confirm"), button:has-text("Delete")');
    this.deleteCancelButton = this.deleteModal.locator('button:has-text("Cancel")');

    // Success/Error banners
    this.successBanner = page.getByTestId('success-message').or(
      page.locator('[data-testid*="success"], .success-banner, .alert-success')
    );
    this.errorBanner = page.getByTestId('error-message').or(
      page.locator('[data-testid*="error"], .error-banner, .alert-error')
    );

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading-indicator')
    );

    // Navigation
    this.backToDashboardButton = page.locator('a[href="/"], button:has-text("Back to Dashboard")');
    this.goToSettingsButton = page.locator('a[href="/settings"], button:has-text("Settings")');
  }

  /**
   * Navigate to the Configuration page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/configuration');
  }

  /**
   * Verify that the configuration page has loaded
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
   * Wait for the configuration page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Click the Entry Points tab
   */
  async clickEntryPointsTab(): Promise<void> {
    await this.click(this.entryPointsTab);
    await this.waitForElement(this.entryPointsList);
  }

  /**
   * Click the Parking Slots tab
   */
  async clickParkingSlotsTab(): Promise<void> {
    await this.click(this.parkingSlotsTab);
    await this.waitForElement(this.slotsList);
  }

  /**
   * Click the System tab
   */
  async clickSystemTab(): Promise<void> {
    await this.click(this.systemTab);
    await this.waitForElement(this.initializeForm);
  }

  /**
   * Fill in the initialization form
   * @param config - The initialization configuration
   */
  async fillInitializationForm(config: {
    totalSlots?: number;
    smallSlots?: number;
    mediumSlots?: number;
    largeSlots?: number;
    entryPoints?: string[];
  }): Promise<void> {
    if (config.totalSlots !== undefined) {
      await this.clear(this.totalSlotsInput);
      await this.fill(this.totalSlotsInput, config.totalSlots.toString());
    }
    if (config.smallSlots !== undefined) {
      await this.clear(this.smallSlotsInput);
      await this.fill(this.smallSlotsInput, config.smallSlots.toString());
    }
    if (config.mediumSlots !== undefined) {
      await this.clear(this.mediumSlotsInput);
      await this.fill(this.mediumSlotsInput, config.mediumSlots.toString());
    }
    if (config.largeSlots !== undefined) {
      await this.clear(this.largeSlotsInput);
      await this.fill(this.largeSlotsInput, config.largeSlots.toString());
    }
    if (config.entryPoints) {
      // Add entry points as tags
      for (const entryPoint of config.entryPoints) {
        await this.fill(this.entryPointsTagInput, entryPoint);
        await this.page.keyboard.press('Enter');
      }
    }
  }

  /**
   * Click the Initialize button
   */
  async clickInitializeButton(): Promise<void> {
    await this.click(this.initializeButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Click the Reset button
   */
  async clickResetButton(): Promise<void> {
    await this.click(this.resetButton);
  }

  /**
   * Initialize the system with the given configuration
   * @param config - The initialization configuration
   */
  async initializeSystem(config: {
    totalSlots?: number;
    smallSlots?: number;
    mediumSlots?: number;
    largeSlots?: number;
    entryPoints?: string[];
  }): Promise<void> {
    await this.clickSystemTab();
    await this.fillInitializationForm(config);
    await this.clickInitializeButton();
  }

  /**
   * Get the API health status
   * @returns The API health status text
   */
  async getApiHealthStatus(): Promise<string> {
    return await this.getText(this.apiHealthStatus);
  }

  /**
   * Get the database health status
   * @returns The database health status text
   */
  async getDbHealthStatus(): Promise<string> {
    return await this.getText(this.dbHealthStatus);
  }

  /**
   * Get the overall health status
   * @returns The overall health status text
   */
  async getOverallHealthStatus(): Promise<string> {
    return await this.getText(this.overallHealthStatus);
  }

  /**
   * Get the health status badge text
   * @returns The health status badge text
   */
  async getHealthStatusBadge(): Promise<string> {
    return await this.getText(this.healthStatusBadge);
  }

  /**
   * Get the last health check time
   * @returns The last health check time
   */
  async getLastHealthCheckTime(): Promise<string> {
    return await this.getText(this.lastHealthCheckTime);
  }

  /**
   * Click the Run Health Check button
   */
  async clickRunHealthCheck(): Promise<void> {
    await this.click(this.runHealthCheckButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify the health status
   * @param expectedStatus - The expected health status ('healthy', 'degraded', or 'down')
   * @returns True if the status matches
   */
  async verifyHealthStatus(expectedStatus: 'healthy' | 'degraded' | 'down'): Promise<boolean> {
    const actualStatus = (await this.getHealthStatusBadge()).toLowerCase();
    return actualStatus.includes(expectedStatus.toLowerCase());
  }

  /**
   * Get the initialization status
   * @returns The initialization status text
   */
  async getInitializationStatus(): Promise<string> {
    return await this.getText(this.initializationStatus);
  }

  /**
   * Get the initialization time
   * @returns The initialization time
   */
  async getInitializationTime(): Promise<string> {
    return await this.getText(this.initializationTime);
  }

  /**
   * Click the Reinitialize button
   */
  async clickReinitializeButton(): Promise<void> {
    await this.click(this.reinitializeButton);
  }

  /**
   * Get the count of entry points
   * @returns The number of entry points
   */
  async getEntryPointsCount(): Promise<number> {
    return await this.entryPointItem.count();
  }

  /**
   * Get the count of slots
   * @returns The number of slots
   */
  async getSlotsCount(): Promise<number> {
    return await this.slotItem.count();
  }

  /**
   * Get the count of entry point tags
   * @returns The number of entry point tags
   */
  async getEntryPointsTagCount(): Promise<number> {
    return await this.entryPointsTagItem.count();
  }

  /**
   * Remove an entry point tag by index
   * @param index - The tag index (0-based)
   */
  async removeEntryPointsTag(index: number): Promise<void> {
    const tagItem = this.entryPointsTagItem.nth(index);
    await this.click(tagItem.locator(this.entryPointsTagRemove));
  }

  /**
   * Click the back to dashboard button
   */
  async clickBackToDashboard(): Promise<void> {
    await this.click(this.backToDashboardButton);
    await this.page.waitForURL(/\//);
  }

  /**
   * Click the go to settings button
   */
  async clickGoToSettings(): Promise<void> {
    await this.click(this.goToSettingsButton);
    await this.page.waitForURL(/\/settings/);
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
   * Verify that the health check card is displayed
   * @returns True if health check card is visible
   */
  async verifyHealthCheckCardDisplayed(): Promise<boolean> {
    return await this.isVisible(this.healthCheckCard);
  }

  /**
   * Verify that the initialize form is displayed
   * @returns True if initialize form is visible
   */
  async verifyInitializeFormDisplayed(): Promise<boolean> {
    return await this.isVisible(this.initializeForm);
  }

  /**
   * Verify that the system is initialized
   * @returns True if the system is initialized
   */
  async isSystemInitialized(): Promise<boolean> {
    const status = await this.getInitializationStatus();
    return status.toLowerCase().includes('initialized');
  }
}
