/**
 * Park Vehicle Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParkVehicle from '../ParkVehicle';
import * as api from '../../api';
import * as reactRouterDom from 'react-router-dom';
import type { EntryPoint, ParkingSlot, ParkingSession } from '../../types';

describe('ParkVehicle Component', () => {
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

  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getEntryPoints').mockResolvedValue(mockEntryPoints);
    vi.spyOn(api, 'parkVehicle').mockResolvedValue(undefined as any);
    vi.spyOn(reactRouterDom, 'useNavigate').mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with title', () => {
      render(<ParkVehicle />);
      expect(screen.getByText('🚗️ Park Vehicle')).toBeInTheDocument();
    });

    it('renders vehicle type dropdown', () => {
      render(<ParkVehicle />);
      expect(screen.getByLabelText(/vehicle type/i)).toBeInTheDocument();
    });

    it('renders entry point dropdown', () => {
      render(<ParkVehicle />);
      expect(screen.getByLabelText(/entry point/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<ParkVehicle />);
      expect(screen.getByRole('button', { name: /park vehicle/i })).toBeInTheDocument();
    });

    it('renders vehicle type info box', () => {
      render(<ParkVehicle />);
      expect(screen.getByText(/vehicle types/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Small \(S\)/)).toHaveLength(2);
      expect(screen.getAllByText(/Medium \(M\)/)).toHaveLength(2);
      expect(screen.getAllByText(/Large \(L\)/)).toHaveLength(2);
    });
  });

  describe('Form Submission', () => {
    it('calls parkVehicle API with correct parameters', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', parking_slot_id: mockParkingSlot.id, entry_point_id: 1,
        parked_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: mockParkingSlot.id, slot_label: mockParkingSlot.slot_label, slot_type: mockParkingSlot.slot_type },
        session_id: '', is_active: false, is_continuous: false
      };
      vi.spyOn(api, 'parkVehicle').mockResolvedValue(mockSession);
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      await userEvent.selectOptions(entryPointSelect, 'Main Entrance (A)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(vi.mocked(api.parkVehicle)).toHaveBeenCalledWith('S', 'A');
      });
    });

    it('displays success message on successful park', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', parking_slot_id: mockParkingSlot.id, entry_point_id: 1,
        parked_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: mockParkingSlot.id, slot_label: mockParkingSlot.slot_label, slot_type: mockParkingSlot.slot_type },
        session_id: '', is_active: false, is_continuous: false
      };
      vi.spyOn(api, 'parkVehicle').mockResolvedValue(mockSession);
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      await userEvent.selectOptions(entryPointSelect, 'Main Entrance (A)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/vehicle parked successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/Session ID:/i)).toBeInTheDocument();
      });
    });

    it('displays error message on failed park', async () => {
      vi.spyOn(api, 'parkVehicle').mockRejectedValue(new Error('No available slots'));
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      await userEvent.selectOptions(entryPointSelect, 'Main Entrance (A)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/No available slots/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when vehicle type is not selected', async () => {
      render(<ParkVehicle />);
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/please select a vehicle type/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when entry point is not selected', async () => {
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/please select an entry point/i)).toBeInTheDocument();
      });
    });

    it('navigates to session details on success', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', parking_slot_id: mockParkingSlot.id, entry_point_id: 1,
        parked_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: mockParkingSlot.id, slot_label: mockParkingSlot.slot_label, slot_type: mockParkingSlot.slot_type },
        session_id: '', is_active: false, is_continuous: false
      };
      vi.spyOn(api, 'parkVehicle').mockResolvedValue(mockSession);
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      await userEvent.selectOptions(entryPointSelect, 'Main Entrance (A)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      const viewSessionButton = await screen.findByRole('button', { name: /view session/i });
      expect(viewSessionButton).toBeInTheDocument();
      await userEvent.click(viewSessionButton);
      expect(mockNavigate).toHaveBeenCalledWith('/session/');
    });
  });

  describe('Loading State', () => {
    it('disables form inputs during loading', async () => {
      vi.spyOn(api, 'parkVehicle').mockImplementation(() => new Promise(() => {}));
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      await userEvent.selectOptions(entryPointSelect, 'Main Entrance (A)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      expect(vehicleTypeSelect).toBeDisabled();
      expect(entryPointSelect).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('shows loading text on button during loading', async () => {
      vi.spyOn(api, 'parkVehicle').mockImplementation(() => new Promise(() => {}));
      render(<ParkVehicle />);
      const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i);
      await userEvent.selectOptions(vehicleTypeSelect, 'Small (S)');
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      await userEvent.selectOptions(entryPointSelect, 'Main Entrance (A)');
      const submitButton = screen.getByRole('button', { name: /park vehicle/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/parking\.\.\./i)).toBeInTheDocument();
      });
    });
  });

  describe('Entry Points Loading', () => {
    it('loads entry points on mount', async () => {
      render(<ParkVehicle />);
      await waitFor(() => {
        expect(vi.mocked(api.getEntryPoints)).toHaveBeenCalled();
      });
    });

    it('does not auto-select entry point on load', async () => {
      render(<ParkVehicle />);
      await waitFor(() => {
        expect(vi.mocked(api.getEntryPoints)).toHaveBeenCalled();
      });
      const entryPointSelect = screen.getByLabelText(/entry point/i);
      expect(entryPointSelect).toHaveValue('');
    });

    it('displays error when entry points fail to load', async () => {
      vi.spyOn(api, 'getEntryPoints').mockRejectedValue(new Error('Network error'));
      render(<ParkVehicle />);
      await waitFor(() => {
        expect(screen.getByText(/failed to load entry points/i)).toBeInTheDocument();
      });
    });
  });
});