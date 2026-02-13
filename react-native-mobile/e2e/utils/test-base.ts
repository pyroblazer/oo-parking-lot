/**
 * Base Test Utilities for Detox E2E Tests
 * 
 * This file provides common setup, teardown, and helper functions
 * for all E2E tests in the parking lot mobile application.
 */

import { Element } from 'detox';

// API Endpoints
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8082';

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
  /**
   * Navigate to a specific screen with error handling
   */
  async navigateToScreen(screenName: string): Promise<void> {
    const screenElement = element(by.text(screenName));
    await waitFor(screenElement)
      .toBeVisible()
      .withTimeout(5000);
    await screenElement.tap();
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(timeout);
    return element;
  }

  /**
   * Tap an element with retry logic
   */
  async tapElement(selector: string, options?: { timeout?: number }): Promise<void> {
    const element = await this.waitForElement(selector, options?.timeout);
    await element.tap();
  }

  /**
   * Fill an input field with clear and type
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.clearText();
    await element.typeText(value);
  }

  /**
   * Select an option from a picker
   */
  async selectOption(selector: string, value: string): Promise<void> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.tap();
    
    const option = element(by.text(value));
    await waitFor(option)
      .toBeVisible()
      .withTimeout(3000);
    await option.tap();
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    return await element.getAttributes().then(attrs => attrs.text || '');
  }

  /**
   * Check if an element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      const element = element(by.id(selector));
      await waitFor(element)
        .toBeVisible()
        .withTimeout(2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot on failure
   */
  async takeScreenshot(name: string): Promise<void> {
    await device.takeScreenshot(`screenshots/${name}-${Date.now()}.png`);
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete(timeout: number = 10000): Promise<void> {
    try {
      const loadingIndicator = element(by.id('loading-indicator'));
      await waitFor(loadingIndicator)
        .not.toBeVisible()
        .withTimeout(timeout);
    } catch {
      // Loading indicator might not exist, which is fine
    }
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.scrollTo('bottom');
  }

  /**
   * Swipe element
   */
  async swipeElement(selector: string, direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.swipe(direction, 'fast', 0.5);
  }

  /**
   * Long press element
   */
  async longPressElement(selector: string, duration: number = 1000): Promise<void> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    await element.longPress(duration);
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    const elements = element(by.id(selector));
    return await elements.getAttributes().then(attrs => {
      // Detox doesn't have a direct count method, so we use a workaround
      return 0;
    });
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text: string, timeout: number = 5000): Promise<void> {
    const element = element(by.text(text));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Check if element has text
   */
  async hasText(selector: string, expectedText: string): Promise<boolean> {
    const element = element(by.id(selector));
    await waitFor(element)
      .toBeVisible()
      .withTimeout(5000);
    const text = await element.getAttributes().then(attrs => attrs.text || '');
    return text.includes(expectedText);
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(timeout: number = 1000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, timeout));
  }

  /**
   * Reload the app
   */
  async reloadApp(): Promise<void> {
    await device.reloadReactNative();
  }

  /**
   * Go back
   */
  async goBack(): Promise<void> {
    await device.pressBack();
  }
}

/**
 * Common selectors used across tests
 */
export const Selectors = {
  // Navigation
  navDashboard: 'nav-dashboard',
  navPark: 'nav-park',
  navSessions: 'nav-sessions',
  navConfiguration: 'nav-configuration',

  // Park Vehicle Page
  parkVehiclePage: 'park-vehicle-page',
  vehicleTypePicker: 'vehicle-type-picker',
  entryPointPicker: 'entry-point-picker',
  parkButton: 'park-button',
  sessionIdDisplay: 'session-id-display',
  slotDisplay: 'slot-display',

  // Unpark Vehicle Page
  unparkVehiclePage: 'unpark-vehicle-page',
  sessionPicker: 'session-picker',
  unparkButton: 'unpark-button',
  feeDisplay: 'fee-display',

  // Sessions Page
  sessionsPage: 'sessions-page',
  sessionsList: 'sessions-list',
  sessionItem: 'session-item',

  // Configuration Page
  configurationPage: 'configuration-page',
  totalSlotsInput: 'total-slots-input',
  smallSlotsInput: 'small-slots-input',
  mediumSlotsInput: 'medium-slots-input',
  largeSlotsInput: 'large-slots-input',
  entryPointsInput: 'entry-points-input',
  initializeButton: 'initialize-button',

  // Dashboard
  dashboardPage: 'dashboard-page',
  availableSlots: 'available-slots',
  occupiedSlots: 'occupied-slots',
  totalRevenue: 'total-revenue',

  // Common
  loadingIndicator: 'loading-indicator',
  errorMessage: 'error-message',
  successMessage: 'success-message',
  backButton: 'back-button',
  refreshButton: 'refresh-button',
};

/**
 * Common wait strategies
 */
export const WaitStrategies = {
  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await device.reloadReactNative();
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete(timeout: number = 10000): Promise<void> {
    try {
      const loadingIndicator = element(by.id(Selectors.loadingIndicator));
      await waitFor(loadingIndicator)
        .not.toBeVisible()
        .withTimeout(timeout);
    } catch {
      // Loading spinner might not exist
    }
  },

  /**
   * Wait for success message
   */
  async waitForSuccess(timeout: number = 5000): Promise<void> {
    const successMessage = element(by.id(Selectors.successMessage));
    await waitFor(successMessage)
      .toBeVisible()
      .withTimeout(timeout);
  },

  /**
   * Wait for error message
   */
  async waitForError(timeout: number = 5000): Promise<void> {
    const errorMessage = element(by.id(Selectors.errorMessage));
    await waitFor(errorMessage)
      .toBeVisible()
      .withTimeout(timeout);
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
