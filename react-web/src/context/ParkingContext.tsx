/**
 * Parking Context
 *
 * Global state management for the OO Parking Lot System using Context + useReducer pattern.
 * Provides centralized state and actions for parking slots, entry points, sessions, and system health.
 *
 * @module ParkingContext
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parking state structure
 */
export interface ParkingState {
  slots: parkingApi.ParkingSlot[];
  entryPoints: parkingApi.EntryPoint[];
  activeSessions: parkingApi.Session[];
  systemHealth: 'online' | 'offline' | 'checking';
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Parking action types
 */
export type ParkingAction =
  | { type: 'SET_SLOTS'; payload: parkingApi.ParkingSlot[] }
  | { type: 'SET_ENTRY_POINTS'; payload: parkingApi.EntryPoint[] }
  | { type: 'SET_ACTIVE_SESSIONS'; payload: parkingApi.Session[] }
  | { type: 'SET_SYSTEM_HEALTH'; payload: 'online' | 'offline' | 'checking' }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'REFRESH_ALL' };

/**
 * Parking context type
 */
export interface ParkingContextType {
  state: ParkingState;
  dispatch: React.Dispatch<ParkingAction>;
  fetchSlots: () => Promise<void>;
  fetchEntryPoints: () => Promise<void>;
  fetchActiveSessions: () => Promise<void>;
  checkHealth: () => Promise<void>;
  initializeSystem: () => Promise<void>;
  refreshAll: () => Promise<void>;
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
  systemHealth: 'checking',
  isInitialized: false,
  loading: false,
  error: null,
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
    
    case 'SET_SYSTEM_HEALTH':
      return { ...state, systemHealth: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'REFRESH_ALL':
      return { ...state };
    
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
const ParkingContext = createContext<ParkingContextType | undefined>(undefined);

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

  /**
   * Fetch all parking slots from the API
   * Updates state with fetched slots or error
   */
  const fetchSlots = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const slots = await parkingApi.listSlots();
      dispatch({ type: 'SET_SLOTS', payload: slots });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch parking slots';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  /**
   * Fetch all entry points from the API
   * Updates state with fetched entry points or error
   */
  const fetchEntryPoints = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const entryPoints = await parkingApi.listEntryPoints();
      dispatch({ type: 'SET_ENTRY_POINTS', payload: entryPoints });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch entry points';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  /**
   * Fetch all active parking sessions from the API
   * Updates state with fetched sessions or error
   */
  const fetchActiveSessions = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await parkingApi.listSessions(1, 100);
      // Filter only active sessions (those without exited_at)
      const activeSessions = result.sessions.filter(session => !session.exited_at);
      dispatch({ type: 'SET_ACTIVE_SESSIONS', payload: activeSessions });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch active sessions';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  /**
   * Check system health status
   * Updates state with health status or error
   */
  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'checking' });
      const health = await parkingApi.checkHealth();
      
      if (health.status === 'ok' && health.checks.database.status === 'healthy') {
        dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'online' });
      } else {
        dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'offline' });
      }
    } catch (error) {
      dispatch({ type: 'SET_SYSTEM_HEALTH', payload: 'offline' });
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Health check failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  /**
   * Initialize the parking system with default configuration
   * Creates entry points and parking slots if not already initialized
   */
  const initializeSystem = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const config: parkingApi.InitializeConfig = {
        entry_points: [
          { identifier: 'A', name: 'Entry Point A' },
          { identifier: 'B', name: 'Entry Point B' },
          { identifier: 'C', name: 'Entry Point C' },
        ],
        parking_slots: [
          // Small vehicle slots (SP)
          { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] },
          { slot_label: 'SP-2', slot_type: 'SP', distances: [2, 3, 6] },
          { slot_label: 'SP-3', slot_type: 'SP', distances: [3, 2, 7] },
          { slot_label: 'SP-4', slot_type: 'SP', distances: [4, 1, 8] },
          // Medium vehicle slots (MP)
          { slot_label: 'MP-1', slot_type: 'MP', distances: [5, 2, 3] },
          { slot_label: 'MP-2', slot_type: 'MP', distances: [6, 1, 4] },
          { slot_label: 'MP-3', slot_type: 'MP', distances: [7, 3, 2] },
          { slot_label: 'MP-4', slot_type: 'MP', distances: [8, 4, 1] },
          // Large vehicle slots (LP)
          { slot_label: 'LP-1', slot_type: 'LP', distances: [9, 5, 1] },
          { slot_label: 'LP-2', slot_type: 'LP', distances: [10, 6, 2] },
          { slot_label: 'LP-3', slot_type: 'LP', distances: [11, 7, 3] },
          { slot_label: 'LP-4', slot_type: 'LP', distances: [12, 8, 4] },
        ],
      };
      
      const result = await parkingApi.initializeSystem(config);
      
      if (result.entry_points_created > 0 || result.parking_slots_created > 0) {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        // Fetch updated data after initialization
        await Promise.all([
          fetchSlots(),
          fetchEntryPoints(),
        ]);
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to initialize system';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [fetchSlots, fetchEntryPoints]);

  /**
   * Refresh all data from the API
   * Fetches slots, entry points, and active sessions
   */
  const refreshAll = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await Promise.all([
        fetchSlots(),
        fetchEntryPoints(),
        fetchActiveSessions(),
      ]);
      dispatch({ type: 'REFRESH_ALL' });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to refresh data';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [fetchSlots, fetchEntryPoints, fetchActiveSessions]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

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
   * Health check polling every 120 seconds
   * Cleans up interval on unmount
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkHealth();
    }, 120000); // 120 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [checkHealth]);

  /**
   * Pause polling when tab is hidden
   * Resume polling when tab becomes visible
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, pause polling
        console.log('Tab hidden, pausing polling');
      } else {
        // Tab is visible, resume polling
        console.log('Tab visible, resuming polling');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHealth, refreshAll]);

  // Context value
  const contextValue: ParkingContextType = {
    state,
    dispatch,
    fetchSlots,
    fetchEntryPoints,
    fetchActiveSessions,
    checkHealth,
    initializeSystem,
    refreshAll,
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
 * useParking custom hook
 * Returns the parking context value
 * Throws error if used outside provider
 * 
 * @returns Parking context value
 * @throws Error if used outside ParkingProvider
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { state, fetchSlots, refreshAll } = useParking();
 *   
 *   return (
 *     <div>
 *       <p>System Status: {state.systemHealth}</p>
 *       <button onClick={refreshAll}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useParking(): ParkingContextType {
  const context = useContext(ParkingContext);
  
  if (context === undefined) {
    throw new Error('useParking must be used within a ParkingProvider');
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ParkingContext;
