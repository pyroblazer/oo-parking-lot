/**
 * Kafka Events Management Page Object Model
 *
 * Provides methods for interacting with the Kafka Events Management screen.
 */

import { BasePage } from './BasePage';
import { by, element, waitFor } from 'detox';

/**
 * Kafka Events Management Page Object
 *
 * Encapsulates all interactions with the Kafka Events Management screen including:
 * - Kafka events list
 * - Event status filtering (All, Pending, Published, Failed, Retrying)
 * - Event type filtering
 * - Event detail viewing
 * - Pagination and summary
 */
export class KafkaEventsManagementPage extends BasePage {
  // Page selectors
  readonly page: any;
  readonly title: any;

  // Filters
  readonly filterBar: any;
  readonly filterAll: any;
  readonly filterPending: any;
  readonly filterPublished: any;
  readonly filterFailed: any;
  readonly filterRetrying: any;
  readonly eventTypeFilterInput: any;
  readonly clearFilterButton: any;

  // Events list
  readonly kafkaEventsList: any;
  readonly kafkaEventItem: any;

  // Detail modal
  readonly kafkaEventDetailModal: any;
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
    this.page = element(by.id('kafka-events-page'));
    this.title = element(by.id('kafka-title'));

    // Filters
    this.filterBar = element(by.id('filter-bar'));
    this.filterAll = element(by.id('filter-all'));
    this.filterPending = element(by.id('filter-pending'));
    this.filterPublished = element(by.id('filter-published'));
    this.filterFailed = element(by.id('filter-failed'));
    this.filterRetrying = element(by.id('filter-retrying'));
    this.eventTypeFilterInput = element(by.id('event-type-filter-input'));
    this.clearFilterButton = element(by.id('clear-filter-button'));

    // Events list
    this.kafkaEventsList = element(by.id('kafka-events-list'));
    this.kafkaEventItem = element(by.id('kafka-event-item'));

    // Detail modal
    this.kafkaEventDetailModal = element(by.id('kafka-event-detail-modal'));
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
   * Navigate to Kafka Events screen
   */
  async navigate(): Promise<void> {
    await this.navigateTo('Kafka Events');
    await this.waitForLoad();
  }

  /**
   * Wait for Kafka Events screen to be visible
   */
  async waitForVisible(): Promise<void> {
    await waitFor(this.page)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Filter by All events
   */
  async filterByAll(): Promise<void> {
    await waitFor(this.filterAll)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterAll.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by Pending events
   */
  async filterByPending(): Promise<void> {
    await waitFor(this.filterPending)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterPending.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by Published events
   */
  async filterByPublished(): Promise<void> {
    await waitFor(this.filterPublished)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterPublished.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by Failed events
   */
  async filterByFailed(): Promise<void> {
    await waitFor(this.filterFailed)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterFailed.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by Retrying events
   */
  async filterByRetrying(): Promise<void> {
    await waitFor(this.filterRetrying)
      .toBeVisible()
      .withTimeout(5000);
    await this.filterRetrying.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter by event type
   * @param type - The event type to filter by
   */
  async filterByEventType(type: string): Promise<void> {
    await waitFor(this.eventTypeFilterInput)
      .toBeVisible()
      .withTimeout(5000);
    await this.eventTypeFilterInput.clearText();
    await this.eventTypeFilterInput.typeText(type);
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
   * Get event count
   * @returns The number of kafka events
   */
  async getEventCount(): Promise<number> {
    return await this.getCount('kafka-event-item');
  }

  /**
   * View details of a specific event by index
   * @param index - The index of the event (0-based)
   */
  async viewEventDetailsByIndex(index: number): Promise<void> {
    const eventElement = this.kafkaEventItem.atIndex(index);
    await waitFor(eventElement)
      .toBeVisible()
      .withTimeout(5000);
    await eventElement.tap();
    await waitFor(this.kafkaEventDetailModal)
      .toBeVisible()
      .withTimeout(5000);
  }

  /**
   * Close the event detail modal
   */
  async closeDetailModal(): Promise<void> {
    await waitFor(this.closeModalButton)
      .toBeVisible()
      .withTimeout(5000);
    await this.closeModalButton.tap();
    await this.waitForLoadingToComplete();
  }

  /**
   * Scroll to bottom of events list
   */
  async scrollToBottom(): Promise<void> {
    await this.scrollToBottom('kafka-events-list');
  }

  /**
   * Scroll to top of events list
   */
  async scrollToTop(): Promise<void> {
    await this.scrollToTop('kafka-events-list');
  }

  /**
   * Click Refresh button
   */
  async clickRefresh(): Promise<void> {
    await this.click('refresh-button');
    await this.waitForLoadingToComplete();
  }

  /**
   * Check if events list is visible
   * @returns True if events list is visible
   */
  async isEventsListVisible(): Promise<boolean> {
    return await this.isVisible('kafka-events-list');
  }

  /**
   * Verify kafka events screen is displayed correctly
   */
  async verifyKafkaEventsScreen(): Promise<void> {
    await this.waitForVisible();

    // Verify title is visible
    await waitFor(this.title)
      .toBeVisible()
      .withTimeout(5000);

    // Verify filter bar is visible
    await waitFor(this.filterBar)
      .toBeVisible()
      .withTimeout(5000);

    // Verify events list is visible
    await waitFor(this.kafkaEventsList)
      .toBeVisible()
      .withTimeout(5000);
  }
}

export default KafkaEventsManagementPage;
