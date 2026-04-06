import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Billing Audit Logs Management Page Object Model
 *
 * Represents the Billing Audit Logs page at '/billing-audit-logs' which provides
 * read-only access to billing audit logs with filtering, pagination, and detail views.
 */
export class BillingAuditLogsManagementPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Table view
  readonly logsTable: Locator;
  readonly logsTableContainer: Locator;
  readonly logRow: Locator;
  readonly tableBody: Locator;

  // Log row elements
  readonly logRowId: Locator;
  readonly logRowSessionId: Locator;
  readonly logRowVehicleType: Locator;
  readonly logRowSlot: Locator;
  readonly logRowEntryPoint: Locator;
  readonly logRowParkedAt: Locator;
  readonly logRowExitedAt: Locator;
  readonly logRowDuration: Locator;
  readonly logRowFee: Locator;
  readonly logRowStatus: Locator;
  readonly logRowViewButton: Locator;

  // Filter bar
  readonly filterBar: Locator;
  readonly filterSessionIdInput: Locator;
  readonly clearFilterButton: Locator;

  // Detail modal
  readonly detailModal: Locator;
  readonly detailModalTitle: Locator;
  readonly detailModalCloseButton: Locator;
  readonly detailModalPrimaryButton: Locator;
  readonly detailGrid: Locator;
  readonly detailItems: Locator;

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
    this.pageTitle = page.getByRole('heading', { name: /billing audit logs/i }).or(
      page.locator('h1, h2').filter({ hasText: /billing audit logs/i })
    );

    // Table view
    this.logsTableContainer = page.getByTestId('logs-table-container').or(
      page.locator('.logs-table-container')
    );
    this.logsTable = page.getByTestId('logs-table').or(
      page.locator('table.logs-table')
    );
    this.logRow = page.getByTestId('log-row').or(
      page.locator('.log-row, table.logs-table tbody tr')
    );
    this.tableBody = this.logsTable.locator('tbody');

    // Log row elements - target td by position within each row
    this.logRowId = this.logRow.locator('td:nth-child(1)');
    this.logRowSessionId = this.logRow.locator('td:nth-child(2)');
    this.logRowVehicleType = this.logRow.locator('td:nth-child(3)');
    this.logRowSlot = this.logRow.locator('td:nth-child(4)');
    this.logRowEntryPoint = this.logRow.locator('td:nth-child(5)');
    this.logRowParkedAt = this.logRow.locator('td:nth-child(6)');
    this.logRowExitedAt = this.logRow.locator('td:nth-child(7)');
    this.logRowDuration = this.logRow.locator('td:nth-child(8)');
    this.logRowFee = this.logRow.locator('td:nth-child(9) .fee-badge').or(
      this.logRow.locator('td:nth-child(9)')
    );
    this.logRowStatus = this.logRow.locator('.status-badge');
    this.logRowViewButton = this.logRow.locator('button:has-text("View Details")');

    // Filter bar
    this.filterBar = page.getByTestId('filter-bar').or(
      page.locator('.filter-bar')
    );
    this.filterSessionIdInput = page.getByTestId('filter-session-id').or(
      page.locator('.filter-bar .filter-input[placeholder*="session ID" i]')
    ).or(
      page.locator('.filter-bar .filter-input')
    );
    this.clearFilterButton = page.getByTestId('clear-filter').or(
      page.locator('.filter-bar button:has-text("Clear Filter")')
    );

    // Detail modal
    this.detailModal = page.getByTestId('detail-modal').or(
      page.locator('.modal-overlay .modal')
    ).or(
      page.locator('[role="dialog"]')
    );
    this.detailModalTitle = page.locator('.modal-title');
    this.detailModalCloseButton = page.locator('.modal .modal-close');
    this.detailModalPrimaryButton = page.locator('.modal .modal-footer button.btn-primary, .modal button:has-text("Close")');
    this.detailGrid = page.locator('.modal .detail-grid');
    this.detailItems = this.detailGrid.locator('.detail-item');

    // Pagination
    this.pagination = page.getByTestId('pagination').or(
      page.locator('[data-testid*="pagination"], .pagination-controls')
    );
    this.previousPageButton = this.pagination.locator('button:has-text("Previous")');
    this.nextPageButton = this.pagination.locator('button:has-text("Next")');
    this.pageNumbers = this.pagination.locator('.page-number, [data-page]');

    // Per page selector
    this.perPageSelect = page.getByTestId('per-page-select').or(
      page.locator('.filter-bar select.filter-input')
    );

    // Empty state
    this.emptyState = page.getByTestId('empty-state').or(
      page.locator('[data-testid*="empty"], .empty-state')
    ).or(
      page.locator('.billing-logs-management div[style*="text-align: center"]')
    );
    this.emptyStateMessage = this.emptyState;

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading')
    );
  }

  /**
   * Navigate to the Billing Audit Logs page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/billing-audit-logs');
  }

  /**
   * Verify that the billing audit logs page has loaded
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
   * Wait for the billing audit logs page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the count of billing audit logs displayed
   * @returns The number of log rows in the current view
   */
  async getLogCount(): Promise<number> {
    return await this.logRow.count();
  }

  /**
   * Get log data from a specific row
   * @param index - The row index (0-based)
   * @returns Object containing log data
   */
  async getLogData(index: number): Promise<{
    id: string;
    sessionId: string;
    vehicleType: string;
    slot: string;
    entryPoint: string;
    parkedAt: string;
    exitedAt: string;
    duration: string;
    totalFee: string;
    status: string;
  }> {
    const row = this.logRow.nth(index);
    return {
      id: await row.locator('td:nth-child(1)').textContent() || '',
      sessionId: await row.locator('td:nth-child(2)').textContent() || '',
      vehicleType: await row.locator('td:nth-child(3)').textContent() || '',
      slot: await row.locator('td:nth-child(4)').textContent() || '',
      entryPoint: await row.locator('td:nth-child(5)').textContent() || '',
      parkedAt: await row.locator('td:nth-child(6)').textContent() || '',
      exitedAt: await row.locator('td:nth-child(7)').textContent() || '',
      duration: await row.locator('td:nth-child(8)').textContent() || '',
      totalFee: await row.locator('td:nth-child(9)').textContent() || '',
      status: await row.locator('.status-badge').textContent() || '',
    };
  }

  /**
   * Filter logs by session ID
   * @param sessionId - The session ID to filter by
   */
  async filterBySessionId(sessionId: string): Promise<void> {
    await this.clear(this.filterSessionIdInput);
    await this.fill(this.filterSessionIdInput, sessionId);
    await this.waitForLoadingToComplete();
  }

  /**
   * Clear the session ID filter
   */
  async clearFilter(): Promise<void> {
    const clearButton = this.clearFilterButton;
    if (await this.isVisible(clearButton)) {
      await this.click(clearButton);
    } else {
      await this.clear(this.filterSessionIdInput);
    }
    await this.waitForLoadingToComplete();
  }

  /**
   * View details of a specific log entry by clicking the row
   * @param index - The row index (0-based)
   */
  async viewLogDetails(index: number): Promise<void> {
    const row = this.logRow.nth(index);
    await this.click(row.locator('button:has-text("View Details")'));
    await this.waitForElement(this.detailModal);
  }

  /**
   * Close the detail modal
   */
  async closeModal(): Promise<void> {
    // Try the close button first, then the primary button
    if (await this.isVisible(this.detailModalCloseButton)) {
      await this.click(this.detailModalCloseButton);
    } else {
      await this.click(this.detailModalPrimaryButton);
    }
    await this.waitForHidden(this.detailModal);
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

export default BillingAuditLogsManagementPage;
