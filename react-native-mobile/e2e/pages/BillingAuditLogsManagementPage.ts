/**
 * Billing Audit Logs Management Page Object Model
 *
 * Provides methods for interacting with the Billing Audit Logs Management screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Billing Audit Logs Management Page Object
 *
 * Encapsulates all interactions with the Billing Audit Logs Management screen including:
 * - Billing logs list
 * - Session ID filtering
 * - Log detail viewing
 * - Pagination and summary
 */
export class BillingAuditLogsManagementPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Filters
  readonly filterBar: any;
  readonly filterSessionInput: any;
  readonly clearFilterButton: any;

  // Logs list
  readonly billingLogsList: any;
  readonly billingLogItem: any;

  // Detail modal
  readonly billingLogDetailModal: any;
  readonly closeModalButton: any;

  // Status
  readonly errorMessage: any;
  readonly loadingIndicator: any;
  readonly emptyState: any;

  // Pagination
  readonly paginationPrevious: any;
  readonly paginationNext: any;

  // Summary
  readonly summaryBar: any;

  constructor() {
    super();

    // Page selectors
    this.page = element(by.id('billing-audit-logs-page'));
    this.title = element(by.id('billing-title'));

    // Filters
    this.filterBar = element(by.id('filter-bar'));
    this.filterSessionInput = element(by.id('filter-session-input'));
    this.clearFilterButton = element(by.id('clear-filter-button'));

    // Logs list
    this.billingLogsList = element(by.id('billing-logs-list'));
    this.billingLogItem = element(by.id('billing-log-item'));

    // Detail modal
    this.billingLogDetailModal = element(by.id('billing-log-detail-modal'));
    this.closeModalButton = element(by.id('close-modal-button'));

    // Status
    this.errorMessage = element(by.id('error-message'));
    this.loadingIndicator = element(by.id('loading-indicator'));
    this.emptyState = element(by.id('empty-state'));

    // Pagination
    this.paginationPrevious = element(by.id('pagination-previous'));
    this.paginationNext = element(by.id('pagination-next'));

    // Summary
    this.summaryBar = element(by.id('summary-bar'));
  }

  /**
   * Navigate to Billing Audit Logs screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Billing Audit Logs');
    await this.waitForLoad();
  }

  /**
   * Wait for Billing Audit Logs screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Filter logs by session ID
   * @param sessionId - The session ID to filter by
   */
  async filterBySessionId(sessionId: string): Promise<void> {
    await waitFor(this.filterSessionInput)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterSessionInput.clearText();
    await this.filterSessionInput.typeText(sessionId);
    await this.waitForLoadingToComplete();
  }

  /**
   * Clear the current filter
   */
  async clearFilter(): Promise<void> {
    await waitFor(this.clearFilterButton)
      .toBeVisible()
      .withTimeout(5000);
    await this.clearFilterButton.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Get log count
   * @returns The number of billing audit logs
   */
  async getLogCount(): Promise<number> {
    return await this.getCount('billing-log-item');
  }

  /**
   * View details of a specific log by index
   * @param index - The index of the log (0-based)
   */
  async viewLogDetailsByIndex(index: number): Promise<void> {
    const logElement = this.billingLogItem.atIndex(index);
    await waitFor(logElement)
      .toBeVisible()
      .withTimeout(5000);
    await logElement.tap();
    await waitFor(this.billingLogDetailModal)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Close the log detail modal
   */
  async closeDetailModal(): Promise<void> {
    await waitFor(this.closeModalButton)
      .toBeVisible()
      .withTimeout(5000);
    await this.closeModalButton.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Scroll to bottom of logs list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('billing-logs-list');
  }

  /**
   * Scroll to top of logs list
   */
  async scrollToTop(): Promise<void> {
    await this.scrollToTop('billing-logs-list');
  }

  /**
   * Click Refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.click('refresh-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if logs list is visible
   * @returns True if logs list is visible
   */
  async isLogsListVisible(): Promise<boolean> {
    return await this.isVisible('billing-logs-list');
  }

  /**
   * Verify billing audit logs screen is displayed correctly
   */
  async verifyBillingAuditLogsScreen(): Promise<void> {
    await this.waitForVisible();

    // Verify title is visible
    await waitFor(this.title)
      .toBeVisible()
      .withTimeout(5000);

    // Verify filter bar is visible
    await waitFor(this.filterBar)
      .toBeVisible()
      .withTimeout(5000);

    // Verify logs list is visible
    await waitFor(this.billingLogsList)
      .toBeVisible()
      .withTimeout(5000);
  }
}

export default BillingAuditLogsManagementPage;
