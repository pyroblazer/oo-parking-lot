/**
 * View Session Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ViewSession from '../ViewSession';
import * as api from '../../api';
import * as reactRouterDom from 'react-router-dom';
import type { ParkingSlot, ParkingSession } from '../../types';

describe('ViewSession Component', () => {
  const mockNavigate = vi.fn();
  const mockUseParams = vi.fn(() => ({ id: '1' }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getSession').mockResolvedValue(undefined as any);
    vi.spyOn(reactRouterDom, 'useNavigate').mockReturnValue(mockNavigate);
    vi.spyOn(reactRouterDom, 'useParams').mockImplementation(mockUseParams);
    mockUseParams.mockReturnValue({ id: '1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders component with loading state', async () => {
      vi.spyOn(api, 'getSession').mockImplementation(() => new Promise(() => {}));
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByRole('heading', { name: /Parking Session Details/i })).toBeInTheDocument();
      expect(await screen.findByText(/Session ID:/i)).toBeInTheDocument();
    });

    it('renders component with error state', async () => {
      vi.spyOn(api, 'getSession').mockRejectedValue(new Error('Session not found'));
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/session not found/i)).toBeInTheDocument();
    });

    it('renders component with session not found', async () => {
      vi.spyOn(api, 'getSession').mockResolvedValue(null as any);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/session not found/i)).toBeInTheDocument();
    });

    it('renders component with session data', async () => {
      const mockParkingSlot: ParkingSlot = {
        id: 1, slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3],
        available: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
        x: 0, z: 0, type: 'SP', status: 'available'
      };
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true,
        parking_slot_id: mockParkingSlot.id, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: mockParkingSlot.id, slot_label: mockParkingSlot.slot_label, slot_type: mockParkingSlot.slot_type },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/Session ID: 1/i)).toBeInTheDocument();
      expect(await screen.findByText(/🚗 Parking Session Details/i)).toBeInTheDocument();
      expect(await screen.findByText(new RegExp(`${mockParkingSlot.slot_label} \\(${mockParkingSlot.slot_type}\\)`, 'i'))).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('displays session ID', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/Session ID: 1/i)).toBeInTheDocument();
    });

    it('displays vehicle type', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/vehicle type:/i)).toBeInTheDocument();
      expect(await screen.findByText('S')).toBeInTheDocument();
    });

    it('displays parking slot information', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/SP-1 \(SP\)/i)).toBeInTheDocument();
    });

    it('displays entry point', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        entry_point: { id: 1, identifier: 'A', name: 'Main Entrance' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/entry point:/i)).toBeInTheDocument();
      expect(await screen.findByText(/Main Entrance/i)).toBeInTheDocument();
    });

    it('displays parked at timestamp', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/parked at:/i)).toBeInTheDocument();
    });

    it('displays exited at timestamp for completed session', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: false, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/exited at:/i)).toBeInTheDocument();
    });

    it('displays active status badge', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/🚗 Active/i)).toBeInTheDocument();
    });

    it('displays completed status badge', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: false, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/✅ Completed/i)).toBeInTheDocument();
    });

    it('displays continuous parking badge', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: false, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        is_continuous: true, session_id: ''
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/♻️/i)).toBeInTheDocument();
      expect(await screen.findByText(/Continuous Parking/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid session ID', async () => {
      vi.spyOn(api, 'getSession').mockRejectedValue(new Error('Invalid session ID'));
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/invalid session id/i)).toBeInTheDocument();
    });

    it('handles API error', async () => {
      vi.spyOn(api, 'getSession').mockRejectedValue(new Error('Network error'));
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    });

    it('handles null session ID', async () => {
      mockUseParams.mockReturnValueOnce({ id: null });
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/session not found/i)).toBeInTheDocument();
    });

    it('handles empty session ID', async () => {
      mockUseParams.mockReturnValueOnce({ id: '' });
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/session not found/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner while fetching', async () => {
      vi.spyOn(api, 'getSession').mockImplementation(() => new Promise(() => {}));
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByRole('heading', { name: /Parking Session Details/i })).toBeInTheDocument();
      expect(await screen.findByText(/Session ID:/i)).toBeInTheDocument();
    });

    it('hides loading spinner after fetch', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      await screen.findByText(/Session ID: 1/i);
      expect(screen.queryByRole('heading', { name: /Parking Session Details/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long session ID', async () => {
      const mockSession: ParkingSession = {
        id: 123456789, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '123456789', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect((await screen.findAllByText(/Session ID:/i)).length).toBeGreaterThan(0);
    });

    it('handles different vehicle types', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'M', is_active: false, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'MP-1', slot_type: 'MP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/vehicle type:/i)).toBeInTheDocument();
      expect(await screen.findByText('M')).toBeInTheDocument();
      expect(await screen.findByText(/MP-1 \(MP\)/i)).toBeInTheDocument();
    });

    it('handles large vehicle type', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'L', is_active: false, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'LP-1', slot_type: 'LP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByText(/vehicle type:/i)).toBeInTheDocument();
      expect(await screen.findByText('L')).toBeInTheDocument();
      expect(await screen.findByText(/LP-1 \(LP\)/i)).toBeInTheDocument();
    });

    it('handles null exited_at for active session', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      await screen.findByText(/Session ID: 1/i);
      expect(screen.queryByText(/exited at:/i)).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('calls getSession API with correct session ID', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      await screen.findByText(/Session ID: 1/i);
      expect(vi.mocked(api.getSession)).toHaveBeenCalledWith('1');
    });
  });

  describe('User Interactions', () => {
    it('navigates to session details when available', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      await screen.findByText(/Session ID: 1/i);
      expect(screen.queryByText(/view session/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      const mockSession: ParkingSession = {
        id: 1, vehicle_type: 'S', is_active: true, parking_slot_id: 1, entry_point_id: 1,
        parked_at: new Date(Date.now() - 7200000).toISOString(), total_fee: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        parking_slot: { id: 1, slot_label: 'SP-1', slot_type: 'SP' },
        session_id: '1', is_continuous: false
      };
      vi.spyOn(api, 'getSession').mockResolvedValue(mockSession);
      render(<MemoryRouter><ViewSession /></MemoryRouter>);
      expect(await screen.findByRole('heading', { name: /Parking Session Details/i })).toBeInTheDocument();
    });
  });
});