import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Sessions Management Page Object Model
 * 
 * Represents the Sessions Management page at '/sessions' which displays
 * a list of all parking sessions with filtering, pagination, and search capabilities.
 */
export class SessionsManagementPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Search and filter
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly clearSearchButton: Locator;
  readonly statusFilter: Locator;
  readonly vehicleTypeFilter: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;

  // Filter options
  readonly statusAll: string;
  readonly statusActive: string;
  readonly statusCompleted: string;
  readonly statusCancelled: string;

  // Table/List view
  readonly sessionsList: Locator;
  readonly sessionRow: Locator;
  readonly sessionTable: Locator;
  readonly tableBody: Locator;

  // Session row elements
  readonly sessionRowId: Locator;
  readonly sessionRowSlot: Locator;
  readonly sessionRowPlate: Locator;
  readonly sessionRowType: Locator;
  readonly sessionRowEntryTime: Locator;
  readonly sessionRowExitTime: Locator;
  readonly sessionRowStatus: Locator;
  readonly sessionRowFee: Locator;
  readonly sessionRowViewButton: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly firstPageButton: Locator;
  readonly lastPageButton: Locator;
  readonly pageNumbers: Locator;
  readonly currentPageIndicator: Locator;
  readonly totalPagesIndicator: Locator;

  // Per page selector
  readonly perPageSelect: Locator;
  readonly perPageOption10: string;
  readonly perPageOption25: string;
  readonly perPageOption50: string;
  readonly perPageOption100: string;

  // Stats summary
  readonly totalSessionsCount: Locator;
  readonly activeSessionsCount: Locator;
  readonly completedSessionsCount: Locator;
  readonly cancelledSessionsCount: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateIcon: Locator;

  // Loading state
  readonly loadingIndicator: Locator;

  // Actions
  readonly refreshButton: Locator;
  readonly exportButton: Locator;

  // Navigation
  readonly backToDashboardButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page title
    this.pageTitle = page.getByRole('heading', { name: /sessions/i }).or(
      page.locator('h1, h2').filter({ hasText: /sessions|parking sessions/i })
    );

    // Search and filter
    this.searchInput = page.getByTestId('search-input').or(
      page.locator('input[name="search"], input[placeholder*="search"], input[placeholder*="Search"]')
    );
    this.searchButton = page.getByTestId('search-button').or(
      page.locator('button:has-text("Search"), button[aria-label*="search"]')
    );
    this.clearSearchButton = page.getByTestId('clear-search-button').or(
      page.locator('button:has-text("Clear"), button[aria-label*="clear"]')
    );
    this.statusFilter = page.getByTestId('status-filter').or(
      page.locator('select[name="status"], select[aria-label*="status"]')
    );
    this.vehicleTypeFilter = page.getByTestId('vehicle-type-filter').or(
      page.locator('select[name="vehicleType"], select[aria-label*="vehicle type"]')
    );
    this.dateFromInput = page.getByTestId('date-from-input').or(
      page.locator('input[name="dateFrom"], input[aria-label*="from"]')
    );
    this.dateToInput = page.getByTestId('date-to-input').or(
      page.locator('input[name="dateTo"], input[aria-label*="to"]')
    );

    // Filter options
    this.statusAll = 'all';
    this.statusActive = 'active';
    this.statusCompleted = 'completed';
    this.statusCancelled = 'cancelled';

    // Table/List view
    this.sessionsList = page.getByTestId('sessions-list').or(
      page.locator('[data-testid*="sessions-list"], .sessions-list')
    );
    this.sessionRow = page.getByTestId('session-row').or(
      page.locator('[data-testid*="session-row"], .session-row, tr[data-session-id]')
    );
    this.sessionTable = page.getByTestId('sessions-table').or(
      page.locator('table.sessions-table, [data-testid*="sessions-table"]')
    );
    this.tableBody = this.sessionTable.locator('tbody');

    // Session row elements
    this.sessionRowId = this.sessionRow.locator('[data-session-id], .session-id');
    this.sessionRowSlot = this.sessionRow.locator('[data-slot-number], .slot-number');
    this.sessionRowPlate = this.sessionRow.locator('[data-vehicle-plate], .vehicle-plate');
    this.sessionRowType = this.sessionRow.locator('[data-vehicle-type], .vehicle-type');
    this.sessionRowEntryTime = this.sessionRow.locator('[data-entry-time], .entry-time');
    this.sessionRowExitTime = this.sessionRow.locator('[data-exit-time], .exit-time');
    this.sessionRowStatus = this.sessionRow.locator('[data-status], .status-badge');
    this.sessionRowFee = this.sessionRow.locator('[data-fee], .fee-amount');
    this.sessionRowViewButton = this.sessionRow.locator('button:has-text("View"), a:has-text("View")');

    // Pagination
    this.pagination = page.getByTestId('pagination').or(
      page.locator('[data-testid*="pagination"], .pagination')
    );
    this.previousPageButton = this.pagination.locator('button:has-text("Previous"), button[aria-label*="previous"]');
    this.nextPageButton = this.pagination.locator('button:has-text("Next"), button[aria-label*="next"]');
    this.firstPageButton = this.pagination.locator('button:has-text("First"), button[aria-label*="first"]');
    this.lastPageButton = this.pagination.locator('button:has-text("Last"), button[aria-label*="last"]');
    this.pageNumbers = this.pagination.locator('.page-number, [data-page]');
    this.currentPageIndicator = this.pagination.locator('.current-page, [data-current-page]');
    this.totalPagesIndicator = this.pagination.locator('.total-pages, [data-total-pages]');

    // Per page selector
    this.perPageSelect = page.getByTestId('per-page-select').or(
      page.locator('select[name="perPage"], select[aria-label*="per page"]')
    );
    this.perPageOption10 = '10';
    this.perPageOption25 = '25';
    this.perPageOption50 = '50';
    this.perPageOption100 = '100';

    // Stats summary
    this.totalSessionsCount = page.getByTestId('total-sessions-count').or(
      page.locator('[data-testid*="total-sessions"], .total-sessions-count')
    );
    this.activeSessionsCount = page.getByTestId('active-sessions-count').or(
      page.locator('[data-testid*="active-sessions"], .active-sessions-count')
    );
    this.completedSessionsCount = page.getByTestId('completed-sessions-count').or(
      page.locator('[data-testid*="completed-sessions"], .completed-sessions-count')
    );
    this.cancelledSessionsCount = page.getByTestId('cancelled-sessions-count').or(
      page.locator('[data-testid*="cancelled-sessions"], .cancelled-sessions-count')
    );

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

    // Actions
    this.refreshButton = page.getByTestId('refresh-button').or(
      page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]')
    );
    this.exportButton = page.getByTestId('export-button').or(
      page.locator('button:has-text("Export"), button[aria-label*="export"]')
    );

    // Navigation
    this.backToDashboardButton = page.locator('a[href="/"], button:has-text("Back to Dashboard")');
  }

  /**
   * Navigate to the Sessions Management page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/sessions');
  }

  /**
   * Verify that the sessions page has loaded
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
   * Wait for the sessions page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
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
   * Filter by status
   * @param status - The status to filter by ('all', 'active', 'completed', or 'cancelled')
   */
  async filterByStatus(status: string): Promise<void> {
    await this.selectOption(this.statusFilter, status);
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by vehicle type
   * @param vehicleType - The vehicle type to filter by
   */
  async filterByVehicleType(vehicleType: string): Promise<void> {
    await this.selectOption(this.vehicleTypeFilter, vehicleType);
    await this.waitForLoadingToComplete();
  }

  /**
   * Set the date range filter
   * @param fromDate - The start date
   * @param toDate - The end date
   */
  async setDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.fill(this.dateFromInput, fromDate);
    await this.fill(this.dateToInput, toDate);
    await this.clickSearchButton();
  }

  /**
   * Get the count of sessions displayed
   * @returns The number of sessions in the current view
   */
  async getSessionCount(): Promise<number> {
    return await this.sessionRow.count();
  }

  /**
   * Get the total number of sessions (from stats)
   * @returns The total sessions count
   */
  async getTotalSessionsCount(): Promise<number> {
    const text = await this.getText(this.totalSessionsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the active sessions count
   * @returns The active sessions count
   */
  async getActiveSessionsCount(): Promise<number> {
    const text = await this.getText(this.activeSessionsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the completed sessions count
   * @returns The completed sessions count
   */
  async getCompletedSessionsCount(): Promise<number> {
    const text = await this.getText(this.completedSessionsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get the cancelled sessions count
   * @returns The cancelled sessions count
   */
  async getCancelledSessionsCount(): Promise<number> {
    const text = await this.getText(this.cancelledSessionsCount);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
  }

  /**
   * Get session data from a specific row
   * @param index - The row index (0-based)
   * @returns Object containing session data
   */
  async getSessionData(index: number): Promise<{
    sessionId: string;
    slotNumber: string;
    vehiclePlate: string;
    vehicleType: string;
    entryTime: string;
    exitTime: string;
    status: string;
    fee: number;
  }> {
    const row = this.sessionRow.nth(index);
    return {
      sessionId: await row.locator(this.sessionRowId).textContent() || '',
      slotNumber: await row.locator(this.sessionRowSlot).textContent() || '',
      vehiclePlate: await row.locator(this.sessionRowPlate).textContent() || '',
      vehicleType: await row.locator(this.sessionRowType).textContent() || '',
      entryTime: await row.locator(this.sessionRowEntryTime).textContent() || '',
      exitTime: await row.locator(this.sessionRowExitTime).textContent() || '',
      status: await row.locator(this.sessionRowStatus).textContent() || '',
      fee: parseFloat((await row.locator(this.sessionRowFee).textContent() || '0').replace(/[^0-9.]/g, '')) || 0,
    };
  }

  /**
   * Click the view button for a specific session
   * @param index - The row index (0-based)
   */
  async clickViewSession(index: number): Promise<void> {
    const row = this.sessionRow.nth(index);
    await this.click(row.locator(this.sessionRowViewButton));
    await this.page.waitForURL(/\/session\//);
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
   * Go to the next page
   */
  async goToNextPage(): Promise<void> {
    await this.click(this.nextPageButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Go to the previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.click(this.previousPageButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Go to the first page
   */
  async goToFirstPage(): Promise<void> {
    await this.click(this.firstPageButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Go to the last page
   */
  async goToLastPage(): Promise<void> {
    await this.click(this.lastPageButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the current page number
   * @returns The current page number
   */
  async getCurrentPage(): Promise<number> {
    const text = await this.getText(this.currentPageIndicator);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 1;
  }

  /**
   * Get the total number of pages
   * @returns The total pages count
   */
  async getTotalPages(): Promise<number> {
    const text = await this.getText(this.totalPagesIndicator);
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 1;
  }

  /**
   * Set the number of items per page
   * @param count - The number of items per page (10, 25, 50, or 100)
   */
  async setPerPage(count: number): Promise<void> {
    await this.selectOption(this.perPageSelect, count.toString());
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the current per-page value
   * @returns The current per-page value
   */
  async getPerPage(): Promise<number> {
    const value = await this.getValue(this.perPageSelect);
    return parseInt(value) || 10;
  }

  /**
   * Check if the previous page button is disabled
   * @returns True if the previous page button is disabled
   */
  async isPreviousPageDisabled(): Promise<boolean> {
    return !(await this.isEnabled(this.previousPageButton));
  }

  /**
   * Check if the next page button is disabled
   * @returns True if the next page button is disabled
   */
  async isNextPageDisabled(): Promise<boolean> {
    return !(await this.isEnabled(this.nextPageButton));
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
   * Click the export button
   */
  async clickExport(): Promise<void> {
    await this.click(this.exportButton);
  }

  /**
   * Click the back to dashboard button
   */
  async clickBackToDashboard(): Promise<void> {
    await this.click(this.backToDashboardButton);
    await this.page.waitForURL(/\//);
  }

  /**
   * Search for a session by ID
   * @param sessionId - The session ID to search for
   */
  async searchSession(sessionId: string): Promise<void> {
    await this.fillSearch(sessionId);
    await this.clickSearchButton();
  }

  /**
   * Find a session row by session ID
   * @param sessionId - The session ID to find
   * @returns The row index if found, -1 otherwise
   */
  async findSessionRow(sessionId: string): Promise<number> {
    const count = await this.getSessionCount();
    for (let i = 0; i < count; i++) {
      const row = this.sessionRow.nth(i);
      const id = await row.locator(this.sessionRowId).textContent();
      if (id === sessionId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Verify that the sessions list is displayed
   * @returns True if sessions list is visible
   */
  async verifySessionsListDisplayed(): Promise<boolean> {
    return await this.isVisible(this.sessionsList);
  }

  /**
   * Verify that pagination is displayed
   * @returns True if pagination is visible
   */
  async verifyPaginationDisplayed(): Promise<boolean> {
    return await this.isVisible(this.pagination);
  }
}
