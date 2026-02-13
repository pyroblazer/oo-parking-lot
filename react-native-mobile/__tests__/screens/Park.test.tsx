/**
 * Park Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { Park } from '../../src/screens/Park';
import * as parkingApi from '../../src/api/parkingApi';
import { useNavigation } from '@react-navigation/native';

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  listEntryPoints: jest.fn(),
  getAvailableSlots: jest.fn(),
  parkVehicle: jest.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('Park Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock for listEntryPoints to return empty array
    (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders screen with title', () => {
      render(<Park />);

      expect(screen.getByText(/Park Vehicle/i)).toBeTruthy();
    });

    it('renders step indicators', () => {
      render(<Park />);

      expect(screen.getByText(/1/i)).toBeTruthy();
      expect(screen.getByText(/2/i)).toBeTruthy();
      expect(screen.getByText(/3/i)).toBeTruthy();
    });

    it('renders vehicle type picker', () => {
      render(<Park />);

      // Use more specific selector to avoid multiple matches
      expect(screen.getAllByText(/Vehicle Type/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Select vehicle type/i)).toBeTruthy();
    });

    it('renders entry point picker', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        // Use getAllByText since "Entry Point" appears multiple times
        const entryPointLabels = screen.getAllByText(/Entry Point/i);
        expect(entryPointLabels.length).toBeGreaterThan(0);
        expect(screen.getByText(/Select entry point/i)).toBeTruthy();
      });
    });
  });

  describe('Entry Points Loading', () => {
    it('loads entry points on mount', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(parkingApi.listEntryPoints).toHaveBeenCalled();
      });
    });

    it('displays loading state while fetching entry points', async () => {
      (parkingApi.listEntryPoints as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/Loading entry points.../i)).toBeTruthy();
      });
    });

    it('displays error when entry points loading fails', async () => {
      (parkingApi.listEntryPoints as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeTruthy();
      });
    });
  });

  describe('Step 1: Vehicle Details Form', () => {
    it('displays correct subtitle for step 1', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/Enter vehicle details/i)).toBeTruthy();
      });
    });

    it('displays vehicle type options', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/Small \(S\)/i)).toBeTruthy();
        expect(screen.getByText(/Medium \(M\)/i)).toBeTruthy();
        expect(screen.getByText(/Large \(L\)/i)).toBeTruthy();
      });
    });

    it('displays vehicle type description', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      await waitFor(() => {
        expect(screen.getByText(/Compact vehicles/i)).toBeTruthy();
      });
    });

    it('selects vehicle type when option is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      await waitFor(() => {
        expect(screen.getByText(/Small \(S\)/i)).toBeTruthy();
      });
    });

    it('displays entry point options', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
        expect(screen.getByText(/B - Entry Point B/i)).toBeTruthy();
      });
    });

    it('selects entry point when option is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const entryPointOption = screen.getByText(/A - Entry Point A/i);
      fireEvent.press(entryPointOption);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });
    });

    it('displays advanced options section', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/Advanced \/ Test Options/i)).toBeTruthy();
      });
    });

    it('toggles advanced options when header is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      const advancedHeader = screen.getByText(/Advanced \/ Test Options/i);
      fireEvent.press(advancedHeader);

      // Wait for advanced options to be visible
      await waitFor(() => {
        expect(screen.getByText(/Test Mode/i)).toBeTruthy();
      });
    });

    it('toggles test mode', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      const advancedHeader = screen.getByText(/Advanced \/ Test Options/i);
      fireEvent.press(advancedHeader);

      // Wait for advanced options to expand
      await waitFor(() => {
        expect(screen.getByText(/Test Mode/i)).toBeTruthy();
      });

      // Press the toggle button (not the text)
      const toggleButton = screen.getByLabelText(/Toggle test mode/i);
      fireEvent.press(toggleButton);

      // Wait for test mode to be enabled and override time to appear
      await waitFor(() => {
        expect(screen.getByText(/Override Park Time/i)).toBeTruthy();
      });
    });

    it('disables find available slot button when form is invalid', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      // Check if button is disabled using toBeDisabled matcher
      expect(screen.getByText(/Find Available Slot/i)).toBeDisabled();
    });

    it('enables find available slot button when form is valid', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      // Select vehicle type
      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      // Select entry point
      const entryPointOption = screen.getByText(/A - Entry Point A/i);
      fireEvent.press(entryPointOption);

      // Wait for state to update
      await waitFor(() => {
        // Check if button is enabled using toBeEnabled matcher
        const findButton = screen.getByText(/Find Available Slot/i);
        expect(findButton).toBeEnabled();
      });
    });
  });

  describe('Find Available Slot', () => {
    it('calls getAvailableSlots API with correct parameters', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const entryPointOption = screen.getByText(/A - Entry Point A/i);
      fireEvent.press(entryPointOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(parkingApi.getAvailableSlots).toHaveBeenCalledWith('S', 'A');
      });
    });

    it('displays error when no available slots found', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue([]);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const entryPointOption = screen.getByText(/A - Entry Point A/i);
      fireEvent.press(entryPointOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/No available slots for selected vehicle type and entry point/i)).toBeTruthy();
      });
    });

    it('displays error when API call fails', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('API Error')
      );

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const entryPointOption = screen.getByText(/A - Entry Point A/i);
      fireEvent.press(entryPointOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeTruthy();
      });
    });

    it('shows validation error when form is incomplete', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select vehicle type and entry point/i)).toBeTruthy();
      });
    });

    it('advances to step 2 when slot is found', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const entryPointOption = screen.getByText(/A - Entry Point A/i);
      fireEvent.press(entryPointOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Review available slot/i)).toBeTruthy();
      });
    });
  });

  describe('Step 2: Slot Preview', () => {
    it('displays correct subtitle for step 2', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Review available slot/i)).toBeTruthy();
      });
    });

    it('displays slot details', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
        expect(screen.getByText(/Small Parking/i)).toBeTruthy();
        expect(screen.getByText(/10 unit from Entry A/i)).toBeTruthy();
      });
    });

    it('displays available status badge', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/✅ Available/i)).toBeTruthy();
      });
    });

    it('goes back to step 1 when back button is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Review available slot/i)).toBeTruthy();
      });

      const backButton = screen.getByText(/← Back/i);
      fireEvent.press(backButton);

      await waitFor(() => {
        expect(screen.getByText(/Enter vehicle details/i)).toBeTruthy();
      });
    });

    it('confirms parking when confirm button is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Review available slot/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(parkingApi.parkVehicle).toHaveBeenCalledWith('S', 'A', undefined);
      });
    });
  });

  describe('Step 3: Confirmation Receipt', () => {
    it('displays correct subtitle for step 3', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Parking complete/i)).toBeTruthy();
      });
    });

    it('displays success message', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/✅/i)).toBeTruthy();
        expect(screen.getByText(/Vehicle Parked Successfully!/i)).toBeTruthy();
      });
    });

    it('displays receipt with session details', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Parking Receipt/i)).toBeTruthy();
        expect(screen.getByText(/Session ID:/i)).toBeTruthy();
        expect(screen.getByText(/session-1/i)).toBeTruthy();
        expect(screen.getByText(/Slot:/i)).toBeTruthy();
        expect(screen.getByText(/SP-1 \(Small Parking\)/i)).toBeTruthy();
        expect(screen.getByText(/Entry Point:/i)).toBeTruthy();
        expect(screen.getByText(/A/i)).toBeTruthy();
        expect(screen.getByText(/Vehicle Type:/i)).toBeTruthy();
        expect(screen.getByText(/Small \(S\)/i)).toBeTruthy();
      });
    });

    it('displays test mode indicator when test mode is enabled', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      // Enable test mode
      const advancedHeader = screen.getByText(/Advanced \/ Test Options/i);
      fireEvent.press(advancedHeader);

      const toggleButton = screen.getByLabelText(/Toggle test mode/i);
      fireEvent.press(toggleButton);

      // Set override time
      const dateTimeButton = screen.getByText(/Not set/i);
      fireEvent.press(dateTimeButton);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Test Mode:/i)).toBeTruthy();
        expect(screen.getByText(/Enabled/i)).toBeTruthy();
      });
    });

    it('resets form when park another vehicle is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Parking complete/i)).toBeTruthy();
      });

      const parkAnotherButton = screen.getByText(/Park Another Vehicle/i);
      fireEvent.press(parkAnotherButton);

      await waitFor(() => {
        expect(screen.getByText(/Enter vehicle details/i)).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('disables form during loading', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      // Check if button is disabled using toBeDisabled matcher
      await waitFor(() => {
        expect(screen.getByText(/Find Available Slot/i)).toBeDisabled();
      });
    });

    it('shows activity indicator during loading', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        const activityIndicator = screen.queryByTestId('activity-indicator');
        expect(activityIndicator).toBeTruthy();
      });
    });
  });

  describe('Error States', () => {
    it('displays error when parkVehicle API fails', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Parking failed')
      );

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Parking failed/i)).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very long session ID', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'very-long-session-id-12345678901234567890',
        vehicle_type: 'S',
        parking_slot: { slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/very-long-session-id-12345678901234567890/i)).toBeTruthy();
      });
    });

    it('handles missing parking slot data', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
      ];

      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [10] },
      ];

      const mockResult = {
        session_id: 'session-1',
        vehicle_type: 'S',
        parking_slot: null,
        entry_point: 'A',
        parked_at: '2025-01-01T00:00:00Z',
      };

      (parkingApi.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (parkingApi.getAvailableSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.parkVehicle as jest.Mock).mockResolvedValue(mockResult);

      render(<Park />);

      await waitFor(() => {
        expect(screen.getByText(/A - Entry Point A/i)).toBeTruthy();
      });

      const smallOption = screen.getByText(/Small \(S\)/i);
      fireEvent.press(smallOption);

      const findButton = screen.getByText(/Find Available Slot/i);
      fireEvent.press(findButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Park →/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/Confirm & Park →/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Parking complete/i)).toBeTruthy();
      });
    });
  });
});
