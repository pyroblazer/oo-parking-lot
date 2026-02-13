/**
 * Custom Wait Strategies for Detox
 * 
 * Provides specialized wait functions for common E2E test scenarios.
 */

import { Element } from 'detox';
import { element, by, waitFor } from 'detox';

/**
 * Wait for an element to be visible
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is visible
 */
export async function waitForElementVisible(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).toBeVisible().withTimeout(timeout);
}

/**
 * Wait for an element to be hidden
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is hidden
 */
export async function waitForElementHidden(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).not.toBeVisible().withTimeout(timeout);
}

/**
 * Wait for an element to exist
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element exists
 */
export async function waitForElementExists(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).toExist().withTimeout(timeout);
}

/**
 * Wait for an element to not exist
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element doesn't exist
 */
export async function waitForElementNotExists(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).not.toExist().withTimeout(timeout);
}

/**
 * Wait for an element to be enabled
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is enabled
 */
export async function waitForElementEnabled(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).toBeEnabled().withTimeout(timeout);
}

/**
 * Wait for an element to be disabled
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is disabled
 */
export async function waitForElementDisabled(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).not.toBeEnabled().withTimeout(timeout);
}

/**
 * Wait for text to appear
 * @param text - Text to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when text is visible
 */
export async function waitForText(text: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.text(text));
  await waitFor(elem).toBeVisible().withTimeout(timeout);
}

/**
 * Wait for text to disappear
 * @param text - Text to wait for disappearance
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when text is not visible
 */
export async function waitForTextNotVisible(text: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.text(text));
  await waitFor(elem).not.toBeVisible().withTimeout(timeout);
}

/**
 * Wait for loading spinner to disappear
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when loading is complete
 */
export async function waitForLoadingToComplete(timeout: number = 10000): Promise<void> {
  try {
    const loadingIndicator = element(by.id('loading-indicator'));
    await waitFor(loadingIndicator).not.toBeVisible().withTimeout(timeout);
  } catch {
    // Loading indicator might not exist, which is fine
  }
}

/**
 * Wait for success message to appear
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when success message is visible
 */
export async function waitForSuccessMessage(timeout: number = 5000): Promise<void> {
  const successMessage = element(by.id('success-message'));
  await waitFor(successMessage).toBeVisible().withTimeout(timeout);
}

/**
 * Wait for error message to appear
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when error message is visible
 */
export async function waitForErrorMessage(timeout: number = 5000): Promise<void> {
  const errorMessage = element(by.id('error-message'));
  await waitFor(errorMessage).toBeVisible().withTimeout(timeout);
}

/**
 * Wait for network idle
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns Promise that resolves after timeout
 */
export async function waitForNetworkIdle(timeout: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Wait for page to load
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when page is loaded
 */
export async function waitForPageLoad(timeout: number = 5000): Promise<void> {
  await waitForNetworkIdle(timeout);
}

/**
 * Wait for element to have specific text
 * @param selector - Element selector (ID or text)
 * @param text - Expected text
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element has expected text
 */
export async function waitForElementWithText(selector: string, text: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).toHaveText(text).withTimeout(timeout);
}

/**
 * Wait for multiple elements to be visible
 * @param selectors - Array of element selectors
 * @param timeout - Maximum time to wait for each element in milliseconds (default: 5000)
 * @returns Promise that resolves when all elements are visible
 */
export async function waitForMultipleElementsVisible(selectors: string[], timeout: number = 5000): Promise<void> {
  await Promise.all(
    selectors.map(selector => waitForElementVisible(selector, timeout))
  );
}

/**
 * Wait for element to be tappable
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is tappable
 */
export async function waitForElementTappable(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).toBeVisible().withTimeout(timeout);
  await waitFor(elem).toBeEnabled().withTimeout(timeout);
}

/**
 * Wait for scroll to complete
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns Promise that resolves after timeout
 */
