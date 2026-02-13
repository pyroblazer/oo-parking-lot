/**
 * Available Slots Component Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvailableSlots from '../AvailableSlots';
import * as api from '../../api';
import type { EntryPoint, ParkingSlot, VehicleType, EntryPointIdentifier } from '../../types';

describe('AvailableSlots Component', () => {
  const mockEntryPoints: EntryPoint[] = [
    {
      id: 1,
      identifier: 'A',
      name: 'Main Entrance',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      identifier: 'B',
      name: 'Side Entrance',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  let getAvailableSlotsSpy: ReturnType<typeof vi.spyOn>;
  let getEntryPointsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on and mock API functions
    getAvailableSlotsSpy = vi.spyOn(api, 'getAvailableSlots').mockResolvedValue({ available_slots: [], total_count: 0, vehicle_type: 'S' as VehicleType, entry_point_id: 'A' as EntryPointIdentifier });
    getEntryPointsSpy = vi.spyOn(api, 'getEntryPoints').mockResolvedValue(mockEntryPoints);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with title', async () => {
      render(<AvailableSlots />);
      await waitFor(() => {
        expect(screen.getByText('🅿️ Available Parking Slots')).toBeInTheDocument();
      });
    });

    it('renders vehicle type selection dropdown', async () => {
      render(<AvailableSlots />);
      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(screen.getAllByText('Small (S)')).toHaveLength(2);
        expect(screen.getAllByText('Medium (M)')).toHaveLength(2);
        expect(screen.getAllByText('Large (L)')).toHaveLength(2);
      });
    });

    it('renders entry point selection dropdown', async () => {
      render(<AvailableSlots />);
      await waitFor(() => {
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(entryPointSelect).toBeInTheDocument();
      });
    });

    it('renders search button', async () => {
      render(<AvailableSlots />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /search available slots/i })).toBeInTheDocument();
      });
    });
  });

  describe('Vehicle Type Selection', () => {
    it('selects vehicle type from dropdown', async () => {
      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        expect(vehicleTypeSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      await userEvent.selectOptions(vehicleTypeSelect, 'S');

      await waitFor(() => {
        expect(vehicleTypeSelect).toHaveValue('S');
      });
    });

    it('updates selection when different type is selected', async () => {
      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        expect(vehicleTypeSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      await userEvent.selectOptions(vehicleTypeSelect, 'S');

      await waitFor(() => {
        expect(vehicleTypeSelect).toHaveValue('S');
      });

      await userEvent.selectOptions(vehicleTypeSelect, 'M');

      await waitFor(() => {
        expect(vehicleTypeSelect).toHaveValue('M');
      });
    });
  });

  describe('Entry Point Selection', () => {
    it('selects entry point from dropdown', async () => {
      render(<AvailableSlots />);

      await waitFor(() => {
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(entryPointSelect).toBeInTheDocument();
      });

      const entryPointSelect = screen.getByLabelText('Entry Point:');
      await userEvent.selectOptions(entryPointSelect, 'A');

      await waitFor(() => {
        expect(entryPointSelect).toHaveValue('A');
      });
    });
  });

  describe('Slot Search', () => {
    it('calls getAvailableSlots API with correct parameters', async () => {
      const mockSlots: ParkingSlot[] = [
        {
          id: 1,
          slot_label: 'SP-1',
          slot_type: 'SP',
          distances: [1, 2, 3],
          available: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          x: 0,
          z: 0,
          type: 'SP',
          status: 'available'
        },
        {
          id: 2,
          slot_label: 'SP-2',
          slot_type: 'SP',
          distances: [2, 3, 4],
          available: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          x: 0,
          z: 0,
          type: 'SP',
          status: 'available'
        },
        {
          id: 3,
          slot_label: 'MP-1',
          slot_type: 'MP',
          distances: [3, 4, 5],
          available: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          x: 0,
          z: 0,
          type: 'SP',
          status: 'available'
        },
      ];

      getAvailableSlotsSpy.mockResolvedValue({
        available_slots: mockSlots,
        total_count: 3,
        vehicle_type: 'S' as VehicleType,
        entry_point_id: 'A' as EntryPointIdentifier,
      });

      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(entryPointSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      const entryPointSelect = screen.getByLabelText('Entry Point:');

      await userEvent.selectOptions(vehicleTypeSelect, 'S');
      await userEvent.selectOptions(entryPointSelect, 'A');

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      await act(async () => {
        await userEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(getAvailableSlotsSpy).toHaveBeenCalledWith('S', 'A');
      });
    });

    it('displays available slots on successful search', async () => {
      const mockSlots: ParkingSlot[] = [
        {
          id: 1,
          slot_label: 'SP-1',
          slot_type: 'SP',
          distances: [1, 2, 3],
          available: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          x: 0,
          z: 0,
          type: 'SP',
          status: 'available'
        },
        {
          id: 2,
          slot_label: 'SP-2',
          slot_type: 'SP',
          distances: [2, 3, 4],
          available: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          x: 0,
          z: 0,
          type: 'SP',
          status: 'available'
        },
      ];

      getAvailableSlotsSpy.mockResolvedValue({
        available_slots: mockSlots,
        total_count: 2,
        vehicle_type: 'S' as VehicleType,
        entry_point_id: 'A' as EntryPointIdentifier,
      });

      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(entryPointSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      const entryPointSelect = screen.getByLabelText('Entry Point:');

      await userEvent.selectOptions(vehicleTypeSelect, 'S');
      await userEvent.selectOptions(entryPointSelect, 'A');

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      await act(async () => {
        await userEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeInTheDocument();
        expect(screen.getByText(/SP-2/i)).toBeInTheDocument();
      });
    });

    it('displays no slots message when no slots available', async () => {
      getAvailableSlotsSpy.mockResolvedValue({
        available_slots: [],
        total_count: 0,
        vehicle_type: 'S' as VehicleType,
        entry_point_id: 'A' as EntryPointIdentifier,
      });
      
      render(<AvailableSlots />);
      
      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(entryPointSelect).toBeInTheDocument();
      });
      
      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      const entryPointSelect = screen.getByLabelText('Entry Point:');

      await userEvent.selectOptions(vehicleTypeSelect, 'S');
      await userEvent.selectOptions(entryPointSelect, 'A');

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      await act(async () => {
        await userEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/no compatible slots found/i)).toBeInTheDocument();
      });
    });

    it('displays error message on failed search', async () => {
      getAvailableSlotsSpy.mockRejectedValue(new Error('Network error'));

      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(entryPointSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      const entryPointSelect = screen.getByLabelText('Entry Point:');

      await userEvent.selectOptions(vehicleTypeSelect, 'S');
      await userEvent.selectOptions(entryPointSelect, 'A');

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      await act(async () => {
        await userEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when vehicle type not selected', async () => {
      getEntryPointsSpy.mockResolvedValue([]);

      render(<AvailableSlots />);

      await waitFor(() => {
        const searchButton = screen.getByRole('button', { name: /search available slots/i });
        expect(searchButton).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select vehicle type and entry point/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('disables elements during loading', async () => {
      getAvailableSlotsSpy.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ available_slots: [], total_count: 0, vehicle_type: 'S' as VehicleType, entry_point_id: 'A' as EntryPointIdentifier }), 100))
      );

      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(entryPointSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      const entryPointSelect = screen.getByLabelText('Entry Point:');

      await userEvent.selectOptions(vehicleTypeSelect, 'S');
      await userEvent.selectOptions(entryPointSelect, 'A');

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      await act(async () => {
        await userEvent.click(searchButton);
      });

      expect(searchButton).toBeDisabled();
      expect(searchButton).toHaveTextContent('Searching...');
    });

    it('shows loading state during loading', async () => {
      getAvailableSlotsSpy.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ available_slots: [], total_count: 0, vehicle_type: 'S' as VehicleType, entry_point_id: 'A' as EntryPointIdentifier }), 100))
      );

      render(<AvailableSlots />);

      await waitFor(() => {
        const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
        const entryPointSelect = screen.getByLabelText('Entry Point:');
        expect(vehicleTypeSelect).toBeInTheDocument();
        expect(entryPointSelect).toBeInTheDocument();
      });

      const vehicleTypeSelect = screen.getByLabelText('Vehicle Type:');
      const entryPointSelect = screen.getByLabelText('Entry Point:');

      await userEvent.selectOptions(vehicleTypeSelect, 'S');
      await userEvent.selectOptions(entryPointSelect, 'A');

      const searchButton = screen.getByRole('button', { name: /search available slots/i });
      await act(async () => {
        await userEvent.click(searchButton);
      });

      await waitFor(() => {
        expect(searchButton).toHaveTextContent('Searching...');
      });
    });
  });
});