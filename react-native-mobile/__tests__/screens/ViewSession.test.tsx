/**
 * View Session Screen Tests
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import ViewSession from '../../src/screens/ViewSession';
import * as api from '../../src/api';
import type { NavigationProp, RouteProp } from '../../src/types';

// Mock API functions
jest.mock('../../src/api', () => ({
  getSession: jest.fn(),
}));

const mockNavigation: NavigationProp = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

interface ViewSessionRouteParams extends Record<string, unknown> {
  id: string;
}

const createMockRoute = (params: ViewSessionRouteParams): RouteProp<ViewSessionRouteParams> => ({
  params,
  key: '',
  name: '',
});

describe('ViewSession Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders screen with loading state', () => {
      (api.getSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      expect(screen.getByText(/loading\.\.\./i)).toBeTruthy();
    });

    it('renders screen with error state', async () => {
      (api.getSession as jest.Mock).mockRejectedValue(new Error('Session not found'));

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session not found/i)).toBeTruthy();
      });
    });

    it('renders screen with session data', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session id:/i)).toBeTruthy();
        expect(screen.getByText(/session-123/i)).toBeTruthy();
      });
    });
  });

  describe('Data Display', () => {
    it('displays session ID', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session id:/i)).toBeTruthy();
        expect(screen.getByText(/session-123/i)).toBeTruthy();
      });
    });

    it('displays vehicle type', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/vehicle type:/i)).toBeTruthy();
        expect(screen.getByText('S')).toBeTruthy();
      });
    });

    it('displays parking slot information', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/parking slot:/i)).toBeTruthy();
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });
    });

    it('displays entry point', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/entry point:/i)).toBeTruthy();
        expect(screen.getByText('A')).toBeTruthy();
      });
    });

    it('displays parked at timestamp', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/parked at:/i)).toBeTruthy();
      });
    });

    it('displays exited at timestamp for completed session', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: false,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/exited at:/i)).toBeTruthy();
      });
    });

    it('displays active status badge', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/🚗️ active/i)).toBeTruthy();
      });
    });

    it('displays completed status badge', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: false,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/✅ completed/i)).toBeTruthy();
      });
    });

    it('displays continuous parking badge', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: false,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: new Date().toISOString(),
        is_continuous: true,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/🔄 yes/i)).toBeTruthy();
        expect(screen.getByText(/continuous parking:/i)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error', async () => {
      (api.getSession as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeTruthy();
      });
    });

    it('handles null session ID', async () => {
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: null as unknown as string })} />);

      await waitFor(() => {
        expect(screen.getByText(/invalid session id/i)).toBeTruthy();
      });
    });

    it('handles empty session ID', async () => {
      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: '' })} />);

      await waitFor(() => {
        expect(screen.getByText(/invalid session id/i)).toBeTruthy();
      });
    });

    it('handles session not found error', async () => {
      (api.getSession as jest.Mock).mockRejectedValue(new Error('Session not found'));

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'nonexistent' })} />);

      await waitFor(() => {
        expect(screen.getByText(/session not found/i)).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while fetching', async () => {
      (api.getSession as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      expect(screen.getByText(/loading\.\.\./i)).toBeTruthy();
    });

    it('hides loading indicator after fetch', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading\.\.\./i)).not.toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    it('allows navigating back', async () => {
      const mockSession = {
        session_id: 'session-123',
        vehicle_type: 'S',
        is_active: true,
        parking_slot: { id: 'slot-1', label: 'SP-1', type: 'SP' as const },
        entry_point: 'A',
        parked_at: new Date(Date.now() - 7200000).toISOString(),
        exited_at: null,
        is_continuous: false,
      };

      (api.getSession as jest.Mock).mockResolvedValue(mockSession);

      render(<ViewSession navigation={mockNavigation} route={createMockRoute({ id: 'session-123' })} />);

      await waitFor(() => {
        expect(screen.queryByText(/back/i)).toBeTruthy();
      });
    });
  });
});
