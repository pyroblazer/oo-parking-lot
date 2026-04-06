/**
 * Entry Points Management Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import EntryPointsManagement from '../../src/screens/EntryPointsManagement';
import * as api from '../../src/api/parkingApi';
import type { NavigationProp, RouteProp } from '../../src/types';

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  listEntryPoints: jest.fn(),
  createEntryPoint: jest.fn(),
  updateEntryPoint: jest.fn(),
  deleteEntryPoint: jest.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
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

describe('EntryPointsManagement Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders screen with title', async () => {
      (api.listEntryPoints as jest.Mock).mockResolvedValue([]);
      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);
      await screen.findByText(/entry points management/i);
    });

    it('renders add entry point button', async () => {
      (api.listEntryPoints as jest.Mock).mockResolvedValue([]);
      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);
      await screen.findByText(/\+ add entry point/i);
    });

    it('displays minimum 3 entry points warning when less than 3', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/minimum 3 entry points required/i)).toBeTruthy();
      });
    });

    it('hides warning when more than 3 entry points', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
        { id: '4', identifier: 'D', name: 'Entry Point D' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load first
      await screen.findByText(/Entry Point D/i);

      expect(screen.queryByText(/minimum 3 entry points required/i)).toBeNull();
    });
  });

  describe('Entry Points Loading', () => {
    it('loads entry points on mount', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.listEntryPoints).toHaveBeenCalled();
      });
    });

    it('displays loading state while fetching', async () => {
      (api.listEntryPoints as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      expect(screen.getByText(/loading entry points\.\.\./i)).toBeTruthy();
    });

    it('displays error when loading fails', async () => {
      (api.listEntryPoints as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeTruthy();
      });
    });
  });

  describe('CRUD Operations', () => {
    it('opens create modal when add button is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load
      await screen.findByText(/entry point a/i);

      const addButton = screen.getByText(/\+ add entry point/i);
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText(/identifier:/i)).toBeTruthy();
        expect(screen.getByText(/name:/i)).toBeTruthy();
      });
    });

    it('creates a new entry point', async () => {
      const mockEntryPoint = {
        id: 'ep-1',
        identifier: 'A',
        name: 'Entry Point A',
      };

      (api.createEntryPoint as jest.Mock).mockResolvedValue(mockEntryPoint);
      (api.listEntryPoints as jest.Mock).mockResolvedValue([]);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for loading to complete
      await screen.findByText(/\+ add entry point/i);

      const addButton = screen.getByText(/\+ add entry point/i);
      fireEvent.press(addButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('A')).toBeTruthy();
      });

      // Fill in form
      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Main Entrance');
      fireEvent.changeText(nameInput, 'Entry Point D');

      const submitButton = screen.getByText(/create entry point/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.createEntryPoint).toHaveBeenCalledWith('D', 'Entry Point D');
      });
    });

    it('opens edit modal when edit button is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load
      await screen.findByText(/entry point a/i);

      // Use getAllByText since there are multiple Edit buttons, pick the first
      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit entry point/i)).toBeTruthy();
      });
    });

    it('updates an existing entry point', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (api.updateEntryPoint as jest.Mock).mockResolvedValue(undefined);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load
      await screen.findByText(/entry point a/i);

      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.press(editButtons[0]);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText(/edit entry point/i)).toBeTruthy();
      });

      const nameInput = screen.getByPlaceholderText(/main entrance/i);
      fireEvent.changeText(nameInput, 'Entry Point A Updated');

      const submitButton = screen.getByText(/save changes/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.updateEntryPoint).toHaveBeenCalledWith('1', 'Entry Point A Updated');
      });
    });

    it('opens delete confirmation modal when delete button is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
        { id: '4', identifier: 'D', name: 'Entry Point D' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load
      await screen.findByText(/entry point a/i);

      // Use getAllByText since there are multiple Delete buttons, pick the first
      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        // The confirmation shows "Delete Entry Point A (Entry Point A)?"
        expect(screen.getByText(/delete entry point a/i)).toBeTruthy();
      });
    });

    it('confirms and executes deletion', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
        { id: '4', identifier: 'D', name: 'Entry Point D' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (api.deleteEntryPoint as jest.Mock).mockResolvedValue(undefined);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load
      await screen.findByText(/entry point a/i);

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/delete entry point a/i)).toBeTruthy();
      });

      // Use exact match for the "Delete Entry Point" button (not the title which includes identifier)
      const confirmButton = screen.getByText('Delete Entry Point');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(api.deleteEntryPoint).toHaveBeenCalled();
      });
    });

    it('allows deletion when only 3 entry points remain', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);
      (api.deleteEntryPoint as jest.Mock).mockResolvedValue(undefined);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      // Wait for data to load
      await screen.findByText(/entry point a/i);

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.press(deleteButtons[0]);

      // The component opens the delete confirmation modal (no minimum count check)
      await waitFor(() => {
        expect(screen.getByText(/delete entry point a/i)).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('loads entry points on mount', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.listEntryPoints).toHaveBeenCalledTimes(1);
      });
    });
  });
});
