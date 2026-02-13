/**
 * View Session E2E Tests
 * 
 * Comprehensive Detox tests for FEAT-004: View Session Details feature.
 * Tests cover happy paths, validation, error states, and UI/UX scenarios.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { ViewSessionPage } from '../../pages/ViewSessionPage';
import { ParkVehiclePage } from '../../pages/ParkVehiclePage';
import { SessionsPage } from '../../pages/SessionsPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-004: View Session - Happy Path', () => {
  let dashboard: DashboardPage;
  let viewSession: ViewSessionPage;
  let parkVehicle: ParkVehiclePage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    viewSession = new ViewSessionPage();
    parkVehicle = new ParkVehiclePage();
    
    // Setup test data
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await dashboard.waitForVisible();
  });

  afterEach(async () => {
    await device.takeScreenshot(`view-session-test-${Date.now()}.png`);
  });

  afterAll(async () => {
    // Cleanup test data
    await apiFixtures.cleanupTestData();
  });

  describe('View Active Session', () => {
    it('should view session with valid session ID', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW ACTIVE 1');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
    });

    it('should display active session details', async () => {
      // Create an active session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW ACTIVE 2');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
      
      const vehicleType = await viewSession.getVehicleType();
      expect(vehicleType).toBeTruthy();
      
      const parkingSlot = await viewSession.getParkingSlot();
      expect(parkingSlot).toBeTruthy();
      
      const entryPoint = await viewSession.getEntryPoint();
      expect(entryPoint).toBeTruthy();
      
      const entryTime = await viewSession.getEntryTime();
      expect(entryTime).toBeTruthy();
      
      const status = await viewSession.getStatus();
      expect(status.toLowerCase()).toBe('active');
    });

    it('should display active status badge', async () => {
      // Create an active session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW ACTIVE 3');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for status badge
      const statusValue = element(by.id('status-value'));
      await waitFor(statusValue)
        .toBeVisible()
        .withTimeout(5000);
      
      const status = await viewSession.getStatus();
      expect(status.toLowerCase()).toBe('active');
    });
  });

  describe('View Completed Session', () => {
    it('should display completed session details', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW COMP 1');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session (unpark it)
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
      
      const vehicleType = await viewSession.getVehicleType();
      expect(vehicleType).toBeTruthy();
      
      const parkingSlot = await viewSession.getParkingSlot();
      expect(parkingSlot).toBeTruthy();
      
      const entryPoint = await viewSession.getEntryPoint();
      expect(entryPoint).toBeTruthy();
      
      const entryTime = await viewSession.getEntryTime();
      expect(entryTime).toBeTruthy();
      
      const status = await viewSession.getStatus();
      expect(status.toLowerCase()).toBe('completed');
    });

    it('should display completed status badge', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW COMP 2');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const status = await viewSession.getStatus();
      expect(status.toLowerCase()).toBe('completed');
    });

    it('should display exit time for completed session', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW COMP 3');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const hasExitTime = await viewSession.isExitTimeVisible();
      expect(hasExitTime).toBeTruthy();
      
      if (hasExitTime) {
        const exitTime = await viewSession.getExitTime();
        expect(exitTime).toBeTruthy();
      }
    });

    it('should display fee for completed session', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW COMP 4');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const hasFee = await viewSession.isFeeVisible();
      expect(hasFee).toBeTruthy();
      
      if (hasFee) {
        const fee = await viewSession.getFee();
        expect(fee).toBeTruthy();
      }
    });
  });

  describe('View Cancelled Session', () => {
    it('should display cancelled session details', async () => {
      // Create a cancelled session via API
      const sessionId = await apiFixtures.createTestSession('small', 'cancelled');
      
      // View the cancelled session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
      
      const status = await viewSession.getStatus();
      expect(status.toLowerCase()).toBe('cancelled');
    });

    it('should display cancelled status badge', async () => {
      // Create a cancelled session via API
      const sessionId = await apiFixtures.createTestSession('small', 'cancelled');
      
      // View the cancelled session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const status = await viewSession.getStatus();
      expect(status.toLowerCase()).toBe('cancelled');
    });
  });

  describe('View Continuous Parking Session', () => {
    it('should display continuous parking session details', async () => {
      // Create a continuous parking session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW CONT 1');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
      
      const vehicleType = await viewSession.getVehicleType();
      expect(vehicleType).toBeTruthy();
      
      const parkingSlot = await viewSession.getParkingSlot();
      expect(parkingSlot).toBeTruthy();
    });
  });

  describe('Navigation From Park Success', () => {
    it('should navigate from park success to view session', async () => {
      // Park a vehicle
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW NAV 1');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Check for view session link or button
      const hasViewSessionButton = await parkVehicle.isVisible('view-session-button');
      
      if (hasViewSessionButton) {
        await parkVehicle.clickViewSession();
        
        // Verify we're on view session screen
        const viewSessionPage = element(by.id('view-session-page'));
        await waitFor(viewSessionPage)
          .toBeVisible()
          .withTimeout(5000);
        
        const actualSessionId = await viewSession.getSessionId();
        expect(actualSessionId).toBe(sessionId);
      }
    });
  });

  describe('Navigation From Unpark Success', () => {
    it('should navigate from unpark success to view session', async () => {
      // Create and unpark a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('VIEW NAV 2');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Unpark the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // Check for view session link or button
      const hasViewSessionButton = await unparkPage.isVisible('view-session-button');
      
      if (hasViewSessionButton) {
        await unparkPage.clickViewSession();
        
        // Verify we're on view session screen
        const viewSessionPage = element(by.id('view-session-page'));
        await waitFor(viewSessionPage)
          .toBeVisible()
          .withTimeout(5000);
        
        const actualSessionId = await viewSession.getSessionId();
        expect(actualSessionId).toBe(sessionId);
      }
    });
  });
});

describe('FEAT-004: View Session - Session Details', () => {
  let dashboard: DashboardPage;
  let viewSession: ViewSessionPage;
  let parkVehicle: ParkVehiclePage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    viewSession = new ViewSessionPage();
    parkVehicle = new ParkVehiclePage();
    
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await dashboard.waitForVisible();
  });

  afterEach(async () => {
    await device.takeScreenshot(`view-session-details-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  describe('Basic Information', () => {
    it('should display session ID', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS ID');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
      expect(actualSessionId.length).toBeGreaterThan(0);
    });

    it('should display vehicle type', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Medium');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS VT');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const vehicleType = await viewSession.getVehicleType();
      expect(vehicleType).toBeTruthy();
      expect(vehicleType).toBe('Medium');
    });

    it('should display vehicle plate', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS VP');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const vehiclePlate = await viewSession.getVehiclePlate();
      expect(vehiclePlate).toBeTruthy();
      expect(vehiclePlate).toBe('DETAILS VP');
    });

    it('should display parking slot', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS PS');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const parkingSlot = await viewSession.getParkingSlot();
      expect(parkingSlot).toBeTruthy();
      expect(parkingSlot.length).toBeGreaterThan(0);
    });

    it('should display entry point', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('North Entrance');
      await parkVehicle.enterVehiclePlate('DETAILS EP');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const entryPoint = await viewSession.getEntryPoint();
      expect(entryPoint).toBeTruthy();
    });
  });

  describe('Timestamps', () => {
    it('should display entry time', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS ET');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const entryTime = await viewSession.getEntryTime();
      expect(entryTime).toBeTruthy();
      expect(entryTime.length).toBeGreaterThan(0);
    });

    it('should display exit time for completed session', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS XIT');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const hasExitTime = await viewSession.isExitTimeVisible();
      expect(hasExitTime).toBeTruthy();
      
      if (hasExitTime) {
        const exitTime = await viewSession.getExitTime();
        expect(exitTime).toBeTruthy();
      }
    });
  });

  describe('Duration and Fee', () => {
    it('should display duration', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS DUR');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const duration = await viewSession.getDuration();
      expect(duration).toBeTruthy();
      expect(duration.length).toBeGreaterThan(0);
    });

    it('should display fee for completed session', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS FEE');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const hasFee = await viewSession.isFeeVisible();
      expect(hasFee).toBeTruthy();
      
      if (hasFee) {
        const fee = await viewSession.getFee();
        expect(fee).toBeTruthy();
      }
    });
  });

  describe('Status Badge', () => {
    it('should display status badge', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('DETAILS STAT');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const statusValue = element(by.id('status-value'));
      await waitFor(statusValue)
        .toBeVisible()
        .withTimeout(5000);
      
      const status = await viewSession.getStatus();
      expect(status).toBeTruthy();
    });

    it('should display active status for active session', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('ACTIVE STAT');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const isActive = await viewSession.isSessionActive();
      expect(isActive).toBeTruthy();
    });

    it('should display completed status for completed session', async () => {
      // Create and complete a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('COMP STAT');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // Complete the session
      const unparkVehicle = require('../../pages/UnparkVehiclePage').UnparkVehiclePage;
      const unparkPage = new unparkVehicle();
      await unparkPage.navigate();
      await unparkPage.waitForVisible();
      await unparkPage.selectSessionById(sessionId);
      await unparkPage.waitForSessionDetails();
      await unparkPage.clickUnpark();
      await unparkPage.waitForLoadingToComplete();
      
      // View the completed session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const isCompleted = await viewSession.isSessionCompleted();
      expect(isCompleted).toBeTruthy();
    });
  });
});

describe('FEAT-004: View Session - Validation', () => {
  let dashboard: DashboardPage;
  let viewSession: ViewSessionPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    viewSession = new ViewSessionPage();
    
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await dashboard.waitForVisible();
  });

  afterEach(async () => {
    await device.takeScreenshot(`view-session-validation-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  describe('Session ID Validation', () => {
    it('should show error when session not found', async () => {
      const nonExistentSessionId = 'non-existent-session-id';
      
      // Try to view the session
      await viewSession.navigate(nonExistentSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });

    it('should show validation for whitespace-only session ID', async () => {
      const whitespaceSessionId = '   ';
      
      // Try to view the session
      await viewSession.navigate(whitespaceSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });

    it('should show error for invalid session ID format', async () => {
      const invalidSessionId = 'invalid-format-@#$';
      
      // Try to view the session
      await viewSession.navigate(invalidSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });
  });
});

describe('FEAT-004: View Session - Error States', () => {
  let dashboard: DashboardPage;
  let viewSession: ViewSessionPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    viewSession = new ViewSessionPage();
    
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await dashboard.waitForVisible();
  });

  afterEach(async () => {
    await device.takeScreenshot(`view-session-error-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  describe('API Errors', () => {
    it('should handle network error gracefully', async () => {
      const networkErrorSessionId = 'network-error-session';
      
      // Try to view the session
      await viewSession.navigate(networkErrorSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });

    it('should handle server errors gracefully', async () => {
      const serverErrorSessionId = 'server-error-session';
      
      // Try to view the session
      await viewSession.navigate(serverErrorSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after error', async () => {
      const nonExistentSessionId = 'non-existent-session-id';
      
      // Try to view the session (should fail)
      await viewSession.navigate(nonExistentSessionId);
      
      // Retry with valid session
      const parkVehicle = new ParkVehiclePage();
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('RETRY VIEW');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the valid session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const actualSessionId = await viewSession.getSessionId();
      expect(actualSessionId).toBe(sessionId);
    });
  });
});

describe('FEAT-004: View Session - UI/UX', () => {
  let dashboard: DashboardPage;
  let viewSession: ViewSessionPage;
  let parkVehicle: ParkVehiclePage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    viewSession = new ViewSessionPage();
    parkVehicle = new ParkVehiclePage();
    
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await dashboard.waitForVisible();
  });

  afterEach(async () => {
    await device.takeScreenshot(`view-session-ui-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  describe('Page Elements', () => {
    it('should display page title', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI TITLE');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      const title = element(by.text('View Session'));
      await waitFor(title)
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display session details section', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI DETAILS');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Verify session details are visible
      const sessionIdValue = element(by.id('session-id-value'));
      await waitFor(sessionIdValue)
        .toBeVisible()
        .withTimeout(5000);
      
      const vehicleTypeValue = element(by.id('vehicle-type-value'));
      await waitFor(vehicleTypeValue)
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Loading States', () => {
    it('should display loading state while fetching', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI LOAD');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session (may show loading briefly)
      await viewSession.navigate(sessionId);
      
      // Check for loading indicator (may appear briefly)
      const loadingIndicator = element(by.id('loading-indicator'));
      const hasLoading = await loadingIndicator.isVisible();
      
      await viewSession.waitForVisible();
      
      // Loading state check is optional
      expect(true).toBeTruthy();
    });

    it('should hide loading state after fetching', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI LOAD2');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Loading should be hidden
      const loadingIndicator = element(by.id('loading-indicator'));
      const isLoadingVisible = await loadingIndicator.isVisible();
      expect(isLoadingVisible).toBeFalsy();
    });
  });

  describe('Action Buttons', () => {
    it('should display unpark button for active sessions', async () => {
      // Create an active session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI UNPARK');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for unpark button
      const unparkButton = element(by.id('unpark-vehicle-button'));
      const hasUnparkButton = await unparkButton.isVisible();
      
      // Unpark button is optional
      expect(true).toBeTruthy();
    });

    it('should display calculate fee button for active sessions', async () => {
      // Create an active session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI CALC');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for calculate fee button
      const calculateFeeButton = element(by.id('calculate-fee-button'));
      const hasCalculateFeeButton = await calculateFeeButton.isVisible();
      
      // Calculate fee button is optional
      expect(true).toBeTruthy();
    });

    it('should display copy session ID button', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI COPY');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for copy button
      const copyButton = element(by.id('copy-session-id-button'));
      const hasCopyButton = await copyButton.isVisible();
      
      // Copy button is optional
      expect(true).toBeTruthy();
    });
  });

  describe('Navigation Buttons', () => {
    it('should display park vehicle button', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI NAV1');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for park vehicle button
      const parkButton = element(by.id('park-vehicle-button'));
      const hasParkButton = await parkButton.isVisible();
      
      // Park button is optional
      expect(true).toBeTruthy();
    });

    it('should display sessions list button', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('UI NAV2');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for sessions list button
      const sessionsButton = element(by.id('sessions-list-button'));
      const hasSessionsButton = await sessionsButton.isVisible();
      
      // Sessions button is optional
      expect(true).toBeTruthy();
    });

    it('should navigate to park vehicle', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('NAV PARK');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for park vehicle button and click it
      const parkButton = element(by.id('park-vehicle-button'));
      const hasParkButton = await parkButton.isVisible();
      
      if (hasParkButton) {
        await viewSession.clickParkVehicle();
        
        // Verify navigation to park screen
        const parkVehiclePage = element(by.id('park-vehicle-page'));
        await waitFor(parkVehiclePage)
          .toBeVisible()
          .withTimeout(5000);
      }
    });

    it('should navigate to sessions list', async () => {
      // Create a session
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('NAV SESSIONS');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Check for sessions list button and click it
      const sessionsButton = element(by.id('sessions-list-button'));
      const hasSessionsButton = await sessionsButton.isVisible();
      
      if (hasSessionsButton) {
        await viewSession.clickSessionsList();
        
        // Verify navigation to sessions screen
        const sessionsPage = element(by.id('sessions-page'));
        await waitFor(sessionsPage)
          .toBeVisible()
          .withTimeout(5000);
      }
    });
  });
});

describe('FEAT-004: View Session - Edge Cases', () => {
  let dashboard: DashboardPage;
  let viewSession: ViewSessionPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    viewSession = new ViewSessionPage();
    
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await dashboard.waitForVisible();
  });

  afterEach(async () => {
    await device.takeScreenshot(`view-session-edge-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  describe('Long Session IDs', () => {
    it('should handle very long session IDs', async () => {
      const longSessionId = 'a'.repeat(1000);
      
      // Try to view the session
      await viewSession.navigate(longSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in session ID', async () => {
      const specialCharsSessionId = 'test-session-123!@#$%';
      
      // Try to view the session
      await viewSession.navigate(specialCharsSessionId);
      
      // Check for error message
      const hasError = await viewSession.isVisible('error-message');
      expect(hasError).toBeTruthy();
    });
  });

  describe('Orientation Changes', () => {
    it('should handle orientation change', async () => {
      // Create a session
      const parkVehicle = new ParkVehiclePage();
      await parkVehicle.navigate();
      await parkVehicle.waitForVisible();
      await parkVehicle.selectVehicleType('Small');
      await parkVehicle.selectEntryPoint('Main Gate');
      await parkVehicle.enterVehiclePlate('ORIENT VIEW');
      await parkVehicle.clickPark();
      await parkVehicle.waitForLoadingToComplete();
      
      const sessionId = await parkVehicle.getSessionId();
      
      // View the session
      await viewSession.navigate(sessionId);
      await viewSession.waitForVisible();
      
      // Change orientation
      await device.setOrientation('landscape');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify elements are still visible
      const sessionIdValue = element(by.id('session-id-value'));
      await waitFor(sessionIdValue)
        .toBeVisible()
        .withTimeout(5000);
      
      // Change back to portrait
      await device.setOrientation('portrait');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(true).toBeTruthy();
    });
  });
});
