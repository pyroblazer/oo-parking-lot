/**
 * Custom Assertion Helpers for Detox
 * 
 * Provides specialized assertion functions for common E2E test scenarios.
 */

import { Element } from 'detox';
import { expect } from 'detox';

/**
 * Assert that element is visible
 * @param element - Detox Element object
 * @param message - Optional assertion message
 */
export async function assertVisible(element: Element, message?: string): Promise<void> {
  await expect(element).toBeVisible();
}

/**
 * Assert that element is hidden
 * @param element - Detox Element object
 * @param message - Optional assertion message
 */
export async function assertHidden(element: Element, message?: string): Promise<void> {
  await expect(element).not.toBeVisible();
}

/**
 * Assert that element exists
 * @param element - Detox Element object
 * @param message - Optional assertion message
 */
export async function assertExists(element: Element, message?: string): Promise<void> {
  await expect(element).toExist();
}

/**
 * Assert that element does not exist
 * @param element - Detox Element object
 * @param message - Optional assertion message
 */
export async function assertNotExists(element: Element, message?: string): Promise<void> {
  await expect(element).not.toExist();
}

/**
 * Assert that element is enabled
 * @param element - Detox Element object
 * @param message - Optional assertion message
 */
export async function assertEnabled(element: Element, message?: string): Promise<void> {
  await expect(element).toBeEnabled();
}

/**
 * Assert that element is disabled
 * @param element - Detox Element object
 * @param message - Optional assertion message
 */
export async function assertDisabled(element: Element, message?: string): Promise<void> {
  await expect(element).not.toBeEnabled();
}

/**
 * Assert that element has specific text
 * @param element - Detox Element object
 * @param text - Expected text content
 * @param message - Optional assertion message
 */
export async function assertText(element: Element, text: string, message?: string): Promise<void> {
  await expect(element).toHaveText(text);
}

/**
 * Assert that element contains specific text
 * @param element - Detox Element object
 * @param text - Expected text content
 * @param message - Optional assertion message
 */
export async function assertContainsText(element: Element, text: string, message?: string): Promise<void> {
  const elementText = await element.getAttributes().then(attrs => attrs.text || '');
  expect(elementText).toContain(text);
}

/**
 * Assert that element does not contain specific text
 * @param element - Detox Element object
 * @param text - Text that should not be present
 * @param message - Optional assertion message
 */