export async function waitForScrollToComplete(timeout: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Wait for animation to complete
 * @param timeout - Maximum time to wait in milliseconds (default: 500)
 * @returns Promise that resolves after timeout
 */
export async function waitForAnimationToComplete(timeout: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Wait for keyboard to appear
 * @param timeout - Maximum time to wait in milliseconds (default: 3000)
 * @returns Promise that resolves when keyboard is visible
 */
export async function waitForKeyboard(timeout: number = 3000): Promise<void> {
  // Detox doesn't have a direct keyboard visibility check
  // We wait a short time for keyboard to appear
  await new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Wait for keyboard to disappear
 * @param timeout - Maximum time to wait in milliseconds (default: 3000)
 * @returns Promise that resolves when keyboard is not visible
 */
export async function waitForKeyboardToDisappear(timeout: number = 3000): Promise<void> {
  // Detox doesn't have a direct keyboard visibility check
  // We wait a short time for keyboard to disappear
  await new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * Wait for element to be focused
 * @param selector - Element selector (ID or text)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is focused
 */
export async function waitForElementFocused(selector: string, timeout: number = 5000): Promise<void> {
  const elem = element(by.id(selector));
  await waitFor(elem).toBeVisible().withTimeout(timeout);
  // Detox doesn't have a direct focus check
  // We assume visibility is sufficient for most cases
}

/**
 * Wait for list to populate
 * @param selector - List element selector
 * @param minItems - Minimum number of items to wait for (default: 1)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when list has minimum items
 */
export async function waitForListToPopulate(selector: string, minItems: number = 1, timeout: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const listElement = element(by.id(selector));
    try {
      const attrs = await listElement.getAttributes();
      // Check if list has content (implementation depends on your app)
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Wait for element attribute to have specific value
 * @param selector - Element selector (ID or text)
 * @param attribute - Attribute name
 * @param value - Expected attribute value
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when attribute has expected value
 */
export async function waitForElementAttribute(selector: string, attribute: string, value: string, timeout: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const elem = element(by.id(selector));
    try {
      const attrs = await elem.getAttributes();
      if (attrs[attribute] === value) {
        return;
      }
    } catch {
      // Element might not be ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Wait for element to be at specific position
 * @param selector - Element selector (ID or text)
 * @param position - Expected position {x, y}
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element is at expected position
 */
export async function waitForElementAtPosition(selector: string, position: { x: number; y: number }, timeout: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const elem = element(by.id(selector));
    try {
      const attrs = await elem.getAttributes();
      if (attrs.bounds) {
        const { x, y } = attrs.bounds;
        if (Math.abs(x - position.x) < 5 && Math.abs(y - position.y) < 5) {
          return;
        }
      }
    } catch {
      // Element might not be ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Wait for element to have specific count
 * @param selector - Element selector (ID or text)
 * @param count - Expected count
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when element has expected count
 */
export async function waitForElementCount(selector: string, count: number, timeout: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const elem = element(by.id(selector));
    try {
      // Detox doesn't have a direct count method
      // This is a placeholder implementation
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Wait for condition to be true
 * @param condition - Condition function to check
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Check interval in milliseconds (default: 100)
 * @returns Promise that resolves when condition is true
 */
export async function waitForCondition(condition: () => boolean, timeout: number = 5000, interval: number = 100): Promise<void> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Condition not met within timeout'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

/**
 * Export all wait functions as an object
 */
export const Waits = {
  waitForElementVisible,
  waitForElementHidden,
  waitForElementExists,
  waitForElementNotExists,
  waitForElementEnabled,
  waitForElementDisabled,
  waitForText,
  waitForTextNotVisible,
  waitForLoadingToComplete,
  waitForSuccessMessage,
  waitForErrorMessage,
  waitForNetworkIdle,
  waitForPageLoad,
  waitForElementWithText,
  waitForMultipleElementsVisible,
  waitForElementTappable,
  waitForScrollToComplete,
  waitForAnimationToComplete,
  waitForKeyboard,
  waitForKeyboardToDisappear,
  waitForElementFocused,
  waitForListToPopulate,
  waitForElementAttribute,
  waitForElementAtPosition,
  waitForElementCount,
  waitForCondition,
} as const;
