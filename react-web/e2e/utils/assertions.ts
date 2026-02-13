import { Page, Locator, expect } from '@playwright/test';

/**
 * Custom Assertion Helpers
 * 
 * Provides specialized assertion functions for common E2E test scenarios.
 */

/**
 * Assert that element is visible
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertVisible(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be visible').toBeVisible();
}

/**
 * Assert that element is hidden
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertHidden(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be hidden').toBeHidden();
}

/**
 * Assert that element exists in DOM
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertExists(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should exist').toHaveCount(1);
}

/**
 * Assert that element does not exist in DOM
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertNotExists(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should not exist').toHaveCount(0);
}

/**
 * Assert that element is enabled
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertEnabled(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be enabled').toBeEnabled();
}

/**
 * Assert that element is disabled
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertDisabled(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be disabled').toBeDisabled();
}

/**
 * Assert that checkbox is checked
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertChecked(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be checked').toBeChecked();
}

/**
 * Assert that checkbox is unchecked
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertUnchecked(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be unchecked').not.toBeChecked();
}

/**
 * Assert that element has specific text content
 * @param locator - Playwright Locator object
 * @param text - Expected text content
 * @param message - Optional assertion message
 */
export async function assertText(locator: Locator, text: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should contain text: ${text}`).toContainText(text);
}

/**
 * Assert that element has exact text content
 * @param locator - Playwright Locator object
 * @param text - Expected exact text content
 * @param message - Optional assertion message
 */
export async function assertTextExact(locator: Locator, text: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should have exact text: ${text}`).toHaveText(text);
}

/**
 * Assert that element does not contain specific text
 * @param locator - Playwright Locator object
 * @param text - Text that should not be present
 * @param message - Optional assertion message
 */
export async function assertNotText(locator: Locator, text: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should not contain text: ${text}`).not.toContainText(text);
}

/**
 * Assert that element has specific value
 * @param locator - Playwright Locator object
 * @param value - Expected value
 * @param message - Optional assertion message
 */
export async function assertValue(locator: Locator, value: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should have value: ${value}`).toHaveValue(value);
}

/**
 * Assert that element has specific attribute
 * @param locator - Playwright Locator object
 * @param attribute - Attribute name
 * @param value - Expected attribute value
 * @param message - Optional assertion message
 */
export async function assertAttribute(locator: Locator, attribute: string, value: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should have attribute ${attribute}=${value}`).toHaveAttribute(attribute, value);
}

/**
 * Assert that element has specific class
 * @param locator - Playwright Locator object
 * @param className - Class name to check for
 * @param message - Optional assertion message
 */
export async function assertClass(locator: Locator, className: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should have class: ${className}`).toHaveClass(className);
}

/**
 * Assert that element does not have specific class
 * @param locator - Playwright Locator object
 * @param className - Class name to check for absence
 * @param message - Optional assertion message
 */
export async function assertNotClass(locator: Locator, className: string, message?: string): Promise<void> {
  await expect(locator, message || `Element should not have class: ${className}`).not.toHaveClass(className);
}

/**
 * Assert that element count matches expected value
 * @param locator - Playwright Locator object
 * @param count - Expected count
 * @param message - Optional assertion message
 */
export async function assertCount(locator: Locator, count: number, message?: string): Promise<void> {
  await expect(locator, message || `Element count should be: ${count}`).toHaveCount(count);
}

/**
 * Assert that element count is at least expected value
 * @param locator - Playwright Locator object
 * @param minCount - Minimum expected count
 * @param message - Optional assertion message
 */
export async function assertCountAtLeast(locator: Locator, minCount: number, message?: string): Promise<void> {
  const count = await locator.count();
  expect(count, message || `Element count should be at least: ${minCount}`).toBeGreaterThanOrEqual(minCount);
}

/**
 * Assert that element count is at most expected value
 * @param locator - Playwright Locator object
 * @param maxCount - Maximum expected count
 * @param message - Optional assertion message
 */
export async function assertCountAtMost(locator: Locator, maxCount: number, message?: string): Promise<void> {
  const count = await locator.count();
  expect(count, message || `Element count should be at most: ${maxCount}`).toBeLessThanOrEqual(maxCount);
}

/**
 * Assert that URL matches expected pattern
 * @param page - Playwright Page object
 * @param pattern - Expected URL pattern (string or RegExp)
 * @param message - Optional assertion message
 */
export async function assertUrl(page: Page, pattern: string | RegExp, message?: string): Promise<void> {
  const url = page.url();
  if (typeof pattern === 'string') {
    expect(url, message || `URL should contain: ${pattern}`).toContain(pattern);
  } else {
    expect(url, message || `URL should match pattern`).toMatch(pattern);
  }
}

