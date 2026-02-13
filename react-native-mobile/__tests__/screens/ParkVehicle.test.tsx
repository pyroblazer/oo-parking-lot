/**
 * Park Vehicle Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import ParkVehicle from '../../src/screens/ParkVehicle';
import * as api from '../../src/api';
import type { NavigationProp, RouteProp } from '../../src/types';

// Mock API functions
jest.mock('../../src/api', () => ({
  parkVehicle: jest.fn(),
  getEntryPoints: jest.fn(),
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

describe('ParkVehicle Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful getEntryPoints response
    (api.getEntryPoints as jest.Mock).mockResolvedValue([
      { id: '1', identifier: 'A', name: 'Main Entrance' },
      { id: '2', identifier: 'B', name: 'Side Entrance' },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the screen with title', () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText('🚗️ Park Vehicle')).toBeTruthy();
    });

    it('renders vehicle type picker', () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getAllByText(/vehicle type/i)).toHaveLength(3);
    });

    it('renders entry point picker', () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getAllByText(/entry point/i)).toHaveLength(2);
    });

    it('renders submit button', () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText('Park Vehicle')).toBeTruthy();
    });

    it('renders vehicle type info box', () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/📋 Vehicle Types/i)).toBeTruthy();
      // Use getAllByText since "Small (S)" appears in both picker and info box
      expect(screen.getAllByText(/Small \(S\)/)).toHaveLength(2);
      expect(screen.getAllByText(/Medium \(M\)/)).toHaveLength(2);
      expect(screen.getAllByText(/Large \(L\)/)).toHaveLength(2);
    });
  });

  describe('Form Submission', () => {
    it('calls parkVehicle API with correct parameters', async () => {
      (api.parkVehicle as jest.Mock).mockResolvedValue({
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date().toISOString(),
      });

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Press on the "Small (S)" picker item to select it (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      // Press on the "Main Entrance (A)" picker item to select it
      const mainEntrancePickerItem = screen.getByText(/main entrance \(a\)/i);
      fireEvent.press(mainEntrancePickerItem);

      const submitButton = screen.getByText('Park Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.parkVehicle).toHaveBeenCalledWith('S', 'A');
      });
    });

    it('displays success message on successful park', async () => {
      (api.parkVehicle as jest.Mock).mockResolvedValue({
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date().toISOString(),
      });

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Select vehicle type by pressing on the picker item (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      // Select entry point by pressing on the picker item
      const mainEntrancePickerItem = screen.getByText(/main entrance \(a\)/i);
      fireEvent.press(mainEntrancePickerItem);

      const submitButton = screen.getByText('Park Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/✅ Vehicle parked successfully/i)).toBeTruthy();
        expect(screen.getByText(/session-123/i)).toBeTruthy();
      });
    });

    it('navigates to View Session when View Session button is pressed', async () => {
      (api.parkVehicle as jest.Mock).mockResolvedValue({
        session_id: 'session-123',
        vehicle_type: 'S',
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date().toISOString(),
      });

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Select vehicle type by pressing on the picker item (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      // Select entry point by pressing on the picker item
      const mainEntrancePickerItem = screen.getByText(/main entrance \(a\)/i);
      fireEvent.press(mainEntrancePickerItem);

      const submitButton = screen.getByText('Park Vehicle');
      fireEvent.press(submitButton);

      // Wait for success message to appear
      await waitFor(() => {
        expect(screen.getByText(/✅ Vehicle parked successfully/i)).toBeTruthy();
      });

      // Press the View Session button
      const viewSessionButton = screen.getByText('View Session');
      fireEvent.press(viewSessionButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ViewSession', { id: 'session-123' });
    });

    it('displays error message on failed park', async () => {
      (api.parkVehicle as jest.Mock).mockRejectedValue(new Error('No available slots'));

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Select vehicle type by pressing on the picker item (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      // Select entry point by pressing on the picker item
      const mainEntrancePickerItem = screen.getByText(/main entrance \(a\)/i);
      fireEvent.press(mainEntrancePickerItem);

      const submitButton = screen.getByText('Park Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/no available slots/i)).toBeTruthy();
      });
    });

    it('shows validation error when vehicle type is not selected', async () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      const submitButton = screen.getByText('Park Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please select: vehicle type, entry point/i)).toBeTruthy();
      });
    });

    it('shows validation error when only entry point is not selected', async () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Select vehicle type by pressing on the picker item (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      const submitButton = screen.getByText('Park Vehicle');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please select: entry point/i)).toBeTruthy();
      });
    });

    it('does not auto-select entry point on load', async () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Verify that "Select entry point" placeholder is still visible
      // This indicates that no entry point is auto-selected
      expect(screen.getByText(/select entry point/i)).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('disables form inputs during loading', async () => {
      (api.parkVehicle as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Select vehicle type by pressing on the picker item (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      // Select entry point by pressing on the picker item
      const mainEntrancePickerItem = screen.getByText(/main entrance \(a\)/i);
      fireEvent.press(mainEntrancePickerItem);

      const submitButton = screen.getByTestId('park-vehicle-button');
      fireEvent.press(submitButton);

      // Check that the button is disabled
      expect(submitButton.props.disabled).toBe(true);
    });

    it('shows activity indicator during loading', async () => {
      (api.parkVehicle as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      // Wait for entry points to load
      await waitFor(() => {
        expect(screen.getByText(/main entrance \(a\)/i)).toBeTruthy();
      });

      // Select vehicle type by pressing on the picker item (first occurrence is in the Picker)
      const smallPickerItem = screen.getAllByText(/Small \(S\)/)[0];
      fireEvent.press(smallPickerItem);

      // Select entry point by pressing on the picker item
      const mainEntrancePickerItem = screen.getByText(/main entrance \(a\)/i);
      fireEvent.press(mainEntrancePickerItem);

      const submitButton = screen.getByTestId('park-vehicle-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        const activityIndicator = screen.queryByTestId('activity-indicator');
        expect(activityIndicator).toBeTruthy();
      });
    });
  });

  describe('Entry Points Loading', () => {
    it('loads entry points on mount', async () => {
      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.getEntryPoints).toHaveBeenCalled();
      });
    });

    it('displays error when entry points fail to load', async () => {
      (api.getEntryPoints as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ParkVehicle navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeTruthy();
      });
    });
  });
});
