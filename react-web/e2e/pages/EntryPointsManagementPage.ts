import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Entry Points Management Page Object Model
 * 
 * Represents the Entry Points Management page at '/manage/entry-points' which allows
 * CRUD operations on parking lot entry points.
 */
export class EntryPointsManagementPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Entry points list
  readonly entryPointsList: Locator;
  readonly entryPointItem: Locator;
  readonly entryPointCard: Locator;

  // Entry point elements
  readonly entryPointId: Locator;
  readonly entryPointName: Locator;
  readonly entryPointLocation: Locator;
  readonly entryPointStatus: Locator;

  // Action buttons (list level)
  readonly addEntryPointButton: Locator;
  readonly refreshButton: Locator;

  // Action buttons (item level)
  readonly editEntryPointButton: Locator;
  readonly deleteEntryPointButton: Locator;

  // Create/Edit Modal
  readonly entryPointModal: Locator;
  readonly modalTitle: Locator;
  readonly nameInput: Locator;
  readonly locationInput: Locator;
  readonly descriptionInput: Locator;
  readonly statusSelect: Locator;
  readonly modalSaveButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalCloseButton: Locator;

  // Delete confirmation modal
  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;
  readonly deleteMessage: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateIcon: Locator;

  // Loading state
  readonly loadingIndicator: Locator;

  // Stats
  readonly totalEntryPointsCount: Locator;
  readonly activeEntryPointsCount: Locator;

  // Navigation
  readonly backToDashboardButton: Locator;
  readonly backToConfigurationButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /entry points/i }).or(
      page.locator('h1, h2').filter({ hasText: /entry points|manage entry points/i })
    );

    // Entry points list
    this.entryPointsList = page.getByTestId('entry-points-list').or(
      page.locator('[data-testid*="entry-points-list"], .entry-points-list')
    );
    this.entryPointItem = page.getByTestId('entry-point-item').or(
      page.locator('[data-testid*="entry-point-item"], .entry-point-item, [data-entry-point-id]')
    );
    this.entryPointCard = page.getByTestId('entry-point-card').or(
      page.locator('[data-testid*="entry-point-card"], .entry-point-card')
    );

    // Entry point elements
    this.entryPointId = this.entryPointItem.locator('[data-entry-point-id], .entry-point-id');
    this.entryPointName = this.entryPointItem.locator('[data-entry-point-name], .entry-point-name, .name');
    this.entryPointLocation = this.entryPointItem.locator('[data-entry-point-location], .entry-point-location, .location');
    this.entryPointStatus = this.entryPointItem.locator('[data-entry-point-status], .entry-point-status, .status');

    // Action buttons (list level)
    this.addEntryPointButton = page.getByTestId('add-entry-point-button').or(
      page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New Entry Point")')
    );
    this.refreshButton = page.getByTestId('refresh-button').or(
      page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]')
    );

    // Action buttons (item level)
    this.editEntryPointButton = page.getByTestId('edit-entry-point-button').or(
      page.locator('button:has-text("Edit"), button[aria-label*="edit"]')
    );
    this.deleteEntryPointButton = page.getByTestId('delete-entry-point-button').or(
      page.locator('button:has-text("Delete"), button[aria-label*="delete"]')
    );

    // Create/Edit Modal
    this.entryPointModal = page.getByTestId('entry-point-modal').or(
      page.locator('[data-testid*="entry-point-modal"], .modal, [role="dialog"]')
    );
    this.modalTitle = this.entryPointModal.locator('.modal-title, h2, h3');
    this.nameInput = this.entryPointModal.locator('input[name="name"], input[placeholder*="name"]');
    this.locationInput = this.entryPointModal.locator('input[name="location"], input[placeholder*="location"]');
    this.descriptionInput = this.entryPointModal.locator('textarea[name="description"], textarea[placeholder*="description"]');
    this.statusSelect = this.entryPointModal.locator('select[name="status"], select[aria-label*="status"]');
    this.modalSaveButton = this.entryPointModal.locator('button:has-text("Save"), button[type="submit"]');
    this.modalCancelButton = this.entryPointModal.locator('button:has-text("Cancel")');
    this.modalCloseButton = this.entryPointModal.locator('button:has-text("Close"), button[aria-label="close"]');

    // Delete confirmation modal
    this.deleteModal = page.getByTestId('delete-modal').or(
      page.locator('[data-testid*="delete-modal"], .delete-modal')
    );
    this.deleteConfirmButton = this.deleteModal.locator('button:has-text("Confirm"), button:has-text("Delete")');
    this.deleteCancelButton = this.deleteModal.locator('button:has-text("Cancel")');
    this.deleteMessage = this.deleteModal.locator('.message, [data-message]');

    // Empty state
    this.emptyState = page.getByTestId('empty-state').or(
      page.locator('[data-testid*="empty"], .empty-state')
    );
    this.emptyStateMessage = this.emptyState.locator('.message, [data-message]');
    this.emptyStateIcon = this.emptyState.locator('.icon, [data-icon]');

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading-indicator')
    );

    // Stats
    this.totalEntryPointsCount = page.getByTestId('total-entry-points-count').or(
      page.locator('[data-testid*="total-entry-points"], .total-entry-points-count')
    );
    this.activeEntryPointsCount = page.getByTestId('active-entry-points-count').or(
      page.locator('[data-testid*="active-entry-points"], .active-entry-points-count')
    );

    // Navigation
    this.backToDashboardButton = page.locator('a[href="/"], button:has-text("Back to Dashboard")');
    this.backToConfigurationButton = page.locator('a[href="/configuration"], button:has-text("Back to Configuration")');
  }

  /**
   * Navigate to the Entry Points Management page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/manage/entry-points');
  }

  /**
   * Verify that the entry points page has loaded
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
   * Wait for the entry points page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the count of entry points displayed
   * @returns The number of entry points in the current view
   */
  async getEntryPointCount(): Promise<number> {
    return await this.entryPointItem.count();
  }

  /**
   * Get entry point data from a specific item
   * @param index - The item index (0-based)
   * @returns Object containing entry point data
   */
  async getEntryPointData(index: number): Promise<{
    id: string;
    name: string;
    location: string;
    status: string;
  }> {
    const item = this.entryPointItem.nth(index);
    return {
      id: await item.locator(this.entryPointId).textContent() || '',
      name: await item.locator(this.entryPointName).textContent() || '',
      location: await item.locator(this.entryPointLocation).textContent() || '',
      status: await item.locator(this.entryPointStatus).textContent() || '',
    };
  }

  /**
   * Click the add entry point button
   */
  async clickAddEntryPoint(): Promise<void> {
    await this.click(this.addEntryPointButton);
    await this.waitForElement(this.entryPointModal);
  }

  /**
   * Click the edit button for a specific entry point
   * @param index - The item index (0-based)
   */
  async clickEditEntryPoint(index: number): Promise<void> {
    const item = this.entryPointItem.nth(index);
    await this.click(item.locator(this.editEntryPointButton));
    await this.waitForElement(this.entryPointModal);
  }

  /**
   * Click the delete button for a specific entry point
   * @param index - The item index (0-based)
   */
  async clickDeleteEntryPoint(index: number): Promise<void> {
    const item = this.entryPointItem.nth(index);
    await this.click(item.locator(this.deleteEntryPointButton));
    await this.waitForElement(this.deleteModal);
  }

  /**
   * Fill in the entry point form in the modal
   * @param data - The entry point data
   */
  async fillEntryPointForm(data: {
    name?: string;
    location?: string;
    description?: string;
    status?: string;
  }): Promise<void> {
    if (data.name !== undefined) {
      await this.clear(this.nameInput);
      await this.fill(this.nameInput, data.name);
    }
    if (data.location !== undefined) {
      await this.clear(this.locationInput);
      await this.fill(this.locationInput, data.location);
    }
    if (data.description !== undefined) {
      await this.clear(this.descriptionInput);
      await this.fill(this.descriptionInput, data.description);
    }
    if (data.status !== undefined) {
      await this.selectOption(this.statusSelect, data.status);
    }
  }

  /**
   * Click the save button in the modal
   */
  async clickModalSave(): Promise<void> {
    await this.click(this.modalSaveButton);
    await this.waitForHidden(this.entryPointModal);
  }

  /**
   * Click the cancel button in the modal
   */
  async clickModalCancel(): Promise<void> {
    await this.click(this.modalCancelButton);
    await this.waitForHidden(this.entryPointModal);
  }

  /**
   * Click the close button in the modal
   */
  async clickModalClose(): Promise<void> {
    await this.click(this.modalCloseButton);
    await this.waitForHidden(this.entryPointModal);
  }

  /**
   * Create a new entry point
   * @param data - The entry point data
   */
  async createEntryPoint(data: {
    name: string;
    location: string;
    description?: string;
    status?: 'active' | 'inactive';
  }): Promise<void> {
    await this.clickAddEntryPoint();
    await this.fillEntryPointForm(data);
    await this.clickModalSave();
  }

  /**
   * Update an existing entry point
   * @param index - The item index (0-based)
   * @param data - The entry point data to update
   */
  async updateEntryPoint(index: number, data: {
    name?: string;
    location?: string;
    description?: string;
    status?: 'active' | 'inactive';
  }): Promise<void> {
    await this.clickEditEntryPoint(index);
    await this.fillEntryPointForm(data);
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
   * Delete an entry point
   * @param index - The item index (0-based)
   */
  async deleteEntryPoint(index: number): Promise<void> {
    await this.clickDeleteEntryPoint(index);
    await this.confirmDelete();
  }

  /**
   * Get the delete message from the delete modal
   * @returns The delete message text
   */
  async getDeleteMessage(): Promise<string> {
    return await this.getText(this.deleteMessage);
  }

  /**
   * Find an entry point item by name
   * @param name - The entry point name to find
   * @returns The item index if found, -1 otherwise
   */
  async findEntryPointByName(name: string): Promise<number> {
    const count = await this.getEntryPointCount();
    for (let i = 0; i < count; i++) {
      const item = this.entryPointItem.nth(i);
      const itemName = await item.locator(this.entryPointName).textContent();
      if (itemName === name) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get the total entry points count
   * @returns The total entry points count
   */
  async getTotalEntryPointsCount(): Promise<number> {
    const text = await this.getText(this.totalEntryPointsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the active entry points count
   * @returns The active entry points count
   */
  async getActiveEntryPointsCount(): Promise<number> {
    const text = await this.getText(this.activeEntryPointsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
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
   * Click the back to configuration button
   */
  async clickBackToConfiguration(): Promise<void> {
    await this.click(this.backToConfigurationButton);
    await this.page.waitForURL(/\/configuration/);
  }

  /**
   * Verify that the entry points list is displayed
   * @returns True if entry points list is visible
   */
  async verifyEntryPointsListDisplayed(): Promise<boolean> {
    return await this.isVisible(this.entryPointsList);
  }

  /**
   * Verify that the entry point modal is displayed
   * @returns True if entry point modal is visible
   */
  async verifyEntryPointModalDisplayed(): Promise<boolean> {
    return await this.isVisible(this.entryPointModal);
  }

  /**
   * Verify that the delete modal is displayed
   * @returns True if delete modal is visible
   */
  async verifyDeleteModalDisplayed(): Promise<boolean> {
    return await this.isVisible(this.deleteModal);
  }

  /**
   * Get the current modal title
   * @returns The modal title text
   */
  async getModalTitle(): Promise<string> {
    return await this.getText(this.modalTitle);
  }

  /**
   * Get the current value of the name input
   * @returns The current name value
   */
  async getNameValue(): Promise<string> {
    return await this.getValue(this.nameInput);
  }

  /**
   * Get the current value of the location input
   * @returns The current location value
   */
  async getLocationValue(): Promise<string> {
    return await this.getValue(this.locationInput);
  }

  /**
   * Get the current value of the description input
   * @returns The current description value
   */
  async getDescriptionValue(): Promise<string> {
    return await this.getValue(this.descriptionInput);
  }

  /**
   * Get the current selected status
   * @returns The selected status value
   */
  async getStatusValue(): Promise<string> {
    return await this.getValue(this.statusSelect);
  }
}
