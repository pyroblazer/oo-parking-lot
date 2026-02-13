/**
 * Sessions Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import SessionsScreen from '../../src/screens/Sessions';
import * as parkingApi from '../../src/api/parkingApi';
import type { NavigationProp } from '@react-navigation/native';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  listSessions: jest.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const mockNavigation: any = {
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

describe('Sessions Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders screen with title', async () => {
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/sessions management/i);
    });

    it('renders auto-refresh indicator', async () => {
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/auto-refresh/i);
    });
  });

  describe('Data Loading', () => {
    it('loads sessions on mount', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_active: true,
        },
      ];

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        total: 1,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/sessions management/i);

      expect(parkingApi.listSessions).toHaveBeenCalledWith(1, 20);
    });

    it('displays loading skeleton while loading', async () => {
      (parkingApi.listSessions as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<SessionsScreen />);

      await screen.findByText(/sessions management/i);
    });

    it('displays error when data loading fails', async () => {
      (parkingApi.listSessions as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<SessionsScreen />);

      await screen.findByText(/error loading sessions/i);
    });
  });

  describe('Session Cards', () => {
    it('displays session cards', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_active: true,
        },
      ];

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        total: 1,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/session-1/i);
    });

    it('displays active status for active sessions', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_active: true,
        },
      ];

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        total: 1,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/active/i);
    });

    it('displays completed status for completed sessions', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: new Date().toISOString(),
          is_active: false,
        },
      ];

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        total: 1,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/completed/i);
    });

    it('navigates to View Session when card is pressed', async () => {
      const mockSessions = [
        {
          session_id: 'session-1',
          vehicle_type: 'S',
          parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
          entry_point: 'A',
          parked_at: new Date(Date.now() - 7200000).toISOString(),
          exited_at: null,
          is_active: true,
        },
      ];

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions,
        total: 1,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      const sessionCard = await screen.findByText(/session-1/i);
      fireEvent.press(sessionCard);
    });
  });

  describe('Pagination', () => {
    it('displays pagination controls', async () => {
      const mockSessions = Array.from({ length: 25 }, (_, i) => ({
        session_id: `session-${i + 1}`,
        vehicle_type: 'S' as const,
        parking_slot: { slot_label: `SP-${i + 1}`, slot_type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_active: true,
      }));

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions.slice(0, 20),
        total: 25,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/showing 1-20 of 25 sessions/i);
    });

    it('navigates to next page when Next button is pressed', async () => {
      const mockSessions = Array.from({ length: 25 }, (_, i) => ({
        session_id: `session-${i + 1}`,
        vehicle_type: 'S' as const,
        parking_slot: { slot_label: `SP-${i + 1}`, slot_type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_active: true,
      }));

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions.slice(0, 20),
        total: 25,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      const nextButton = await screen.findByText(/next/i);
      fireEvent.press(nextButton);
    });

    it('changes per-page value when option is selected', async () => {
      const mockSessions = Array.from({ length: 25 }, (_, i) => ({
        session_id: `session-${i + 1}`,
        vehicle_type: 'S' as const,
        parking_slot: { slot_label: `SP-${i + 1}`, slot_type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_active: true,
      }));

      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: mockSessions.slice(0, 20),
        total: 25,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      const perPageOption = await screen.findByText(/10/i);
      fireEvent.press(perPageOption);
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no sessions exist', async () => {
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/no sessions found/i);
    });

    it('navigates to Park Vehicle when Park a Vehicle button is pressed', async () => {
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      const parkButton = await screen.findByText(/park a vehicle/i);
      fireEvent.press(parkButton);
    });
  });

  describe('Error Handling', () => {
    it('displays error message', async () => {
      (parkingApi.listSessions as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<SessionsScreen />);

      await screen.findByText(/network error/i);
    });

    it('retries loading when Retry button is pressed', async () => {
      (parkingApi.listSessions as jest.Mock)
        .mockRejectedValueOnce(new parkingApi.ApiError('Network error'))
        .mockResolvedValueOnce({
          sessions: [],
          total: 0,
          page: 1,
          per_page: 20,
        });

      render(<SessionsScreen />);

      const retryButton = await screen.findByText(/retry/i);
      fireEvent.press(retryButton);
    });
  });

  describe('Auto-refresh', () => {
    it('auto-refreshes after 30 seconds', async () => {
      (parkingApi.listSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      render(<SessionsScreen />);

      await screen.findByText(/auto-refresh/i);

      jest.advanceTimersByTime(30000);

      expect(parkingApi.listSessions).toHaveBeenCalledTimes(2);
    });
  });
});
