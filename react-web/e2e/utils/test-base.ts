import { test as base, Page, APIRequestContext } from '@playwright/test';

/**
 * Base test utilities for Playwright E2E tests
 * 
 * This file provides common setup, teardown, and helper functions
 * for all E2E tests in the parking lot application.
 */

// API Endpoints
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8082';

export interface ParkingSlot {
  id: string;
  slotNumber: string;
  slotType: 'small' | 'medium' | 'large';
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface EntryPoint {
  id: string;
  name: string;
  location: string;
}

export interface ParkingSession {
  id: string;
  sessionId: string;
  slotId: string;
  entryPointId: string;
  vehiclePlate: string;
  vehicleType: 'small' | 'medium' | 'large';
  entryTime: string;
  exitTime?: string;
  status: 'active' | 'completed' | 'cancelled';
  fee?: number;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  vehicleType: 'small' | 'medium' | 'large';
}

/**
 * Custom test fixture with extended functionality
 */
export class ParkingTestFixtures {
  readonly page: Page;
  readonly request: APIRequestContext;

  constructor(page: Page, request: APIRequestContext) {
    this.page = page;
    this.request = request;
  }

  /**
   * Navigate to a specific page with error handling
   */
  async navigateToPage(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for an element to be visible and clickable
   */
  async waitForElement(selector: string, timeout: number = 1000) {
    await this.page.waitForSelector(selector, { 
      state: 'visible',
      timeout 
    });
  }

  /**
   * Click an element with retry logic
   */
  async clickElement(selector: string, options?: { timeout?: number }) {
    await this.waitForElement(selector, options?.timeout);
    await this.page.click(selector);
  }

  /**
   * Fill an input field with clear and type
   */
  async fillInput(selector: string, value: string) {
    await this.waitForElement(selector);
    await this.page.fill(selector, value);
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(selector: string, value: string) {
    await this.waitForElement(selector);
    await this.page.selectOption(selector, value);
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    await this.waitForElement(selector);
    return await this.page.textContent(selector) || '';
  }

  /**
   * Check if an element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { 
        state: 'visible',
        timeout: 2000 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 1000) {
    return await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Take screenshot on failure
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `screenshots/${name}.png`,
      fullPage: true 
    });
  }

  // API Helper Methods

  /**
   * Create a parking session via API
   */
  async createParkingSession(data: {
    slotId: string;
    entryPointId: string;
    vehiclePlate: string;
    vehicleType: 'small' | 'medium' | 'large';
  }): Promise<ParkingSession> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/sessions`, {
      data
    });
    return await response.json();
  }

  /**
   * Complete a parking session via API
   */
  async completeParkingSession(sessionId: string): Promise<ParkingSession> {
    const response = await this.request.post(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}/exit`
    );
    return await response.json();
  }

  /**
   * Get available parking slots via API
   */
  async getAvailableSlots(): Promise<ParkingSlot[]> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/slots/available`);
    return await response.json();
  }

  /**
   * Get all entry points via API
   */
  async getEntryPoints(): Promise<EntryPoint[]> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/entry_points`);
    return await response.json();
  }

  /**
   * Initialize parking lot via API
   */
  async initializeParkingLot(data: {
    totalSlots: number;
    smallSlots: number;
    mediumSlots: number;
    largeSlots: number;
    entryPoints: string[];
  }): Promise<any> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/initializations`, {
      data
    });
    return await response.json();
  }

  /**
   * Clear all parking data via API (for test cleanup)
   */
  async clearParkingData(): Promise<void> {
    try {
      await this.request.delete(`${API_BASE_URL}/api/v1/sessions`);
    } catch (error) {
      // Ignore errors if endpoint doesn't exist
      console.warn('Failed to clear parking data:', error);
    }
  }
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<{
  parking: ParkingTestFixtures;
}>({
  parking: async ({ page, request }, use) => {
    const fixtures = new ParkingTestFixtures(page, request);
    await use(fixtures);
  },
});

/**
 * Common selectors used across tests
 */
export const Selectors = {
  // Navigation
  navDashboard: 'nav a[href="/"]',
  navPark: 'nav a[href="/park"]',
  navSessions: 'nav a[href="/sessions"]',
  navConfiguration: 'nav a[href="/configuration"]',

  // Park Vehicle Page
  parkVehiclePage: 'text=Park Vehicle',
  vehiclePlateInput: 'input[name="plateNumber"]',
  vehicleTypeSelect: 'select[name="vehicleType"]',
  entryPointSelect: 'select[name="entryPoint"]',
  slotSelect: 'select[name="slot"]',
  parkButton: 'button[type="submit"]:has-text("Park")',

  // Unpark Vehicle Page
  unparkVehiclePage: 'text=Unpark Vehicle',
  sessionSelect: 'select[name="session"]',
  unparkButton: 'button[type="submit"]:has-text("Unpark")',

  // Sessions Page
  sessionsPage: 'text=Sessions',
  sessionsList: '[data-testid="sessions-list"]',
  sessionItem: '[data-testid="session-item"]',

  // Configuration Page
  configurationPage: 'text=Configuration',
  totalSlotsInput: 'input[name="totalSlots"]',
  smallSlotsInput: 'input[name="smallSlots"]',
  mediumSlotsInput: 'input[name="mediumSlots"]',
  largeSlotsInput: 'input[name="largeSlots"]',
  entryPointsInput: 'input[name="entryPoints"]',
  initializeButton: 'button:has-text("Initialize")',

  // Dashboard
  dashboardPage: 'text=Dashboard',
  availableSlots: '[data-testid="available-slots"]',
  occupiedSlots: '[data-testid="occupied-slots"]',
  totalRevenue: '[data-testid="total-revenue"]',

  // Common
  loadingSpinner: '[data-testid="loading-spinner"]',
  errorMessage: '[data-testid="error-message"]',
  successMessage: '[data-testid="success-message"]',
  toast: '[role="alert"]',
};

/**
 * Common wait strategies
 */
export const WaitStrategies = {
  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  },

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete(page: Page, timeout: number = 1000) {
    try {
      await page.waitForSelector(Selectors.loadingSpinner, { 
        state: 'hidden',
        timeout 
      });
    } catch {
      // Loading spinner might not exist
    }
  },

  /**
   * Wait for success message
   */
  async waitForSuccess(page: Page, timeout: number = 1000) {
    await page.waitForSelector(Selectors.successMessage, { 
      state: 'visible',
      timeout 
    });
  },

  /**
   * Wait for error message
   */
  async waitForError(page: Page, timeout: number = 1000) {
    await page.waitForSelector(Selectors.errorMessage, { 
      state: 'visible',
      timeout 
    });
  },
};

/**
 * Test data generators
 */
export const TestDataGenerators = {
  /**
   * Generate a random vehicle plate number
   */
  generateVehiclePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    return (
      letters[Math.floor(Math.random() * letters.length)] +
      letters[Math.floor(Math.random() * letters.length)] +
      ' ' +
      numbers[Math.floor(Math.random() * numbers.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      letters[Math.floor(Math.random() * letters.length)]
    );
  },

  /**
   * Generate a random entry point name
   */
  generateEntryPointName(): string {
    const names = ['Main Gate', 'North Entrance', 'South Entrance', 'East Entrance', 'West Entrance'];
    return names[Math.floor(Math.random() * names.length)];
  },

  /**
   * Generate parking lot configuration
   */
  generateParkingConfig() {
    return {
      totalSlots: 10,
      smallSlots: 3,
      mediumSlots: 4,
      largeSlots: 3,
      entryPoints: ['Main Gate', 'North Entrance'],
    };
  },
};
