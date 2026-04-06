/**
 * Settings Page Object Model
 *
 * Provides methods for interacting with the Settings screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Settings Page Object
 *
 * Encapsulates all interactions with the Settings screen including:
 * - API URL configuration
 * - API timeout configuration
 * - Connection testing
 * - Settings save/reset
 */
export class SettingsPage extends BasePage {
  // Page selectors
  readonly page: any;

  // Form fields
  readonly apiUrlInput: any;
  readonly apiTimeoutInput: any;

  // Actions
  readonly testConnectionButton: any;
  readonly saveSettingsButton: any;
  readonly resetSettingsButton: any;

  // Status
  readonly connectionStatus: any;

  // Navigation
  readonly backButton: any;

  constructor() {
    super();

    // Page selectors
    this.page = element(by.id('settings-page'));

    // Form fields
    this.apiUrlInput = element(by.id('api-url-input'));
    this.apiTimeoutInput = element(by.id('api-timeout-input'));

    // Actions
    this.testConnectionButton = element(by.id('test-connection-button'));
    this.saveSettingsButton = element(by.id('save-settings-button'));
    this.resetSettingsButton = element(by.id('reset-settings-button'));

    // Status
    this.connectionStatus = element(by.id('connection-status'));

    // Navigation
    this.backButton = element(by.id('back-button'));
  }

  /**
   * Navigate to Settings screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Settings');
    await this.waitForLoad();
  }

  /**
   * Wait for Settings screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Enter API URL in the input field
   * @param url - The API URL to enter
   */
  async enterApiUrl(url: string): Promise<void> {
    await waitFor(this.apiUrlInput)
      .toBeVisible()
      .withTimeout(5000);
    await this.apiUrlInput.clearText();
    await this.apiUrlInput.typeText(url);
  }

  /**
   * Get the current API URL value
   * @returns The API URL text
   */
  async getApiUrl(): Promise<string> {
    return await this.getText('api-url-input');
  }

  /**
   * Click Test Connection button
   */
  async clickTestConnection(): Promise<void> {
    await this.click('test-connection-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the connection status text
   * @returns The connection status text
   */
  async getConnectionStatus(): Promise<string> {
    await waitFor(this.connectionStatus)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await this.connectionStatus.getAttributes();
    return attrs.text || '';
  }

  /**
   * Click Save Settings button
   */
  async clickSave(): Promise<void> {
    await this.click('save-settings-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Click Reset Settings button
   */
  async clickReset(): Promise<void> {
    await this.click('reset-settings-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Click Back to Dashboard button
   */
  async clickBackToDashboard(): Promise<void> {
    await waitFor(this.backButton)
      .toBeVisible()
      .withTimeout(5000);
    await this.backButton.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if settings page is visible
   * @returns True if settings page is visible
   */
  async isSettingsPageVisible(): Promise<boolean> {
    return await this.isVisible('settings-page');
  }

  /**
   * Verify settings screen is displayed correctly
   */
  async verifySettingsScreen(): Promise<void> {
    await this.waitForVisible();

    // Verify API URL input is visible
    await waitFor(this.apiUrlInput)
      .toBeVisible()
      .withTimeout(5000);

    // Verify test connection button is visible
    await waitFor(this.testConnectionButton)
      .toBeVisible()
      .withTimeout(5000);

    // Verify save settings button is visible
    await waitFor(this.saveSettingsButton)
      .toBeVisible()
      .withTimeout(5000);

    // Verify reset settings button is visible
    await waitFor(this.resetSettingsButton)
      .toBeVisible()
      .withTimeout(5000);
  }
}

export default SettingsPage;