export async function assertNotContainsText(element: Element, text: string, message?: string): Promise<void> {
  const elementText = await element.getAttributes().then(attrs => attrs.text || '');
  expect(elementText).not.toContain(text);
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
  expect(diff).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that number is greater than expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertGreaterThan(actual: number, expected: number, message?: string): void {
  expect(actual).toBeGreaterThan(expected);
}

/**
 * Assert that number is less than expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertLessThan(actual: number, expected: number, message?: string): void {
  expect(actual).toBeLessThan(expected);
}

/**
 * Assert that number is greater than or equal to expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertGreaterThanOrEqual(actual: number, expected: number, message?: string): void {
  expect(actual).toBeGreaterThanOrEqual(expected);
}

/**
 * Assert that number is less than or equal to expected value
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Optional assertion message
 */
export function assertLessThanOrEqual(actual: number, expected: number, message?: string): void {
  expect(actual).toBeLessThanOrEqual(expected);
}

/**
 * Assert that array contains expected value
 * @param array - Array to check
 * @param value - Value to look for
 * @param message - Optional assertion message
 */
export function assertContains<T>(array: T[], value: T, message?: string): void {
  expect(array).toContain(value);
}

/**
 * Assert that array does not contain expected value
 * @param array - Array to check
 * @param value - Value to look for
 * @param message - Optional assertion message
 */
export function assertNotContains<T>(array: T[], value: T, message?: string): void {
  expect(array).not.toContain(value);
}

/**
 * Assert that object has expected property
 * @param obj - Object to check
 * @param property - Property name
 * @param message - Optional assertion message
 */
export function assertHasProperty(obj: any, property: string, message?: string): void {
  expect(obj).toHaveProperty(property);
}

/**
 * Assert that object property matches expected value
 * @param obj - Object to check
 * @param property - Property name
 * @param value - Expected property value
 * @param message - Optional assertion message
 */
export function assertPropertyEquals(obj: any, property: string, value: any, message?: string): void {
  expect(obj[property]).toEqual(value);
}

/**
 * Assert that session status matches expected value
 * @param status - Actual status
 * @param expectedStatus - Expected status
 * @param message - Optional assertion message
 */
export function assertSessionStatus(status: string, expectedStatus: string, message?: string): void {
  expect(status.toLowerCase()).toBe(expectedStatus.toLowerCase());
}

/**
 * Assert that vehicle type is valid
 * @param vehicleType - Vehicle type to check
 * @param message - Optional assertion message
 */
export function assertValidVehicleType(vehicleType: string, message?: string): void {
  const validTypes = ['small', 'medium', 'large'];
  expect(validTypes.includes(vehicleType.toLowerCase())).toBeTruthy();
}

/**
 * Assert that slot status is valid
 * @param slotStatus - Slot status to check
 * @param message - Optional assertion message
 */
export function assertValidSlotStatus(slotStatus: string, message?: string): void {
  const validStatuses = ['available', 'occupied', 'maintenance'];
  expect(validStatuses.includes(slotStatus.toLowerCase())).toBeTruthy();
}

/**
 * Assert that vehicle plate format is valid
 * @param plateNumber - Vehicle plate number to check
 * @param message - Optional assertion message
 */
export function assertValidVehiclePlate(plateNumber: string, message?: string): void {
  // Format: XX 123 YY (e.g., AB 123 CD)
  const plateRegex = /^[A-Z]{2}\s\d{3}\s[A-Z]{2}$/;
  expect(plateRegex.test(plateNumber)).toBeTruthy();
}

/**
 * Assert that session ID format is valid
 * @param sessionId - Session ID to check
 * @param message - Optional assertion message
 */
export function assertValidSessionId(sessionId: string, message?: string): void {
  // Format: SES-XXXXX (e.g., SES-12345)
  const sessionIdRegex = /^SES-\d{5}$/;
  expect(sessionIdRegex.test(sessionId)).toBeTruthy();
}

/**
 * Assert that fee is non-negative
 * @param fee - Fee amount to check
 * @param message - Optional assertion message
 */
export function assertNonNegativeFee(fee: number, message?: string): void {
  expect(fee).toBeGreaterThanOrEqual(0);
}

/**
 * Assert that duration is positive
 * @param duration - Duration in hours to check
 * @param message - Optional assertion message
 */
export function assertPositiveDuration(duration: number, message?: string): void {
  expect(duration).toBeGreaterThan(0);
}

/**
 * Assert that string matches expected pattern
 * @param str - String to check
 * @param pattern - Expected pattern (RegExp)
 * @param message - Optional assertion message
 */
export function assertMatchesPattern(str: string, pattern: RegExp, message?: string): void {
  expect(str).toMatch(pattern);
}

/**
 * Assert that string starts with expected prefix
 * @param str - String to check
 * @param prefix - Expected prefix
 * @param message - Optional assertion message
 */
export function assertStartsWith(str: string, prefix: string, message?: string): void {
  expect(str).startsWith(prefix);
}

/**
 * Assert that string ends with expected suffix
 * @param str - String to check
 * @param suffix - Expected suffix
 * @param message - Optional assertion message
 */
export function assertEndsWith(str: string, suffix: string, message?: string): void {
  expect(str).endsWith(suffix);
}

/**
 * Assert that array length matches expected value
 * @param array - Array to check
 * @param expectedLength - Expected length
 * @param message - Optional assertion message
 */
export function assertArrayLength<T>(array: T[], expectedLength: number, message?: string): void {
  expect(array.length).toBe(expectedLength);
}

/**
 * Assert that array is empty
 * @param array - Array to check
 * @param message - Optional assertion message
 */
export function assertArrayEmpty<T>(array: T[], message?: string): void {
  expect(array.length).toBe(0);
}

/**
 * Assert that array is not empty
 * @param array - Array to check
 * @param message - Optional assertion message
 */
export function assertArrayNotEmpty<T>(array: T[], message?: string): void {
  expect(array.length).toBeGreaterThan(0);
}

/**
 * Assert that two objects are equal
 * @param actual - Actual object
 * @param expected - Expected object
 * @param message - Optional assertion message
 */
export function assertObjectEquals(actual: any, expected: any, message?: string): void {
  expect(actual).toEqual(expected);
}

/**
 * Assert that two objects are not equal
 * @param actual - Actual object
 * @param expected - Expected object
 * @param message - Optional assertion message
 */
export function assertObjectNotEquals(actual: any, expected: any, message?: string): void {
  expect(actual).not.toEqual(expected);
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
  assertText,
  assertContainsText,
  assertNotContainsText,
  assertApproximatelyEqual,
  assertGreaterThan,
  assertLessThan,
  assertGreaterThanOrEqual,
  assertLessThanOrEqual,
  assertContains,
  assertNotContains,
  assertHasProperty,
  assertPropertyEquals,
  assertSessionStatus,
  assertValidVehicleType,
  assertValidSlotStatus,
  assertValidVehiclePlate,
  assertValidSessionId,
  assertNonNegativeFee,
  assertPositiveDuration,
  assertMatchesPattern,
  assertStartsWith,
  assertEndsWith,
  assertArrayLength,
  assertArrayEmpty,
  assertArrayNotEmpty,
  assertObjectEquals,
  assertObjectNotEquals,
} as const;
