/**
 * Slots Management Page Object Model
 * 
 * Provides methods for interacting with the Slots Management screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Slots Management Page Object
 * 
 * Encapsulates all interactions with the Slots Management screen including:
 * - Slots list
 * - Slot filtering
 * - Add/Edit/Delete slot operations
 * - Refresh functionality
 */
export class SlotsManagementPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Slots list
  readonly slotsList: any;
  readonly slotItem: any;
  readonly slotId: any;
  readonly slotNumber: any;
  readonly slotType: any;
  readonly slotStatus: any;
  readonly slotFloor: any;

  // Filters
  readonly filterButton: any;
  readonly filterAvailable: any;
  readonly filterOccupied: any;
  readonly filterMaintenance: any;
  readonly filterAll: any;

  // Add slot
  readonly addSlotButton: any;
  readonly addSlotButtonText: any;

  // Edit slot
  readonly editSlotButton: any;
  readonly deleteSlotButton: any;

  // Modal
  readonly slotModal: any;
  readonly slotNumberInput: any;
  readonly slotTypePicker: any;
  readonly slotFloorInput: any;
  readonly saveSlotButton: any;
  readonly cancelSlotButton: any;

  // Refresh
  readonly refreshButton: any;

  constructor() {
    super();
    
    // Page selectors
    this.page = element(by.id('slots-management-page'));
    this.title = element(by.text('Slots Management'));

    // Slots list
    this.slotsList = element(by.id('slots-list'));
    this.slotItem = element(by.id('slot-item'));
    this.slotId = element(by.id('slot-id'));
    this.slotNumber = element(by.id('slot-number'));
    this.slotType = element(by.id('slot-type'));
    this.slotStatus = element(by.id('slot-status'));
    this.slotFloor = element(by.id('slot-floor'));

    // Filters
    this.filterButton = element(by.id('filter-button'));
    this.filterAvailable = element(by.text('Available'));
    this.filterOccupied = element(by.text('Occupied'));
    this.filterMaintenance = element(by.text('Maintenance'));
    this.filterAll = element(by.text('All'));

    // Add slot
    this.addSlotButton = element(by.id('add-slot-button'));
    this.addSlotButtonText = element(by.text('Add Slot'));

    // Edit slot
    this.editSlotButton = element(by.id('edit-slot-button'));
    this.deleteSlotButton = element(by.id('delete-slot-button'));

    // Modal
    this.slotModal = element(by.id('slot-modal'));
    this.slotNumberInput = element(by.id('slot-number-input'));
    this.slotTypePicker = element(by.id('slot-type-picker'));
    this.slotFloorInput = element(by.id('slot-floor-input'));
    this.saveSlotButton = element(by.id('save-slot-button'));
    this.cancelSlotButton = element(by.id('cancel-slot-button'));

    // Refresh
    this.refreshButton = element(by.id('refresh-button'));
  }

  /**
   * Navigate to Slots Management screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Slots Management');
    await this.waitForLoad();
  }

  /**
   * Wait for Slots Management screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Click Add Slot button
   */
  async clickAddSlot(): Promise<void> {
    await this.click('add-slot-button');
  }

  /**
   * Click Edit Slot button for a specific slot
   * @param index - The index of the slot (0-based)
   */
  async clickEditSlotByIndex(index: number): Promise<void> {
    const slotElement = this.slotItem.atIndex(index);
    const editButtonElement = slotElement.element(by.id('edit-slot-button'));
    await waitFor(editButtonElement)
      .toBeVisible()
      .withTimeout(5000);
    await editButtonElement.tap();
  }

  /**
   * Click Delete Slot button for a specific slot
   * @param index - The index of the slot (0-based)
   */
  async clickDeleteSlotByIndex(index: number): Promise<void> {
    const slotElement = this.slotItem.atIndex(index);
    const deleteButtonElement = slotElement.element(by.id('delete-slot-button'));
    await waitFor(deleteButtonElement)
      .toBeVisible()
      .withTimeout(5000);
    await deleteButtonElement.tap();
  }

  /**
   * Enter slot number in modal
   * @param slotNumber - The slot number
   */
  async enterSlotNumber(slotNumber: string): Promise<void> {
    await this.fill('slot-number-input', slotNumber);
  }

  /**
   * Select slot type in modal
   * @param slotType - The slot type ('Small', 'Medium', 'Large')
   */
  async selectSlotType(slotType: 'Small' | 'Medium' | 'Large'): Promise<void> {
    await this.selectOption('slot-type-picker', slotType);
  }

  /**
   * Enter slot floor in modal
   * @param floor - The floor number
   */
  async enterSlotFloor(floor: string): Promise<void> {
    await this.fill('slot-floor-input', floor);
  }

  /**
   * Click Save Slot button in modal
   */
  async clickSaveSlot(): Promise<void> {
    await this.click('save-slot-button');
  }

  /**
   * Click Cancel Slot button in modal
   */
  async clickCancelSlot(): Promise<void> {
    await this.click('cancel-slot-button');
  }

  /**
   * Add a new slot
   * @param slotNumber - The slot number
   * @param slotType - The slot type
   * @param floor - The floor number
   */
  async addSlot(slotNumber: string, slotType: 'Small' | 'Medium' | 'Large', floor: string): Promise<void> {
    await this.clickAddSlot();
    await waitFor(this.slotModal)
      .toBeVisible()
      .withTimeout(5000);
    
    await this.enterSlotNumber(slotNumber);
    await this.selectSlotType(slotType);
    await this.enterSlotFloor(floor);
    await this.clickSaveSlot();
    await this.waitForLoadingToComplete();
  }

  /**
   * Edit an existing slot
   * @param index - The index of the slot (0-based)
   * @param slotNumber - The new slot number
   * @param slotType - The new slot type
   * @param floor - The new floor number
   */
  async editSlot(
    index: number,
    slotNumber: string,
    slotType: 'Small' | 'Medium' | 'Large',
    floor: string
  ): Promise<void> {
    await this.clickEditSlotByIndex(index);
    await waitFor(this.slotModal)
      .toBeVisible()
      .withTimeout(5000);
    
    await this.enterSlotNumber(slotNumber);
    await this.selectSlotType(slotType);
    await this.enterSlotFloor(floor);
    await this.clickSaveSlot();
    await this.waitForLoadingToComplete();
  }

  /**
   * Delete a slot
   * @param index - The index of the slot (0-based)
   */
  async deleteSlot(index: number): Promise<void> {
    await this.clickDeleteSlotByIndex(index);
    // Confirm deletion if prompted
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by Available slots
   */
  async filterByAvailable(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterAvailable)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterAvailable.tap();
  }

  /**
   * Filter by Occupied slots
   */
  async filterByOccupied(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterOccupied)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterOccupied.tap();
  }

  /**
   * Filter by Maintenance slots
   */
  async filterByMaintenance(): Promise<void> {
    await this.clickFilter();
    await waitFor(this.filterMaintenance)
      .toBeVisible()
      .withTimeout(3000);
    await this.filterMaintenance.tap();
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
   * Get slot status by index
   * @param index - The index of the slot (0-based)
   * @returns The slot status
   */
  async getSlotStatusByIndex(index: number): Promise<string> {
    const slotElement = this.slotItem.atIndex(index);
    const slotStatusElement = slotElement.element(by.id('slot-status'));
    await waitFor(slotStatusElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await slotStatusElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get slot floor by index
   * @param index - The index of the slot (0-based)
   * @returns The slot floor
   */
  async getSlotFloorByIndex(index: number): Promise<string> {
    const slotElement = this.slotItem.atIndex(index);
    const slotFloorElement = slotElement.element(by.id('slot-floor'));
    await waitFor(slotFloorElement)
      .toBeVisible()
      .withTimeout(5000);
    const attrs = await slotFloorElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Click Refresh button
   */
  /**
   * Click Filter button to open filter options
   */
  async clickFilter(): Promise<void> {
    await waitFor(this.filterButton)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterButton.tap();
  }

  async clickRefresh(): Promise<void> {
    await this.click('refresh-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Scroll to bottom of slots list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('slots-list');
  }

  /**
   * Check if slots list is visible
   * @returns True if slots list is visible
   */
  async isSlotsListVisible(): Promise<boolean> {
    return await this.isVisible('slots-list');
  }

  /**
   * Check if add slot button is visible
   * @returns True if add slot button is visible
   */
  async isAddSlotButtonVisible(): Promise<boolean> {
    return await this.isVisible('add-slot-button');
  }

  /**
   * Check if modal is visible
   * @returns True if modal is visible
   */
  async isModalVisible(): Promise<boolean> {
    return await this.isVisible('slot-modal');
  }

  /**
   * Verify slots management screen is displayed correctly
   */
  async verifySlotsManagementScreen(): Promise<void> {
    await this.waitForVisible();
    
    // Verify slots list is visible
    await waitFor(this.slotsList)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify add slot button is visible
    await waitFor(this.addSlotButton)
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify filter button is visible
    await waitFor(this.filterButton)
      .toBeVisible()
      .withTimeout(5000);
  }
}
