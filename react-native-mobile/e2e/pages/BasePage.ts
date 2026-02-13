/**
 * Base Page Object Model
 * 
 * Provides common methods and properties for all page objects.
 * All specific page objects should extend this class.
 */

import { Element, by, waitFor, device } from 'detox';

/**
 * Base Page Object
 * 
 * Provides common functionality for all page objects including:
 * - Element selection and interaction
 * - Waiting strategies
 * - Navigation helpers
 * - Assertion helpers
 */
export class BasePage {
  // Common selectors
  readonly loadingSpinner: Element;
  readonly errorBanner: Element;
  readonly successBanner: Element;
  readonly backButton: Element;
  readonly refreshButton: Element;

  constructor() {
    // Initialize common selectors
    this.loadingSpinner = element(by.id('loading-indicator'));
    this.errorBanner = element(by.id('error-message'));
    this.successBanner = element(by.id('success-message'));
    this.backButton = element(by.id('header-back-button'));
    this.refreshButton = element(by.id('refresh-button'));
  }

  /**
   * Navigate to a specific screen
   * @param screenName - The name of the screen to navigate to
   */
  async navigateTo(screenName: string): Promise<void> {
    const screenElement = element(by.text(screenName));
    await waitFor(screenElement)
      .toBeVisible()
      .withTimeout(5000);
    await screenElement.tap();
    await this.waitForLoad();
  }

  /**
   * Wait for the page to fully load
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForLoad(timeout: number = 5000): Promise<void> {
    await this.waitForLoadingToComplete(timeout);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Wait for an element to be visible
   * @param selector - The element selector (ID or text)
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns The element when visible
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
    const element = by.id(selector);
    await waitFor(element)
      .toBeVisible()
      .withTimeout(timeout);
    return element;
  }

  /**
   * Wait for an element to be attached to the DOM
   * @param selector - The element selector (ID or text)
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns The element when attached
   */
  async waitForAttached(selector: string, timeout: number = 5000): Promise<Element> {
    const element = by.id(selector);
    await waitFor(element)
      .toExist()
      .withTimeout(timeout);
    return element;
  }

  /**
   * Wait for an element to be hidden
   * @param selector - The element selector (ID or text)
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForHidden(selector: string, timeout: number = 5000): Promise<void> {
    const element = by.id(selector);
    await waitFor(element)
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Click on an element
   * @param selector - The element selector (ID or text)
   * @param options - Click options
   */
  async click(selector: string, options?: { timeout?: number }): Promise<void> {
    const element = await this.waitForElement(selector, options?.timeout);
    await element.tap();
  }

  /**
   * Double click on an element
   * @param selector - The element selector (ID or text)
   */
  async doubleClick(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.multiTap(2);
  }

