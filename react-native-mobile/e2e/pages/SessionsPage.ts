/**
 * Sessions Page Object Model
 * 
 * Provides methods for interacting with the Sessions screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Sessions Page Object
 * 
 * Encapsulates all interactions with the Sessions screen including:
 * - Search functionality
 * - Filter functionality
 * - Sessions list
 * - Pull to refresh
 */
export class SessionsPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Search
  readonly searchInput: any;
  readonly clearSearchButton: any;

  // Filters
  readonly filterButton: any;
  readonly filterActive: any;
  readonly filterCompleted: any;
  readonly filterAll: any;

  // Sessions list
  readonly sessionsList: any;
  readonly sessionItem: any;
  readonly sessionId: any;
  readonly vehicleType: any;
  readonly vehiclePlate: any;
  readonly parkingSlot: any;
  readonly entryTime: any;
  readonly status: any;

  // Pull to refresh
  readonly refreshControl: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('sessions-page'));
    this.title = element(by.text('Sessions'));

    // Search
    this.searchInput = element(by.id('sessions-search-input'));
    this.clearSearchButton = element(by.id('clear-search-button'));

    // Filters
    this.filterButton = element(by.id('filter-button'));
    this.filterActive = element(by.text('Active'));
    this.filterCompleted = element(by.text('Completed'));
    this.filterAll = element(by.text('All'));

    // Sessions list
    this.sessionsList = element(by.id('sessions-list'));
    this.sessionItem = element(by.id('session-item'));
    this.sessionId = element(by.id('session-id'));
    this.vehicleType = element(by.id('vehicle-type'));
    this.vehiclePlate = element(by.id('vehicle-plate'));
    this.parkingSlot = element(by.id('parking-slot'));
    this.entryTime = element(by.id('entry-time'));
    this.status = element(by.id('status'));

    // Pull to refresh
    this.refreshControl = element(by.id('refresh-control');
  }

  /**
   * Navigate to Sessions screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Sessions');
    await this.waitForLoad();
  }

  /**
   * Wait for Sessions screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Enter search text
   * @param searchText - The text to search for
   */
  async enterSearch(searchText: string): Promise<void> {
    await this.fill('sessions-search-input', searchText);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.click('clear-search-button');
  }

  /**
   * Click filter button
   */
  async clickFilter(): Promise<void> {
    await this.click('filter-button');
  }

  /**
   * Filter by Active sessions
   */
  async filterByActive(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterActive)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterActive.tap();
  }

  /**
   * Filter by Completed sessions
   */
  async filterByCompleted(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterCompleted)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterCompleted.tap();
  }

  /**
   * Filter by All sessions
   */
  async filterByAll(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterAll)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterAll.tap();
  }

  /**
   * Tap on a session item by index
   * @param index - The index of the session (0-based)
   */
  async tapSessionByIndex(index: number): Promise<void> {
    const sessionElement = this.sessionItem.atIndex(index);
    await waitFor(sessionElement)
      .toBeVisible()
      .withTimeout(5000);
    await sessionElement.tap();
  }

  /**
   * Tap on a session by session ID
   * @param sessionId - The session ID to tap
   */
  async tapSessionById(sessionId: string): Promise<void> {
    const sessionElement = element(by.text(sessionId));
    await waitFor(sessionElement)
      .toBeVisible()
      .withTimeout(5000);
    await sessionElement.tap();
  }

  /**
   * Get sessions count
   * @returns The number of sessions
   */
  async getSessionsCount(): Promise<number> {
    return await this.getCount('session-item');
  }

  /**
   * Get session ID from item
   * @param index - The index of the session (0-based)
   * @returns The session ID
   */
  async getSessionIdByIndex(index: number): Promise<string> {
    const sessionElement = this.sessionItem.atIndex(index);
    const sessionIdElement = sessionElement.element(by.id('session-id'));
    await waitFor(sessionIdElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await sessionIdElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get vehicle type from item
   * @param index - The index of the session (0-based)
   * @returns The vehicle type
   */
  async getVehicleTypeByIndex(index: number): Promise<string> {
    const sessionElement = this.sessionItem.atIndex(index);
    const vehicleTypeElement = sessionElement.element(by.id('vehicle-type'));
    await waitFor(vehicleTypeElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await vehicleTypeElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get vehicle plate from item
   * @param index - The index of the session (0-based)
   * @returns The vehicle plate
   */
  async getVehiclePlateByIndex(index: number): Promise<string> {
    const sessionElement = this.sessionItem.atIndex(index);
    const vehiclePlateElement = sessionElement.element(by.id('vehicle-plate'));
    await waitFor(vehiclePlateElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await vehiclePlateElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get parking slot from item
   * @param index - The index of the session (0-based)
   * @returns The parking slot
   */
  async getParkingSlotByIndex(index: number): Promise<string> {
    const sessionElement = this.sessionItem.atIndex(index);
    const parkingSlotElement = sessionElement.element(by.id('parking-slot'));
    await waitFor(parkingSlotElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await parkingSlotElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get entry time from item
   * @param index - The index of the session (0-based)
   * @returns The entry time
   */
  async getEntryTimeByIndex(index: number): Promise<string> {
    const sessionElement = this.sessionItem.atIndex(index);
    const entryTimeElement = sessionElement.element(by.id('entry-time'));
    await waitFor(entryTimeElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await entryTimeElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get status from item
   * @param index - The index of the session (0-based)
   * @returns The status
   */
  async getStatusByIndex(index: number): Promise<string> {
    const sessionElement = this.sessionItem.atIndex(index);
    const statusElement = sessionElement.element(by.id('status'));
    await waitFor(statusElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await statusElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Scroll to bottom of sessions list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('sessions-list');
  }

  /**
   * Pull to refresh
   */
  async pullToRefresh(): Promise<void> {
    await this.sessionsList.scrollTo('top');
    await this.sessionsList.scrollTo('bottom');
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if sessions list is visible
   * @returns True if sessions list is visible
   */
  async isSessionsListVisible(): Promise<boolean> {
    return await this.isVisible('sessions-list');
  }

  /**
   * Check if search input is visible
   * @returns True if search input is visible
   */
  async isSearchInputVisible(): Promise<boolean> {
    return await this.isVisible('sessions-search-input');
  }

  /**
   * Check if filter button is visible
   * @returns True if filter button is visible
   */
  async isFilterButtonVisible(): Promise<boolean> {
    return await this.isVisible('filter-button');
  }

  /**
   * Verify sessions screen is displayed correctly
   */
  async verifySessionsScreen(): Promise<void> {
    await this.waitForVisible();
    
    // Verify search input is visible
    await waitFor(this.searchInput)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify filter button is visible
    await waitFor(this.filterButton)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify sessions list is visible
    await waitFor(this.sessionsList)
      .toBeVisible()
      .withTimeout(5000);
  }
}
