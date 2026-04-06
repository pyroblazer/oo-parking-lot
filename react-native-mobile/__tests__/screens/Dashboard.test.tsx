/**
 * Dashboard Screen Tests
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import Dashboard from '../../src/screens/Dashboard';
import * as parkingApi from '../../src/api/parkingApi';
import type { NavigationProp } from '@react-navigation/native';

// Set timeout for async tests
jest.setTimeout(30000);

// Mock navigation object
const mockNavigation: NavigationProp<any> = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => mockNavigation),
}));

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  listSlots: jest.fn(),
  listEntryPoints: jest.fn(),
  listSessions: jest.fn(),
  checkHealth: jest.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

describe('Dashboard Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('renders screen with title', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/dashboard/i);
    });

    it('renders health status badge', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/online/i);
    });
  });

  describe('Data Loading', () => {
    it('loads all dashboard data on mount', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/dashboard/i);

      expect(parkingApi.listSlots).toHaveBeenCalledTimes(1);
      expect(parkingApi.listEntryPoints).toHaveBeenCalledTimes(1);
      expect(parkingApi.listSessions).toHaveBeenCalledTimes(1);
      expect(parkingApi.checkHealth).toHaveBeenCalledTimes(1);
    });

    it('displays error when data loading fails', async () => {
      (parkingApi.listSlots as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/network error/i);
    });

    it('displays error banner', async () => {
      (parkingApi.listSlots as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/network error/i);
    });

    it('dismisses error banner when dismiss button is pressed', async () => {
      (parkingApi.listSlots as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      const errorText = await screen.findByText(/network error/i);
      expect(errorText).toBeTruthy();
    });
  });

  describe('Health Status', () => {
    it('displays online status when health check returns ok', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/online/i);
    });

    it('displays offline status when health check fails', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'error' });

      render(<Dashboard />);

      await screen.findByText(/offline/i);
    });
  });

  describe('Statistics Cards', () => {
    it('displays total slots stat', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
        { id: '2', slot_label: 'SP-2', slot_type: 'SP', available: false },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/total slots/i);
    });

    it('displays available slots stat', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
        { id: '2', slot_label: 'SP-2', slot_type: 'SP', available: false },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/available/i);
    });

    it('displays occupied slots stat', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
        { id: '2', slot_label: 'SP-2', slot_type: 'SP', available: false },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/occupied/i);
    });

    it('displays active sessions stat', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_continuous: false,
        },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: mockSessions, total: 1 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/active sessions/i);
    });
  });

  describe('Slot Occupancy Grid', () => {
    it('displays slot grid', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
        { id: '2', slot_label: 'SP-2', slot_type: 'SP', available: false },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/slot occupancy/i);
    });

    it('displays empty state when no slots exist', async () => {
      (parkingApi.listSlots as jest.Mock).mockResolvedValue([]);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/no slots available/i);
    });

    it('navigates to Park Vehicle when Park Vehicle button is pressed', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      const parkButton = await screen.findByText(/park vehicle/i);
      fireEvent.press(parkButton);
    });
  });

  describe('Entry Points Status', () => {
    it('displays entry points list', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Main Entrance' },
        { id: '2', identifier: 'B', name: 'Side Entrance' },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/entry points/i);
    });

    it('displays vehicle count for each entry point', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Main Entrance' },
      ];

      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_continuous: false,
        },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: mockSessions, total: 1 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/entry points/i);
    });

    it('displays empty state when no entry points exist', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/no entry points configured yet/i);
    });
  });

  describe('Recent Activity Feed', () => {
    it('displays recent activity', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_continuous: false,
        },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: mockSessions, total: 1 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/recent activity/i);
    });

    it('displays empty state when no activity exists', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/no recent activity/i);
    });
  });

  describe('Configuration Navigation', () => {
    it('renders the Configuration button', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      const configButton = await screen.findByLabelText(/go to configuration/i);
      expect(configButton).toBeTruthy();
    });

    it('renders Configuration button with gear icon text', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      await screen.findByText(/configuration/i);
    });

    it('navigates to Configuration screen when Configuration button is pressed', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({ sessions: [], total: 0 });
      (parkingApi.checkHealth as jest.Mock).mockResolvedValue({ status: 'ok' });

      render(<Dashboard />);

      const configButton = await screen.findByLabelText(/go to configuration/i);
      fireEvent.press(configButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Configuration');
    });
  });
});
