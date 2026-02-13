/**
 * Parking Context
 * 
 * Global state management for the OO Parking Lot System using Context + useReducer pattern.
 * Provides centralized state and actions for parking slots, entry points, sessions, and system health.
 * Adapted for React Native with AsyncStorage persistence.
 * 
 * @module ParkingContext
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as parkingApi from '../api/parkingApi';
import type {
  ParkingSlot,
  EntryPoint,
  ParkingSession,
  VehicleType,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parking state structure
 */
interface ParkingState {
  // Data
  slots: ParkingSlot[];
  entryPoints: EntryPoint[];
  activeSessions: ParkingSession[];
  allSessions: ParkingSession[];
  
  // System status
  systemHealth: 'online' | 'offline' | 'checking';
  isInitialized: boolean;
  
  // Configuration
  apiBaseUrl: string;
  testMode: boolean;
  
  // Loading states
  loading: {
    slots: boolean;
    entryPoints: boolean;
    sessions: boolean;
    health: boolean;
  };
  
  // Error states
  errors: {
    slots: string | null;
    entryPoints: string | null;
    sessions: string | null;
    health: string | null;
  };
}

/**
 * Parking action types
 */
type ParkingAction =
  | { type: 'SET_SLOTS'; payload: ParkingSlot[] }
  | { type: 'SET_ENTRY_POINTS'; payload: EntryPoint[] }
  | { type: 'SET_ACTIVE_SESSIONS'; payload: ParkingSession[] }
  | { type: 'SET_ALL_SESSIONS'; payload: ParkingSession[] }
  | { type: 'SET_SYSTEM_HEALTH'; payload: 'online' | 'offline' | 'checking' }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_API_BASE_URL'; payload: string }
  | { type: 'SET_TEST_MODE'; payload: boolean }
  | { type: 'SET_LOADING'; payload: { key: keyof ParkingState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof ParkingState['errors']; value: string | null } }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'REFRESH_ALL' }
  | { type: 'RESET_STATE' };

/**
 * Parking context value interface
 */
interface ParkingContextValue {
  // State
  state: ParkingState;
  
  // Data fetching
  fetchSlots: () => Promise<void>;
  fetchEntryPoints: () => Promise<void>;
  fetchActiveSessions: () => Promise<void>;
  fetchAllSessions: (page?: number, perPage?: number) => Promise<void>;
  checkHealth: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Configuration
  loadConfiguration: () => Promise<void>;
  saveConfiguration: () => Promise<void>;
  clearConfiguration: () => Promise<void>;
  
  // Helper functions
  getAvailableSlots: (vehicleType: VehicleType) => ParkingSlot[];
  getAvailableSlotsForEntryPoint: (vehicleType: VehicleType, entryPointId: string) => ParkingSlot[];
  getSlotById: (slotId: string) => ParkingSlot | undefined;
  getEntryPointById: (entryPointId: string) => EntryPoint | undefined;
  getSessionById: (sessionId: string) => ParkingSession | undefined;
  getActiveSessionsCount: () => number;
  getAvailableSlotsCount: () => number;
  getTotalSlotsCount: () => number;
  getRevenueToday: () => number;
  
  // Dispatch
  dispatch: React.Dispatch<ParkingAction>;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

/**
 * Initial parking state
 */
const initialState: ParkingState = {
  slots: [],
  entryPoints: [],
  activeSessions: [],
  allSessions: [],
  systemHealth: 'checking',
  isInitialized: false,
  apiBaseUrl: 'http://localhost:8082',
  testMode: false,
  loading: {
    slots: false,
    entryPoints: false,
    sessions: false,
    health: false,
  },
  errors: {
    slots: null,
    entryPoints: null,
    sessions: null,
    health: null,
  },
};

// ============================================================================
// REDUCER
// ============================================================================

/**
 * Parking state reducer
 * Handles all action types and updates state accordingly
 * 
 * @param state - Current state
 * @param action - Action to process
 * @returns New state
 */
function parkingReducer(state: ParkingState, action: ParkingAction): ParkingState {
  switch (action.type) {
    case 'SET_SLOTS':
      return { ...state, slots: action.payload };
    
    case 'SET_ENTRY_POINTS':
      return { ...state, entryPoints: action.payload };
    
    case 'SET_ACTIVE_SESSIONS':
      return { ...state, activeSessions: action.payload };
    
    case 'SET_ALL_SESSIONS':
      return { ...state, allSessions: action.payload };
    
    case 'SET_SYSTEM_HEALTH':
      return { ...state, systemHealth: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'SET_API_BASE_URL':
      return { ...state, apiBaseUrl: action.payload };
    
    case 'SET_TEST_MODE':
      return { ...state, testMode: action.payload };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.value,
        },
      };
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {
          slots: null,
          entryPoints: null,
          sessions: null,
          health: null,
        },
      };
    
