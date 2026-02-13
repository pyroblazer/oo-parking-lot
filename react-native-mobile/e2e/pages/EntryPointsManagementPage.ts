/**
 * Entry Points Management Page Object Model
 * 
 * Provides methods for interacting with the Entry Points Management screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Entry Points Management Page Object
 * 
 * Encapsulates all interactions with the Entry Points Management screen including:
 * - Entry points list
 * - Add/Edit/Delete entry point operations
 * - Refresh functionality
 */
export class EntryPointsManagementPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Entry points list
  readonly entryPointsList: any;
  readonly entryPointItem: any;
  readonly entryPointId: any;
  readonly entryPointName: any;
  readonly entryPointLocation: any;

  // Add entry point
  readonly addEntryPointButton: any;
  readonly addEntryPointButtonText: any;

  // Edit entry point
  readonly editEntryPointButton: any;
  readonly deleteEntryPointButton: any;

  // Modal
  readonly entryPointModal: any;
  readonly entryPointNameInput: any;
  readonly entryPointLocationInput: any;
  readonly saveEntryPointButton: any;
  readonly cancelEntryPointButton: any;

  // Refresh
  readonly refreshButton: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('entry-points-management-page'));
    this.title = element(by.text('Entry Points'));

    // Entry points list
    this.entryPointsList = element(by.id('entry-points-list'));
    this.entryPointItem = element(by.id('entry-point-item'));
    this.entryPointId = element(by.id('entry-point-id'));
    this.entryPointName = element(by.id('entry-point-name'));
    this.entryPointLocation = element(by.id('entry-point-location'));

    // Add entry point
    this.addEntryPointButton = element(by.id('add-entry-point-button'));
    this.addEntryPointButtonText = element(by.text('Add Entry Point'));

    // Edit entry point
    this.editEntryPointButton = element(by.id('edit-entry-point-button'));
    this.deleteEntryPointButton = element(by.id('delete-entry-point-button'));

    // Modal
    this.entryPointModal = element(by.id('entry-point-modal'));
    this.entryPointNameInput = element(by.id('entry-point-name-input'));
    this.entryPointLocationInput = element(by.id('entry-point-location-input'));
    this.saveEntryPointButton = element(by.id('save-entry-point-button'));
    this.cancelEntryPointButton = element(by.id('cancel-entry-point-button'));

    // Refresh
    this.refreshButton = element(by.id('refresh-button');
  }

  /**
   * Navigate to Entry Points Management screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Entry Points');
    await this.waitForLoad();
  }

  /**
   * Wait for Entry Points Management screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Click Add Entry Point button
   */
  async clickAddEntryPoint(): Promise<void> {
    await this.click('add-entry-point-button');
  }

  /**
   * Click Edit Entry Point button for a specific entry point
   * @param index - The index of the entry point (0-based)
   */
  async clickEditEntryPointByIndex(index: number): Promise<void> {
    const entryPointElement = this.entryPointItem.atIndex(index);
    const editButtonElement = entryPointElement.element(by.id('edit-entry-point-button'));
    await waitFor(editButtonElement)
      .toBeVisible()
      .withTimeout(5000);
    await editButtonElement.tap();
  }

  /**
   * Click Delete Entry Point button for a specific entry point
   * @param index - The index of the entry point (0-based)
   */
  async clickDeleteEntryPointByIndex(index: number): Promise<void> {
    const entryPointElement = this.entryPointItem.atIndex(index);
    const deleteButtonElement = entryPointElement.element(by.id('delete-entry-point-button'));
    await waitFor(deleteButtonElement)
      .toBeVisible()
      .withTimeout(5000);
    await deleteButtonElement.tap();
  }

  /**
   * Enter entry point name in modal
   * @param name - The entry point name
   */
  async enterEntryPointName(name: string): Promise<void> {
    await this.fill('entry-point-name-input', name);
  }

  /**
   * Enter entry point location in modal
   * @param location - The entry point location
   */
  async enterEntryPointLocation(location: string): Promise<void> {
    await this.fill('entry-point-location-input', location);
  }

  /**
   * Click Save Entry Point button in modal
   */
  async clickSaveEntryPoint(): Promise<void> {
    await this.click('save-entry-point-button');
  }

  /**
   * Click Cancel Entry Point button in modal
   */
  async clickCancelEntryPoint(): Promise<void> {
    await this.click('cancel-entry-point-button');
  }

  /**
   * Add a new entry point
   * @param name - The entry point name
   * @param location - The entry point location
   */
  async addEntryPoint(name: string, location: string): Promise<void> {
    await this.clickAddEntryPoint();
    await this.waitFor(this.entryPointModal)
      .toBeVisible()
      .withTimeout(5000);
    
    await this.enterEntryPointName(name);
    await this.enterEntryPointLocation(location);
    await this.clickSaveEntryPoint();
    await this.waitForLoadingToComplete();
  }

  /**
   * Edit an existing entry point
   * @param index - The index of the entry point (0-based)
   * @param name - The new entry point name
   * @param location - The new entry point location
   */
  async editEntryPoint(
    index: number,
    name: string,
    location: string
  ): Promise<void> {
    await this.clickEditEntryPointByIndex(index);
    await this.waitFor(this.entryPointModal)
      .toBeVisible()
      .withTimeout(5000);
    
    await this.enterEntryPointName(name);
    await this.enterEntryPointLocation(location);
    await this.clickSaveEntryPoint();
    await this.waitForLoadingToComplete();
  }

  /**
   * Delete an entry point
   * @param index - The index of the entry point (0-based)
   */
  async deleteEntryPoint(index: number): Promise<void> {
    await this.clickDeleteEntryPointByIndex(index);
    // Confirm deletion if prompted
    await this.waitForLoadingToComplete();
  }

  /**
   * Get entry points count
   * @returns The number of entry points
   */
  async getEntryPointsCount(): Promise<number> {
    return await this.getCount('entry-point-item');
  }

  /**
   * Get entry point ID by index
   * @param index - The index of the entry point (0-based)
   * @returns The entry point ID
   */
  async getEntryPointIdByIndex(index: number): Promise<string> {
    const entryPointElement = this.entryPointItem.atIndex(index);
    const idElement = entryPointElement.element(by.id('entry-point-id'));
    await waitFor(idElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await idElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get entry point name by index
   * @param index - The index of the entry point (0-based)
   * @returns The entry point name
   */
  async getEntryPointNameByIndex(index: number): Promise<string> {
    const entryPointElement = this.entryPointItem.atIndex(index);
    const nameElement = entryPointElement.element(by.id('entry-point-name'));
    await waitFor(nameElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await nameElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get entry point location by index
   * @param index - The index of the entry point (0-based)
   * @returns The entry point location
   */
  async getEntryPointLocationByIndex(index: number): Promise<string> {
    const entryPointElement = this.entryPointItem.atIndex(index);
    const locationElement = entryPointElement.element(by.id('entry-point-location'));
    await waitFor(locationElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await locationElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Click Refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.click('refresh-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Scroll to bottom of entry points list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('entry-points-list');
  }

  /**
   * Check if entry points list is visible
   * @returns True if entry points list is visible
   */
  async isEntryPointsListVisible(): Promise<boolean> {
    return await this.isVisible('entry-points-list');
  }

  /**
   * Check if add entry point button is visible
   * @returns True if add entry point button is visible
   */
  async isAddEntryPointButtonVisible(): Promise<boolean> {
    return await this.isVisible('add-entry-point-button');
  }

  /**
   * Check if modal is visible
   * @returns True if modal is visible
   */
  async isModalVisible(): Promise<boolean> {
    return await this.isVisible('entry-point-modal');
  }

  /**
   * Verify entry points management screen is displayed correctly
   */
  async verifyEntryPointsManagementScreen(): Promise<void> {
    await this.waitForVisible();
    
    // Verify entry points list is visible
    await waitFor(this.entryPointsList)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify add entry point button is visible
    await waitFor(this.addEntryPointButton)
      .toBeVisible()
      .withTimeout(5000);
  }
}
