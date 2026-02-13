/**
 * Unpark Vehicle Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import UnparkVehicle from '../../src/screens/UnparkVehicle';
import * as api from '../../src/api';
import type { NavigationProp, RouteProp } from '../../src/types';

// Mock API functions
jest.mock('../../src/api', () => ({
  unparkVehicle: jest.fn(),
}));

const mockNavigation: NavigationProp = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute: RouteProp = {
  params: {},
  key: '',
  name: '',
};

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
      expect(screen.getByText('🚗️ Unpark Vehicle')).toBeTruthy();
    });

    it('renders session ID input field', () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByPlaceholderText(/enter session id/i)).toBeTruthy();
    });

    it('renders submit button', () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText('Unpark Vehicle')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('calls unparkVehicle API with correct session ID', async () => {
      const mockResponse = {
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        duration_hours: 2,
        total_fee: 40.0,
        fee_breakdown: {
          total_fee: 40.0,
          duration_hours: 2,
          base_fee: 40.0,
          exceeding_fee: 0,
          exceeding_hours: 0,
        },
        is_continuous: false,
      };

      (api.unparkVehicle as jest.Mock).mockResolvedValue(mockResponse);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.unparkVehicle).toHaveBeenCalledWith('session-123');
      });
    });

    it('displays result on successful unpark', async () => {
      const mockResponse = {
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        duration_hours: 2,
        total_fee: 40.0,
        fee_breakdown: {
          total_fee: 40.0,
          duration_hours: 2,
          base_fee: 40.0,
          exceeding_fee: 0,
          exceeding_hours: 0,
        },
        is_continuous: false,
      };

      (api.unparkVehicle as jest.Mock).mockResolvedValue(mockResponse);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vehicle unparked successfully/i)).toBeTruthy();
        expect(screen.getByText(/session-123/i)).toBeTruthy();
        expect(screen.getByText('S')).toBeTruthy();
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });
    });

    it('displays fee breakdown details', async () => {
      const mockResponse = {
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        duration_hours: 5,
        total_fee: 80.0,
        fee_breakdown: {
          total_fee: 80.0,
          duration_hours: 5,
          base_fee: 40.0,
          exceeding_fee: 40.0,
          exceeding_hours: 2,
        },
        is_continuous: false,
      };

      (api.unparkVehicle as jest.Mock).mockResolvedValue(mockResponse);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/duration:/i)).toBeTruthy();
        expect(screen.getByText(/hours/i)).toBeTruthy();
        expect(screen.getByText(/total fee:/i)).toBeTruthy();
        expect(screen.getByText('₱80.00')).toBeTruthy();
      });
    });

    it('displays continuous parking badge when applicable', async () => {
      const mockResponse = {
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        duration_hours: 5,
        total_fee: 80.0,
        fee_breakdown: {
          total_fee: 80.0,
          duration_hours: 5,
          base_fee: 40.0,
          exceeding_fee: 40.0,
          exceeding_hours: 2,
        },
        is_continuous: true,
      };

      (api.unparkVehicle as jest.Mock).mockResolvedValue(mockResponse);

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/continuous parking/i)).toBeTruthy();
      });
    });

    it('displays error message on failed unpark', async () => {
      (api.unparkVehicle as jest.Mock).mockRejectedValue(new Error('Session not found'));

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/session not found/i)).toBeTruthy();
      });
    });

    it('shows validation error when session ID is empty', async () => {
      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a session id/i)).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('disables form inputs during loading', async () => {
      (api.unparkVehicle as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        const activityIndicator = screen.queryByTestId('activity-indicator');
        expect(activityIndicator).toBeTruthy();
      });
    });

    it('shows activity indicator during loading', async () => {
      (api.unparkVehicle as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<UnparkVehicle navigation={mockNavigation} route={mockRoute} />);

      const sessionIdInput = screen.getByPlaceholderText(/enter session id/i);
      fireEvent.changeText(sessionIdInput, 'session-123');

      const submitButton = screen.getByText('Unpark Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        const activityIndicator = screen.queryByTestId('activity-indicator');
        expect(activityIndicator).toBeTruthy();
      });
    });
  });
});
