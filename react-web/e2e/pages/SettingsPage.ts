import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Settings Page Object Model
 * 
 * Represents the Settings page at '/settings' which allows users to configure
 * API settings and other application preferences.
 */
export class SettingsPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // API Configuration section
  readonly apiConfigSection: Locator;
  readonly apiUrlInput: Locator;
  readonly apiUrlLabel: Locator;
  readonly apiTimeoutInput: Locator;
  readonly apiTimeoutLabel: Locator;
  readonly apiRetryCountInput: Locator;
  readonly apiRetryCountLabel: Locator;

  // Connection test
  readonly testConnectionButton: Locator;
  readonly connectionStatus: Locator;
  readonly connectionStatusBadge: Locator;
  readonly connectionMessage: Locator;
  readonly connectionLatency: Locator;

  // Save/Reset actions
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly discardButton: Locator;

  // Success/Error banners
  readonly successBanner: Locator;
  readonly errorBanner: Locator;

  // Additional settings sections
  readonly themeSection: Locator;
  readonly themeSelect: Locator;
  readonly themeLightOption: string;
  readonly themeDarkOption: string;
  readonly themeAutoOption: string;

  readonly languageSection: Locator;
  readonly languageSelect: Locator;

  readonly notificationsSection: Locator;
  readonly enableNotificationsToggle: Locator;
  readonly soundEnabledToggle: Locator;

  // Advanced settings
  readonly advancedSettingsSection: Locator;
  readonly debugModeToggle: Locator;
  readonly enableLogsToggle: Locator;
  readonly clearCacheButton: Locator;
  readonly clearDataButton: Locator;

  // Danger zone
  readonly dangerZoneSection: Locator;
  readonly factoryResetButton: Locator;

  // Confirmation modal
  readonly confirmationModal: Locator;
  readonly modalTitle: Locator;
  readonly modalMessage: Locator;
  readonly modalConfirmButton: Locator;
  readonly modalCancelButton: Locator;

  // Navigation
  readonly backToDashboardButton: Locator;
  readonly goToConfigurationButton: Locator;

  // Loading state
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /settings/i }).or(
      page.locator('h1, h2').filter({ hasText: /settings|application settings/i })
    );

    // API Configuration section
    this.apiConfigSection = page.getByTestId('api-config-section').or(
      page.locator('[data-testid*="api-config"], .api-config-section')
    );
    this.apiUrlInput = page.getByTestId('api-url-input').or(
      page.locator('input[name="apiUrl"], input[placeholder*="http"], input[aria-label*="API URL"]')
    );
    this.apiUrlLabel = this.apiConfigSection.locator('label:has-text("API URL"), .label-text');
    this.apiTimeoutInput = page.getByTestId('api-timeout-input').or(
      page.locator('input[name="timeout"], input[aria-label*="timeout"]')
    );
    this.apiTimeoutLabel = this.apiConfigSection.locator('label:has-text("Timeout"), .label-text');
    this.apiRetryCountInput = page.getByTestId('api-retry-count-input').or(
      page.locator('input[name="retryCount"], input[aria-label*="retry"]')
    );
    this.apiRetryCountLabel = this.apiConfigSection.locator('label:has-text("Retry"), .label-text');

    // Connection test
    this.testConnectionButton = page.getByTestId('test-connection-button').or(
      page.locator('button:has-text("Test Connection"), button:has-text("Test API")')
    );
    this.connectionStatus = page.getByTestId('connection-status').or(
      page.locator('[data-testid*="connection-status"], .connection-status')
    );
    this.connectionStatusBadge = this.connectionStatus.locator('.status-badge, [data-status]');
    this.connectionMessage = this.connectionStatus.locator('.message, [data-message]');
    this.connectionLatency = this.connectionStatus.locator('.latency, [data-latency]');

    // Save/Reset actions
    this.saveButton = page.getByTestId('save-button').or(
      page.locator('button:has-text("Save"), button[type="submit"]')
    );
    this.resetButton = page.getByTestId('reset-button').or(
      page.locator('button:has-text("Reset"), button:has-text("Reset to Default")')
    );
    this.discardButton = page.getByTestId('discard-button').or(
      page.locator('button:has-text("Discard"), button:has-text("Cancel")')
    );

    // Success/Error banners
    this.successBanner = page.getByTestId('success-message').or(
      page.locator('[data-testid*="success"], .success-banner, .alert-success')
    );
    this.errorBanner = page.getByTestId('error-message').or(
      page.locator('[data-testid*="error"], .error-banner, .alert-error')
    );

    // Additional settings sections
    this.themeSection = page.getByTestId('theme-section').or(
      page.locator('[data-testid*="theme"], .theme-section')
    );
    this.themeSelect = page.getByTestId('theme-select').or(
      page.locator('select[name="theme"], select[aria-label*="theme"]')
    );
    this.themeLightOption = 'light';
    this.themeDarkOption = 'dark';
    this.themeAutoOption = 'auto';

    this.languageSection = page.getByTestId('language-section').or(
      page.locator('[data-testid*="language"], .language-section')
    );
    this.languageSelect = page.getByTestId('language-select').or(
      page.locator('select[name="language"], select[aria-label*="language"]')
    );

    this.notificationsSection = page.getByTestId('notifications-section').or(
      page.locator('[data-testid*="notifications"], .notifications-section')
    );
    this.enableNotificationsToggle = page.getByTestId('enable-notifications-toggle').or(
      page.locator('input[name="enableNotifications"], [role="switch"][aria-label*="notifications"]')
    );
    this.soundEnabledToggle = page.getByTestId('sound-enabled-toggle').or(
      page.locator('input[name="soundEnabled"], [role="switch"][aria-label*="sound"]')
    );

    // Advanced settings
    this.advancedSettingsSection = page.getByTestId('advanced-settings-section').or(
      page.locator('[data-testid*="advanced-settings"], .advanced-settings-section')
    );
    this.debugModeToggle = page.getByTestId('debug-mode-toggle').or(
      page.locator('input[name="debugMode"], [role="switch"][aria-label*="debug"]')
    );
    this.enableLogsToggle = page.getByTestId('enable-logs-toggle').or(
      page.locator('input[name="enableLogs"], [role="switch"][aria-label*="logs"]')
    );
    this.clearCacheButton = page.getByTestId('clear-cache-button').or(
      page.locator('button:has-text("Clear Cache")')
    );
    this.clearDataButton = page.getByTestId('clear-data-button').or(
      page.locator('button:has-text("Clear Data")')
    );

    // Danger zone
    this.dangerZoneSection = page.getByTestId('danger-zone-section').or(
      page.locator('[data-testid*="danger-zone"], .danger-zone-section')
    );
    this.factoryResetButton = page.getByTestId('factory-reset-button').or(
      page.locator('button:has-text("Factory Reset"), button.danger')
    );

    // Confirmation modal
    this.confirmationModal = page.getByTestId('confirmation-modal').or(
      page.locator('[data-testid*="confirmation-modal"], .modal, [role="dialog"]')
    );
    this.modalTitle = this.confirmationModal.locator('.modal-title, h2, h3');
    this.modalMessage = this.confirmationModal.locator('.modal-message, .message');
    this.modalConfirmButton = this.confirmationModal.locator('button:has-text("Confirm"), button.danger');
    this.modalCancelButton = this.confirmationModal.locator('button:has-text("Cancel")');

    // Navigation
    this.backToDashboardButton = page.locator('a[href="/"], button:has-text("Back to Dashboard")');
    this.goToConfigurationButton = page.locator('a[href="/configuration"], button:has-text("Configuration")');

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading-indicator')
    );
  }

  /**
   * Navigate to the Settings page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/settings');
  }

  /**
   * Verify that the settings page has loaded
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
   * Wait for the settings page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Set the API URL
   * @param url - The API URL to set
   */
  async setApiUrl(url: string): Promise<void> {
    await this.clear(this.apiUrlInput);
    await this.fill(this.apiUrlInput, url);
  }

  /**
   * Get the current API URL
   * @returns The current API URL
   */
  async getApiUrl(): Promise<string> {
    return await this.getValue(this.apiUrlInput);
  }

  /**
   * Set the API timeout
   * @param timeout - The timeout value in milliseconds
   */
  async setApiTimeout(timeout: number): Promise<void> {
    await this.clear(this.apiTimeoutInput);
    await this.fill(this.apiTimeoutInput, timeout.toString());
  }

  /**
   * Get the current API timeout
   * @returns The current API timeout value
   */
  async getApiTimeout(): Promise<number> {
    const value = await this.getValue(this.apiTimeoutInput);
    return parseInt(value) || 1000;
  }

  /**
   * Set the API retry count
   * @param count - The retry count
   */
  async setApiRetryCount(count: number): Promise<void> {
    await this.clear(this.apiRetryCountInput);
    await this.fill(this.apiRetryCountInput, count.toString());
  }

  /**
   * Get the current API retry count
   * @returns The current retry count
   */
  async getApiRetryCount(): Promise<number> {
    const value = await this.getValue(this.apiRetryCountInput);
    return parseInt(value) || 3;
  }

  /**
   * Click the Test Connection button
   */
  async clickTestConnection(): Promise<void> {
    await this.click(this.testConnectionButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<void> {
    await this.clickTestConnection();
  }

  /**
   * Get the connection status
   * @returns The connection status text
   */
  async getConnectionStatus(): Promise<string> {
    return await this.getText(this.connectionStatusBadge);
  }

  /**
   * Get the connection message
   * @returns The connection message text
   */
  async getConnectionMessage(): Promise<string> {
    return await this.getText(this.connectionMessage);
  }

  /**
   * Get the connection latency
   * @returns The connection latency text
   */
  async getConnectionLatency(): Promise<string> {
    return await this.getText(this.connectionLatency);
  }

  /**
   * Check if the connection is successful
   * @returns True if connection status indicates success
   */
  async isConnectionSuccessful(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.toLowerCase().includes('connected') || status.toLowerCase().includes('success');
  }

  /**
   * Click the Save button
   */
  async clickSave(): Promise<void> {
    await this.click(this.saveButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Click the Reset button
   */
  async clickReset(): Promise<void> {
    await this.click(this.resetButton);
  }

  /**
   * Click the Discard button
   */
  async clickDiscard(): Promise<void> {
    await this.click(this.discardButton);
  }

  /**
   * Set the theme
   * @param theme - The theme to set ('light', 'dark', or 'auto')
   */
  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    await this.selectOption(this.themeSelect, theme);
  }

  /**
   * Get the current theme
   * @returns The current theme value
   */
  async getTheme(): Promise<string> {
    return await this.getValue(this.themeSelect);
  }

  /**
   * Set the language
   * @param language - The language to set
   */
  async setLanguage(language: string): Promise<void> {
    await this.selectOption(this.languageSelect, language);
  }

  /**
   * Get the current language
   * @returns The current language value
   */
  async getLanguage(): Promise<string> {
    return await this.getValue(this.languageSelect);
  }

  /**
   * Toggle notifications
   * @param enabled - Whether notifications should be enabled
   */
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    const isChecked = await this.isChecked(this.enableNotificationsToggle);
    if (isChecked !== enabled) {
      await this.click(this.enableNotificationsToggle);
    }
  }

  /**
   * Check if notifications are enabled
   * @returns True if notifications are enabled
   */
  async isNotificationsEnabled(): Promise<boolean> {
    return await this.isChecked(this.enableNotificationsToggle);
  }

  /**
   * Toggle sound
   * @param enabled - Whether sound should be enabled
   */
  async setSoundEnabled(enabled: boolean): Promise<void> {
    const isChecked = await this.isChecked(this.soundEnabledToggle);
    if (isChecked !== enabled) {
      await this.click(this.soundEnabledToggle);
    }
  }

  /**
   * Check if sound is enabled
   * @returns True if sound is enabled
   */
  async isSoundEnabled(): Promise<boolean> {
    return await this.isChecked(this.soundEnabledToggle);
  }

  /**
   * Toggle debug mode
   * @param enabled - Whether debug mode should be enabled
   */
  async setDebugMode(enabled: boolean): Promise<void> {
    const isChecked = await this.isChecked(this.debugModeToggle);
    if (isChecked !== enabled) {
      await this.click(this.debugModeToggle);
    }
  }

  /**
   * Check if debug mode is enabled
   * @returns True if debug mode is enabled
   */
  async isDebugModeEnabled(): Promise<boolean> {
    return await this.isChecked(this.debugModeToggle);
  }

  /**
   * Toggle logs
   * @param enabled - Whether logs should be enabled
   */
  async setLogsEnabled(enabled: boolean): Promise<void> {
    const isChecked = await this.isChecked(this.enableLogsToggle);
    if (isChecked !== enabled) {
      await this.click(this.enableLogsToggle);
    }
  }

  /**
   * Check if logs are enabled
   * @returns True if logs are enabled
   */
  async isLogsEnabled(): Promise<boolean> {
    return await this.isChecked(this.enableLogsToggle);
  }

  /**
   * Click the Clear Cache button
   */
  async clickClearCache(): Promise<void> {
    await this.click(this.clearCacheButton);
  }

  /**
   * Click the Clear Data button
   */
  async clickClearData(): Promise<void> {
    await this.click(this.clearDataButton);
    await this.waitForElement(this.confirmationModal);
  }

  /**
   * Click the Factory Reset button
   */
  async clickFactoryReset(): Promise<void> {
    await this.click(this.factoryResetButton);
    await this.waitForElement(this.confirmationModal);
  }

  /**
   * Confirm the modal action
   */
  async confirmModal(): Promise<void> {
    await this.click(this.modalConfirmButton);
    await this.waitForHidden(this.confirmationModal);
  }

  /**
   * Cancel the modal action
   */
  async cancelModal(): Promise<void> {
    await this.click(this.modalCancelButton);
    await this.waitForHidden(this.confirmationModal);
  }

  /**
   * Get the modal title
   * @returns The modal title text
   */
  async getModalTitle(): Promise<string> {
    return await this.getText(this.modalTitle);
  }

  /**
   * Get the modal message
   * @returns The modal message text
   */
  async getModalMessage(): Promise<string> {
    return await this.getText(this.modalMessage);
  }

  /**
   * Click the back to dashboard button
   */
  async clickBackToDashboard(): Promise<void> {
    await this.click(this.backToDashboardButton);
    await this.page.waitForURL(/\//);
  }

  /**
   * Click the go to configuration button
   */
  async clickGoToConfiguration(): Promise<void> {
    await this.click(this.goToConfigurationButton);
    await this.page.waitForURL(/\/configuration/);
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
   * Verify that the API config section is displayed
   * @returns True if API config section is visible
   */
  async verifyApiConfigSectionDisplayed(): Promise<boolean> {
    return await this.isVisible(this.apiConfigSection);
  }

  /**
   * Verify that the connection status is displayed
   * @returns True if connection status is visible
   */
  async verifyConnectionStatusDisplayed(): Promise<boolean> {
    return await this.isVisible(this.connectionStatus);
  }

  /**
   * Verify that the confirmation modal is displayed
   * @returns True if confirmation modal is visible
   */
  async verifyConfirmationModalDisplayed(): Promise<boolean> {
    return await this.isVisible(this.confirmationModal);
  }

  /**
   * Save all settings
   */
  async saveSettings(): Promise<void> {
    await this.clickSave();
  }

  /**
   * Reset all settings to default
   */
  async resetSettings(): Promise<void> {
    await this.clickReset();
  }
}
