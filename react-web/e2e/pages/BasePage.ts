import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object Model
 * 
 * Provides common methods and properties for all page objects.
 * All specific page objects should extend this class.
 */
export class BasePage {
  readonly page: Page;

  // Common selectors
  readonly loadingSpinner: Locator;
  readonly errorBanner: Locator;
  readonly successBanner: Locator;
  readonly toast: Locator;
  readonly navigation: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize common selectors
    this.loadingSpinner = page.getByTestId('loading-spinner').or(
      page.locator('.loading-spinner')
    ).or(
      page.locator('[role="progressbar"]')
    );
    
    this.errorBanner = page.getByTestId('error-message').or(
      page.locator('[data-testid*="error"]')
    ).or(
      page.locator('.error-banner')
    );
    
    this.successBanner = page.getByTestId('success-message').or(
      page.locator('[data-testid*="success"]')
    ).or(
      page.locator('.success-banner')
    );
    
    this.toast = page.locator('[role="alert"]').or(
      page.locator('.toast')
    );
    
    this.navigation = page.locator('nav').or(
      page.locator('[role="navigation"]')
    );
  }

  /**
   * Navigate to a specific URL path
   * @param path - The path to navigate to (e.g., '/park')
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoad();
  }

  /**
   * Get the current page URL
   * @returns The current URL as a string
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for the page to fully load
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForLoad(timeout: number = 1000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for an element to be visible
   * @param selector - The element selector
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForElement(selector: string | Locator, timeout: number = 1000): Promise<Locator> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /**
   * Wait for an element to be attached to the DOM
   * @param selector - The element selector
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForAttached(selector: string | Locator, timeout: number = 1000): Promise<Locator> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'attached', timeout });
    return locator;
  }

  /**
   * Wait for an element to be hidden
   * @param selector - The element selector
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForHidden(selector: string | Locator, timeout: number = 1000): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click on an element
   * @param selector - The element selector
   * @param options - Click options
   */
  async click(selector: string | Locator, options?: { timeout?: number; force?: boolean }): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.click(options);
  }

  /**
   * Double click on an element
   * @param selector - The element selector
   */
  async doubleClick(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.dblclick();
  }

  /**
   * Fill an input field with text
   * @param selector - The input selector
   * @param value - The value to fill
   */
  async fill(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    await locator.fill(value);
  }

  /**
   * Clear an input field
   * @param selector - The input selector
   */
  async clear(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.clear();
  }

  /**
   * Type text into an input field (preserves existing content)
   * @param selector - The input selector
   * @param value - The value to type
   */
  async type(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    await locator.type(value);
  }

  /**
   * Select an option from a dropdown
   * @param selector - The select element selector
   * @param value - The option value to select
   */
  async selectOption(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    await locator.selectOption(value);
  }

  /**
   * Get text content of an element
   * @param selector - The element selector
   * @returns The text content
   */
  async getText(selector: string | Locator): Promise<string> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return (await locator.textContent()) || '';
  }

  /**
   * Get all text content from multiple elements
   * @param selector - The elements selector
   * @returns Array of text content
   */
  async getAllText(selector: string | Locator): Promise<string[]> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return await locator.allTextContents();
  }

  /**
   * Get the value of an input element
   * @param selector - The input selector
   * @returns The input value
   */
  async getValue(selector: string | Locator): Promise<string> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return (await locator.inputValue()) || '';
  }

  /**
   * Check if an element is visible
   * @param selector - The element selector
   * @returns True if visible, false otherwise
   */
  async isVisible(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    try {
      await locator.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element exists in the DOM
   * @param selector - The element selector
   * @returns True if exists, false otherwise
   */
  async exists(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return await locator.count() > 0;
  }

  /**
   * Check if an element is enabled
   * @param selector - The element selector
   * @returns True if enabled, false otherwise
   */
  async isEnabled(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return await locator.isEnabled();
  }

  /**
   * Check if an element is checked
   * @param selector - The element selector
   * @returns True if checked, false otherwise
   */
  async isChecked(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return await locator.isChecked();
  }

  /**
   * Wait for loading spinner to disappear
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForLoadingToComplete(timeout: number = 1000): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // Loading spinner might not exist, which is fine
    }
  }

  /**
   * Wait for success message to appear
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForSuccessMessage(timeout: number = 1000): Promise<string> {
    await this.successBanner.waitFor({ state: 'visible', timeout });
    return await this.getText(this.successBanner);
  }

  /**
   * Wait for error message to appear
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForErrorMessage(timeout: number = 1000): Promise<string> {
    await this.errorBanner.waitFor({ state: 'visible', timeout });
    return await this.getText(this.errorBanner);
  }

  /**
   * Take a screenshot of the current page
   * @param name - The name for the screenshot file
   * @param fullPage - Whether to capture the full page (default: true)
   */
  async takeScreenshot(name: string, fullPage: boolean = true): Promise<void> {
    await this.page.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage,
    });
  }

  /**
   * Take a screenshot of a specific element
   * @param selector - The element selector
   * @param name - The name for the screenshot file
   */
  async takeElementScreenshot(selector: string | Locator, name: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    await locator.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
    });
  }

  /**
   * Hover over an element
   * @param selector - The element selector
   */
  async hover(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    await locator.hover();
  }

  /**
   * Scroll an element into view
   * @param selector - The element selector
   */
  async scrollIntoView(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Get the count of elements matching the selector
   * @param selector - The elements selector
   * @returns The count of matching elements
   */
  async getCount(selector: string | Locator): Promise<number> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return await locator.count();
  }

  /**
   * Get the nth element matching the selector
   * @param selector - The elements selector
   * @param index - The index of the element (0-based)
   * @returns The locator for the nth element
   */
  async getNthElement(selector: string | Locator, index: number): Promise<Locator> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : locator;
    return locator.nth(index);
  }

  /**
   * Wait for an API response matching a URL pattern
   * @param urlPattern - The URL pattern to match (string or RegExp)
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 1000): Promise<any> {
    const response = await this.page.waitForResponse(urlPattern, { timeout });
    return await response.json().catch(() => response.text());
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForLoad();
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForLoad();
  }

  /**
   * Execute JavaScript in the page context
   * @param script - The JavaScript to execute
   * @param args - Arguments to pass to the script
   * @returns The result of the script execution
   */
  async evaluate<R>(script: string | Function, ...args: any[]): Promise<R> {
    return await this.page.evaluate(script, ...args);
  }

  /**
   * Get page title
   * @returns The page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }
}
