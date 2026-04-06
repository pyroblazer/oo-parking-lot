/**
 * Unpark Vehicle Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnparkVehicle from '../UnparkVehicle';
import * as api from '../../api';
import type { VehicleType, ParkingSlot, UnparkVehicleResult } from '../../types';

// Mock react-router-dom - must be before importing MemoryRouter
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useParams: vi.fn()
  };
});

import { MemoryRouter } from 'react-router-dom';
import * as reactRouterDom from 'react-router-dom';

describe('UnparkVehicle Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'unparkVehicle').mockResolvedValue(undefined as any);
    vi.spyOn(api, 'getSession').mockResolvedValue(undefined as any);
    vi.mocked(reactRouterDom).useNavigate.mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with title', () => {
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      expect(screen.getByText('🚗️ Unpark Vehicle')).toBeInTheDocument();
    });

    it('renders session ID input field', () => {
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      expect(screen.getByLabelText(/session id/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      expect(screen.getByRole('button', { name: /calculate fee/i })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls unparkVehicle API with correct session ID', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockResponse: UnparkVehicleResult = {
        session_id: 'session-123', vehicle_type: 'S' as VehicleType,
        parking_slot: mockParkingSlot, entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), duration_hours: 2, total_fee: 40.0,
        is_continuous: false,
        breakdown: {
          remaining: { total: 40.0, base_fee: 40.0, exceeding_hours: 0, exceeding_fee: 0 },
          long_term: { days: 0, fee: 0 },
          total_fee: 40.0, duration_hours: 2, is_continuous: false,
        },
      };
      vi.spyOn(api, 'unparkVehicle').mockResolvedValue(mockResponse);
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(vi.mocked(api.unparkVehicle)).toHaveBeenCalledWith('session-123', expect.any(String));
      });
    });

    it('displays result on successful unpark', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockResponse: UnparkVehicleResult = {
        session_id: 'session-123', vehicle_type: 'S' as VehicleType,
        parking_slot: mockParkingSlot, entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), duration_hours: 2, total_fee: 40.0,
        is_continuous: false,
        breakdown: {
          remaining: { total: 40.0, base_fee: 40.0, exceeding_hours: 0, exceeding_fee: 0 },
          long_term: { days: 0, fee: 0 },
          total_fee: 40.0, duration_hours: 2, is_continuous: false,
        },
      };
      vi.spyOn(api, 'unparkVehicle').mockResolvedValue(mockResponse);
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/vehicle unparked successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/session-123/i)).toBeInTheDocument();
        expect(screen.getAllByText(/S/).length).toBeGreaterThan(0);
        expect(screen.getByText(/sp-1/i)).toBeInTheDocument();
      });
    });

    it('displays fee breakdown details', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockResponse: UnparkVehicleResult = {
        session_id: 'session-123', vehicle_type: 'S' as VehicleType,
        parking_slot: mockParkingSlot, entry_point: 'A',
        parked_at: new Date(Date.now() - 18000000).toISOString(),
        exited_at: new Date().toISOString(), duration_hours: 5, total_fee: 80.0,
        is_continuous: false,
        breakdown: {
          remaining: { total: 80.0, base_fee: 40.0, exceeding_hours: 2, exceeding_fee: 40.0, hourly_rate: 20.0 },
          long_term: { days: 0, fee: 0 },
          total_fee: 80.0, duration_hours: 5, is_continuous: false,
        },
      };
      vi.spyOn(api, 'unparkVehicle').mockResolvedValue(mockResponse);
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/5 hours/i)).toBeInTheDocument();
        expect(screen.getAllByText(/₱80\.00/i).length).toBeGreaterThan(0);
      });
    });

    it('displays singular "hour" for 1 hour duration', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockResponse: UnparkVehicleResult = {
        session_id: 'session-123', vehicle_type: 'S' as VehicleType,
        parking_slot: mockParkingSlot, entry_point: 'A',
        parked_at: new Date(Date.now() - 1800000).toISOString(),
        exited_at: new Date().toISOString(), duration_hours: 1, total_fee: 40.0,
        is_continuous: false,
        breakdown: {
          remaining: { total: 40.0, base_fee: 40.0, exceeding_hours: 0, exceeding_fee: 0 },
          long_term: { days: 0, fee: 0 },
          total_fee: 40.0, duration_hours: 1, is_continuous: false,
        },
      };
      vi.spyOn(api, 'unparkVehicle').mockResolvedValue(mockResponse);
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/1 hour$/)).toBeInTheDocument();
        expect(screen.queryByText(/1 hours/)).not.toBeInTheDocument();
      });
    });

    it('displays continuous parking badge when applicable', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockResponse: UnparkVehicleResult = {
        session_id: 'session-123', vehicle_type: 'S' as VehicleType,
        parking_slot: mockParkingSlot, entry_point: 'A',
        parked_at: new Date(Date.now() - 18000000).toISOString(),
        exited_at: new Date().toISOString(), duration_hours: 5, total_fee: 80.0,
        is_continuous: true,
        breakdown: {
          remaining: { total: 80.0, base_fee: 40.0, exceeding_hours: 2, exceeding_fee: 40.0, hourly_rate: 20.0 },
          long_term: { days: 0, fee: 0 },
          total_fee: 80.0, duration_hours: 5, is_continuous: true,
          base_start_time: new Date(Date.now() - 18000000).toISOString(),
        },
      };
      vi.spyOn(api, 'unparkVehicle').mockResolvedValue(mockResponse);
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/continuous parking/i)).toBeInTheDocument();
      });
    });

    it('displays error message on failed unpark', async () => {
      vi.spyOn(api, 'unparkVehicle').mockRejectedValue(new Error('Session not found'));
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Session not found/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when session ID is empty', async () => {
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Session ID is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('disables form inputs during loading', async () => {
      vi.spyOn(api, 'unparkVehicle').mockImplementation(() => new Promise(() => {}));
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      expect(sessionIdInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('shows loading indicator on button during loading', async () => {
      vi.spyOn(api, 'unparkVehicle').mockImplementation(() => new Promise(() => {}));
      render(<MemoryRouter><UnparkVehicle /></MemoryRouter>);
      const sessionIdInput = screen.getByLabelText(/session id/i);
      await userEvent.type(sessionIdInput, 'session-123');
      const submitButton = screen.getByRole('button', { name: /calculate fee/i });
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Calculating\.\.\./i })).toBeInTheDocument();
      });
    });
  });
});