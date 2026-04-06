/**
 * Available Slots Page Object Model
 * 
 * Provides methods for interacting with the Available Slots screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Available Slots Page Object
 * 
 * Encapsulates all interactions with the Available Slots screen including:
 * - Slots list
 * - Slot filtering
 * - Refresh functionality
 */
export class AvailableSlotsPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Slots list
  readonly slotsList: any;
  readonly slotItem: any;
  readonly slotNumber: any;
  readonly slotType: any;
  readonly slotDistance: any;

  // Filters
  readonly filterButton: any;
  readonly filterSmall: any;
  readonly filterMedium: any;
  readonly filterLarge: any;
  readonly filterAll: any;

  // Vehicle type selector
  readonly vehicleTypeSmall: any;
  readonly vehicleTypeMedium: any;
  readonly vehicleTypeLarge: any;

  // Entry point selector
  readonly entryPointButton: any;

  // Search
  readonly searchButton: any;

  // No results
  readonly noSlotsMessage: any;

  // Refresh
  readonly refreshButton: any;

  constructor() {
    super();

    // Page selectors
    this.page = element(by.id('available-slots-page'));
    this.title = element(by.text('Available Slots'));

    // Slots list
    this.slotsList = element(by.id('available-slots-list'));
    this.slotItem = element(by.id('slot-item'));
    this.slotNumber = element(by.id('slot-number'));
    this.slotType = element(by.id('slot-type'));
    this.slotDistance = element(by.id('slot-distance'));

    // Filters
    this.filterButton = element(by.id('filter-button'));
    this.filterSmall = element(by.text('Small'));
    this.filterMedium = element(by.text('Medium'));
    this.filterLarge = element(by.text('Large'));
    this.filterAll = element(by.text('All'));

    // Vehicle type selector
    this.vehicleTypeSmall = element(by.id('vehicle-type-small'));
    this.vehicleTypeMedium = element(by.id('vehicle-type-medium'));
    this.vehicleTypeLarge = element(by.id('vehicle-type-large'));

    // Entry point selector (generic reference)
    this.entryPointButton = element(by.id('entry-point'));

    // Search
    this.searchButton = element(by.id('search-button'));

    // No results message
    this.noSlotsMessage = element(by.id('no-slots-message'));

    // Refresh
    this.refreshButton = element(by.id('refresh-button'));
  }

  /**
   * Navigate to Available Slots screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Available Slots');
    await this.waitForLoad();
  }

  /**
   * Wait for Available Slots screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Click Filter button
   */
  async clickFilter(): Promise<void> {
    await this.click('filter-button');
  }

  /**
   * Filter by Small slots
   */
  async filterBySmall(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterSmall)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterSmall.tap();
  }

  /**
   * Filter by Medium slots
   */
  async filterByMedium(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterMedium)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterMedium.tap();
  }

  /**
   * Filter by Large slots
   */
  async filterByLarge(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterLarge)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterLarge.tap();
  }

  /**
   * Filter by All slots
   */
  async filterByAll(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterAll)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterAll.tap();
  }

  /**
   * Tap on a slot item by index
   * @param index - The index of the slot (0-based)
   */
  async tapSlotByIndex(index: number): Promise<void> {
    const slotElement = this.slotItem.atIndex(index);
    await waitFor(slotElement)
      .toBeVisible()
      .withTimeout(5000);
    await slotElement.tap();
  }

  /**
   * Tap on a slot by slot number
   * @param slotNumber - The slot number to tap
   */
  async tapSlotByNumber(slotNumber: string): Promise<void> {
    const slotElement = element(by.text(slotNumber));
    await waitFor(slotElement)
      .toBeVisible()
      .withTimeout(5000);
    await slotElement.tap();
  }

  /**
   * Get slots count
   * @returns The number of slots
   */
  async getSlotsCount(): Promise<number> {
    return await this.getCount('slot-item');
  }

  /**
   * Get slot number by index
   * @param index - The index of the slot (0-based)
   * @returns The slot number
   */
  async getSlotNumberByIndex(index: number): Promise<string> {
    const slotElement = this.slotItem.atIndex(index);
    const slotNumberElement = slotElement.element(by.id('slot-number'));
    await waitFor(slotNumberElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await slotNumberElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get slot type by index
   * @param index - The index of the slot (0-based)
   * @returns The slot type
   */
  async getSlotTypeByIndex(index: number): Promise<string> {
    const slotElement = this.slotItem.atIndex(index);
    const slotTypeElement = slotElement.element(by.id('slot-type'));
    await waitFor(slotTypeElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await slotTypeElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get slot distance by index
   * @param index - The index of the slot (0-based)
   * @returns The slot distance
   */
  async getSlotDistanceByIndex(index: number): Promise<string> {
    const slotElement = this.slotItem.atIndex(index);
    const slotDistanceElement = slotElement.element(by.id('slot-distance'));
    await waitFor(slotDistanceElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await slotDistanceElement.getAttributes();
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
   * Scroll to bottom of slots list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('available-slots-list');
  }

  /**
   * Scroll to top of slots list
   */
  async scrollToTop(): Promise<void> {
    await this.scrollToTop('available-slots-list');
  }

  /**
   * Check if slots list is visible
   * @returns True if slots list is visible
   */
  async isSlotsListVisible(): Promise<boolean> {
    return await this.isVisible('available-slots-list');
  }

  /**
   * Check if filter button is visible
   * @returns True if filter button is visible
   */
  async isFilterButtonVisible(): Promise<boolean> {
    return await this.isVisible('filter-button');
  }

  /**
   * Check if refresh button is visible
   * @returns True if refresh button is visible
   */
  async isRefreshButtonVisible(): Promise<boolean> {
    return await this.isVisible('refresh-button');
  }

  /**
   * Select a vehicle type
   * @param type - The vehicle type to select ('S', 'M', or 'L')
   */
  async selectVehicleType(type: 'S' | 'M' | 'L'): Promise<void> {
    const typeMap: Record<string, string> = {
      S: 'vehicle-type-small',
      M: 'vehicle-type-medium',
      L: 'vehicle-type-large',
    };
    const testId = typeMap[type];
    await this.click(testId);
  }

  /**
   * Select an entry point by identifier
   * @param identifier - The entry point identifier (e.g. 'A', 'B', 'C')
   */
  async selectEntryPoint(identifier: string): Promise<void> {
    const entryPointElement = element(by.id(`entry-point-${identifier}`));
    await waitFor(entryPointElement)
      .toBeVisible()
      .withTimeout(5000);
    await entryPointElement.tap();
  }

  /**
   * Click the search button to find available slots
   */
  async clickSearch(): Promise<void> {
    await this.click('search-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if search results (slot items) are visible
   * @returns True if slot items are visible
   */
  async hasResults(): Promise<boolean> {
    return await this.isVisible('slot-item');
  }

  /**
   * Check if no-slots message is visible
   * @returns True if the no-slots message is visible
   */
  async hasNoResults(): Promise<boolean> {
    return await this.isVisible('no-slots');
  }

  /**
   * Verify available slots screen is displayed correctly
   */
  async verifyAvailableSlotsScreen(): Promise<void> {
    await this.waitForVisible();

    // Verify slots list is visible
    await waitFor(this.slotsList)
      .toBeVisible()
      .withTimeout(5000);

    // Verify filter button is visible
    await waitFor(this.filterButton)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Select a vehicle type
   * @param type - The vehicle type to select ('S', 'M', or 'L')
   */
  async selectVehicleType(type: 'S' | 'M' | 'L'): Promise<void> {
    const typeMap: Record<string, string> = {
      'S': 'vehicle-type-small',
      'M': 'vehicle-type-medium',
      'L': 'vehicle-type-large',
    };
    const testId = typeMap[type];
    await this.click(testId);
  }

  /**
   * Select an entry point by identifier
   * @param identifier - The entry point identifier (e.g. 'A', 'B', 'C')
   */
  async selectEntryPoint(identifier: string): Promise<void> {
    const entryPointElement = element(by.id(`entry-point-${identifier}`));
    await waitFor(entryPointElement)
      .toBeVisible()
      .withTimeout(5000);
    await entryPointElement.tap();
  }

  /**
   * Click the search button to find available slots
   */
  async clickSearch(): Promise<void> {
    await this.click('search-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if search results (slot items) are visible
   * @returns True if slot items are visible
   */
  async hasResults(): Promise<boolean> {
    return await this.isVisible('slot-item');
  }

  /**
   * Check if no-slots message is visible
   * @returns True if the no-slots message is visible
   */
  async hasNoResults(): Promise<boolean> {
    return await this.isVisible('no-slots-message');
  }
}
