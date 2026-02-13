/**
 * General Helper Functions
 * 
 * Provides utility functions for common E2E test scenarios.
 */

/**
 * Date and Time Helpers
 */
export const DateHelpers = {
  /**
   * Format a date to ISO string
   * @param date - Date to format
   * @returns ISO formatted date string
   */
  toISOString(date: Date): string {
    return date.toISOString();
  },

  /**
   * Format a date to local string
   * @param date - Date to format
   * @param format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
   * @returns Formatted date string
   */
  toLocalString(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * Get current timestamp
   * @returns Current timestamp in milliseconds
   */
  now(): number {
    return Date.now();
  },

  /**
   * Parse an ISO date string
   * @param isoString - ISO date string
   * @returns Date object
   */
  parseISO(isoString: string): Date {
    return new Date(isoString);
  },

  /**
   * Add hours to a date
   * @param date - Original date
   * @param hours - Hours to add
   * @returns New date
   */
  addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  },

  /**
   * Add days to a date
   * @param date - Original date
   * @param days - Days to add
   * @returns New date
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Get difference in hours between two dates
   * @param date1 - First date
   * @param date2 - Second date
   * @returns Difference in hours
   */
  diffInHours(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return diffMs / (1000 * 60 * 60);
  },

  /**
   * Get difference in days between two dates
   * @param date1 - First date
   * @param date2 - Second date
   * @returns Difference in days
   */
  diffInDays(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  },
};

/**
 * Currency Helpers
 */
export const CurrencyHelpers = {
  /**
   * Format a number as currency
   * @param amount - Amount to format
   * @param currency - Currency symbol (default: '$')
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted currency string
   */
  format(amount: number, currency: string = '$', decimals: number = 2): string {
    return `${currency}${amount.toFixed(decimals)}`;
  },

  /**
   * Parse a currency string to number
   * @param currencyString - Currency string to parse
   * @returns Parsed number
   */
  parse(currencyString: string): number {
    return parseFloat(currencyString.replace(/[^0-9.-]/g, ''));
  },

  /**
   * Round to 2 decimal places
   * @param amount - Amount to round
   * @returns Rounded amount
   */
  round(amount: number): number {
    return Math.round(amount * 100) / 100;
  },

  /**
   * Calculate percentage
   * @param amount - Base amount
   * @param percentage - Percentage to calculate
   * @returns Calculated percentage amount
   */
  percentage(amount: number, percentage: number): number {
    return (amount * percentage) / 100;
  },
};

/**
 * String Helpers
 */
export const StringHelpers = {
  /**
   * Convert string to title case
   * @param str - String to convert
   * @returns Title case string
   */
  toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  },

  /**
   * Convert string to uppercase
   * @param str - String to convert
   * @returns Uppercase string
   */
  toUpperCase(str: string): string {
    return str.toUpperCase();
  },

  /**
   * Convert string to lowercase
   * @param str - String to convert
   * @returns Lowercase string
   */
  toLowerCase(str: string): string {
    return str.toLowerCase();
  },

  /**
   * Trim whitespace from string
   * @param str - String to trim
   * @returns Trimmed string
   */
  trim(str: string): string {
    return str.trim();
  },

  /**
   * Check if string is empty or whitespace only
   * @param str - String to check
   * @returns True if empty or whitespace only
   */
  isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  },

  /**
   * Check if string contains another string (case-insensitive)
   * @param str - String to search in
   * @param search - String to search for
   * @returns True if search string is found
   */
  contains(str: string, search: string): boolean {
    return str.toLowerCase().includes(search.toLowerCase());
  },

  /**
   * Generate a random string
   * @param length - Length of random string (default: 10)
   * @returns Random string
   */
  random(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Truncate string to max length
   * @param str - String to truncate
   * @param maxLength - Maximum length
   * @param suffix - Suffix to add if truncated (default: '...')
   * @returns Truncated string
   */
  truncate(str: string, maxLength: number, suffix: string = '...'): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Replace all occurrences of a substring
   * @param str - Original string
   * @param search - Substring to replace
   * @param replacement - Replacement string
   * @returns Modified string
   */
  replaceAll(str: string, search: string, replacement: string): string {
    return str.split(search).join(replacement);
  },

  /**
   * Capitalize first letter
   * @param str - String to capitalize
   * @returns Capitalized string
   */
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
};

/**
 * Number Helpers
 */
