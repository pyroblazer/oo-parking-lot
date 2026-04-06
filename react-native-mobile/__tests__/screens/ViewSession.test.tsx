/**
 * View Session Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import ViewSession from '../../src/screens/ViewSession';
import * as parkingApi from '../../src/api/parkingApi';

import type { NavigationProp, RouteProp } from '../../src/types';

import type { Session } from '../../src/api/parkingApi';

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  getSession: jest.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const mockNavigation: NavigationProp = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

interface ViewSessionRouteParams extends Record<string, unknown> {
  id: string;
}

const createMockRoute = (params: ViewSessionRouteParams): RouteProp<ViewSessionRouteParams> => ({
  params,
  key: '',
  name: '',
});

// Factory for creating a mock active session matching the Go backend API response
const createMockActiveSession = (overrides: Partial<Session> = {}): Session => ({
  session_id: 'session-123',
  vehicle_type: 'S',
  parking_slot: {
    id: 'slot-1',
    slot_label: 'SP-1',
    slot_type: 'SP',
    distances: [10, 20],
    available: false,
  },
  entry_point: 'A',
  parked_at: new Date(Date.now() - 7200000).toISOString(),
  is_active: true,
  is_continuous: false,
  ...overrides,
});

// Factory for creating a mock completed session matching the Go backend API response
const createMockCompletedSession = (overrides: Partial<Session> = {}): Session => ({
  session_id: 'session-456',
  vehicle_type: 'M',
  parking_slot: {
    id: 'slot-2',
    slot_label: 'MP-1',
    slot_type: 'MP',
    distances: [15, 25],
    available: true,
  },
  entry_point: 'B',
  parked_at: new Date(Date.now() - 18000000).toISOString(),
  exited_at: new Date().toISOString(),
  duration_hours: 5.0,
  total_fee: 140.0,
  is_active: false,
  is_continuous: false,
  ...overrides,
});

describe('ViewSession Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders loading state while fetching session', () => {
      (parkingApi.getSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      expect(screen.getByText(/loading\.\.\./i)).toBeTruthy();
    });

    it('renders session details after successful fetch', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session-123/i)).toBeTruthy();
      });
    });

    it('renders back button', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/← back/i)).toBeTruthy();
      });
    });

    it('renders session details header', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session details/i)).toBeTruthy();
      });
    });
  });

  describe('Active Session Display', () => {
    it('displays active status badge', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeTruthy();
      });
    });

    it('displays session ID', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session-123/i)).toBeTruthy();
      });
    });

    it('displays vehicle type', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/small \(s\)/i)).toBeTruthy();
      });
    });

    it('displays parking slot label', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });
    });

    it('displays slot type badge', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/small parking/i)).toBeTruthy();
      });
    });

    it('displays entry point', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        // Entry point 'A' may appear multiple times; check the entry point label is present
        expect(screen.getByText(/entry point/i)).toBeTruthy();
        const entryPointElements = screen.getAllByText('A');
        expect(entryPointElements.length).toBeGreaterThan(0);
      });
    });

    it('displays parked at timestamp', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/parked at/i)).toBeTruthy();
      });
    });

    it('does not display exited at for active session', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/exited at/i)).not.toBeTruthy();
      });
    });

    it('does not display fee for active session', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/total fee/i)).not.toBeTruthy();
      });
    });

    it('displays unpark button for active session', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/unpark this vehicle/i)).toBeTruthy();
      });
    });

    it('does not display continuous parking badge when not continuous', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/continuous parking/i)).not.toBeTruthy();
      });
    });
  });

  describe('Completed Session Display', () => {
    it('displays completed status badge', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeTruthy();
      });
    });

    it('displays exited at timestamp', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/exited at/i)).toBeTruthy();
      });
    });

    it('displays duration in hours (plural)', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/5\.0 hours/i)).toBeTruthy();
      });
    });

    it('displays singular "hour" for 1 hour duration', async () => {
      const mockSession = createMockCompletedSession({ duration_hours: 1.0 });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/1\.0 hour$/i)).toBeTruthy();
        expect(screen.queryByText(/1\.0 hours/i)).not.toBeTruthy();
      });
    });

    it('displays total fee', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/₱140\.00/i)).toBeTruthy();
      });
    });

    it('displays medium vehicle type', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/medium \(m\)/i)).toBeTruthy();
      });
    });

    it('displays MP slot type', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/medium parking/i)).toBeTruthy();
      });
    });

    it('shows browse all sessions button for completed session', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/browse all sessions/i)).toBeTruthy();
      });
    });

    it('does not show unpark button for completed session', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/unpark this vehicle/i)).not.toBeTruthy();
      });
    });
  });

  describe('Continuous Parking', () => {
    it('displays continuous parking badge', async () => {
      const mockSession = createMockCompletedSession({ is_continuous: true });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/continuous parking/i)).toBeTruthy();
      });
    });

    it('displays active session with continuous parking badge', async () => {
      const mockSession = createMockActiveSession({ is_continuous: true });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/continuous parking/i)).toBeTruthy();
      });
    });
  });

  describe('Entry Point Handling', () => {
    it('handles entry point as string', async () => {
      const mockSession = createMockActiveSession({ entry_point: 'A' });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/entry point/i)).toBeTruthy();
        const entryElements = screen.getAllByText('A');
        expect(entryElements.length).toBeGreaterThan(0);
      });
    });

    it('handles entry point as object with identifier', async () => {
      const mockSession = createMockActiveSession({
        entry_point: {
          id: '1',
          identifier: 'B',
          name: 'Entry B',
        } as any,
      });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/entry point/i)).toBeTruthy();
        const entryElements = screen.getAllByText('B');
        expect(entryElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/← back/i)).toBeTruthy();
      });

      const backButton = screen.getByText(/← back/i);
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('navigates to UnparkVehicle when unpark button is pressed', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/unpark this vehicle/i)).toBeTruthy();
      });

      const unparkButton = screen.getByText(/unpark this vehicle/i);
      fireEvent.press(unparkButton);

      expect(mockNavigate).toHaveBeenCalledWith('UnparkVehicle', { sessionId: 'session-123' });
    });

    it('navigates to Sessions when browse all sessions is pressed', async () => {
      const mockSession = createMockCompletedSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/browse all sessions/i)).toBeTruthy();
      });

      const browseButton = screen.getByText(/browse all sessions/i);
      fireEvent.press(browseButton);

      expect(mockNavigate).toHaveBeenCalledWith('Sessions');
    });
  });

  describe('Error Handling', () => {
    it('displays error when API call fails', async () => {
      (parkingApi.getSession as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Session not found')
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session not found/i)).toBeTruthy();
      });
    });

    it('displays try again button on error', async () => {
      (parkingApi.getSession as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeTruthy();
      });
    });

    it('displays browse sessions button on error', async () => {
      (parkingApi.getSession as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/browse sessions/i)).toBeTruthy();
      });
    });

    it('retries loading when try again is pressed', async () => {
      let callCount = 0;
      (parkingApi.getSession as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new parkingApi.ApiError('Network error'));
        }
        return Promise.resolve(createMockActiveSession());
      });

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeTruthy();
      });

      const tryAgainButton = screen.getByText(/try again/i);
      fireEvent.press(tryAgainButton);

      await waitFor(() => {
        expect(parkingApi.getSession).toHaveBeenCalledTimes(2);
      });
    });

    it('navigates to Sessions from error state', async () => {
      (parkingApi.getSession as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/browse sessions/i)).toBeTruthy();
      });

      const browseButton = screen.getByText(/browse sessions/i);
      fireEvent.press(browseButton);

      expect(mockNavigate).toHaveBeenCalledWith('Sessions');
    });
  });

  describe('Invalid Session ID', () => {
    it('handles null session ID', async () => {
      render(
        <ViewSession
          navigation={mockNavigation}
          route={createMockRoute({ id: null as unknown as string })}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/invalid session id/i)).toBeTruthy();
      });
    });

    it('handles empty session ID', async () => {
      render(
        <ViewSession
          navigation={mockNavigation}
          route={createMockRoute({ id: '' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/invalid session id/i)).toBeTruthy();
      });
    });

    it('displays try again button for invalid session ID', async () => {
      render(
        <ViewSession
          navigation={mockNavigation}
          route={createMockRoute({ id: '' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeTruthy();
      });
    });

    it('displays browse sessions button for invalid session ID', async () => {
      render(
        <ViewSession
          navigation={mockNavigation}
          route={createMockRoute({ id: '' })}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/browse sessions/i)).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while fetching', () => {
      (parkingApi.getSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      expect(screen.getByText(/loading\.\.\./i)).toBeTruthy();
    });

    it('hides loading indicator after fetch completes', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading\.\.\./i)).not.toBeTruthy();
      });
    });

    it('calls getSession with correct session ID', async () => {
      const mockSession = createMockActiveSession();
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(parkingApi.getSession).toHaveBeenCalledWith('session-123');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles large vehicle type session', async () => {
      const mockSession = createMockActiveSession({
        vehicle_type: 'L',
        parking_slot: {
          id: 'slot-3',
          slot_label: 'LP-1',
          slot_type: 'LP',
          distances: [30],
          available: true,
        },
      });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/large \(l\)/i)).toBeTruthy();
        expect(screen.getByText(/LP-1/i)).toBeTruthy();
        expect(screen.getByText(/large parking/i)).toBeTruthy();
      });
    });

    it('handles session with fee breakdown', async () => {
      const mockSession = createMockCompletedSession({
        total_fee: 140.0,
        fee_breakdown: {
          total_fee: 140.0,
          duration_hours: 5,
          is_continuous: false,
          long_term: {
            days: 0,
            fee: 0,
          },
          remaining: {
            total: 140.0,
            base_fee: 40.0,
            exceeding_hours: 2,
            exceeding_fee: 100.0,
          },
        },
      });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-456' })} />);

      await waitFor(() => {
        expect(screen.getByText(/fee breakdown/i)).toBeTruthy();
        expect(screen.getByText(/₱40\.00/i)).toBeTruthy();
        // ₱140.00 may appear in total and total fee rows
 const feeElements = screen.getAllByText(/₱140\.00/i);
        expect(feeElements.length).toBeGreaterThan(0);
      });
    });

    it('handles session without parking slot data', async () => {
      const mockSession: Session = {
        session_id: 'session-789',
        vehicle_type: 'S',
        parking_slot: null as any,
        entry_point: 'C',
        parked_at: new Date().toISOString(),
        is_active: true,
        is_continuous: false,
      };
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-789' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session-789/i)).toBeTruthy();
        expect(screen.getByText(/N\/A/i)).toBeTruthy();
      });
    });

    it('handles very long session ID', async () => {
      const longId = 'very-long-session-id-12345678901234567890';
      const mockSession = createMockActiveSession({ session_id: longId });
      (parkingApi.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: longId })} />);

      await waitFor(() => {
        expect(screen.getByText(/very-long-session-id-12345678901234567890/i)).toBeTruthy();
      });
    });
  });
});
