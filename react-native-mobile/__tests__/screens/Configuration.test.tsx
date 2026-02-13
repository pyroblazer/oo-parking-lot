/**
 * Configuration Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import Configuration from '../../src/screens/Configuration';
import * as api from '../../src/api/parkingApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationProp, RouteProp } from '../../src/types';

// Mock API functions
jest.mock('../../src/api/parkingApi', () => ({
  checkHealth: jest.fn(),
  initializeSystem: jest.fn(),
  listEntryPoints: jest.fn(),
  listSlots: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
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

describe('Configuration Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('http://localhost:8082/api');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders screen with title', () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/configuration/i)).toBeTruthy();
    });

    it('renders three sub-tabs: Entry Points, Parking Slots, System', () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/entry points/i)).toBeTruthy();
      expect(screen.getByText(/parking slots/i)).toBeTruthy();
      expect(screen.getByText(/system/i)).toBeTruthy();
    });

    it('displays API URL input field', () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByPlaceholderText(/http:\/\/localhost:8082\/api/i)).toBeTruthy();
    });

    it('displays save API URL button', () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(/save api url/i)).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Entry Points tab', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const entryPointsTab = screen.getByText(/entry points/i);
      fireEvent.press(entryPointsTab);

      await waitFor(() => {
        expect(screen.getByText(/entry points management/i)).toBeTruthy();
      });
    });

    it('switches to Parking Slots tab', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const parkingSlotsTab = screen.getByText(/parking slots/i);
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/parking slots management/i)).toBeTruthy();
      });
    });

    it('switches to System tab', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const systemTab = screen.getByText(/system/i);
      fireEvent.press(systemTab);

      await waitFor(() => {
        expect(screen.getByText(/system configuration/i)).toBeTruthy();
      });
    });
  });

  describe('API Configuration', () => {
    it('loads API URL from AsyncStorage on mount', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('http://test-api.com/api');

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('apiUrl');
      });
    });

    it('saves API URL to AsyncStorage', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const apiUrlInput = screen.getByPlaceholderText(/http:\/\/localhost:8082\/api/i);
      fireEvent.changeText(apiUrlInput, 'http://new-api.com/api');

      const saveButton = screen.getByText(/save api url/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('apiUrl', 'http://new-api.com/api');
      });
    });

    it('displays success message after saving API URL', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const apiUrlInput = screen.getByPlaceholderText(/http:\/\/localhost:8082\/api/i);
      fireEvent.changeText(apiUrlInput, 'http://new-api.com/api');

      const saveButton = screen.getByText(/save api url/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/api url saved successfully/i)).toBeTruthy();
      });
    });

    it('validates API URL format', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const apiUrlInput = screen.getByPlaceholderText(/http:\/\/localhost:8082\/api/i);
      fireEvent.changeText(apiUrlInput, 'invalid-url');

      const saveButton = screen.getByText(/save api url/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid api url format/i)).toBeTruthy();
      });
    });
  });

  describe('Health Status', () => {
    it('checks health status on mount', async () => {
      const mockHealth = {
        status: 'healthy',
        database: 'connected',
        timestamp: '2025-01-01T00:00:00Z',
      };

      (api.checkHealth as jest.Mock).mockResolvedValue(mockHealth);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.checkHealth).toHaveBeenCalled();
      });
    });

    it('displays healthy status', async () => {
      const mockHealth = {
        status: 'healthy',
        database: 'connected',
        timestamp: '2025-01-01T00:00:00Z',
      };

      (api.checkHealth as jest.Mock).mockResolvedValue(mockHealth);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/status: healthy/i)).toBeTruthy();
        expect(screen.getByText(/database: connected/i)).toBeTruthy();
      });
    });

    it('displays unhealthy status', async () => {
      const mockHealth = {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: '2025-01-01T00:00:00Z',
      };

      (api.checkHealth as jest.Mock).mockResolvedValue(mockHealth);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/status: unhealthy/i)).toBeTruthy();
        expect(screen.getByText(/database: disconnected/i)).toBeTruthy();
      });
    });

    it('displays error when health check fails', async () => {
      (api.checkHealth as jest.Mock).mockRejectedValue(new Error('Health check failed'));

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/health check failed/i)).toBeTruthy();
      });
    });

    it('refreshes health status when refresh button is pressed', async () => {
      const mockHealth = {
        status: 'healthy',
        database: 'connected',
        timestamp: '2025-01-01T00:00:00Z',
      };

      (api.checkHealth as jest.Mock).mockResolvedValue(mockHealth);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const refreshButton = screen.getByText(/refresh status/i);
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(api.checkHealth).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('System Initialization', () => {
    it('initializes system when initialize button is pressed', async () => {
      const mockInitResult = {
        success: true,
        message: 'System initialized successfully',
      };

      (api.initializeSystem as jest.Mock).mockResolvedValue(mockInitResult);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const initializeButton = screen.getByText(/initialize system/i);
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(api.initializeSystem).toHaveBeenCalled();
      });
    });

    it('displays success message after initialization', async () => {
      const mockInitResult = {
        success: true,
        message: 'System initialized successfully',
      };

      (api.initializeSystem as jest.Mock).mockResolvedValue(mockInitResult);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const initializeButton = screen.getByText(/initialize system/i);
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/system initialized successfully/i)).toBeTruthy();
      });
    });

    it('displays error when initialization fails', async () => {
      (api.initializeSystem as jest.Mock).mockRejectedValue(new Error('Initialization failed'));

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const initializeButton = screen.getByText(/initialize system/i);
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/initialization failed/i)).toBeTruthy();
      });
    });

    it('shows confirmation dialog before initialization', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const initializeButton = screen.getByText(/initialize system/i);
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to initialize the system\?/i)).toBeTruthy();
      });
    });

    it('cancels initialization when cancel button is pressed', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const initializeButton = screen.getByText(/initialize system/i);
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to initialize the system\?/i)).toBeTruthy();
      });

      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(api.initializeSystem).not.toHaveBeenCalled();
      });
    });
  });

  describe('Entry Points Tab', () => {
    it('displays entry points list', async () => {
      const mockEntryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(mockEntryPoints);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const entryPointsTab = screen.getByText(/entry points/i);
      fireEvent.press(entryPointsTab);

      await waitFor(() => {
        expect(screen.getByText(/entry point a/i)).toBeTruthy();
        expect(screen.getByText(/entry point b/i)).toBeTruthy();
        expect(screen.getByText(/entry point c/i)).toBeTruthy();
      });
    });

    it('displays loading state while fetching entry points', async () => {
      (api.listEntryPoints as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const entryPointsTab = screen.getByText(/entry points/i);
      fireEvent.press(entryPointsTab);

      expect(screen.getByText(/loading entry points\.\.\./i)).toBeTruthy();
    });

    it('displays error when entry points loading fails', async () => {
      (api.listEntryPoints as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const entryPointsTab = screen.getByText(/entry points/i);
      fireEvent.press(entryPointsTab);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeTruthy();
      });
    });
  });

  describe('Parking Slots Tab', () => {
    it('displays parking slots list', async () => {
      const mockSlots = [
        { id: '1', identifier: 'A1', type: 'Small', isAvailable: true },
        { id: '2', identifier: 'B1', type: 'Medium', isAvailable: false },
        { id: '3', identifier: 'C1', type: 'Large', isAvailable: true },
      ];

      (api.listSlots as jest.Mock).mockResolvedValue(mockSlots);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const parkingSlotsTab = screen.getByText(/parking slots/i);
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/a1/i)).toBeTruthy();
        expect(screen.getByText(/b1/i)).toBeTruthy();
        expect(screen.getByText(/c1/i)).toBeTruthy();
      });
    });

    it('displays loading state while fetching parking slots', async () => {
      (api.listSlots as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const parkingSlotsTab = screen.getByText(/parking slots/i);
      fireEvent.press(parkingSlotsTab);

      expect(screen.getByText(/loading parking slots\.\.\./i)).toBeTruthy();
    });

    it('displays error when parking slots loading fails', async () => {
      (api.listSlots as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const parkingSlotsTab = screen.getByText(/parking slots/i);
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeTruthy();
      });
    });
  });

  describe('System Tab', () => {
    it('displays system information', async () => {
      const mockHealth = {
        status: 'healthy',
        database: 'connected',
        timestamp: '2025-01-01T00:00:00Z',
      };

      (api.checkHealth as jest.Mock).mockResolvedValue(mockHealth);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const systemTab = screen.getByText(/system/i);
      fireEvent.press(systemTab);

      await waitFor(() => {
        expect(screen.getByText(/status: healthy/i)).toBeTruthy();
        expect(screen.getByText(/database: connected/i)).toBeTruthy();
      });
    });

    it('displays initialization button', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const systemTab = screen.getByText(/system/i);
      fireEvent.press(systemTab);

      expect(screen.getByText(/initialize system/i)).toBeTruthy();
    });

    it('displays refresh status button', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const systemTab = screen.getByText(/system/i);
      fireEvent.press(systemTab);

      expect(screen.getByText(/refresh status/i)).toBeTruthy();
    });
  });

  describe('Modal Dialogs', () => {
    it('closes modal when backdrop is pressed', async () => {
      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      const initializeButton = screen.getByText(/initialize system/i);
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to initialize the system\?/i)).toBeTruthy();
      });

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.press(backdrop);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to initialize the system\?/i)).toBeNull();
      });
    });
  });

  describe('Auto-refresh', () => {
    it('auto-refreshes health status every 30 seconds', async () => {
      jest.useFakeTimers();

      const mockHealth = {
        status: 'healthy',
        database: 'connected',
        timestamp: '2025-01-01T00:00:00Z',
      };

      (api.checkHealth as jest.Mock).mockResolvedValue(mockHealth);

      render(<Configuration navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(api.checkHealth).toHaveBeenCalledTimes(1);
      });

      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(api.checkHealth).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });
});