export const NumberHelpers = {
  /**
   * Format a number with thousands separator
   * @param num - Number to format
   * @param separator - Separator character (default: ',')
   * @returns Formatted number string
   */
  formatWithSeparator(num: number, separator: string = ','): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, `$1${separator}`);
  },

  /**
   * Round to specified decimal places
   * @param num - Number to round
   * @param decimals - Number of decimal places (default: 2)
   * @returns Rounded number
   */
  round(num: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },

  /**
   * Get minimum of two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Minimum value
   */
  min(a: number, b: number): number {
    return Math.min(a, b);
  },

  /**
   * Get maximum of two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Maximum value
   */
  max(a: number, b: number): number {
    return Math.max(a, b);
  },

  /**
   * Clamp a number between min and max
   * @param num - Number to clamp
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Clamped number
   */
  clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Check if number is in range
   * @param num - Number to check
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns True if in range
   */
  inRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
  },

  /**
   * Generate a random number in range
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Random number
   */
  random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Calculate percentage
   * @param value - Value to calculate percentage for
   * @param total - Total value
   * @returns Percentage (0-100)
   */
  percentage(value: number, total: number): number {
    return total === 0 ? 0 : (value / total) * 100;
  },
};

/**
 * Array Helpers
 */
export const ArrayHelpers = {
  /**
   * Shuffle an array
   * @param arr - Array to shuffle
   * @returns Shuffled array
   */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * Get random element from array
   * @param arr - Array to get element from
   * @returns Random element
   */
  random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Check if array contains element
   * @param arr - Array to check
   * @param element - Element to look for
   * @returns True if element is in array
   */
  contains<T>(arr: T[], element: T): boolean {
    return arr.includes(element);
  },

  /**
   * Remove element from array
   * @param arr - Array to modify
   * @param element - Element to remove
   * @returns Modified array
   */
  remove<T>(arr: T[], element: T): T[] {
    return arr.filter(item => item !== element);
  },

  /**
   * Get unique elements from array
   * @param arr - Array to process
   * @returns Array with unique elements
   */
  unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  },

  /**
   * Chunk array into smaller arrays
   * @param arr - Array to chunk
   * @param size - Chunk size
   * @returns Array of chunks
   */
  chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  },

  /**
   * Flatten nested arrays
   * @param arr - Array to flatten
   * @returns Flattened array
   */
  flatten<T>(arr: T[][]): T[] {
    return arr.reduce((flat, current) => [...flat, ...current], [] as T[]);
  },

  /**
   * Group array by key function
   * @param arr - Array to group
   * @param keyFn - Function to get grouping key
   * @returns Object with grouped arrays
   */
  groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return arr.reduce((result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {} as Record<string, T[]>);
  },
};

/**
 * Object Helpers
 */
export const ObjectHelpers = {
  /**
   * Deep clone an object
   * @param obj - Object to clone
   * @returns Cloned object
   */
  clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Merge two objects
   * @param obj1 - First object
   * @param obj2 - Second object
   * @returns Merged object
   */
  merge<T>(obj1: T, obj2: Partial<T>): T {
    return { ...obj1, ...obj2 };
  },

  /**
   * Get object keys
   * @param obj - Object to get keys from
   * @returns Array of keys
   */
  keys<T>(obj: T): string[] {
    return Object.keys(obj) as string[];
  },

  /**
   * Get object values
   * @param obj - Object to get values from
   * @returns Array of values
   */
  values<T>(obj: T): T[keyof T][] {
    return Object.values(obj) as T[keyof T][];
  },

  /**
   * Check if object has property
   * @param obj - Object to check
   * @param key - Property name
   * @returns True if property exists
   */
  hasProperty<T>(obj: T, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
  },

  /**
   * Get nested property value
   * @param obj - Object to get value from
   * @param path - Dot notation path (e.g., 'data.user.name')
   * @returns Property value or undefined
   */
  getNestedValue<T>(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  },

  /**
   * Pick specific properties from object
   * @param obj - Object to pick from
   * @param keys - Keys to pick
   * @returns Object with picked properties
   */
  pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    return keys.reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {} as Pick<T, K>);
  },

  /**
   * Omit specific properties from object
   * @param obj - Object to omit from
   * @param keys - Keys to omit
   * @returns Object without omitted properties
   */
  omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result as Omit<T, K>;
  },
};

/**
 * Validation Helpers
 */
