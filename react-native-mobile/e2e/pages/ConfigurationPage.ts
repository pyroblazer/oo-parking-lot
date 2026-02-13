/**
 * Configuration Page Object Model
 * 
 * Provides methods for interacting with the Configuration screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Configuration Page Object
 * 
 * Encapsulates all interactions with the Configuration screen including:
 * - Initialization form
 * - API settings
 * - System settings
 * - Tab navigation
 */
export class ConfigurationPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Tabs
  readonly initializationTab: any;
  readonly apiSettingsTab: any;
  readonly systemSettingsTab: any;

  // Initialization form
  readonly totalSlotsLabel: any;
  readonly totalSlotsInput: any;
  readonly smallSlotsLabel: any;
  readonly smallSlotsInput: any;
  readonly mediumSlotsLabel: any;
  readonly mediumSlotsInput: any;
  readonly largeSlotsLabel: any;
  readonly largeSlotsInput: any;
  readonly entryPointsLabel: any;
  readonly entryPointsInput: any;
  readonly initializeButton: any;
  readonly initializeButtonText: any;

  // API settings
  readonly apiUrlLabel: any;
  readonly apiUrlInput: any;
  readonly saveApiButton: any;
  readonly saveApiButtonText: any;

  // System settings
  readonly themeLabel: any;
  readonly themePicker: any;
  readonly languageLabel: any;
  readonly languagePicker: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('configuration-page'));
    this.title = element(by.text('Configuration'));

    // Tabs
    this.initializationTab = element(by.id('initialization-tab'));
    this.apiSettingsTab = element(by.id('api-settings-tab'));
    this.systemSettingsTab = element(by.id('system-settings-tab'));

    // Initialization form
    this.totalSlotsLabel = element(by.text('Total Slots'));
    this.totalSlotsInput = element(by.id('total-slots-input'));
    this.smallSlotsLabel = element(by.text('Small Slots'));
    this.smallSlotsInput = element(by.id('small-slots-input'));
    this.mediumSlotsLabel = element(by.text('Medium Slots'));
    this.mediumSlotsInput = element(by.id('medium-slots-input'));
    this.largeSlotsLabel = element(by.text('Large Slots'));
    this.largeSlotsInput = element(by.id('large-slots-input'));
    this.entryPointsLabel = element(by.text('Entry Points'));
    this.entryPointsInput = element(by.id('entry-points-input'));
    this.initializeButton = element(by.id('initialize-button'));
    this.initializeButtonText = element(by.text('Initialize'));

    // API settings
    this.apiUrlLabel = element(by.text('API URL'));
    this.apiUrlInput = element(by.id('api-url-input'));
    this.saveApiButton = element(by.id('save-api-button'));
    this.saveApiButtonText = element(by.text('Save'));

    // System settings
    this.themeLabel = element(by.text('Theme'));
    this.themePicker = element(by.id('theme-picker'));
    this.languageLabel = element(by.text('Language'));
    this.languagePicker = element(by.id('language-picker'));
  }

  /**
   * Navigate to Configuration screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Configuration');
    await this.waitForLoad();
  }

  /**
   * Wait for Configuration screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Click Initialization tab
   */
  async clickInitializationTab(): Promise<void> {
    await this.click('initialization-tab');
    await this.waitForLoad();
  }

  /**
   * Click API Settings tab
   */
  async clickApiSettingsTab(): Promise<void> {
    await this.click('api-settings-tab');
    await this.waitForLoad();
  }

  /**
   * Click System Settings tab
   */
  async clickSystemSettingsTab(): Promise<void> {
    await this.click('system-settings-tab');
    await this.waitForLoad();
  }

  /**
   * Enter total slots
   * @param totalSlots - The total number of slots
   */
  async enterTotalSlots(totalSlots: string): Promise<void> {
    await this.fill('total-slots-input', totalSlots);
  }

  /**
   * Enter small slots
   * @param smallSlots - The number of small slots
   */
  async enterSmallSlots(smallSlots: string): Promise<void> {
    await this.fill('small-slots-input', smallSlots);
  }

  /**
   * Enter medium slots
   * @param mediumSlots - The number of medium slots
   */
  async enterMediumSlots(mediumSlots: string): Promise<void> {
    await this.fill('medium-slots-input', mediumSlots);
  }

  /**
   * Enter large slots
   * @param largeSlots - The number of large slots
   */
  async enterLargeSlots(largeSlots: string): Promise<void> {
    await this.fill('large-slots-input', largeSlots);
  }

  /**
   * Enter entry points
   * @param entryPoints - The entry points (comma-separated)
   */
  async enterEntryPoints(entryPoints: string): Promise<void> {
    await this.fill('entry-points-input', entryPoints);
  }

  /**
   * Click Initialize button
   */
  async clickInitialize(): Promise<void> {
    await this.click('initialize-button');
  }

  /**
   * Initialize parking lot
   * @param totalSlots - Total number of slots
   * @param smallSlots - Number of small slots
   * @param mediumSlots - Number of medium slots
   * @param largeSlots - Number of large slots
   * @param entryPoints - Entry points (comma-separated)
   */
  async initializeParkingLot(
    totalSlots: string,
    smallSlots: string,
    mediumSlots: string,
    largeSlots: string,
    entryPoints: string
  ): Promise<void> {
    await this.enterTotalSlots(totalSlots);
    await this.enterSmallSlots(smallSlots);
    await this.enterMediumSlots(mediumSlots);
    await this.enterLargeSlots(largeSlots);
    await this.enterEntryPoints(entryPoints);
    await this.clickInitialize();
    await this.waitForLoadingToComplete();
  }

  /**
   * Enter API URL
   * @param apiUrl - The API URL
   */
  async enterApiUrl(apiUrl: string): Promise<void> {
    await this.fill('api-url-input', apiUrl);
  }

  /**
   * Click Save API button
   */
  async clickSaveApi(): Promise<void> {
    await this.click('save-api-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Select theme
   * @param theme - The theme to select
   */
  async selectTheme(theme: string): Promise<void> {
    await this.selectOption('theme-picker', theme);
  }

  /**
   * Select language
   * @param language - The language to select
   */
  async selectLanguage(language: string): Promise<void> {
    await this.selectOption('language-picker', language);
  }

  /**
   * Check if initialization tab is active
   * @returns True if initialization tab is active
   */
  async isInitializationTabActive(): Promise<boolean> {
    // This is a simplified check - actual implementation depends on app UI
    return await this.isVisible('initialization-tab');
  }

  /**
   * Check if API settings tab is active
   * @returns True if API settings tab is active
   */
  async isApiSettingsTabActive(): Promise<boolean> {
    // This is a simplified check - actual implementation depends on app UI
    return await this.isVisible('api-settings-tab');
  }

  /**
   * Check if system settings tab is active
   * @returns True if system settings tab is active
   */
  async isSystemSettingsTabActive(): Promise<boolean> {
    // This is a simplified check - actual implementation depends on app UI
    return await this.isVisible('system-settings-tab');
  }

  /**
   * Check if initialize button is enabled
   * @returns True if initialize button is enabled
   */
  async isInitializeButtonEnabled(): Promise<boolean> {
    return await this.isEnabled('initialize-button');
  }

  /**
   * Check if save API button is visible
   * @returns True if save API button is visible
   */
  async isSaveApiButtonVisible(): Promise<boolean> {
    return await this.isVisible('save-api-button');
  }

  /**
   * Scroll to bottom of configuration form
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('scroll-view');
  }

  /**
   * Verify configuration screen is displayed correctly
   */
  async verifyConfigurationScreen(): Promise<void> {
    await this.waitForVisible();
    
    // Verify tabs are visible
    await waitFor(this.initializationTab)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.apiSettingsTab)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify initialization form is visible
    await waitFor(this.totalSlotsLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.totalSlotsInput)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.smallSlotsLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.smallSlotsInput)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.mediumSlotsLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.mediumSlotsInput)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.largeSlotsLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.largeSlotsInput)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.entryPointsLabel)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.entryPointsInput)
      .toBeVisible()
      .withTimeout(5000);
    await waitFor(this.initializeButton)
      .toBeVisible()
      .withTimeout(5000);
  }
}
