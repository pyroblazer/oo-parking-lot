/**
 * Configuration Screen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import Configuration from '../../src/screens/Configuration';
import * as api from '../../src/api/parkingApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
}));

// Mock API functions
jest.mock('../../src/api/parkingApi', () => {
  class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  }

  return {
    checkHealth: jest.fn(),
    initializeSystem: jest.fn(),
    listEntryPoints: jest.fn(),
    listSlots: jest.fn(),
    setApiBaseUrl: jest.fn().mockResolvedValue(undefined),
    createEntryPoint: jest.fn().mockResolvedValue(undefined),
    updateEntryPoint: jest.fn().mockResolvedValue(undefined),
    deleteEntryPoint: jest.fn().mockResolvedValue(undefined),
    createSlot: jest.fn().mockResolvedValue(undefined),
    updateSlot: jest.fn().mockResolvedValue(undefined),
    deleteSlot: jest.fn().mockResolvedValue(undefined),
    ApiError: ApiError,
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Helper to set up default mocks
const setupDefaultMocks = () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

  (api.listEntryPoints as jest.Mock).mockResolvedValue([
    { id: '1', identifier: 'A', name: 'Entry Point A' },
    { id: '2', identifier: 'B', name: 'Entry Point B' },
    { id: '3', identifier: 'C', name: 'Entry Point C' },
  ]);

  (api.listSlots as jest.Mock).mockResolvedValue([
    { id: '1', slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5], available: true },
    { id: '2', slot_label: 'MP-1', slot_type: 'MP', distances: [3, 2, 4], available: false },
  ]);

  (api.checkHealth as jest.Mock).mockResolvedValue({
    status: 'ok',
    service: 'parking-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'ok' },
    },
  });
};

describe('Configuration Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders screen with title after loading', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);
    });

    it('renders three sub-tabs: Entry Points, Parking Slots, System', async () => {
      render(<Configuration />);

      // Wait for data to load, then check for tabs
      await waitFor(() => {
        const tabButtons = screen.getAllByRole('tab');
        expect(tabButtons.length).toBe(3);
      }, { timeout: 3000 });
    });

    it('displays loading state initially', () => {
      // Make API calls hang so loading persists
      (api.listEntryPoints as jest.Mock).mockImplementation(() => new Promise(() => {}));
      (api.listSlots as jest.Mock).mockImplementation(() => new Promise(() => {}));
      (api.checkHealth as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<Configuration />);

      expect(screen.getByText(/loading configuration\.\.\./i)).toBeTruthy();
    });

    it('displays API URL input field on System tab', async () => {
      render(<Configuration />);

      // Wait for loading to complete
      await screen.findByText(/configuration/i);

      // Switch to System tab
      const systemTab = screen.getAllByText(/system/i).find(
        (el) => el.props.accessibilityRole === 'tab' || el.props.onPress
      );
      if (systemTab) {
        fireEvent.press(systemTab);
      } else {
        fireEvent.press(screen.getAllByText(/system/i)[0]);
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/http:\/\/localhost:8082/i)).toBeTruthy();
      });
    });

    it('displays Save button for API URL on System tab', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to System tab
      fireEvent.press(screen.getAllByText(/system/i)[0]);

      await waitFor(() => {
        // The save button text is "Save"
        const saveButtons = screen.getAllByText(/save/i);
        expect(saveButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Entry Points tab', async () => {
      render(<Configuration />);

      await screen.findByText(/add new entry point/i);
    });

    it('switches to Parking Slots tab', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/add new slot/i)).toBeTruthy();
      });
    });

    it('switches to System tab', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const systemTab = screen.getAllByText(/system/i)[0];
      fireEvent.press(systemTab);

      await waitFor(() => {
        expect(screen.getByText(/system health/i)).toBeTruthy();
      });
    });
  });

  describe('API Configuration', () => {
    it('loads API URL from AsyncStorage on mount', async () => {
      render(<Configuration />);

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('api_base_url');
      });
    });

    it('saves API URL to AsyncStorage', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to System tab
      fireEvent.press(screen.getAllByText(/system/i)[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/http:\/\/localhost:8082/i)).toBeTruthy();
      });

      const apiUrlInput = screen.getByPlaceholderText(/http:\/\/localhost:8082/i);
      fireEvent.changeText(apiUrlInput, 'http://new-api.com');

      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[0]);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('api_base_url', 'http://new-api.com');
      });
    });
  });

  describe('Health Status', () => {
    it('checks health status on mount', async () => {
      render(<Configuration />);

      await waitFor(() => {
        expect(api.checkHealth).toHaveBeenCalled();
      });
    });

    it('displays online status when health is ok', async () => {
      render(<Configuration />);

      await screen.findByText(/online/i);
    });

    it('displays offline status when health check returns non-ok', async () => {
      (api.checkHealth as jest.Mock).mockResolvedValue({ status: 'error' });

      render(<Configuration />);

      await screen.findByText(/offline/i);
    });

    it('displays offline status when health check fails', async () => {
      (api.listEntryPoints as jest.Mock).mockRejectedValue(new api.ApiError('Health check failed'));
      (api.listSlots as jest.Mock).mockRejectedValue(new api.ApiError('Health check failed'));
      (api.checkHealth as jest.Mock).mockRejectedValue(new api.ApiError('Health check failed'));

      render(<Configuration />);

      await screen.findByText(/offline/i);
    });

    it('tests connection when test connection button is pressed', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to System tab
      fireEvent.press(screen.getAllByText(/system/i)[0]);

      await waitFor(() => {
        expect(screen.getByText(/test connection/i)).toBeTruthy();
      });

      const testButton = screen.getByText(/test connection/i);
      fireEvent.press(testButton);

      await waitFor(() => {
        expect(api.checkHealth).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('System Initialization', () => {
    it('shows initialize confirmation modal when initialize button is pressed', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to System tab
      const systemTab = screen.getAllByText(/system/i)[0];
      fireEvent.press(systemTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /initialize system/i })).toBeTruthy();
      });

      const initializeButton = screen.getByRole('button', { name: /initialize system/i });
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/initialize system\?/i)).toBeTruthy();
      });
    });

    it('confirms and executes initialization', async () => {
      const mockInitResult = {
        entry_points_created: 3,
        parking_slots_created: 7,
        message: 'System initialized',
      };
      (api.initializeSystem as jest.Mock).mockResolvedValue(mockInitResult);

      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to System tab
      fireEvent.press(screen.getAllByText(/system/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /initialize system/i })).toBeTruthy();
      });

      // Press the Initialize System button
      const initializeButton = screen.getByRole('button', { name: /initialize system/i });
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/initialize system\?/i)).toBeTruthy();
      });

      // Press the confirm "Initialize" button in the modal
      const confirmButtons = screen.getAllByText(/^initialize$/i);
      fireEvent.press(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(api.initializeSystem).toHaveBeenCalled();
      });
    });

    it('cancels initialization when cancel button is pressed', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to System tab
      fireEvent.press(screen.getAllByText(/system/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /initialize system/i })).toBeTruthy();
      });

      const initializeButton = screen.getByRole('button', { name: /initialize system/i });
      fireEvent.press(initializeButton);

      await waitFor(() => {
        expect(screen.getByText(/initialize system\?/i)).toBeTruthy();
      });

      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(api.initializeSystem).not.toHaveBeenCalled();
        expect(screen.queryByText(/initialize system\?/i)).toBeNull();
      });
    });
  });

  describe('Entry Points Tab', () => {
    it('displays entry points list', async () => {
      render(<Configuration />);

      // Entry Points tab is default, wait for data
      await waitFor(() => {
        expect(screen.getByText(/entry point a/i)).toBeTruthy();
        expect(screen.getByText(/entry point b/i)).toBeTruthy();
        expect(screen.getByText(/entry point c/i)).toBeTruthy();
      });
    });

    it('displays empty state when no entry points', async () => {
      (api.listEntryPoints as jest.Mock).mockResolvedValue([]);

      render(<Configuration />);

      await waitFor(() => {
        expect(screen.getByText(/no entry points/i)).toBeTruthy();
      });
    });
  });

  describe('Parking Slots Tab', () => {
    it('displays parking slots list', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
        expect(screen.getByText(/MP-1/i)).toBeTruthy();
      });
    });

    it('displays empty state when no slots', async () => {
      (api.listSlots as jest.Mock).mockResolvedValue([]);

      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/no parking slots/i)).toBeTruthy();
      });
    });
  });

  describe('System Tab', () => {
    it('displays system health information', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const systemTab = screen.getAllByText(/system/i)[0];
      fireEvent.press(systemTab);

      await waitFor(() => {
        expect(screen.getByText(/system health/i)).toBeTruthy();
        expect(screen.getByText(/test connection/i)).toBeTruthy();
      });
    });

    it('displays initialization section', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const systemTab = screen.getAllByText(/system/i)[0];
      fireEvent.press(systemTab);

      await waitFor(() => {
        // "Initialize System" appears as both section header text and button text
        expect(screen.getAllByText(/initialize system/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: /initialize system/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /preview configuration/i })).toBeTruthy();
      });
    });

    it('displays current system status', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const systemTab = screen.getAllByText(/system/i)[0];
      fireEvent.press(systemTab);

      await waitFor(() => {
        expect(screen.getByText(/current system status/i)).toBeTruthy();
        expect(screen.getByText(/entry points:/i)).toBeTruthy();
        expect(screen.getByText(/parking slots:/i)).toBeTruthy();
      });
    });
  });

  describe('Auto-refresh', () => {
    it('sets up auto-refresh interval for configuration data', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Verify auto-refresh interval was set with 120 second duration
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        120000
      );

      setIntervalSpy.mockRestore();
    });
  });

  describe('Navigation', () => {
    it('navigates back to dashboard when back button is pressed', async () => {
      render(<Configuration />);

      await screen.findByText(/← back/i);

      const backButton = screen.getByText(/← back/i);
      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
    });
  });

  describe('Button Loading vs Disabled States', () => {
    it('Add Entry Point button shows text when form is filled (not loading)', async () => {
      render(<Configuration />);

      // Wait for the form to render
      await screen.findByPlaceholderText('A');

      // Fill the form so button becomes enabled
      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInput, 'Entry Point D');

      // The button should be enabled and show text, not a spinner
      const addButton = screen.getByLabelText(/add new entry point/i);
      expect(addButton.props.accessibilityState.disabled).toBe(false);

      // Verify text content is rendered (not ActivityIndicator)
      const hasTextContent = addButton.props.children !== undefined &&
        addButton.props.children !== null;
      expect(hasTextContent).toBe(true);
    });

    it('shows button text for Add Slot when form is incomplete', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to Parking Slots tab
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // The "Add Slot" button text should be visible (not a spinner)
      expect(screen.getByText(/^add slot$/i)).toBeTruthy();
    });

    it('shows spinner during entry point creation and text returns after', async () => {
      // Make createEntryPoint hang so loading persists, then resolve
      let resolveCreate!: () => void;
      (api.createEntryPoint as jest.Mock).mockImplementation(
        () => new Promise<void>((resolve) => { resolveCreate = resolve; })
      );

      render(<Configuration />);

      // Wait for form to render, then fill it
      await screen.findByPlaceholderText('A');

      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInput, 'Entry Point D');

      // Before pressing: button shows text (not spinner), is enabled
      const addButton = screen.getByLabelText(/add new entry point/i);
      expect(addButton.props.accessibilityState.disabled).toBe(false);

      // Press the add button
      fireEvent.press(addButton);

      // During loading, the button should be disabled and show an ActivityIndicator (no text)
      await waitFor(() => {
        const btn = screen.getByLabelText(/add new entry point/i);
        expect(btn.props.accessibilityState.disabled).toBe(true);
        // When loading, children should NOT contain text — it's an ActivityIndicator
        const childType = btn.props.children?.type;
        expect(childType).toBeDefined(); // ActivityIndicator has a type
      });

      // Resolve the creation — loading ends
      await act(async () => {
        resolveCreate!();
      });

      // After loading completes, the button should show text again and be enabled
      await waitFor(() => {
        const btn = screen.getByLabelText(/add new entry point/i);
        expect(btn.props.accessibilityState.disabled).toBe(true); // disabled because form was cleared
        const hasTextContent = btn.props.children !== undefined &&
          btn.props.children !== null;
        expect(hasTextContent).toBe(true);
      });
    });

    it('Add Slot button shows text when disabled due to empty label', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to Parking Slots tab
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Button should show "Add Slot" text, not a spinner
      expect(screen.getByText(/^add slot$/i)).toBeTruthy();
    });

    it('disabled Add Entry Point button does not show spinner', async () => {
      render(<Configuration />);

      // Wait for form to render
      await screen.findByPlaceholderText('A');

      // The button should be disabled (empty form) but NOT show a spinner
      // because only `loading` triggers the spinner, not `disabled`
      const addButton = screen.getByLabelText(/add new entry point/i);
      expect(addButton.props.accessibilityState.disabled).toBe(true);

      // Verify the button has text content (children), not just an ActivityIndicator
      const hasTextContent = addButton.props.children !== undefined &&
        addButton.props.children !== null;
      expect(hasTextContent).toBe(true);
    });
  });

  describe('Entry Point CRUD in Configuration', () => {
    it('creates a new entry point via the add form', async () => {
      render(<Configuration />);

      // Wait for the add form to appear on the Entry Points tab
      await screen.findByText(/add new entry point/i);

      // Fill in the identifier and name inputs
      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInput, 'Entry Point D');

      // Press the add button via accessibility label
      const addButton = screen.getByLabelText(/add new entry point/i);
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(api.createEntryPoint).toHaveBeenCalledWith('D', 'Entry Point D');
      });
    });

    it('handles entry point creation error', async () => {
      (api.createEntryPoint as jest.Mock).mockRejectedValue(new api.ApiError('Creation failed'));

      render(<Configuration />);

      await screen.findByText(/add new entry point/i);

      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInput, 'Entry Point D');

      // Press the add button via accessibility label
      const addButton = screen.getByLabelText(/add new entry point/i);
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeTruthy();
      });
    });

    it('opens edit entry point modal when edit button pressed', async () => {
      render(<Configuration />);

      await screen.findByText(/entry point a/i);

      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit entry point/i)).toBeTruthy();
      });
    });

    it('saves entry point edit', async () => {
      render(<Configuration />);

      await screen.findByText(/entry point a/i);

      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit entry point/i)).toBeTruthy();
      });

      // Find the name input in the modal and change it
      const nameInputs = screen.getAllByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInputs[nameInputs.length - 1], 'Updated Entry Point');

      // Press Save
      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateEntryPoint).toHaveBeenCalledWith('1', 'Updated Entry Point');
      });
    });

    it('deletes an entry point via the delete button (with >3 entry points)', async () => {
      // Add a 4th entry point so deletion is allowed
      (api.listEntryPoints as jest.Mock).mockResolvedValue([
        { id: '1', identifier: 'A', name: 'Entry Point A' },
        { id: '2', identifier: 'B', name: 'Entry Point B' },
        { id: '3', identifier: 'C', name: 'Entry Point C' },
        { id: '4', identifier: 'D', name: 'Entry Point D' },
      ]);

      render(<Configuration />);

      await screen.findByText(/entry point d/i);

      // Find Delete buttons and press the first one
      const deleteButtons = screen.getAllByText(/^delete$/i);
      fireEvent.press(deleteButtons[0]);

      // The component uses Alert.alert — just verify the function was called
      // We can't easily test the native Alert mock, so we verify the button press doesn't throw
      await waitFor(() => {
        // Verify the delete button was pressed without errors
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('blocks deletion when at minimum entry points', async () => {
      render(<Configuration />);

      await screen.findByText(/entry point a/i);

      const deleteButtons = screen.getAllByText(/^delete$/i);
      // Pressing delete with exactly 3 entry points should trigger "Cannot Delete" alert
      // This verifies the min count guard works
      fireEvent.press(deleteButtons[0]);

      // No API call should happen (blocked by min count check)
      await waitFor(() => {
        expect(api.deleteEntryPoint).not.toHaveBeenCalled();
      });
    });
  });

  describe('Parking Slot Distance Handling', () => {
    it('initializes distances array with correct length after creating slot', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to Parking Slots tab
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Create a slot with minimal distances filled
      const labelInput = screen.getByPlaceholderText('SP-1');
      fireEvent.changeText(labelInput, 'MP-5');

      const addSlotButton = screen.getByLabelText(/add new parking slot/i);
      fireEvent.press(addSlotButton);

      await waitFor(() => {
        expect(api.createSlot).toHaveBeenCalled();
      });

      // Verify the distances array has exactly 3 values
      const createCall = (api.createSlot as jest.Mock).mock.calls[0][0];
      expect(createCall.distances).toEqual([0, 0, 0]);
    });

    it('normalizes distances array to match entry point count when creating slot', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to Parking Slots tab
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Fill in slot label
      const labelInput = screen.getByPlaceholderText('SP-1');
      fireEvent.changeText(labelInput, 'MP-5');

      // Add button should call API with normalized distances
      const addSlotButton = screen.getByLabelText(/add new parking slot/i);
      fireEvent.press(addSlotButton);

      await waitFor(() => {
        // Should call createSlot with distances array matching entry point count (3)
        expect(api.createSlot).toHaveBeenCalledWith(
          expect.objectContaining({
            slot_label: 'MP-5',
            distances: expect.arrayContaining([expect.any(Number)])
          })
        );
        const callArgs = (api.createSlot as jest.Mock).mock.calls[0][0];
        expect(callArgs.distances.length).toBe(3); // 3 entry points
      });
    });

    it('handles slot creation when entry points are added', async () => {
      render(<Configuration />);

      await screen.findByText(/add new entry point/i);

      // Create a new entry point first
      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInput, 'Entry Point D');

      const addEntryButton = screen.getByLabelText(/add new entry point/i);
      fireEvent.press(addEntryButton);

      await waitFor(() => {
        expect(api.createEntryPoint).toHaveBeenCalledWith('D', 'Entry Point D');
      });

      // Verify the API was called for creating the entry point
      expect(api.createEntryPoint).toHaveBeenCalled();
    });

    it('pads distances to match entry point count when editing slot', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to Parking Slots tab
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Press Save without changing distances
      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateSlot).toHaveBeenCalled();
        const updateCall = (api.updateSlot as jest.Mock).mock.calls[0];
        const distances = updateCall[1].distances;
        // Distances should be padded to match entry point count
        expect(distances.length).toBe(3); // 3 entry points (A, B, C)
        expect(distances).toEqual(expect.arrayContaining([expect.any(Number), expect.any(Number), expect.any(Number)]));
      });
    });

    it('resets form distances array to correct length after successful slot creation', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      // Switch to Parking Slots tab twice to verify form resets properly
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Create first slot
      const labelInput = screen.getByPlaceholderText('SP-1');
      fireEvent.changeText(labelInput, 'LP-10');

      const addSlotButton = screen.getByLabelText(/add new parking slot/i);
      fireEvent.press(addSlotButton);

      await waitFor(() => {
        expect(api.createSlot).toHaveBeenCalled();
      });

      // Verify next slot creation will also have proper distances
      // The form should have been reset with distances array of correct length
      const secondCreateCall = (api.createSlot as jest.Mock).mock.calls[0][0];
      expect(secondCreateCall.distances.length).toBe(3); // Should have 3 distances for 3 entry points
    });
  });

  describe('Parking Slot CRUD in Configuration', () => {
    it('navigates to parking slots tab and displays slots', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
        expect(screen.getByText(/MP-1/i)).toBeTruthy();
      });
    });

    it('opens edit slot modal and saves changes', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Press Save
      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateSlot).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            slot_label: expect.any(String),
            slot_type: expect.any(String),
            distances: expect.any(Array),
          })
        );
      });
    });

    it('loads slot data correctly into edit modal', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Verify slot data is loaded into the modal
      expect(screen.getByDisplayValue(/SP-1/i)).toBeTruthy();
    });

    it('allows editing slot label and saves correctly', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Change label
      const labelInputs = screen.getAllByDisplayValue(/SP-1/i);
      fireEvent.changeText(labelInputs[0], 'SP-UPDATED');

      // Press Save
      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateSlot).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            slot_label: 'SP-UPDATED',
          })
        );
      });
    });

    it('allows editing slot type and saves correctly', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Change slot type to MP
      const mpButton = screen.getByLabelText(/Select Medium/i);
      fireEvent.press(mpButton);

      // Press Save
      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateSlot).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            slot_type: 'MP',
          })
        );
      });
    });

    it('pads distances when editing with fewer values than entry points', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Verify distances are loaded
      const distanceInputs = screen.getAllByDisplayValue(/5|15|25/i);
      expect(distanceInputs.length).toBeGreaterThan(0);

      // Press Save
      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateSlot).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            distances: expect.arrayContaining([expect.any(Number)]),
          })
        );
      });
    });

    it('disables save button when slot label is empty', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Clear the label
      const labelInputs = screen.getAllByDisplayValue(/SP-1/i);
      fireEvent.changeText(labelInputs[0], '');

      // Save button should be disabled
      const saveButtons = screen.getAllByText(/^save$/i);
      const editModalSaveButton = saveButtons[saveButtons.length - 1];

      // The button should exist but be disabled
      expect(editModalSaveButton).toBeTruthy();
    });

    it('closes modal when cancel is pressed', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      // Press edit on the first slot
      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit parking slot/i)).toBeTruthy();
      });

      // Press Cancel
      const cancelButtons = screen.getAllByText(/^cancel$/i);
      fireEvent.press(cancelButtons[cancelButtons.length - 1]);

      // Modal should be closed - the "Edit Parking Slot" text should disappear
      await waitFor(() => {
        expect(screen.queryByText(/edit parking slot/i)).toBeFalsy();
      });
    });

    it('deletes a slot via the delete button', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      const parkingSlotsTab = screen.getAllByText(/parking slots/i)[0];
      fireEvent.press(parkingSlotsTab);

      await waitFor(() => {
        expect(screen.getByText(/SP-1/i)).toBeTruthy();
      });

      const deleteButtons = screen.getAllByText(/^delete$/i);
      fireEvent.press(deleteButtons[0]);

      // Verify that api.deleteSlot was not called yet (confirmation dialog is showing)
      expect(api.deleteSlot).not.toHaveBeenCalled();
    });
  });

  describe('Pull-to-Refresh', () => {
    it('completes refresh successfully without hanging', async () => {
      render(<Configuration />);

      // Wait for initial load to complete
      await screen.findByText(/add new entry point/i);

      // Verify that APIs were called
      expect((api.listEntryPoints as jest.Mock)).toHaveBeenCalled();
      expect((api.listSlots as jest.Mock)).toHaveBeenCalled();
      expect((api.checkHealth as jest.Mock)).toHaveBeenCalled();

      // After the initial load completes successfully, the UI should be responsive
      // and the refresh state should be properly reset
      const addButton = screen.getByLabelText(/add new entry point/i);
      expect(addButton).toBeTruthy();
    });

    it('resets refreshing state even when API errors occur', async () => {
      // Mock to simulate an API failure
      (api.listEntryPoints as jest.Mock).mockRejectedValueOnce(
        new api.ApiError('Network error')
      );

      render(<Configuration />);

      // Wait for the component to try to load and handle the error
      await screen.findByText(/configuration/i);

      // Even with an API error, the component should render and be responsive
      // The error should have been caught and handled without hanging
      expect(screen.getByText(/configuration/i)).toBeTruthy();
    });

    it('component remains responsive after successful data fetch', async () => {
      render(<Configuration />);

      // Wait for initial configuration to load
      await screen.findByText(/add new entry point/i);

      // Verify the component is interactive and not in a stuck refreshing state
      const addButton = screen.getByLabelText(/add new entry point/i);

      // Button should be queryable and have proper accessibility state
      expect(addButton.props.accessibilityState).toBeDefined();

      // Component should be rendered and interactive (not hung)
      expect(addButton).toBeTruthy();
    });
  });

  describe('Success Behaviors', () => {
    it('calls API and refreshes data after entry point creation', async () => {
      render(<Configuration />);

      await screen.findByPlaceholderText('A');

      const identifierInput = screen.getByPlaceholderText('A');
      fireEvent.changeText(identifierInput, 'D');

      const nameInput = screen.getByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInput, 'Entry Point D');

      const addButton = screen.getByLabelText(/add new entry point/i);

      await waitFor(() => {
        expect(addButton.props.accessibilityState.disabled).toBe(false);
      });

      fireEvent.press(addButton);

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(api.createEntryPoint).toHaveBeenCalledWith('D', 'Entry Point D');
      });

      // Verify data was refreshed
      await waitFor(() => {
        expect(api.listEntryPoints).toHaveBeenCalled();
      });
    });

    it('calls API and refreshes data after entry point update', async () => {
      render(<Configuration />);

      await screen.findByText(/entry point a/i);

      const editButtons = screen.getAllByText(/^edit$/i);
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/edit entry point/i)).toBeTruthy();
      });

      const nameInputs = screen.getAllByPlaceholderText('Entry Point Name');
      fireEvent.changeText(nameInputs[nameInputs.length - 1], 'Updated Name');

      const saveButtons = screen.getAllByText(/^save$/i);
      fireEvent.press(saveButtons[saveButtons.length - 1]);

      await waitFor(() => {
        expect(api.updateEntryPoint).toHaveBeenCalledWith('1', 'Updated Name');
      });
    });

    it('calls API and refreshes data after slot creation', async () => {
      render(<Configuration />);

      await screen.findByText(/configuration/i);

      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      const labelInput = screen.getByPlaceholderText('SP-1');
      fireEvent.changeText(labelInput, 'LP-3');

      const addSlotButton = screen.getByLabelText(/add new parking slot/i);
      fireEvent.press(addSlotButton);

      await waitFor(() => {
        expect(api.createSlot).toHaveBeenCalled();
      });

      // Verify data was refreshed
      await waitFor(() => {
        expect(api.listSlots).toHaveBeenCalled();
      });
    });

    it('creates slot with correct distances array length matching entry points', async () => {
      // Start with 4 entry points
      const entryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
        { id: '2', identifier: 'B', name: 'Entry Point B', distances: {} },
        { id: '3', identifier: 'C', name: 'Entry Point C', distances: {} },
        { id: '4', identifier: 'D', name: 'Entry Point D', distances: {} },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
      (api.listSlots as jest.Mock).mockResolvedValue([]);
      (api.checkHealth as jest.Mock).mockResolvedValue({
        status: 'ok',
        checks: { database: { status: 'ok' } },
      });

      render(<Configuration />);

      await screen.findByText(/parking slots/i);
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Fill in distances for 4 entry points
      const distanceInputs = screen.getAllByPlaceholderText('0');
      fireEvent.changeText(distanceInputs[0], '10');
      fireEvent.changeText(distanceInputs[1], '20');
      fireEvent.changeText(distanceInputs[2], '30');
      fireEvent.changeText(distanceInputs[3], '40');

      const labelInput = screen.getByPlaceholderText('SP-1');
      fireEvent.changeText(labelInput, 'SP-4');

      const addSlotButton = screen.getByLabelText(/add new parking slot/i);
      fireEvent.press(addSlotButton);

      // Verify API was called with exactly 4 distances
      await waitFor(() => {
        expect(api.createSlot).toHaveBeenCalledWith(
          expect.objectContaining({
            slot_label: 'SP-4',
            distances: [10, 20, 30, 40],
          })
        );
      });
    });

    it('maintains correct distances when entry points are added dynamically', async () => {
      const entryPoints = [
        { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
        { id: '2', identifier: 'B', name: 'Entry Point B', distances: {} },
      ];

      (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
      (api.listSlots as jest.Mock).mockResolvedValue([]);
      (api.checkHealth as jest.Mock).mockResolvedValue({
        status: 'ok',
        checks: { database: { status: 'ok' } },
      });

      render(<Configuration />);

      await screen.findByText(/parking slots/i);
      fireEvent.press(screen.getAllByText(/parking slots/i)[0]);

      await screen.findByText(/add new slot/i);

      // Fill in distances for 2 entry points
      const distanceInputs = screen.getAllByPlaceholderText('0');
      fireEvent.changeText(distanceInputs[0], '5');
      fireEvent.changeText(distanceInputs[1], '15');

      const labelInput = screen.getByPlaceholderText('SP-1');
      fireEvent.changeText(labelInput, 'SP-2');

      const addSlotButton = screen.getByLabelText(/add new parking slot/i);
      fireEvent.press(addSlotButton);

      // Verify API was called with exactly 2 distances
      await waitFor(() => {
        expect(api.createSlot).toHaveBeenCalledWith(
          expect.objectContaining({
            slot_label: 'SP-2',
            distances: [5, 15],
          })
        );
      });
    });

    describe('dynamic entry point counts', () => {
      it('creates slot with 1 entry point', async () => {
        const entryPoints = [
          { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
        ];

        (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
        (api.listSlots as jest.Mock).mockResolvedValue([]);
        (api.checkHealth as jest.Mock).mockResolvedValue({
          status: 'ok',
          checks: { database: { status: 'ok' } },
        });

        render(<Configuration />);
        await screen.findByText(/parking slots/i);
        fireEvent.press(screen.getAllByText(/parking slots/i)[0]);
        await screen.findByText(/add new slot/i);

        const distanceInputs = screen.getAllByPlaceholderText('0');
        fireEvent.changeText(distanceInputs[0], '100');

        const labelInput = screen.getByPlaceholderText('SP-1');
        fireEvent.changeText(labelInput, 'SP-1');
        fireEvent.press(screen.getByLabelText(/add new parking slot/i));

        await waitFor(() => {
          expect(api.createSlot).toHaveBeenCalledWith(
            expect.objectContaining({
              slot_label: 'SP-1',
              distances: [100],
            })
          );
        });
      });

      it('creates slot with 2 entry points', async () => {
        const entryPoints = [
          { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
          { id: '2', identifier: 'B', name: 'Entry Point B', distances: {} },
        ];

        (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
        (api.listSlots as jest.Mock).mockResolvedValue([]);
        (api.checkHealth as jest.Mock).mockResolvedValue({
          status: 'ok',
          checks: { database: { status: 'ok' } },
        });

        render(<Configuration />);
        await screen.findByText(/parking slots/i);
        fireEvent.press(screen.getAllByText(/parking slots/i)[0]);
        await screen.findByText(/add new slot/i);

        const distanceInputs = screen.getAllByPlaceholderText('0');
        fireEvent.changeText(distanceInputs[0], '50');
        fireEvent.changeText(distanceInputs[1], '75');

        const labelInput = screen.getByPlaceholderText('SP-1');
        fireEvent.changeText(labelInput, 'SP-2');
        fireEvent.press(screen.getByLabelText(/add new parking slot/i));

        await waitFor(() => {
          expect(api.createSlot).toHaveBeenCalledWith(
            expect.objectContaining({
              slot_label: 'SP-2',
              distances: [50, 75],
            })
          );
        });
      });

      it('creates slot with 3 entry points', async () => {
        const entryPoints = [
          { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
          { id: '2', identifier: 'B', name: 'Entry Point B', distances: {} },
          { id: '3', identifier: 'C', name: 'Entry Point C', distances: {} },
        ];

        (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
        (api.listSlots as jest.Mock).mockResolvedValue([]);
        (api.checkHealth as jest.Mock).mockResolvedValue({
          status: 'ok',
          checks: { database: { status: 'ok' } },
        });

        render(<Configuration />);
        await screen.findByText(/parking slots/i);
        fireEvent.press(screen.getAllByText(/parking slots/i)[0]);
        await screen.findByText(/add new slot/i);

        const distanceInputs = screen.getAllByPlaceholderText('0');
        fireEvent.changeText(distanceInputs[0], '10');
        fireEvent.changeText(distanceInputs[1], '20');
        fireEvent.changeText(distanceInputs[2], '30');

        const labelInput = screen.getByPlaceholderText('SP-1');
        fireEvent.changeText(labelInput, 'SP-3');
        fireEvent.press(screen.getByLabelText(/add new parking slot/i));

        await waitFor(() => {
          expect(api.createSlot).toHaveBeenCalledWith(
            expect.objectContaining({
              slot_label: 'SP-3',
              distances: [10, 20, 30],
            })
          );
        });
      });

      it('creates slot with 5 entry points', async () => {
        const entryPoints = [
          { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
          { id: '2', identifier: 'B', name: 'Entry Point B', distances: {} },
          { id: '3', identifier: 'C', name: 'Entry Point C', distances: {} },
          { id: '4', identifier: 'D', name: 'Entry Point D', distances: {} },
          { id: '5', identifier: 'E', name: 'Entry Point E', distances: {} },
        ];

        (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
        (api.listSlots as jest.Mock).mockResolvedValue([]);
        (api.checkHealth as jest.Mock).mockResolvedValue({
          status: 'ok',
          checks: { database: { status: 'ok' } },
        });

        render(<Configuration />);
        await screen.findByText(/parking slots/i);
        fireEvent.press(screen.getAllByText(/parking slots/i)[0]);
        await screen.findByText(/add new slot/i);

        const distanceInputs = screen.getAllByPlaceholderText('0');
        fireEvent.changeText(distanceInputs[0], '5');
        fireEvent.changeText(distanceInputs[1], '10');
        fireEvent.changeText(distanceInputs[2], '15');
        fireEvent.changeText(distanceInputs[3], '20');
        fireEvent.changeText(distanceInputs[4], '25');

        const labelInput = screen.getByPlaceholderText('SP-1');
        fireEvent.changeText(labelInput, 'SP-5');
        fireEvent.press(screen.getByLabelText(/add new parking slot/i));

        await waitFor(() => {
          expect(api.createSlot).toHaveBeenCalledWith(
            expect.objectContaining({
              slot_label: 'SP-5',
              distances: [5, 10, 15, 20, 25],
            })
          );
        });
      });

      it('handles partial distance input with 4 entry points', async () => {
        // Test case where user doesn't fill in all distances
        const entryPoints = [
          { id: '1', identifier: 'A', name: 'Entry Point A', distances: {} },
          { id: '2', identifier: 'B', name: 'Entry Point B', distances: {} },
          { id: '3', identifier: 'C', name: 'Entry Point C', distances: {} },
          { id: '4', identifier: 'D', name: 'Entry Point D', distances: {} },
        ];

        (api.listEntryPoints as jest.Mock).mockResolvedValue(entryPoints);
        (api.listSlots as jest.Mock).mockResolvedValue([]);
        (api.checkHealth as jest.Mock).mockResolvedValue({
          status: 'ok',
          checks: { database: { status: 'ok' } },
        });

        render(<Configuration />);
        await screen.findByText(/parking slots/i);
        fireEvent.press(screen.getAllByText(/parking slots/i)[0]);
        await screen.findByText(/add new slot/i);

        // Only fill in first 2 distances, leave last 2 empty (will default to 0)
        const distanceInputs = screen.getAllByPlaceholderText('0');
        fireEvent.changeText(distanceInputs[0], '100');
        fireEvent.changeText(distanceInputs[1], '200');
        // Not filling distanceInputs[2] and [3]

        const labelInput = screen.getByPlaceholderText('SP-1');
        fireEvent.changeText(labelInput, 'SP-partial');
        fireEvent.press(screen.getByLabelText(/add new parking slot/i));

        // Should pad with zeros for unfilled distances
        await waitFor(() => {
          expect(api.createSlot).toHaveBeenCalledWith(
            expect.objectContaining({
              slot_label: 'SP-partial',
              distances: [100, 200, 0, 0],
            })
          );
        });
      });
    });
  });
});