export const ValidationHelpers = {
  /**
   * Validate vehicle plate format
   * @param plate - Vehicle plate to validate
   * @returns True if valid
   */
  isValidVehiclePlate(plate: string): boolean {
    // Format: XX 123 YY (e.g., AB 123 CD)
    const plateRegex = /^[A-Z]{2}\s\d{3}\s[A-Z]{2}$/;
    return plateRegex.test(plate);
  },

  /**
   * Validate session ID format
   * @param sessionId - Session ID to validate
   * @returns True if valid
   */
  isValidSessionId(sessionId: string): boolean {
    // Format: SES-XXXXX (e.g., SES-12345)
    const sessionIdRegex = /^SES-\d{5}$/;
    return sessionIdRegex.test(sessionId);
  },

  /**
   * Validate email format
   * @param email - Email to validate
   * @returns True if valid
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate URL format
   * @param url - URL to validate
   * @returns True if valid
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate that value is a positive number
   * @param value - Value to validate
   * @returns True if positive
   */
  isPositiveNumber(value: any): boolean {
    return typeof value === 'number' && value > 0;
  },

  /**
   * Validate that value is a non-negative number
   * @param value - Value to validate
   * @returns True if non-negative
   */
  isNonNegativeNumber(value: any): boolean {
    return typeof value === 'number' && value >= 0;
  },

  /**
   * Validate that value is an integer
   * @param value - Value to validate
   * @returns True if integer
   */
  isInteger(value: any): boolean {
    return Number.isInteger(value);
  },

  /**
   * Validate that string is not empty
   * @param str - String to validate
   * @returns True if not empty
   */
  isNotEmptyString(str: string): boolean {
    return str && str.trim().length > 0;
  },

  /**
   * Validate that array is not empty
   * @param arr - Array to validate
   * @returns True if not empty
   */
  isNotEmptyArray<T>(arr: T[]): boolean {
    return Array.isArray(arr) && arr.length > 0;
  },
};

/**
 * Delay Helpers
 */
export const DelayHelpers = {
  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Sleep for specified seconds
   * @param seconds - Seconds to sleep
   * @returns Promise that resolves after delay
   */
  seconds(seconds: number): Promise<void> {
    return this.sleep(seconds * 1000);
  },

  /**
   * Wait for condition to be true
   * @param condition - Condition function
   * @param timeout - Maximum time to wait in milliseconds (default: 1000)
   * @param interval - Check interval in milliseconds (default: 100)
   * @returns Promise that resolves when condition is true
   */
  waitFor(condition: () => boolean, timeout: number = 1000, interval: number = 100): Promise<void> {
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
  },
};

/**
 * File/Path Helpers
 */
export const PathHelpers = {
  /**
   * Join path segments
   * @param segments - Path segments
   * @returns Joined path
   */
  join(...segments: string[]): string {
    return segments.join('/').replace(/\/+/g, '/');
  },

  /**
   * Get file extension from path
   * @param path - File path
   * @returns File extension (with dot)
   */
  getExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  },

  /**
   * Get filename from path
   * @param path - File path
   * @returns Filename with extension
   */
  getFilename(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
  },

  /**
   * Get directory from path
   * @param path - File path
   * @returns Directory path
   */
  getDirectory(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  },
};

/**
 * Color Helpers
 */
export const ColorHelpers = {
  /**
   * Convert hex color to RGB
   * @param hex - Hex color string
   * @returns RGB color string
   */
  hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 'rgb(0, 0, 0)';

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgb(${r}, ${g}, ${b})`;
  },

  /**
   * Convert RGB color to hex
   * @param rgb - RGB color string
   * @returns Hex color string
   */
  rgbToHex(rgb: string): string {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
    if (!result) return '#000000';

    const r = parseInt(result[1]).toString(16).padStart(2, '0');
    const g = parseInt(result[2]).toString(16).padStart(2, '0');
    const b = parseInt(result[3]).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  },

  /**
   * Generate random hex color
   * @returns Random hex color string
   */
  randomHexColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  },
};

/**
 * Export all helper objects as a single object
 */
export const Helpers = {
  date: DateHelpers,
  currency: CurrencyHelpers,
  string: StringHelpers,
  number: NumberHelpers,
  array: ArrayHelpers,
  object: ObjectHelpers,
  validation: ValidationHelpers,
  delay: DelayHelpers,
  path: PathHelpers,
  color: ColorHelpers,
} as const;