/**
 * Assert that page title matches expected value
 * @param page - Playwright Page object
 * @param title - Expected page title
 * @param message - Optional assertion message
 */
export async function assertTitle(page: Page, title: string, message?: string): Promise<void> {
  await expect(page, message || `Page title should be: ${title}`).toHaveTitle(title);
}

/**
 * Assert that number is approximately equal to expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param tolerance - Allowed tolerance (default: 0.01)
 * @param message - Optional assertion message
 */
export function assertApproximatelyEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.01,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  expect(diff, message || `Value ${actual} should be approximately ${expected}`).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that number is greater than expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertGreaterThan(actual: number, expected: number, message?: string): void {
  expect(actual, message || `${actual} should be greater than ${expected}`).toBeGreaterThan(expected);
}

/**
 * Assert that number is less than expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertLessThan(actual: number, expected: number, message?: string): void {
  expect(actual, message || `${actual} should be less than ${expected}`).toBeLessThan(expected);
}

/**
 * Assert that number is greater than or equal to expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertGreaterThanOrEqual(actual: number, expected: number, message?: string): void {
  expect(actual, message || `${actual} should be greater than or equal to ${expected}`).toBeGreaterThanOrEqual(expected);
}

/**
 * Assert that number is less than or equal to expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertLessThanOrEqual(actual: number, expected: number, message?: string): void {
  expect(actual, message || `${actual} should be less than or equal to ${expected}`).toBeLessThanOrEqual(expected);
}

/**
 * Assert that array contains expected value
 * @param array - Array to check
 * @param value - Value to look for
 * @param message - Optional assertion message
 */
export function assertContains<T>(array: T[], value: T, message?: string): void {
  expect(array, message || `Array should contain: ${value}`).toContain(value);
}

/**
 * Assert that array does not contain expected value
 * @param array - Array to check
 * @param value - Value to look for
 * @param message - Optional assertion message
 */
export function assertNotContains<T>(array: T[], value: T, message?: string): void {
  expect(array, message || `Array should not contain: ${value}`).not.toContain(value);
}

/**
 * Assert that object has expected property
 * @param obj - Object to check
 * @param property - Property name
 * @param message - Optional assertion message
 */
export function assertHasProperty(obj: any, property: string, message?: string): void {
  expect(obj, message || `Object should have property: ${property}`).toHaveProperty(property);
}

/**
 * Assert that object property matches expected value
 * @param obj - Object to check
 * @param property - Property name
 * @param value - Expected property value
 * @param message - Optional assertion message
 */
export function assertPropertyEquals(obj: any, property: string, value: any, message?: string): void {
  expect(obj[property], message || `Property ${property} should equal: ${value}`).toEqual(value);
}

/**
 * Assert that element is focused
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertFocused(locator: Locator, message?: string): Promise<void> {
  const element = await locator.elementHandle();
  const isFocused = await element.evaluate(el => document.activeElement === el);
  expect(isFocused, message || 'Element should be focused').toBeTruthy();
}

/**
 * Assert that element is not focused
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertNotFocused(locator: Locator, message?: string): Promise<void> {
  const element = await locator.elementHandle();
  const isFocused = await element.evaluate(el => document.activeElement === el);
  expect(isFocused, message || 'Element should not be focused').toBeFalsy();
}

/**
 * Assert that element is in viewport
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertInViewport(locator: Locator, message?: string): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, message || 'Element should be in viewport').not.toBeNull();
}

/**
 * Assert that element is out of viewport
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertOutOfViewport(locator: Locator, message?: string): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, message || 'Element should be out of viewport').toBeNull();
}

/**
 * Assert that element is clickable
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertClickable(locator: Locator, message?: string): Promise<void> {
  await expect(locator, message || 'Element should be clickable').toBeEnabled();
  await expect(locator, message || 'Element should be visible').toBeVisible();
}

/**
 * Assert that element is not clickable
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertNotClickable(locator: Locator, message?: string): Promise<void> {
  const isEnabled = await locator.isEnabled();
  const isVisible = await locator.isVisible();
  expect(isEnabled || isVisible, message || 'Element should not be clickable').toBeFalsy();
}

/**
 * Assert that API response was successful
 * @param response - API response object
 * @param message - Optional assertion message
 */
export function assertApiSuccess(response: any, message?: string): void {
  expect(response.success, message || 'API response should be successful').toBeTruthy();
}

/**
 * Assert that API response failed
 * @param response - API response object
 * @param message - Optional assertion message
 */
