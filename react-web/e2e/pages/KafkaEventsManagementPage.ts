import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Kafka Events Management Page Object Model
 *
 * Represents the Kafka Events page at '/kafka-events' which provides
 * read-only access to Kafka events with filtering by status and event type,
 * pagination, and detail views.
 */
export class KafkaEventsManagementPage extends BasePage {
  // Page title
  readonly pageTitle: Locator;

  // Table view
  readonly eventsTable: Locator;
  readonly eventsTableContainer: Locator;
  readonly eventRow: Locator;
  readonly tableBody: Locator;

  // Event row elements
  readonly eventRowId: Locator;
  readonly eventRowEventType: Locator;
  readonly eventRowTopic: Locator;
  readonly eventRowStatus: Locator;
  readonly eventRowPartition: Locator;
  readonly eventRowOffset: Locator;
  readonly eventRowOccurredAt: Locator;
  readonly eventRowPublishedAt: Locator;
  readonly eventRowRetryCount: Locator;
  readonly eventRowViewButton: Locator;

  // Status badges
  readonly statusPending: Locator;
  readonly statusPublished: Locator;
  readonly statusFailed: Locator;
  readonly statusRetrying: Locator;

  // Filter bar
  readonly filterBar: Locator;
  readonly filterStatusSelect: Locator;
  readonly filterEventTypeInput: Locator;
  readonly clearFilterButton: Locator;

  // Status filter options
  readonly statusAll: string;
  readonly statusPendingOption: string;
  readonly statusPublishedOption: string;
  readonly statusFailedOption: string;
  readonly statusRetryingOption: string;

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
    this.pageTitle = page.getByRole('heading', { name: /kafka events/i }).or(
      page.locator('h1, h2').filter({ hasText: /kafka events/i })
    );

    // Table view
    this.eventsTableContainer = page.getByTestId('events-table-container').or(
      page.locator('.events-table-container')
    );
    this.eventsTable = page.getByTestId('events-table').or(
      page.locator('table.events-table')
    );
    this.eventRow = page.getByTestId('event-row').or(
      page.locator('.event-row, table.events-table tbody tr')
    );
    this.tableBody = this.eventsTable.locator('tbody');

    // Event row elements - target td by position within each row
    this.eventRowId = this.eventRow.locator('td:nth-child(1)');
    this.eventRowEventType = this.eventRow.locator('td:nth-child(2)');
    this.eventRowTopic = this.eventRow.locator('td:nth-child(3)');
    this.eventRowStatus = this.eventRow.locator('.status-badge');
    this.eventRowPartition = this.eventRow.locator('td:nth-child(5)');
    this.eventRowOffset = this.eventRow.locator('td:nth-child(6)');
    this.eventRowOccurredAt = this.eventRow.locator('td:nth-child(7)');
    this.eventRowPublishedAt = this.eventRow.locator('td:nth-child(8)');
    this.eventRowRetryCount = this.eventRow.locator('td:nth-child(9)');
    this.eventRowViewButton = this.eventRow.locator('button:has-text("View Details")');

    // Status badges
    this.statusPending = page.locator('.status-badge.status-pending');
    this.statusPublished = page.locator('.status-badge.status-published');
    this.statusFailed = page.locator('.status-badge.status-failed');
    this.statusRetrying = page.locator('.status-badge.status-retrying');

    // Filter bar
    this.filterBar = page.getByTestId('filter-bar').or(
      page.locator('.filter-bar')
    );
    this.filterStatusSelect = page.getByTestId('filter-status').or(
      page.locator('.filter-bar .filter-select')
    );
    this.filterEventTypeInput = page.getByTestId('filter-event-type').or(
      page.locator('.filter-bar .filter-input[placeholder*="event type" i]')
    ).or(
      page.locator('.filter-bar .filter-input')
    );
    this.clearFilterButton = page.getByTestId('clear-filter').or(
      page.locator('.filter-bar button:has-text("Clear Filter")')
    );

    // Status filter options
    this.statusAll = 'all';
    this.statusPendingOption = 'pending';
    this.statusPublishedOption = 'published';
    this.statusFailedOption = 'failed';
    this.statusRetryingOption = 'retrying';

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
      page.locator('.filter-bar select.filter-select')
    );

    // Empty state
    this.emptyState = page.getByTestId('empty-state').or(
      page.locator('[data-testid*="empty"], .empty-state')
    ).or(
      page.locator('.kafka-events-management div[style*="text-align: center"]')
    );
    this.emptyStateMessage = this.emptyState;

    // Loading state
    this.loadingIndicator = page.getByTestId('loading').or(
      page.locator('[data-testid*="loading"], .loading')
    );
  }

  /**
   * Navigate to the Kafka Events page
   */
  async goto(): Promise<void> {
    await this.navigateTo('/kafka-events');
  }

  /**
   * Verify that the Kafka events page has loaded
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
   * Wait for the Kafka events page to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 1000 });
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the count of Kafka events displayed
   * @returns The number of event rows in the current view
   */
  async getEventCount(): Promise<number> {
    return await this.eventRow.count();
  }

  /**
   * Get event data from a specific row
   * @param index - The row index (0-based)
   * @returns Object containing event data
   */
  async getEventData(index: number): Promise<{
    id: string;
    eventType: string;
    topic: string;
    status: string;
    partition: string;
    offset: string;
    occurredAt: string;
    publishedAt: string;
    retryCount: string;
  }> {
    const row = this.eventRow.nth(index);
    return {
      id: await row.locator('td:nth-child(1)').textContent() || '',
      eventType: await row.locator('td:nth-child(2)').textContent() || '',
      topic: await row.locator('td:nth-child(3)').textContent() || '',
      status: await row.locator('.status-badge').textContent() || '',
      partition: await row.locator('td:nth-child(5)').textContent() || '',
      offset: await row.locator('td:nth-child(6)').textContent() || '',
      occurredAt: await row.locator('td:nth-child(7)').textContent() || '',
      publishedAt: await row.locator('td:nth-child(8)').textContent() || '',
      retryCount: await row.locator('td:nth-child(9)').textContent() || '',
    };
  }

  /**
   * Filter events by status
   * @param status - The status to filter by ('all', 'pending', 'published', 'failed', or 'retrying')
   */
  async filterByStatus(status: string): Promise<void> {
    await this.selectOption(this.filterStatusSelect, status);
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter events by event type
   * @param type - The event type to filter by
   */
  async filterByEventType(type: string): Promise<void> {
    await this.clear(this.filterEventTypeInput);
    await this.fill(this.filterEventTypeInput, type);
    await this.waitForLoadingToComplete();
  }

  /**
   * Clear all filters
   */
  async clearFilter(): Promise<void> {
    // Clear event type filter if there's a clear button
    const clearButton = this.clearFilterButton;
    if (await this.isVisible(clearButton)) {
      await this.click(clearButton);
    } else {
      await this.clear(this.filterEventTypeInput);
    }
    // Reset status filter to "all"
    await this.selectOption(this.filterStatusSelect, this.statusAll);
    await this.waitForLoadingToComplete();
  }

  /**
   * View details of a specific event
   * @param index - The row index (0-based)
   */
  async viewEventDetails(index: number): Promise<void> {
    const row = this.eventRow.nth(index);
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

export default KafkaEventsManagementPage;