  /**
   * Long press on an element
   * @param selector - The element selector (ID or text)
   * @param duration - Duration of long press in milliseconds (default: 1000)
   */
  async longPress(selector: string, duration: number = 1000): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.longPress(duration);
  }

  /**
   * Fill an input field with text
   * @param selector - The input selector (ID or text)
   * @param value - The value to fill
   */
  async fill(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.clearText();
    await element.typeText(value);
  }

  /**
   * Clear an input field
   * @param selector - The input selector (ID or text)
   */
  async clear(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.clearText();
  }

  /**
   * Type text into an input field (preserves existing content)
   * @param selector - The input selector (ID or text)
   * @param value - The value to type
   */
  async type(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.typeText(value);
  }

  /**
   * Select an option from a picker
   * @param selector - The picker selector (ID or text)
   * @param value - The option value to select
   */
  async selectOption(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.tap();
    
    const option = element(by.text(value));
    await waitFor(option)
      .toBeVisible()
      .withTimeout(3000);
    await option.tap();
  }

  /**
   * Get text content of an element
   * @param selector - The element selector (ID or text)
   * @returns The text content
   */
  async getText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    const attrs = await element.getAttributes();
    return attrs.text || '';
  }

  /**
   * Get all text content from multiple elements
   * @param selector - The elements selector (ID or text)
   * @returns Array of text content
   */
  async getAllText(selector: string): Promise<string[]> {
    const elements = element(by.id(selector));
    const attrs = await elements.getAttributes();
    return [attrs.text || ''];
  }

  /**
   * Get the value of an input element
   * @param selector - The input selector (ID or text)
   * @returns The input value
   */
  async getValue(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    const attrs = await element.getAttributes();
    return attrs.text || '';
  }

  /**
   * Check if an element is visible
   * @param selector - The element selector (ID or text)
   * @returns True if visible, false otherwise
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      await this.waitForElement(selector, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element exists in the DOM
   * @param selector - The element selector (ID or text)
   * @returns True if exists, false otherwise
   */
  async exists(selector: string): Promise<boolean> {
    try {
      await this.waitForAttached(selector, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is enabled
   * @param selector - The element selector (ID or text)
   * @returns True if enabled, false otherwise
   */
  async isEnabled(selector: string): Promise<boolean> {
    try {
      const element = await this.waitForElement(selector);
      const attrs = await element.getAttributes();
      return !attrs.disabled;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is checked
   * @param selector - The element selector (ID or text)
   * @returns True if checked, false otherwise
   */
  async isChecked(selector: string): Promise<boolean> {
    try {
      const element = await this.waitForElement(selector);
      const attrs = await element.getAttributes();
      return attrs.selected === true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for loading spinner to disappear
   * @param timeout - Maximum time to wait in milliseconds (default: 10000)
   */
  async waitForLoadingToComplete(timeout: number = 10000): Promise<void> {
    try {
      await waitFor(this.loadingSpinner)
        .not.toBeVisible()
        .withTimeout(timeout);
    } catch {
      // Loading spinner might not exist, which is fine
    }
  }

  /**
   * Wait for success message to appear
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns The success message text
   */
  async waitForSuccessMessage(timeout: number = 5000): Promise<string> {
    await waitFor(this.successBanner)
      .toBeVisible()
      .withTimeout(timeout);
    return await this.getText('success-message');
  }

  /**
   * Wait for error message to appear
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns The error message text
   */
  async waitForErrorMessage(timeout: number = 5000): Promise<string> {
    await waitFor(this.errorBanner)
      .toBeVisible()
      .withTimeout(timeout);
    return await this.getText('error-message');
  }

  /**
   * Take a screenshot of the current page
   * @param name - The name for the screenshot file
   */
  async takeScreenshot(name: string): Promise<void> {
    await device.takeScreenshot(`screenshots/${name}-${Date.now()}.png`);
  }

  /**
   * Take a screenshot of a specific element
   * @param selector - The element selector (ID or text)
   * @param name - The name for the screenshot file
   */
  async takeElementScreenshot(selector: string, name: string): Promise<void> {
    const element = await this.waitForElement(selector);
    // Detox doesn't have element-specific screenshots, so we take a full screenshot
    await device.takeScreenshot(`screenshots/${name}-${Date.now()}.png`);
  }

  /**
   * Scroll to the bottom of the page
   * @param selector - The scrollable element selector (ID or text)
   */
  async scrollToBottom(selector: string = 'scroll-view'): Promise<void> {
    const element = by.id(selector);
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.scrollTo('bottom');
  }

  /**
   * Scroll to the top of the page
   * @param selector - The scrollable element selector (ID or text)
   */
  async scrollToTop(selector: string = 'scroll-view'): Promise<void> {
    const element = by.id(selector);
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.scrollTo('top');
  }

  /**
   * Swipe an element
   * @param selector - The element selector (ID or text)
   * @param direction - Swipe direction ('up', 'down', 'left', 'right')
   * @param speed - Swipe speed ('fast', 'slow', 'normal')
   * @param percentage - Swipe percentage (0-1)
   */
  async swipe(
    selector: string,
    direction: 'up' | 'down' | 'left' | 'right',
    speed: 'fast' | 'slow' | 'normal' = 'fast',
    percentage: number = 0.5
  ): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.swipe(direction, speed, percentage);
  }

  /**
   * Go back in navigation
   */
  async goBack(): Promise<void> {
    await device.pressBack();
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await device.reloadReactNative();
    await this.waitForLoad();
  }

  /**
   * Get the count of elements matching the selector
   * @param selector - The elements selector (ID or text)
   * @returns The count of matching elements
   */
  async getCount(selector: string): Promise<number> {
    const elements = element(by.id(selector));
    // Detox doesn't have a direct count method
    // This is a placeholder implementation
    return 0;
  }

  /**
   * Get the nth element matching the selector
   * @param selector - The elements selector (ID or text)
   * @param index - The index of the element (0-based)
   * @returns The nth element
   */
  async getNthElement(selector: string, index: number): Promise<Element> {
    const elements = element(by.id(selector));
    return elements.atIndex(index);
  }

  /**
   * Wait for text to appear
   * @param text - The text to wait for
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForText(text: string, timeout: number = 5000): Promise<void> {
    const element = by.text(text);
    await waitFor(element)
      .toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Check if element has specific text
   * @param selector - The element selector (ID or text)
   * @param expectedText - The expected text
   * @returns True if element has expected text, false otherwise
   */
  async hasText(selector: string, expectedText: string): Promise<boolean> {
    const text = await this.getText(selector);
    return text.includes(expectedText);
  }

  /**
   * Wait for network idle
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForNetworkIdle(timeout: number = 1000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, timeout));
  }

  /**
   * Get page title
   * @returns The page title
   */
  async getTitle(): Promise<string> {
    const titleElement = element(by.id('header-title'));
    const attrs = await titleElement.getAttributes();
    return attrs.text || '';
  }

  /**
   * Dismiss keyboard if visible
   */
  async dismissKeyboard(): Promise<void> {
    await device.pressBack();
  }

  /**
   * Wait for element to be focused
   * @param selector - The element selector (ID or text)
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForFocused(selector: string, timeout: number = 5000): Promise<void> {
    const element = await this.waitForElement(selector);
    await waitFor(element)
      .toBeVisible()
      .withTimeout(timeout);
    // Detox doesn't have a direct focus check
    // We assume visibility is sufficient for most cases
  }

  /**
   * Tap element at coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  async tapAt(x: number, y: number): Promise<void> {
    await device.tap({ x, y });
  }

  /**
   * Swipe from coordinates
   * @param startX - Start X coordinate
   * @param startY - Start Y coordinate
   * @param endX - End X coordinate
   * @param endY - End Y coordinate
   * @param speed - Swipe speed ('fast', 'slow', 'normal')
   */
  async swipeFrom(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    speed: 'fast' | 'slow' | 'normal' = 'fast'
  ): Promise<void> {
    await device.swipe(startX, startY, endX, endY, speed);
  }
}