export function assertApiFailure(response: any, message?: string): void {
  expect(response.success, message || 'API response should be failed').toBeFalsy();
}

/**
 * Assert that API response contains expected data
 * @param response - API response object
 * @param dataPath - Path to data in response (e.g., 'data.sessionId')
 * @param expectedValue - Expected value
 * @param message - Optional assertion message
 */
export function assertApiData(response: any, dataPath: string, expectedValue: any, message?: string): void {
  const actualValue = dataPath.split('.').reduce((obj, key) => obj?.[key], response);
  expect(actualValue, message || `API data ${dataPath} should equal: ${expectedValue}`).toEqual(expectedValue);
}

/**
 * Assert that session status matches expected value
 * @param status - Actual status
 * @param expectedStatus - Expected status
 * @param message - Optional assertion message
 */
export function assertSessionStatus(status: string, expectedStatus: string, message?: string): void {
  expect(status.toLowerCase(), message || `Session status should be: ${expectedStatus}`).toBe(expectedStatus.toLowerCase());
}

/**
 * Assert that vehicle type is valid
 * @param vehicleType - Vehicle type to check
 * @param message - Optional assertion message
 */
export function assertValidVehicleType(vehicleType: string, message?: string): void {
  const validTypes = ['small', 'medium', 'large'];
  expect(validTypes.includes(vehicleType.toLowerCase()), message || `Vehicle type should be valid`).toBeTruthy();
}

/**
 * Assert that slot status is valid
 * @param slotStatus - Slot status to check
 * @param message - Optional assertion message
 */
export function assertValidSlotStatus(slotStatus: string, message?: string): void {
  const validStatuses = ['available', 'occupied', 'maintenance'];
  expect(validStatuses.includes(slotStatus.toLowerCase()), message || `Slot status should be valid`).toBeTruthy();
}

/**
 * Assert that vehicle plate format is valid
 * @param plateNumber - Vehicle plate number to check
 * @param message - Optional assertion message
 */
export function assertValidVehiclePlate(plateNumber: string, message?: string): void {
  // Format: XX 123 YY (e.g., AB 123 CD)
  const plateRegex = /^[A-Z]{2}\s\d{3}\s[A-Z]{2}$/;
  expect(plateRegex.test(plateNumber), message || `Vehicle plate format should be valid`).toBeTruthy();
}

/**
 * Assert that session ID format is valid
 * @param sessionId - Session ID to check
 * @param message - Optional assertion message
 */
export function assertValidSessionId(sessionId: string, message?: string): void {
  // Format: SES-XXXXX (e.g., SES-12345)
  const sessionIdRegex = /^SES-\d{5}$/;
  expect(sessionIdRegex.test(sessionId), message || `Session ID format should be valid`).toBeTruthy();
}

/**
 * Assert that fee is non-negative
 * @param fee - Fee amount to check
 * @param message - Optional assertion message
 */
export function assertNonNegativeFee(fee: number, message?: string): void {
  expect(fee, message || `Fee should be non-negative`).toBeGreaterThanOrEqual(0);
}

/**
 * Assert that duration is positive
 * @param duration - Duration in hours to check
 * @param message - Optional assertion message
 */
export function assertPositiveDuration(duration: number, message?: string): void {
  expect(duration, message || `Duration should be positive`).toBeGreaterThan(0);
}

/**
 * Assert that element has expected count of children
 * @param locator - Playwright Locator object
 * @param expectedCount - Expected number of children
 * @param message - Optional assertion message
 */
export async function assertChildCount(locator: Locator, expectedCount: number, message?: string): Promise<void> {
  const count = await locator.locator('> *').count();
  expect(count, message || `Element should have ${expectedCount} children`).toBe(expectedCount);
}

/**
 * Assert that page has no console errors
 * @param page - Playwright Page object
 * @param message - Optional assertion message
 */
export async function assertNoConsoleErrors(page: Page, message?: string): Promise<void> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  expect(errors.length, message || 'Page should have no console errors').toBe(0);
}

/**
 * Assert that page has no console warnings
 * @param page - Playwright Page object
 * @param message - Optional assertion message
 */
export async function assertNoConsoleWarnings(page: Page, message?: string): Promise<void> {
  const warnings: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  expect(warnings.length, message || 'Page should have no console warnings').toBe(0);
}

/**
 * Assert that element is empty
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertEmpty(locator: Locator, message?: string): Promise<void> {
  const text = await locator.textContent();
  expect(text?.trim(), message || 'Element should be empty').toBe('');
}

/**
 * Assert that element is not empty
 * @param locator - Playwright Locator object
 * @param message - Optional assertion message
 */
