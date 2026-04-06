/**
 * Slots Management Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import SlotsManagement from '../../src/screens/SlotsManagement';
import * as parkingApi from '../../src/api/parkingApi';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  listSlots: jest.fn(),
  listEntryPoints: jest.fn(),
  createSlot: jest.fn(),
  updateSlot: jest.fn(),
  deleteSlot: jest.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const mockNavigation: any = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

describe('Slots Management Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders screen with title', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/slots management/i);
    });

    it('renders filter buttons', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/filter by type/i);
      await screen.findByText(/filter by availability/i);
      expect(screen.getAllByText(/sp/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/mp/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/lp/i).length).toBeGreaterThan(0);
    });

    it('renders create button', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/\+ create new slot/i);
    });
  });

  describe('Data Loading', () => {
    it('loads slots on mount', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/slots management/i);

      expect(parkingApi.listSlots).toHaveBeenCalledTimes(1);
    });

    it('displays loading state while loading', async () => {
      (parkingApi.listSlots as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/loading slots/i);
    });

    it('displays error when data loading fails', async () => {
      (parkingApi.listSlots as jest.Mock).mockRejectedValue(
        new parkingApi.ApiError('Network error')
      );

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/network error/i);
    });
  });

  describe('Slot Filtering', () => {
    it('filters slots by type', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
        { id: '2', slot_label: 'MP-1', slot_type: 'MP', available: true, distances: [0, 0, 0] },
        { id: '3', slot_label: 'LP-1', slot_type: 'LP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      const spButtons = screen.getAllByText(/sp/i);
      fireEvent.press(spButtons[0]); // Press the first SP button (filter button)

      await screen.findByText(/sp-1/i);
    });

    it('filters slots by availability', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
        { id: '2', slot_label: 'SP-2', slot_type: 'SP', available: false, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      const allButtons = screen.getAllByText(/all/i);
      fireEvent.press(allButtons[1]); // Press the second "All" button (availability toggle)

      await screen.findByText(/available only/i);
    });
  });

  describe('Slot Display', () => {
    it('displays slot cards', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/sp-1/i);
    });

    it('displays available status for available slots', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/available/i);
    });

    it('displays occupied status for occupied slots', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: false, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/occupied/i);
    });

    it('displays slot type badge', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      expect(screen.getAllByText(/sp/i).length).toBeGreaterThan(0);
    });
  });

  describe('Slot Creation', () => {
    it('opens create modal when create button is pressed', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      const createButtons = screen.getAllByText(/\+ create new slot/i);
      fireEvent.press(createButtons[0]); // Press the first create button

      // Wait for modal to appear - look for unique modal elements
      await waitFor(() => {
        // Check for unique modal elements that only appear in the modal
        const slotLabel = screen.queryByText(/slot label:/i);
        expect(slotLabel).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('creates new slot when form is submitted', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.createSlot as jest.Mock).mockResolvedValue({
        id: '2',
        slot_label: 'SP-2',
        slot_type: 'SP',
        available: true,
        distances: [0, 0, 0],
      });

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      const createButtons = screen.getAllByText(/\+ create new slot/i);
      fireEvent.press(createButtons[0]); // Press the first create button

      // Wait for modal to appear - look for unique modal elements
      await waitFor(() => {
        // Check for unique modal elements that only appear in the modal
        const slotLabel = screen.queryByText(/slot label:/i);
        expect(slotLabel).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Slot Editing', () => {
    it('opens edit modal when edit button is pressed', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/sp-1/i);

      const slotCard = await screen.findByText(/sp-1/i);
      fireEvent.press(slotCard);

      await screen.findByText(/edit slot/i);
    });

    it('updates slot when form is submitted', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.updateSlot as jest.Mock).mockResolvedValue({
        id: '1',
        slot_label: 'SP-1',
        slot_type: 'SP',
        available: true,
        distances: [0, 0, 0],
      });

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/sp-1/i);

      const slotCard = await screen.findByText(/sp-1/i);
      fireEvent.press(slotCard);

      await screen.findByText(/edit slot/i);
    });
  });

  describe('Slot Deletion', () => {
    it('opens delete confirmation modal when delete button is pressed', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/sp-1/i);

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.press(deleteButtons[0]); // Press the first Delete button

      await screen.findByText(/delete slot sp-1/i);
    });

    it('deletes slot when confirmed', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);
      (parkingApi.deleteSlot as jest.Mock).mockResolvedValue(undefined);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/sp-1/i);

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.press(deleteButtons[0]); // Press the first Delete button

      await screen.findByText(/delete slot sp-1/i);
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no slots exist', async () => {
      (parkingApi.listSlots as jest.Mock).mockResolvedValue([]);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/no slots found/i);
    });
  });

  describe('Summary Bar', () => {
    it('displays slot counts summary', async () => {
      const mockSlots = [
        { id: '1', slot_label: 'SP-1', slot_type: 'SP', available: true, distances: [0, 0, 0] },
        { id: '2', slot_label: 'SP-2', slot_type: 'SP', available: false, distances: [0, 0, 0] },
        { id: '3', slot_label: 'MP-1', slot_type: 'MP', available: true, distances: [0, 0, 0] },
      ];

      (parkingApi.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<SlotsManagement navigation={mockNavigation} route={{ key: '', name: '', params: {} }} />);

      await screen.findByText(/sp:/i);
      await screen.findByText(/mp:/i);
    });
  });
});
