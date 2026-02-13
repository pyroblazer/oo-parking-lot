import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Slots Management Page Object Model
 * 
 * Represents the Slots Management page at '/manage/slots' which allows
 * CRUD operations on parking slots.
 */
export class SlotsManagementPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Slot grid/table view
  readonly slotsGrid: Locator;
  readonly slotTable: Locator;
  readonly slotRow: Locator;
  readonly slotItem: Locator;

  // Slot elements
  readonly slotNumber: Locator;
  readonly slotType: Locator;
  readonly slotFloor: Locator;
  readonly slotStatus: Locator;
  readonly slotVehiclePlate: Locator;

  // Slot status badges
  readonly availableSlot: Locator;
  readonly occupiedSlot: Locator;
  readonly maintenanceSlot: Locator;

  // Slot type filters
  readonly typeFilter: Locator;
  readonly typeAll: string;
  readonly typeSmall: string;
  readonly typeMedium: string;
  readonly typeLarge: string;

  // Availability filter
  readonly availabilityFilter: Locator;
  readonly availabilityAll: string;
  readonly availabilityAvailable: string;
  readonly availabilityOccupied: string;
  readonly availabilityMaintenance: string;

  // Floor filter
  readonly floorFilter: Locator;

  // Search
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly clearSearchButton: Locator;

  // Action buttons
  readonly createSlotButton: Locator;
  readonly editSlotButton: Locator;
  readonly deleteSlotButton: Locator;
  readonly refreshButton: Locator;

  // Create/Edit Modal
  readonly slotModal: Locator;
  readonly modalTitle: Locator;
  readonly slotNumberInput: Locator;
  readonly slotTypeSelect: Locator;
  readonly slotFloorInput: Locator;
  readonly slotStatusSelect: Locator;
  readonly modalSaveButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalCloseButton: Locator;

  // Delete confirmation modal
  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Stats
  readonly totalSlotsCount: Locator;
  readonly availableSlotsCount: Locator;
  readonly occupiedSlotsCount: Locator;
  readonly maintenanceSlotsCount: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;

  // Loading state
  readonly loadingIndicator: Locator;

  // Navigation
  readonly backToDashboardButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /slots/i }).or(
      page.locator('h1, h2').filter({ hasText: /slots|parking slots|manage slots/i })
    );

    // Slot grid/table view
    this.slotsGrid = page.getByTestId('slots-grid').or(
      page.locator('[data-testid*="slots-grid"], .slots-grid')
    );
    this.slotTable = page.getByTestId('slots-table').or(
      page.locator('table.slots-table, [data-testid*="slots-table"]')
    );
    this.slotRow = page.getByTestId('slot-row').or(
      page.locator('[data-testid*="slot-row"], .slot-row, tr[data-slot-id]')
    );
    this.slotItem = page.getByTestId('slot-item').or(
      page.locator('[data-testid*="slot-item"], .slot-item, [data-slot-id]')
    );

    // Slot elements
    this.slotNumber = this.slotRow.locator('[data-slot-number], .slot-number');
    this.slotType = this.slotRow.locator('[data-slot-type], .slot-type');
    this.slotFloor = this.slotRow.locator('[data-slot-floor], .slot-floor');
    this.slotStatus = this.slotRow.locator('[data-slot-status], .slot-status');
    this.slotVehiclePlate = this.slotRow.locator('[data-vehicle-plate], .vehicle-plate');

    // Slot status badges
    this.availableSlot = page.locator('.slot.available, [data-status="available"]');
    this.occupiedSlot = page.locator('.slot.occupied, [data-status="occupied"]');
    this.maintenanceSlot = page.locator('.slot.maintenance, [data-status="maintenance"]');

    // Slot type filters
    this.typeFilter = page.getByTestId('type-filter').or(
      page.locator('select[name="type"], select[aria-label*="type"]')
    );
    this.typeAll = 'all';
    this.typeSmall = 'small';
    this.typeMedium = 'medium';
    this.typeLarge = 'large';

    // Availability filter
    this.availabilityFilter = page.getByTestId('availability-filter').or(
      page.locator('select[name="availability"], select[aria-label*="availability"]')
    );
    this.availabilityAll = 'all';
    this.availabilityAvailable = 'available';
    this.availabilityOccupied = 'occupied';
    this.availabilityMaintenance = 'maintenance';

    // Floor filter
    this.floorFilter = page.getByTestId('floor-filter').or(
      page.locator('select[name="floor"], select[aria-label*="floor"]')
    );

    // Search
    this.searchInput = page.getByTestId('search-input').or(
      page.locator('input[name="search"], input[placeholder*="search"], input[placeholder*="Search"]')
    );
    this.searchButton = page.getByTestId('search-button').or(
      page.locator('button:has-text("Search"), button[aria-label*="search"]')
    );
    this.clearSearchButton = page.getByTestId('clear-search-button').or(
      page.locator('button:has-text("Clear"), button[aria-label*="clear"]')
    );

    // Action buttons
    this.createSlotButton = page.getByTestId('create-slot-button').or(
      page.locator('button:has-text("Create"), button:has-text("Add Slot")')
    );
    this.editSlotButton = page.getByTestId('edit-slot-button').or(
      page.locator('button:has-text("Edit"), button[aria-label*="edit"]')
    );
    this.deleteSlotButton = page.getByTestId('delete-slot-button').or(
      page.locator('button:has-text("Delete"), button[aria-label*="delete"]')
    );
    this.refreshButton = page.getByTestId('refresh-button').or(
      page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]')
    );

    // Create/Edit Modal
    this.slotModal = page.getByTestId('slot-modal').or(
      page.locator('[data-testid*="slot-modal"], .modal, [role="dialog"]')
    );
    this.modalTitle = this.slotModal.locator('.modal-title, h2, h3');
    this.slotNumberInput = this.slotModal.locator('input[name="slotNumber"], input[placeholder*="slot number"]');
    this.slotTypeSelect = this.slotModal.locator('select[name="slotType"], select[aria-label*="type"]');
    this.slotFloorInput = this.slotModal.locator('input[name="floor"], input[aria-label*="floor"]');
    this.slotStatusSelect = this.slotModal.locator('select[name="status"], select[aria-label*="status"]');
    this.modalSaveButton = this.slotModal.locator('button:has-text("Save"), button[type="submit"]');
    this.modalCancelButton = this.slotModal.locator('button:has-text("Cancel")');
    this.modalCloseButton = this.slotModal.locator('button:has-text("Close"), button[aria-label="close"]');

    // Delete confirmation modal
    this.deleteModal = page.getByTestId('delete-modal').or(
      page.locator('[data-testid*="delete-modal"], .delete-modal')
    );
    this.deleteConfirmButton = this.deleteModal.locator('button:has-text("Confirm"), button:has-text("Delete")');
    this.deleteCancelButton = this.deleteModal.locator('button:has-text("Cancel")');

    // Stats
    this.totalSlotsCount = page.getByTestId('total-slots-count').or(
      page.locator('[data-testid*="total-slots"], .total-slots-count')
    );
    this.availableSlotsCount = page.getByTestId('available-slots-count').or(
      page.locator('[data-testid*="available-slots"], .available-slots-count')
    );
    this.occupiedSlotsCount = page.getByTestId('occupied-slots-count').or(
      page.locator('[data-testid*="occupied-slots"], .occupied-slots-count')
    );
    this.maintenanceSlotsCount = page.getByTestId('maintenance-slots-count').or(
      page.locator('[data-testid*="maintenance-slots"], .maintenance-slots-count')
    );

    // Empty state
    this.emptyState = page.getByTestId('empty-state').or(
      page.locator('[data-testid*="empty"], .empty-state')
    );
    this.emptyStateMessage = this.emptyState.locator('.message, [data-message]');

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading-indicator')
    );

    // Navigation
    this.backToDashboardButton = page.locator('a[href="/"], button:has-text("Back to Dashboard")');
  }

  /**
   * Navigate to the Slots Management page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/manage/slots');
  }

  /**
   * Verify that the slots page has loaded
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
   * Wait for the slots page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by slot type
   * @param type - The slot type to filter by ('all', 'small', 'medium', or 'large')
   */
  async filterByType(type: string): Promise<void> {
    await this.selectOption(this.typeFilter, type);
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by availability
   * @param availability - The availability to filter by ('all', 'available', 'occupied', or 'maintenance')
   */
  async filterByAvailability(availability: string): Promise<void> {
    await this.selectOption(this.availabilityFilter, availability);
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by floor
   * @param floor - The floor number to filter by
   */
  async filterByFloor(floor: string): Promise<void> {
    await this.selectOption(this.floorFilter, floor);
    await this.waitForLoadingToComplete();
  }

  /**
   * Fill in the search input
   * @param searchText - The text to search for
   */
  async fillSearch(searchText: string): Promise<void> {
    await this.clear(this.searchInput);
    await this.fill(this.searchInput, searchText);
  }

  /**
   * Click the search button
   */
  async clickSearchButton(): Promise<void> {
    await this.click(this.searchButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Clear the search
   */
  async clearSearch(): Promise<void> {
    await this.click(this.clearSearchButton);
  }

  /**
   * Get the count of slots displayed
   * @returns The number of slots in the current view
   */
  async getSlotCount(): Promise<number> {
    return await this.slotRow.count();
  }

  /**
   * Get slot data from a specific row
   * @param index - The row index (0-based)
   * @returns Object containing slot data
   */
  async getSlotData(index: number): Promise<{
    slotNumber: string;
    slotType: string;
    floor: string;
    status: string;
    vehiclePlate: string;
  }> {
    const row = this.slotRow.nth(index);
    return {
      slotNumber: await row.locator(this.slotNumber).textContent() || '',
      slotType: await row.locator(this.slotType).textContent() || '',
      floor: await row.locator(this.slotFloor).textContent() || '',
      status: await row.locator(this.slotStatus).textContent() || '',
      vehiclePlate: await row.locator(this.slotVehiclePlate).textContent() || '',
    };
  }

  /**
   * Click the create slot button
   */
  async clickCreateSlot(): Promise<void> {
    await this.click(this.createSlotButton);
    await this.waitForElement(this.slotModal);
  }

  /**
   * Click the edit button for a specific slot
   * @param index - The row index (0-based)
   */
  async clickEditSlot(index: number): Promise<void> {
    const row = this.slotRow.nth(index);
    await this.click(row.locator(this.editSlotButton));
    await this.waitForElement(this.slotModal);
  }

  /**
   * Click the delete button for a specific slot
   * @param index - The row index (0-based)
   */
  async clickDeleteSlot(index: number): Promise<void> {
    const row = this.slotRow.nth(index);
    await this.click(row.locator(this.deleteSlotButton));
    await this.waitForElement(this.deleteModal);
  }

  /**
   * Fill in the slot form in the modal
   * @param data - The slot data
   */
  async fillSlotForm(data: {
    slotNumber?: string;
    slotType?: string;
    floor?: string;
    status?: string;
  }): Promise<void> {
    if (data.slotNumber !== undefined) {
      await this.clear(this.slotNumberInput);
      await this.fill(this.slotNumberInput, data.slotNumber);
    }
    if (data.slotType !== undefined) {
      await this.selectOption(this.slotTypeSelect, data.slotType);
    }
    if (data.floor !== undefined) {
      await this.clear(this.slotFloorInput);
      await this.fill(this.slotFloorInput, data.floor);
    }
    if (data.status !== undefined) {
      await this.selectOption(this.slotStatusSelect, data.status);
    }
  }

  /**
   * Click the save button in the modal
   */
  async clickModalSave(): Promise<void> {
    await this.click(this.modalSaveButton);
    await this.waitForHidden(this.slotModal);
  }

  /**
   * Click the cancel button in the modal
   */
  async clickModalCancel(): Promise<void> {
    await this.click(this.modalCancelButton);
    await this.waitForHidden(this.slotModal);
  }

  /**
   * Click the close button in the modal
   */
  async clickModalClose(): Promise<void> {
    await this.click(this.modalCloseButton);
    await this.waitForHidden(this.slotModal);
  }

  /**
   * Create a new slot
   * @param data - The slot data
   */
  async createSlot(data: {
    slotNumber: string;
    slotType: 'small' | 'medium' | 'large';
    floor: string;
    status?: 'available' | 'occupied' | 'maintenance';
  }): Promise<void> {
    await this.clickCreateSlot();
    await this.fillSlotForm(data);
    await this.clickModalSave();
  }

  /**
   * Update an existing slot
   * @param index - The row index (0-based)
   * @param data - The slot data to update
   */
  async updateSlot(index: number, data: {
    slotNumber?: string;
    slotType?: 'small' | 'medium' | 'large';
    floor?: string;
    status?: 'available' | 'occupied' | 'maintenance';
  }): Promise<void> {
    await this.clickEditSlot(index);
    await this.fillSlotForm(data);
    await this.clickModalSave();
  }

  /**
   * Confirm the delete action
   */
  async confirmDelete(): Promise<void> {
    await this.click(this.deleteConfirmButton);
    await this.waitForHidden(this.deleteModal);
  }

  /**
   * Cancel the delete action
   */
  async cancelDelete(): Promise<void> {
    await this.click(this.deleteCancelButton);
    await this.waitForHidden(this.deleteModal);
  }

  /**
   * Delete a slot
   * @param index - The row index (0-based)
   */
  async deleteSlot(index: number): Promise<void> {
    await this.clickDeleteSlot(index);
    await this.confirmDelete();
  }

  /**
   * Get the total slots count
   * @returns The total slots count
   */
  async getTotalSlotsCount(): Promise<number> {
    const text = await this.getText(this.totalSlotsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the available slots count
   * @returns The available slots count
   */
  async getAvailableSlotsCount(): Promise<number> {
    const text = await this.getText(this.availableSlotsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the occupied slots count
   * @returns The occupied slots count
   */
  async getOccupiedSlotsCount(): Promise<number> {
    const text = await this.getText(this.occupiedSlotsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the maintenance slots count
   * @returns The maintenance slots count
   */
  async getMaintenanceSlotsCount(): Promise<number> {
    const text = await this.getText(this.maintenanceSlotsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Find a slot row by slot number
   * @param slotNumber - The slot number to find
   * @returns The row index if found, -1 otherwise
   */
  async findSlotRow(slotNumber: string): Promise<number> {
    const count = await this.getSlotCount();
    for (let i = 0; i < count; i++) {
      const row = this.slotRow.nth(i);
      const number = await row.locator(this.slotNumber).textContent();
      if (number === slotNumber) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if the empty state is displayed
   * @returns True if empty state is visible
   */
  async isEmptyStateDisplayed(): Promise<boolean> {
    return await this.isVisible(this.emptyState);
  }

  /**
   * Get the empty state message
   * @returns The empty state message text
   */
  async getEmptyStateMessage(): Promise<string> {
    return await this.getText(this.emptyStateMessage);
  }

  /**
   * Click the refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.click(this.refreshButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Click the back to dashboard button
   */
  async clickBackToDashboard(): Promise<void> {
    await this.click(this.backToDashboardButton);
    await this.page.waitForURL(/\//);
  }

  /**
   * Verify that the slots list is displayed
   * @returns True if slots list is visible
   */
  async verifySlotsListDisplayed(): Promise<boolean> {
    return await this.isVisible(this.slotsGrid) || await this.isVisible(this.slotTable);
  }

  /**
   * Verify that the slot modal is displayed
   * @returns True if slot modal is visible
   */
  async verifySlotModalDisplayed(): Promise<boolean> {
    return await this.isVisible(this.slotModal);
  }

  /**
   * Verify that the delete modal is displayed
   * @returns True if delete modal is visible
   */
  async verifyDeleteModalDisplayed(): Promise<boolean> {
    return await this.isVisible(this.deleteModal);
  }
}
