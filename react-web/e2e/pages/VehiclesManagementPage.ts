import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Vehicles Management Page Object Model
 *
 * Represents the Vehicles Management page at '/vehicles-management' which allows
 * CRUD operations on vehicles with filtering, pagination, and card-based display.
 */
export class VehiclesManagementPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Vehicle grid/card view
  readonly vehiclesGrid: Locator;
  readonly vehicleCard: Locator;

  // Vehicle card elements
  readonly vehicleLicense: Locator;
  readonly vehicleType: Locator;
  readonly vehicleInfo: Locator;
  readonly vehicleActions: Locator;
  readonly frequentBadge: Locator;

  // Vehicle info rows
  readonly vehicleInfoLabel: Locator;
  readonly vehicleInfoValue: Locator;

  // Summary bar
  readonly summaryBar: Locator;
  readonly summaryText: Locator;

  // Type filter
  readonly typeFilter: Locator;
  readonly typeAll: string;
  readonly typeSmall: string;
  readonly typeMedium: string;
  readonly typeLarge: string;

  // Action buttons
  readonly createVehicleButton: Locator;
  readonly editVehicleButton: Locator;
  readonly deleteVehicleButton: Locator;
  readonly refreshButton: Locator;

  // Create/Edit Modal
  readonly vehicleModal: Locator;
  readonly modalTitle: Locator;
  readonly licensePlateInput: Locator;
  readonly vehicleTypeSelect: Locator;
  readonly colorInput: Locator;
  readonly brandInput: Locator;
  readonly modelInput: Locator;
  readonly yearInput: Locator;
  readonly modalSaveButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalCloseButton: Locator;

  // Delete confirmation modal
  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageNumbers: Locator;

  // Per page selector
  readonly perPageSelect: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;

  // Loading state
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /vehicles/i }).or(
      page.locator('h1, h2').filter({ hasText: /vehicles|vehicles management/i })
    );

    // Vehicle grid/card view
    this.vehiclesGrid = page.getByTestId('vehicles-grid').or(
      page.locator('[data-testid*="vehicles-grid"], .vehicles-grid')
    );
    this.vehicleCard = page.getByTestId('vehicle-card').or(
      page.locator('[data-testid*="vehicle-card"], .vehicle-card')
    );

    // Vehicle card elements
    this.vehicleLicense = this.vehicleCard.locator('.vehicle-license');
    this.vehicleType = this.vehicleCard.locator('.vehicle-type');
    this.vehicleInfo = this.vehicleCard.locator('.vehicle-info');
    this.vehicleActions = this.vehicleCard.locator('.vehicle-actions');
    this.frequentBadge = this.vehicleCard.locator('.frequent-badge');

    // Vehicle info rows
    this.vehicleInfoLabel = this.vehicleCard.locator('.vehicle-info-label');
    this.vehicleInfoValue = this.vehicleCard.locator('.vehicle-info-value');

    // Summary bar
    this.summaryBar = page.getByTestId('summary-bar').or(
      page.locator('.summary-bar')
    );
    this.summaryText = this.summaryBar.locator('.summary-text');

    // Type filter
    this.typeFilter = page.getByTestId('type-filter').or(
      page.locator('.filter-bar .filter-select')
    );
    this.typeAll = 'all';
    this.typeSmall = 'S';
    this.typeMedium = 'M';
    this.typeLarge = 'L';

    // Action buttons
    this.createVehicleButton = page.getByTestId('create-vehicle-button').or(
      page.locator('button:has-text("Create Vehicle"), button:has-text("+ Create Vehicle")')
    );
    this.editVehicleButton = this.vehicleCard.locator('button:has-text("Edit")');
    this.deleteVehicleButton = this.vehicleCard.locator('button:has-text("Delete")');
    this.refreshButton = page.getByTestId('refresh-button').or(
      page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]')
    );

    // Create/Edit Modal
    this.vehicleModal = page.getByTestId('vehicle-modal').or(
      page.locator('[data-testid*="vehicle-modal"], .modal-overlay .modal')
    ).or(
      page.locator('[role="dialog"]')
    );
    this.modalTitle = page.locator('.modal-title');
    this.licensePlateInput = page.locator('#license_plate, #edit_license_plate').or(
      page.locator('.modal input[name="license_plate"], .modal input[placeholder*="license plate" i]')
    );
    this.vehicleTypeSelect = page.locator('#vehicle_type, #edit_vehicle_type').or(
      page.locator('.modal select[name="vehicle_type"], .modal .form-select')
    );
    this.colorInput = page.locator('#color, #edit_color').or(
      page.locator('.modal input[name="color"], .modal input[placeholder*="color" i]')
    );
    this.brandInput = page.locator('#brand, #edit_brand').or(
      page.locator('.modal input[name="brand"], .modal input[placeholder*="brand" i]')
    );
    this.modelInput = page.locator('#model, #edit_model').or(
      page.locator('.modal input[name="model"], .modal input[placeholder*="model" i]')
    );
    this.yearInput = page.locator('#year, #edit_year').or(
      page.locator('.modal input[name="year"], .modal input[type="number"]')
    );
    this.modalSaveButton = page.locator('.modal button[type="submit"], .modal button:has-text("Create"), .modal button:has-text("Update")');
    this.modalCancelButton = page.locator('.modal button:has-text("Cancel"), .modal button.btn-outline');
    this.modalCloseButton = page.locator('.modal .modal-close');

    // Delete confirmation modal
    this.deleteModal = page.getByTestId('delete-modal').or(
      page.locator('[data-testid*="delete-modal"], .modal-overlay .modal:has-text("Delete Vehicle")')
    );
    this.deleteConfirmButton = this.deleteModal.locator('button:has-text("Delete Vehicle"), button:has-text("Delete")').or(
      this.deleteModal.locator('.btn-danger')
    );
    this.deleteCancelButton = this.deleteModal.locator('button:has-text("Cancel"), button.btn-outline');

    // Pagination
    this.pagination = page.getByTestId('pagination').or(
      page.locator('[data-testid*="pagination"], .pagination-controls')
    );
    this.previousPageButton = this.pagination.locator('button:has-text("Previous")');
    this.nextPageButton = this.pagination.locator('button:has-text("Next")');
    this.pageNumbers = this.pagination.locator('.page-number, [data-page]');

    // Per page selector
    this.perPageSelect = page.getByTestId('per-page-select').or(
      page.locator('.filter-bar select.filter-select')
    );

    // Empty state
    this.emptyState = page.getByTestId('empty-state').or(
      page.locator('[data-testid*="empty"], .empty-state')
    );
    this.emptyStateMessage = this.emptyState.locator('.message, [data-message]');

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading')
    );
  }

  /**
   * Navigate to the Vehicles Management page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/vehicles-management');
  }

  /**
   * Verify that the vehicles page has loaded
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
   * Wait for the vehicles page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the count of vehicles displayed
   * @returns The number of vehicle cards in the current view
   */
  async getVehicleCount(): Promise<number> {
    return await this.vehicleCard.count();
  }

  /**
   * Get vehicle data from a specific card
   * @param index - The card index (0-based)
   * @returns Object containing vehicle data
   */
  async getVehicleData(index: number): Promise<{
    licensePlate: string;
    vehicleType: string;
    brandModel: string;
    color: string;
    year: string;
    sessions: string;
    totalSpent: string;
    isFrequent: boolean;
  }> {
    const card = this.vehicleCard.nth(index);
    const infoRows = card.locator('.vehicle-info-row');
    return {
      licensePlate: await card.locator('.vehicle-license').textContent() || '',
      vehicleType: await card.locator('.vehicle-type').textContent() || '',
      brandModel: await infoRows.nth(0).locator('.vehicle-info-value').textContent() || '',
      color: await infoRows.nth(1).locator('.vehicle-info-value').textContent() || '',
      year: await infoRows.nth(2).locator('.vehicle-info-value').textContent() || '',
      sessions: await infoRows.nth(3).locator('.vehicle-info-value').textContent() || '',
      totalSpent: await infoRows.nth(4).locator('.vehicle-info-value').textContent() || '',
      isFrequent: await card.locator('.frequent-badge').count() > 0,
    };
  }

  /**
   * Click the create vehicle button to open the create modal
   */
  private async clickCreateVehicle(): Promise<void> {
    await this.click(this.createVehicleButton);
    await this.waitForElement(this.vehicleModal);
  }

  /**
   * Fill in the vehicle form in the modal
   * @param data - The vehicle form data
   */
  private async fillVehicleForm(data: {
    licensePlate?: string;
    vehicleType?: string;
    color?: string;
    brand?: string;
    model?: string;
    year?: string;
  }): Promise<void> {
    if (data.licensePlate !== undefined) {
      await this.clear(this.licensePlateInput);
      await this.fill(this.licensePlateInput, data.licensePlate);
    }
    if (data.vehicleType !== undefined) {
      await this.selectOption(this.vehicleTypeSelect, data.vehicleType);
    }
    if (data.color !== undefined) {
      await this.clear(this.colorInput);
      await this.fill(this.colorInput, data.color);
    }
    if (data.brand !== undefined) {
      await this.clear(this.brandInput);
      await this.fill(this.brandInput, data.brand);
    }
    if (data.model !== undefined) {
      await this.clear(this.modelInput);
      await this.fill(this.modelInput, data.model);
    }
    if (data.year !== undefined) {
      await this.clear(this.yearInput);
      await this.fill(this.yearInput, data.year);
    }
  }

  /**
   * Create a new vehicle
   * @param data - The vehicle data
   */
  async createVehicle(data: {
    licensePlate: string;
    vehicleType?: string;
    color?: string;
    brand?: string;
    model?: string;
    year?: string;
  }): Promise<void> {
    await this.clickCreateVehicle();
    await this.fillVehicleForm(data);
    await this.click(this.modalSaveButton);
    await this.waitForHidden(this.vehicleModal);
  }

  /**
   * Click the edit button for a specific vehicle
   * @param index - The card index (0-based)
   */
  private async clickEditVehicle(index: number): Promise<void> {
    const card = this.vehicleCard.nth(index);
    await this.click(card.locator('button:has-text("Edit")'));
    await this.waitForElement(this.vehicleModal);
  }

  /**
   * Edit an existing vehicle
   * @param index - The card index (0-based)
   * @param data - The vehicle data to update
   */
  async editVehicle(index: number, data: {
    licensePlate?: string;
    vehicleType?: string;
    color?: string;
    brand?: string;
    model?: string;
    year?: string;
  }): Promise<void> {
    await this.clickEditVehicle(index);
    await this.fillVehicleForm(data);
    await this.click(this.modalSaveButton);
    await this.waitForHidden(this.vehicleModal);
  }

  /**
   * Click the delete button for a specific vehicle
   * @param index - The card index (0-based)
   */
  private async clickDeleteVehicle(index: number): Promise<void> {
    const card = this.vehicleCard.nth(index);
    await this.click(card.locator('button:has-text("Delete")'));
    await this.waitForElement(this.deleteModal);
  }

  /**
   * Delete a vehicle
   * @param index - The card index (0-based)
   */
  async deleteVehicle(index: number): Promise<void> {
    await this.clickDeleteVehicle(index);
    await this.confirmDelete();
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
   * Filter vehicles by type
   * @param type - The vehicle type to filter by ('all', 'S', 'M', or 'L')
   */
  async filterByType(type: string): Promise<void> {
    await this.selectOption(this.typeFilter, type);
    await this.waitForLoadingToComplete();
  }

  /**
   * Set the number of items per page
   * @param count - The number of items per page (10, 20, 50, or 100)
   */
  async setPerPage(count: number): Promise<void> {
    await this.selectOption(this.perPageSelect, count.toString());
    await this.waitForLoadingToComplete();
  }

  /**
   * Go to a specific page
   * @param pageNumber - The page number to navigate to
   */
  async goToPage(pageNumber: number): Promise<void> {
    const pageButton = this.pageNumbers.filter({ hasText: pageNumber.toString() });
    await this.click(pageButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Click the refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.click(this.refreshButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Find a vehicle card by license plate
   * @param plate - The license plate to find
   * @returns The card index if found, -1 otherwise
   */
  async findVehicleByPlate(plate: string): Promise<number> {
    const count = await this.getVehicleCount();
    for (let i = 0; i < count; i++) {
      const card = this.vehicleCard.nth(i);
      const license = await card.locator('.vehicle-license').textContent();
      if (license === plate) {
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
}

export default VehiclesManagementPage;
