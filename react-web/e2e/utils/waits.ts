import { Page, Locator } from '@playwright/test';

/**
 * Custom Wait Strategies
 * 
 * Provides specialized wait strategies for common E2E test scenarios.
 */

/**
 * Wait for page to be fully loaded
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForPageLoad(page: Page, timeout: number = 1000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for loading spinner to disappear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForLoadingToComplete(page: Page, timeout: number = 1000): Promise<void> {
  const selectors = [
    '[data-testid="loading-spinner"]',
    '.loading-spinner',
    '[role="progressbar"]',
    '.loading-indicator',
    '[data-testid="loading"]',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout });
    } catch {
      // Selector might not exist, which is fine
    }
  }
}

/**
 * Wait for success message to appear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForSuccessMessage(page: Page, timeout: number = 1000): Promise<Locator> {
  const selectors = [
    '[data-testid="success-message"]',
    '.success-banner',
    '.alert-success',
    '[role="alert"]:has-text("success")',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return page.locator(selector);
    } catch {
      // Try next selector
    }
  }

  throw new Error('Success message did not appear within timeout');
}

/**
 * Wait for error message to appear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForErrorMessage(page: Page, timeout: number = 1000): Promise<Locator> {
  const selectors = [
    '[data-testid="error-message"]',
    '.error-banner',
    '.alert-error',
    '[role="alert"]:has-text("error")',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return page.locator(selector);
    } catch {
      // Try next selector
    }
  }

  throw new Error('Error message did not appear within timeout');
}

/**
 * Wait for an element to become visible
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForVisible(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

/**
 * Wait for an element to become hidden
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForHidden(locator: Locator, timeout: number = 1000): Promise<void> {
  await locator.waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for an element to be attached to the DOM
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForAttached(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await locator.waitFor({ state: 'attached', timeout });
  return locator;
}

/**
 * Wait for an element to be detached from the DOM
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForDetached(locator: Locator, timeout: number = 1000): Promise<void> {
  await locator.waitFor({ state: 'detached', timeout });
}

/**
 * Wait for an element to become enabled
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForEnabled(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    return await locator.isEnabled();
  }, timeout);
  return locator;
}

/**
 * Wait for an element to become disabled
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForDisabled(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await pageWait(locator.page, async () => {
    return !(await locator.isEnabled());
  }, timeout);
  return locator;
}

/**
 * Wait for text content to appear in an element
 * @param locator - Playwright Locator object
 * @param text - Expected text content
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForText(locator: Locator, text: string, timeout: number = 1000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    const content = await locator.textContent();
    return content?.includes(text);
  }, timeout);
}

/**
 * Wait for text content to change
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForTextChange(locator: Locator, timeout: number = 1000): Promise<string> {
  const initialText = await locator.textContent();
  await pageWait(locator.page, async () => {
    const currentText = await locator.textContent();
    return currentText !== initialText;
  }, timeout);
  return await locator.textContent() || '';
}

/**
 * Wait for element count to reach expected value
 * @param locator - Playwright Locator object
 * @param expectedCount - Expected count
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForCount(locator: Locator, expectedCount: number, timeout: number = 1000): Promise<void> {
  await pageWait(locator.page, async () => {
    const count = await locator.count();
    return count >= expectedCount;
  }, timeout);
}

/**
 * Wait for URL to change
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForUrlChange(page: Page, timeout: number = 1000): Promise<string> {
  const initialUrl = page.url();
  await pageWait(page, async () => {
    return page.url() !== initialUrl;
  }, timeout);
  return page.url();
}

/**
 * Wait for URL to match a pattern
 * @param page - Playwright Page object
 * @param pattern - URL pattern to match (string or RegExp)
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForUrlMatch(page: Page, pattern: string | RegExp, timeout: number = 1000): Promise<string> {
  await pageWait(page, async () => {
    const url = page.url();
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  }, timeout);
  return page.url();
}

/**
 * Wait for API response matching a URL pattern
 * @param page - Playwright Page object
 * @param urlPattern - URL pattern to match (string or RegExp)
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 1000
): Promise<any> {
  const response = await page.waitForResponse(urlPattern, { timeout });
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

/**
 * Wait for multiple API responses
 * @param page - Playwright Page object
 * @param urlPatterns - Array of URL patterns to match
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForMultipleApiResponses(
  page: Page,
  urlPatterns: Array<string | RegExp>,
  timeout: number = 1000
): Promise<any[]> {
  const responses: any[] = [];
  const promises = urlPatterns.map(pattern =>
    page.waitForResponse(pattern, { timeout }).then(async response => {
      try {
        return await response.json();
      } catch {
        return await response.text();
      }
    })
  );

  const results = await Promise.all(promises);
  responses.push(...results);
  return responses;
}

/**
 * Wait for modal to appear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForModal(page: Page, timeout: number = 1000): Promise<Locator> {
  const selectors = [
    '.modal',
    '[role="dialog"]',
    '[data-testid*="modal"]',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return page.locator(selector);
    } catch {
      // Try next selector
    }
  }

  throw new Error('Modal did not appear within timeout');
}

/**
 * Wait for modal to disappear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForModalToClose(page: Page, timeout: number = 1000): Promise<void> {
  const selectors = [
    '.modal',
    '[role="dialog"]',
    '[data-testid*="modal"]',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout });
      return;
    } catch {
      // Try next selector
    }
  }
}

/**
 * Wait for toast notification to appear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForToast(page: Page, timeout: number = 5000): Promise<Locator> {
  const selectors = [
    '[role="alert"]',
    '.toast',
    '[data-testid="toast"]',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return page.locator(selector);
    } catch {
      // Try next selector
    }
  }

  throw new Error('Toast did not appear within timeout');
}

/**
 * Wait for toast notification to disappear
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForToastToDisappear(page: Page, timeout: number = 5000): Promise<void> {
  const selectors = [
    '[role="alert"]',
    '.toast',
    '[data-testid="toast"]',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout });
      return;
    } catch {
      // Try next selector
    }
  }
}

/**
 * Wait for element to be clickable
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForClickable(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await locator.waitFor({ state: 'visible', timeout });
  await locator.waitFor({ state: 'attached', timeout });
  await pageWait(locator.page, async () => {
    return await locator.isEnabled();
  }, timeout);
  return locator;
}

/**
 * Wait for element to have specific attribute value
 * @param locator - Playwright Locator object
 * @param attribute - Attribute name
 * @param value - Expected attribute value
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForAttribute(
  locator: Locator,
  attribute: string,
  value: string,
  timeout: number = 1000
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    const attrValue = await locator.getAttribute(attribute);
    return attrValue === value;
  }, timeout);
}

/**
 * Wait for element to have specific class
 * @param locator - Playwright Locator object
 * @param className - Class name to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForClass(locator: Locator, className: string, timeout: number = 1000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    const classList = await locator.getAttribute('class');
    return classList?.includes(className);
  }, timeout);
}

/**
 * Wait for element to not have specific class
 * @param locator - Playwright Locator object
 * @param className - Class name to wait for removal
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForClassRemoval(locator: Locator, className: string, timeout: number = 1000): Promise<void> {
  await pageWait(locator.page, async () => {
    const classList = await locator.getAttribute('class');
    return !classList?.includes(className);
  }, timeout);
}

/**
 * Wait for stable state (no changes for specified duration)
 * @param locator - Playwright Locator object
 * @param stableDuration - Duration to wait for stability in milliseconds (default: 500)
 * @param checkInterval - Interval between checks in milliseconds (default: 100)
 */