    case 'REFRESH_ALL':
      return { ...state };
    
    case 'RESET_STATE':
      return { ...initialState };
    
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * Parking context
 */
const ParkingContext = createContext<ParkingContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

/**
 * Parking Provider component props
 */
interface ParkingProviderProps {
  children: ReactNode;
}

/**
 * Parking Provider component
 * Wraps children with the Context and provides state and dispatch
 */
export function ParkingProvider({ children }: ParkingProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(parkingReducer, initialState);

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================

  /**
   * Fetch all parking slots from the API
   * Updates state with fetched slots or error
   */
  const fetchSlots = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'slots', value: true } });
      const slots = await parkingApi.listSlots();
      dispatch({ type: 'SET_SLOTS', payload: slots });
      dispatch({ type: 'SET_ERROR', payload: { key: 'slots', value: null } });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch parking slots';
      dispatch({ type: 'SET_ERROR', payload: { key: 'slots', value: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'slots', value: false } });
    }
  }, []);

  /**
   * Fetch all entry points from the API
   * Updates state with fetched entry points or error
   */
  const fetchEntryPoints = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'entryPoints', value: true } });
      const entryPoints = await parkingApi.listEntryPoints();
      dispatch({ type: 'SET_ENTRY_POINTS', payload: entryPoints });
      dispatch({ type: 'SET_ERROR', payload: { key: 'entryPoints', value: null } });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch entry points';
      dispatch({ type: 'SET_ERROR', payload: { key: 'entryPoints', value: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'entryPoints', value: false } });
    }
  }, []);

  /**
   * Fetch active parking sessions from the API
   * Updates state with fetched sessions or error
   */
  const fetchActiveSessions = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'sessions', value: true } });
      const result = await parkingApi.listSessions(1, 100);
      // Filter only active sessions (those without exited_at)
      const activeSessions = result.sessions.filter(session => !session.exited_at);
      dispatch({ type: 'SET_ACTIVE_SESSIONS', payload: activeSessions });
      dispatch({ type: 'SET_ERROR', payload: { key: 'sessions', value: null } });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch active sessions';
      dispatch({ type: 'SET_ERROR', payload: { key: 'sessions', value: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'sessions', value: false } });
    }
  }, []);

  /**
   * Fetch all parking sessions with pagination
   * Updates state with fetched sessions or error
   * 
   * @param page - Page number (default: 1)
   * @param perPage - Items per page (default: 20, max: 100)
   */
  const fetchAllSessions = useCallback(async (page: number = 1, perPage: number = 20): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'sessions', value: true } });
      const result = await parkingApi.listSessions(page, perPage);
      dispatch({ type: 'SET_ALL_SESSIONS', payload: result.sessions });
      dispatch({ type: 'SET_ERROR', payload: { key: 'sessions', value: null } });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch sessions';
      dispatch({ type: 'SET_ERROR', payload: { key: 'sessions', value: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'sessions', value: false } });
    }
  }, []);

  /**
   * Check system health status
   * Updates state with health status or error
   */
  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'health', value: true } });
      dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'checking' });
      const health = await parkingApi.checkHealth();
      
      if (health.status === 'ok' && health.checks.database.status === 'healthy') {
        dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'online' });
      } else {
        dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'offline' });
      }
      dispatch({ type: 'SET_ERROR', payload: { key: 'health', value: null } });
    } catch (error) {
      dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'offline' });
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Health check failed';
      dispatch({ type: 'SET_ERROR', payload: { key: 'health', value: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'health', value: false } });
    }
  }, []);

  /**
   * Refresh all data from the API
   * Fetches slots, entry points, and active sessions
   */
  const refreshAll = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        fetchSlots(),
        fetchEntryPoints(),
        fetchActiveSessions(),
      ]);
      dispatch({ type: 'REFRESH_ALL' });
    } catch (error) {
      // Individual fetch functions handle their own errors
      console.error('Error during refreshAll:', error);
    }
  }, [fetchSlots, fetchEntryPoints, fetchActiveSessions]);

  // ============================================================================
  // ASYNCSTORAGE CONFIGURATION
  // ============================================================================

  /**
   * Load configuration from AsyncStorage
   * Retrieves API base URL and test mode settings
   */
  const loadConfiguration = useCallback(async (): Promise<void> => {
    try {
      const apiBaseUrl = await AsyncStorage.getItem('api_base_url');
      const testMode = await AsyncStorage.getItem('test_mode');
      
      if (apiBaseUrl) {
        dispatch({ type: 'SET_API_BASE_URL', payload: apiBaseUrl });
        // Update API client with new base URL
        await parkingApi.setApiBaseUrl(apiBaseUrl);
      }
      
      if (testMode) {
        dispatch({ type: 'SET_TEST_MODE', payload: testMode === 'true' });
      }
    } catch (error) {
      console.error('Error loading configuration from AsyncStorage:', error);
    }
  }, []);

  /**
   * Save configuration to AsyncStorage
   * Persists API base URL and test mode settings
   */
  const saveConfiguration = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.setItem('api_base_url', state.apiBaseUrl);
      await AsyncStorage.setItem('test_mode', String(state.testMode));
      // Update API client with new base URL
      await parkingApi.setApiBaseUrl(state.apiBaseUrl);
    } catch (error) {
      console.error('Error saving configuration to AsyncStorage:', error);
      throw error;
    }
  }, [state.apiBaseUrl, state.testMode]);

  /**
   * Clear configuration from AsyncStorage
   * Removes API base URL and test mode settings
   */
  const clearConfiguration = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('api_base_url');
      await AsyncStorage.removeItem('test_mode');
      // Reset to defaults
      dispatch({ type: 'SET_API_BASE_URL', payload: 'http://localhost:8082' });
      dispatch({ type: 'SET_TEST_MODE', payload: false });
      await parkingApi.setApiBaseUrl('http://localhost:8082');
    } catch (error) {
      console.error('Error clearing configuration from AsyncStorage:', error);
      throw error;
    }
  }, []);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get available slots for a vehicle type
   * 
   * @param vehicleType - Type of vehicle ('S', 'M', or 'L')
   * @returns Array of available parking slots
   */
  const getAvailableSlots = useCallback((vehicleType: VehicleType): ParkingSlot[] => {
    return state.slots.filter(slot => {
      // Map vehicle type to slot type
      const slotType = vehicleType === 'S' ? 'SP' : vehicleType === 'M' ? 'MP' : 'LP';
      return slot.type === slotType && slot.status === 'available';
    });
  }, [state.slots]);

  /**
   * Get available slots for a vehicle type and entry point
   * 
   * @param vehicleType - Type of vehicle ('S', 'M', or 'L')
   * @param entryPointId - Entry point identifier
   * @returns Array of available parking slots sorted by distance
   */
  const getAvailableSlotsForEntryPoint = useCallback(
    (vehicleType: VehicleType, entryPointId: string): ParkingSlot[] => {
      const _entryPointIndex = entryPointId.charCodeAt(0) - 'A'.charCodeAt(0);
      
      return state.slots.filter(slot => {
        const slotType = vehicleType === 'S' ? 'SP' : vehicleType === 'M' ? 'MP' : 'LP';
        const isAvailable = slot.status === 'available';
        const hasDistance = slot.distance_from_entry !== undefined;
        return slot.type === slotType && isAvailable && hasDistance;
      }).sort((a, b) => {
        const distanceA = a.distance_from_entry || 0;
        const distanceB = b.distance_from_entry || 0;
        return distanceA - distanceB;
      });
    },
    [state.slots]
  );

  /**
   * Get slot by ID
   * 
   * @param slotId - Slot ID to find
   * @returns Parking slot or undefined if not found
   */
  const getSlotById = useCallback((slotId: string): ParkingSlot | undefined => {
    return state.slots.find(slot => String(slot.id) === slotId);
  }, [state.slots]);

  /**
   * Get entry point by ID
   * 
   * @param entryPointId - Entry point ID to find
   * @returns Entry point or undefined if not found
   */
  const getEntryPointById = useCallback((entryPointId: string): EntryPoint | undefined => {
    return state.entryPoints.find(ep => String(ep.id) === entryPointId);
  }, [state.entryPoints]);

  /**
   * Get session by ID
   * 
   * @param sessionId - Session ID to find
   * @returns Parking session or undefined if not found
   */
  const getSessionById = useCallback((sessionId: string): ParkingSession | undefined => {
    return state.allSessions.find(session => session.session_id === sessionId);
  }, [state.allSessions]);

  /**
   * Get active sessions count
   * 
   * @returns Number of active sessions
   */
  const getActiveSessionsCount = useCallback((): number => {
    return state.activeSessions.length;
  }, [state.activeSessions]);

  /**
   * Get available slots count
   * 
   * @returns Number of available slots
   */
  const getAvailableSlotsCount = useCallback((): number => {
    return state.slots.filter(slot => slot.status === 'available').length;
  }, [state.slots]);

  /**
   * Get total slots count
   * 
   * @returns Total number of slots
   */
  const getTotalSlotsCount = useCallback((): number => {
    return state.slots.length;
  }, [state.slots]);

  /**
   * Get revenue today (sum of completed session fees)
   * 
   * @returns Total revenue from completed sessions today
   */
  const getRevenueToday = useCallback((): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return state.allSessions
      .filter(session => {
        if (!session.exited_at || !session.total_fee) {
          return false;
        }
        const exitedDate = new Date(session.exited_at);
        exitedDate.setHours(0, 0, 0, 0);
        return exitedDate.getTime() === today.getTime();
      })
      .reduce((total, session) => total + (session.total_fee || 0), 0);
  }, [state.allSessions]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Load configuration from AsyncStorage on mount
   */
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  /**
   * Initial data fetch on mount
   * Fetches all data and checks health when component mounts
   */
  useEffect(() => {
    const initialize = async () => {
      await checkHealth();
      await refreshAll();
    };
    
    initialize();
  }, [checkHealth, refreshAll]);

  /**
   * Auto-refresh slots and sessions every 30 seconds
   * Cleans up interval on unmount
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshAll();
    }, 30000); // 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshAll]);

  /**
   * Health check polling every 60 seconds
   * Cleans up interval on unmount
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkHealth();
    }, 60000); // 60 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [checkHealth]);

  // Context value
  const contextValue: ParkingContextValue = {
    state,
    dispatch,
    fetchSlots,
    fetchEntryPoints,
    fetchActiveSessions,
    fetchAllSessions,
    checkHealth,
    refreshAll,
    loadConfiguration,
    saveConfiguration,
    clearConfiguration,
    getAvailableSlots,
    getAvailableSlotsForEntryPoint,
    getSlotById,
    getEntryPointById,
    getSessionById,
    getActiveSessionsCount,
    getAvailableSlotsCount,
    getTotalSlotsCount,
    getRevenueToday,
  };

  return (
    <ParkingContext.Provider value={contextValue}>
      {children}
    </ParkingContext.Provider>
  );
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * useParkingContext custom hook
 * Returns the parking context value
 * Throws error if used outside provider
 * 
 * @returns Parking context value
 * @throws Error if used outside ParkingProvider
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { state, fetchSlots, refreshAll } = useParkingContext();
 *   
 *   return (
 *     <View>
 *       <Text>System Status: {state.systemHealth}</Text>
 *       <Button onPress={refreshAll} title="Refresh" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useParkingContext(): ParkingContextValue {
  const context = useContext(ParkingContext);
  
  if (context === undefined) {
    throw new Error('useParkingContext must be used within a ParkingProvider');
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ParkingContext, ParkingProvider, useParkingContext };
export default ParkingContext;