export async function assertNotEmpty(locator: Locator, message?: string): Promise<void> {
  const text = await locator.textContent();
  expect(text?.trim(), message || 'Element should not be empty').not.toBe('');
}

/**
 * Assert that date is in expected range
 * @param date - Date to check
 * @param minDate - Minimum expected date
 * @param maxDate - Maximum expected date
 * @param message - Optional assertion message
 */
export function assertDateInRange(date: Date, minDate: Date, maxDate: Date, message?: string): void {
  expect(date.getTime(), message || `Date should be in range`).toBeGreaterThanOrEqual(minDate.getTime());
  expect(date.getTime(), message || `Date should be in range`).toBeLessThanOrEqual(maxDate.getTime());
}

/**
 * Assert that string matches expected pattern
 * @param str - String to check
 * @param pattern - Expected pattern (RegExp)
 * @param message - Optional assertion message
 */
export function assertMatchesPattern(str: string, pattern: RegExp, message?: string): void {
  expect(str, message || `String should match pattern`).toMatch(pattern);
}

/**
 * Assert that string starts with expected prefix
 * @param str - String to check
 * @param prefix - Expected prefix
 * @param message - Optional assertion message
 */
export function assertStartsWith(str: string, prefix: string, message?: string): void {
  expect(str, message || `String should start with: ${prefix}`).startsWith(prefix);
}

/**
 * Assert that string ends with expected suffix
 * @param str - String to check
 * @param suffix - Expected suffix
 * @param message - Optional assertion message
 */
export function assertEndsWith(str: string, suffix: string, message?: string): void {
  expect(str, message || `String should end with: ${suffix}`).endsWith(suffix);
}

/**
 * Assert that array length matches expected value
 * @param array - Array to check
 * @param expectedLength - Expected length
 * @param message - Optional assertion message
 */
export function assertArrayLength<T>(array: T[], expectedLength: number, message?: string): void {
  expect(array.length, message || `Array length should be: ${expectedLength}`).toBe(expectedLength);
}

/**
 * Assert that array is empty
 * @param array - Array to check
 * @param message - Optional assertion message
 */
export function assertArrayEmpty<T>(array: T[], message?: string): void {
  expect(array.length, message || 'Array should be empty').toBe(0);
}

/**
 * Assert that array is not empty
 * @param array - Array to check
 * @param message - Optional assertion message
 */
export function assertArrayNotEmpty<T>(array: T[], message?: string): void {
  expect(array.length, message || 'Array should not be empty').toBeGreaterThan(0);
}

/**
 * Assert that two objects are equal
 * @param actual - Actual object
 * @param expected - Expected object
 * @param message - Optional assertion message
 */
export function assertObjectEquals(actual: any, expected: any, message?: string): void {
  expect(actual, message || 'Objects should be equal').toEqual(expected);
}

/**
 * Assert that two objects are not equal
 * @param actual - Actual object
 * @param expected - Expected object
 * @param message - Optional assertion message
 */
export function assertObjectNotEquals(actual: any, expected: any, message?: string): void {
  expect(actual, message || 'Objects should not be equal').not.toEqual(expected);
}

/**
 * Export all assertion functions as an object
 */
export const Assertions = {
  assertVisible,
  assertHidden,
  assertExists,
  assertNotExists,
  assertEnabled,
  assertDisabled,
  assertChecked,
  assertUnchecked,
  assertText,
  assertTextExact,
  assertNotText,
  assertValue,
  assertAttribute,
  assertClass,
  assertNotClass,
  assertCount,
  assertCountAtLeast,
  assertCountAtMost,
  assertUrl,
  assertTitle,
  assertApproximatelyEqual,
  assertGreaterThan,
  assertLessThan,
  assertGreaterThanOrEqual,
  assertLessThanOrEqual,
  assertContains,
  assertNotContains,
  assertHasProperty,
  assertPropertyEquals,
  assertFocused,
  assertNotFocused,
  assertInViewport,
  assertOutOfViewport,
  assertClickable,
  assertNotClickable,
  assertApiSuccess,
  assertApiFailure,
  assertApiData,
  assertSessionStatus,
  assertValidVehicleType,
  assertValidSlotStatus,
  assertValidVehiclePlate,
  assertValidSessionId,
  assertNonNegativeFee,
  assertPositiveDuration,
  assertChildCount,
  assertNoConsoleErrors,
  assertNoConsoleWarnings,
  assertEmpty,
  assertNotEmpty,
  assertDateInRange,
  assertMatchesPattern,
  assertStartsWith,
  assertEndsWith,
  assertArrayLength,
  assertArrayEmpty,
  assertArrayNotEmpty,
  assertObjectEquals,
  assertObjectNotEquals,
} as const;
