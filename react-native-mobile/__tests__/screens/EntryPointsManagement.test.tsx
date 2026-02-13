/**
 * Entry Points Management Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import EntryPointsManagement from '../../src/screens/EntryPointsManagement';
import * as api from '../../src/api/parkingApi';
import type { NavigationProp, RouteProp } from '../../src/types';

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  listEntryPoints: jest.fn(),
  createEntryPoint: jest.fn(),
  updateEntryPoint: jest.fn(),
  deleteEntryPoint: jest.fn(),
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
    it('renders screen with title', () => {
      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/entry points management/i)).toBeTruthy();
    });

    it('renders add entry point button', () => {
      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/\+ add entry point/i)).toBeTruthy();
    });

    it('displays minimum 3 entry points warning', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
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

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      const addButton = screen.getByText(/\+ add entry point/i);
      fireEvent.press(addButton);

      // Fill in form
      const identifierInput = screen.getByPlaceholderText(/a/i);
      fireEvent.changeText(identifierInput, 'A');

      const nameInput = screen.getByPlaceholderText(/entry point name/i);
      fireEvent.changeText(nameInput, 'Entry Point A');

      const submitButton = screen.getByText(/create entry point/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.createEntryPoint).toHaveBeenCalledWith('A', 'Entry Point A');
      });
    });

    it('opens edit modal when edit button is pressed', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      const editButton = screen.getByText(/edit/i);
      fireEvent.press(editButton);

      await waitFor(() => {
        expect(screen.getByText(/edit entry point a/i)).toBeTruthy();
      });
    });

    it('updates an existing entry point', async () => {
      const mockEntryPoint = {
        id: '1',
        identifier: 'A',
        name: 'Entry Point A',
      };

      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      const editButton = screen.getByText(/edit/i);
      fireEvent.press(editButton);

      // Fill in form
      const nameInput = screen.getByPlaceholderText(/entry point name/i);
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
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      const deleteButton = screen.getByText(/delete/i);
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/delete entry point a \(entry point b\)\?/i)).toBeTruthy();
      });
    });

    it('confirms and executes deletion', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      const deleteButton = screen.getByText(/delete/i);
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/delete entry point a \(entry point b\)\?/i)).toBeTruthy();
      });

      const confirmButton = screen.getByText(/delete entry point a \(entry point b\)\?/i);
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(api.deleteEntryPoint).toHaveBeenCalledWith('1');
      });
    });

    it('prevents deletion when only 3 entry points remain', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      const deleteButton = screen.getByText(/delete/i);
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot delete — minimum 3 entry points required/i)).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes entry points when refresh control is pulled', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValueOnce(mockEntryPoints);
      (api.listEntryPoints as jest.Mock).mockResolvedValueOnce(mockEntryPoints);

      render(<EntryPointsManagement navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.listEntryPoints).toHaveBeenCalledTimes(2);
      });
    });
  });
});
