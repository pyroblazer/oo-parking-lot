/**
 * Unpark Vehicle Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import UnparkVehicle from '../../src/screens/UnparkVehicle';
import * as parkingApi from '../../src/api/parkingApi';
import type { NavigationProp, RouteProp } from '../../src/types';

import type { Session } from '../../src/api/parkingApi';

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  unpackVehicle: jest.fn(),
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

const mockRoute: RouteProp = {
  params: {},
  key: '',
  name: '',
};

// Factory for mock unpark result matching the actual API response
const createMockUnparkResult = (overrides: Partial<Session> = {}): Session => ({
  session_id: 'session-123',
  vehicle_type: 'S',
  parking_slot: {
    id: 'slot-1',
    slot_label: 'SP-1',
    slot_type: 'SP',
    distances: [10, 20],
    available: true,
  },
  entry_point: 'A',
  parked_at: new Date(Date.now() - 7200000).toISOString(),
  exited_at: new Date().toISOString(),
  duration_hours: 2,
  total_fee: 40.0,
  is_active: false,
  is_continuous: false,
  fee_breakdown: {
    total_fee: 40.0,
    duration_hours: 2,
    is_continuous: false,
    long_term: {
      days: 0,
      fee: 0,
    },
    remaining: {
      total: 40.0,
      base_fee: 40.0,
      exceeding_hours: 0,
      exceeding_fee: 0,
    },
  },
  ...overrides,
});

describe('UnparkVehicle Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the screen with title', () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/unpark vehicle/i)).toBeTruthy();
    });

    it('renders session ID input field', () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByPlaceholderText(/enter session id/i)).toBeTruthy();
    });

    it('renders calculate fee button', () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/calculate fee/i)).toBeTruthy();
    });

    it('renders subtitle text', () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/enter a session id to calculate/i)).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('shows error when session ID is empty', async () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a session id/i)).toBeTruthy();
      });
    });

    it('shows error when session ID is only whitespace', async () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, '   ');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a session id/i)).toBeTruthy();
      });
    });
  });

  describe('Fee Calculation', () => {
    it('calls unpackVehicle API with correct session ID', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(parkingApi.unpackVehicle).toHaveBeenCalledWith(
          'session-123',
          expect.any(String)
        );
      });
    });

    it('displays result on successful unpark', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vehicle unparked successfully/i)).toBeTruthy();
      });
    });

    it('displays session ID in result', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/session-123/i)).toBeTruthy();
      });
    });

    it('displays vehicle type', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/small \(s\)/i)).toBeTruthy();
      });
    });

    it('displays parking slot label and type', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
        expect(screen.getByText(/small parking/i)).toBeTruthy();
      });
    });

    it('displays entry point', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/entry point/i)).toBeTruthy();
      });
    });

    it('displays total fee', async () => {
      const mockResult = createMockUnparkResult({ total_fee: 40.0 });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        const feeElements = screen.getAllByText(/₱40\.00/i);
        expect(feeElements.length).toBeGreaterThan(0);
      });
    });

    it('displays duration in hours (plural)', async () => {
      const mockResult = createMockUnparkResult({ duration_hours: 5 });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/5 hours/i)).toBeTruthy();
      });
    });

    it('displays duration with singular "hour" for 1 hour', async () => {
      const mockResult = createMockUnparkResult({ duration_hours: 0.5 });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/1 hour$/i)).toBeTruthy();
        expect(screen.queryByText(/1 hours/i)).not.toBeTruthy();
      });
    });

    it('displays fee breakdown section', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/fee breakdown/i)).toBeTruthy();
        expect(screen.getByText(/base fee/i)).toBeTruthy();
      });
    });

    it('displays exceeding hours when applicable', async () => {
      const mockResult = createMockUnparkResult({
        duration_hours: 5,
        total_fee: 80.0,
        fee_breakdown: {
          total_fee: 80.0,
          duration_hours: 5,
          is_continuous: false,
          long_term: {
            days: 0,
            fee: 0,
          },
          remaining: {
            total: 80.0,
            base_fee: 40.0,
            exceeding_hours: 2,
            exceeding_fee: 40.0,
          },
        },
      });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/exceeding/i)).toBeTruthy();
        expect(screen.getByText(/₱80\.00/i)).toBeTruthy();
      });
    });

    it('displays continuous parking badge when applicable', async () => {
      const mockResult = createMockUnparkResult({
        is_continuous: true,
      });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/continuous parking/i)).toBeTruthy();
      });
    });

    it('displays error message on failed API call', async () => {
      (parkingApi.unpackVehicle as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Session not found')
      );

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/session not found/i)).toBeTruthy();
      });
    });

    it('shows parked at timestamp', async () => {
      const parkedAt = '2025-01-01T10:00:00Z';
      const mockResult = createMockUnparkResult({ parked_at: parkedAt });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/parked at/i)).toBeTruthy();
      });
    });

    it('shows exited at timestamp', async () => {
      const mockResult = createMockUnparkResult({
        exited_at: new Date().toISOString(),
      });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/exited at/i)).toBeTruthy();
      });
    });
  });

  describe('Entry Point Handling', () => {
    it('handles entry point as string', async () => {
      const mockResult = createMockUnparkResult({ entry_point: 'A' });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/entry point/i)).toBeTruthy();
      });
    });

    it('handles entry point as object with identifier', async () => {
      const mockResult = createMockUnparkResult({
        entry_point: {
          id: '1',
          identifier: 'B',
          name: 'Entry B',
        } as any,
      });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/entry point/i)).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('shows activity indicator during loading', async () => {
      (parkingApi.unpackVehicle as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      });
    });
  });

  describe('Reset and Navigation', () => {
    it('resets form when unpark another is pressed', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vehicle unparked successfully/i)).toBeTruthy();
      });

      const resetButton = screen.getByText(/unpark another/i);
      fireEvent.press(resetButton);

      await waitFor(() => {
        // Back to input form
        expect(screen.getByPlaceholderText(/enter session id/i)).toBeTruthy();
        expect(screen.getByText(/calculate fee/i)).toBeTruthy();
      });
    });

    it('navigates to ViewSession when view session is pressed', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vehicle unparked successfully/i)).toBeTruthy();
      });

      const viewButton = screen.getByText(/view session/i);
      fireEvent.press(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith('ViewSession', { id: 'session-123' });
    });
  });

  describe('Vehicle Type Display', () => {
    it('displays medium vehicle type correctly', async () => {
      const mockResult = createMockUnparkResult({
        vehicle_type: 'M',
        parking_slot: {
          id: 'slot-2',
          slot_label: 'MP-1',
          slot_type: 'MP',
          distances: [15],
          available: true,
        },
      });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/medium \(m\)/i)).toBeTruthy();
        expect(screen.getByText(/MP-1/i)).toBeTruthy();
        expect(screen.getByText(/medium parking/i)).toBeTruthy();
      });
    });

    it('displays large vehicle type correctly', async () => {
      const mockResult = createMockUnparkResult({
        vehicle_type: 'L',
        parking_slot: {
          id: 'slot-3',
          slot_label: 'LP-1',
          slot_type: 'LP',
          distances: [30],
          available: true,
        },
      });
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(input, 'session-123');

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/large \(l\)/i)).toBeTruthy();
        expect(screen.getByText(/LP-1/i)).toBeTruthy();
        expect(screen.getByText(/large parking/i)).toBeTruthy();
      });
    });
  });

  describe('Pre-populated Session ID from Route Params', () => {
    it('pre-populates session ID from route params', () => {
      const routeWithParams: RouteProp = {
        params: { sessionId: 'session-from-view' },
        key: '',
        name: '',
      };

      render(<UnparkVehicle navigation={mockNavigation} route={routeWithParams} />);

      const input = screen.getByPlaceholderText(/enter session id/i);
      expect(input.props.value).toBe('session-from-view');
    });

    it('allows pre-populated session ID to be submitted directly', async () => {
      const mockResult = createMockUnparkResult();
      (parkingApi.unpackVehicle as jest.Mock).mockResolvedValue(mockResult);

      const routeWithParams: RouteProp = {
        params: { sessionId: 'session-from-view' },
        key: '',
        name: '',
      };

      render(<UnparkVehicle navigation={mockNavigation} route={routeWithParams} />);

      const submitButton = screen.getByText(/calculate fee/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(parkingApi.unpackVehicle).toHaveBeenCalledWith(
          'session-from-view',
          expect.any(String)
        );
      });
    });
  });
});