export async function waitForStableState(
  locator: Locator,
  stableDuration: number = 500,
  checkInterval: number = 100
): Promise<void> {
  const checksNeeded = Math.ceil(stableDuration / checkInterval);
  let previousState: string | null = null;

  for (let i = 0; i < checksNeeded; i++) {
    const currentState = await locator.textContent();
    if (previousState !== null && currentState !== previousState) {
      previousState = currentState;
      i = -1; // Restart the counter
    } else {
      previousState = currentState;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

/**
 * Wait with retry logic
 * @param fn - Function to execute
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param retryDelay - Delay between retries in milliseconds (default: 1000)
 */
export async function waitForWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Generic page wait function
 * @param page - Playwright Page object
 * @param condition - Condition function to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @param pollInterval - Interval between polls in milliseconds (default: 100)
 */
async function pageWait(
  page: Page,
  condition: () => Promise<boolean>,
  timeout: number = 1000,
  pollInterval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for element to be in viewport
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForInViewport(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    const box = await locator.boundingBox();
    return box !== null;
  }, timeout);
  return locator;
}

/**
 * Wait for element to be out of viewport
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForOutOfViewport(locator: Locator, timeout: number = 1000): Promise<void> {
  await pageWait(locator.page, async () => {
    const box = await locator.boundingBox();
    return box === null;
  }, timeout);
}

/**
 * Wait for animation to complete
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForAnimationComplete(locator: Locator, timeout: number = 5000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    const animations = await locator.evaluate(el => {
      return getComputedStyle(el).animationName !== 'none';
    });
    return !animations;
  }, timeout);
}

/**
 * Wait for download to complete
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForDownload(page: Page, timeout: number = 1000): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download', { timeout });
  const download = await downloadPromise;
  return await download.createReadStream().toArray();
}

/**
 * Wait for file chooser
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForFileChooser(page: Page, timeout: number = 1000): Promise<any> {
  return await page.waitForEvent('filechooser', { timeout });
}

/**
 * Wait for console message
 * @param page - Playwright Page object
 * @param predicate - Predicate function to match console message
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForConsoleMessage(
  page: Page,
  predicate: (message: any) => boolean,
  timeout: number = 1000
): Promise<any> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const listener = (message: any) => {
      if (predicate(message)) {
        page.off('console', listener);
        resolve(message);
      }
    };

    page.on('console', listener);

    setTimeout(() => {
      page.off('console', listener);
      reject(new Error('Console message not found within timeout'));
    }, timeout);
  });
}

/**
 * Wait for page title to change
 * @param page - Playwright Page object
 * @param expectedTitle - Expected page title
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForTitle(page: Page, expectedTitle: string, timeout: number = 1000): Promise<void> {
  await pageWait(page, async () => {
    const title = await page.title();
    return title === expectedTitle;
  }, timeout);
}

/**
 * Wait for element to be focused
 * @param locator - Playwright Locator object
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForFocus(locator: Locator, timeout: number = 1000): Promise<Locator> {
  await locator.waitFor({ state: 'visible', timeout });
  await pageWait(locator.page, async () => {
    const element = await locator.elementHandle();
    return await element.evaluate(el => document.activeElement === el);
  }, timeout);
  return locator;
}

/**
 * Export all wait functions as an object
 */
export const Waits = {
  waitForPageLoad,
  waitForLoadingToComplete,
  waitForSuccessMessage,
  waitForErrorMessage,
  waitForVisible,
  waitForHidden,
  waitForAttached,
  waitForDetached,
  waitForEnabled,
  waitForDisabled,
  waitForText,
  waitForTextChange,
  waitForCount,
  waitForUrlChange,
  waitForUrlMatch,
  waitForApiResponse,
  waitForMultipleApiResponses,
  waitForModal,
  waitForModalToClose,
  waitForToast,
  waitForToastToDisappear,
  waitForClickable,
  waitForAttribute,
  waitForClass,
  waitForClassRemoval,
  waitForStableState,
  waitForWithRetry,
  waitForInViewport,
  waitForOutOfViewport,
  waitForAnimationComplete,
  waitForDownload,
  waitForFileChooser,
  waitForConsoleMessage,
  waitForTitle,
  waitForFocus,
} as const;
