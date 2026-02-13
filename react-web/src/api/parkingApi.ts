/**
 * Parking API Service Layer
 * 
 * A comprehensive TypeScript API service for the OO Parking Lot System.
 * Shared between React Web and React Native frontends.
 * 
 * @module parkingApi
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// AsyncStorage is only available in React Native, not React Web
// This is a placeholder to satisfy TypeScript when shared code is used
declare const AsyncStorage: any;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Health check response from the API
 */
export interface HealthCheckResponse {
  readonly status: 'ok' | 'error';
  readonly service: string;
  readonly version: string;
  readonly timestamp: string;
  readonly checks: {
    readonly database: {
      readonly status: 'healthy' | 'unhealthy';
    };
  };
}

/**
 * Entry point representation
 */
export interface EntryPoint {
  readonly id: string;
  readonly identifier: string;
  readonly name: string;
}

/**
 * Parking slot representation
 */
export interface ParkingSlot {
  readonly id: string;
  readonly slot_label: string;
  readonly slot_type: 'SP' | 'MP' | 'LP';
  readonly distances: readonly number[];
  readonly available: boolean;
}

/**
 * Fee breakdown structure
 */
export interface FeeBreakdown {
  readonly total_fee: number;
  readonly duration_hours: number;
  readonly is_continuous: boolean;
  readonly long_term: {
    readonly days: number;
    readonly fee: number;
  };
  readonly remaining: {
    readonly total: number;
    readonly base_fee: number;
    readonly exceeding_hours: number;
    readonly exceeding_fee: number;
  };
}

/**
 * Parking session representation
 */
export interface Session {
  readonly session_id: string;
  readonly vehicle_type: 'S' | 'M' | 'L';
  readonly parking_slot: ParkingSlot;
  readonly entry_point: {
    readonly id: number;
    readonly identifier: string;
    readonly name: string;
  };
  readonly parked_at: string;
  readonly exited_at?: string;
  readonly duration_hours?: number;
  readonly total_fee?: number;
  readonly is_continuous?: boolean;
  readonly fee_breakdown?: FeeBreakdown;
  readonly breakdown?: FeeBreakdown;
  readonly is_active?: boolean;
}

/**
 * Initialize system configuration
 */
export interface InitializeConfig {
  readonly entry_points: readonly {
    readonly identifier: string;
    readonly name: string;
  }[];
  readonly parking_slots: readonly {
    readonly slot_label: string;
    readonly slot_type: 'SP' | 'MP' | 'LP';
    readonly distances: readonly number[];
  }[];
}

/**
 * Initialize system response
 */
export interface InitializeResponse {
  readonly entry_points_created: number;
  readonly parking_slots_created: number;
  readonly message: string;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  readonly error: string;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly status: number | undefined;
  public readonly code: string | undefined;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Create ApiError from Axios error
   */
  static fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
    const status = error.response?.status;
    const data = error.response?.data;
    const url = error.config?.url;
    const baseURL = error.config?.baseURL || getApiBaseUrl();
    
    // Handle network errors (no response received)
    if (!error.response && error.request) {
      const message = `Cannot connect to parking system. Check if the API server is running at ${baseURL}.`;
      console.error('Network Error:', message, error.message);
      return new ApiError(message, undefined, 'NETWORK_ERROR', { originalError: error.message });
    }
    
    // Handle request setup errors
    if (!error.response && !error.request) {
      console.error('Request Setup Error:', error.message);
      return new ApiError(
        'Failed to setup request. Please try again.',
        undefined,
        'REQUEST_ERROR',
        { originalError: error.message }
      );
    }
    
    // Handle specific HTTP status codes with user-friendly messages
    let message = data?.error ?? error.message ?? 'An unknown error occurred';
    
    if (status === 409) {
      // Try to extract vehicle type from error details or request data
      let vehicleType = 'specified';
      if (data?.details?.['vehicle_type']) {
        const vt = data.details['vehicle_type'];
        vehicleType = typeof vt === 'string' ? vt : 'specified';
      } else if (error.config?.data) {
        // Try to extract from request data (for parkVehicle)
        try {
          const requestData = error.config.data instanceof URLSearchParams 
            ? Object.fromEntries(error.config.data.entries())
            : JSON.parse(error.config.data);
          if (requestData.vehicle_type) {
            const typeMap: Record<string, string> = { 'S': 'small', 'M': 'medium', 'L': 'large' };
            vehicleType = typeMap[requestData.vehicle_type] || requestData.vehicle_type;
          }
        } catch {
          // Failed to parse request data, use default
        }
      }
      message = `No available ${vehicleType} parking slot. All ${vehicleType} slots are occupied.`;
    } else if (status === 404) {
      // Check if this is an unpark/session operation
      if (url?.includes('/sessions/') && url?.includes('/unpark')) {
        message = 'Session not found. It may have already been completed.';
      } else if (url?.includes('/sessions/')) {
        message = 'Session not found. It may have already been completed.';
      } else {
        message = 'The requested resource was not found.';
      }
    } else if (status === 503) {
      // Check if this is a health check
      if (url?.includes('/health')) {
        message = 'Parking system database is unavailable. Contact system administrator.';
      } else {
        message = 'Service temporarily unavailable. Please try again later.';
      }
    } else if (status === 400) {
      message = data?.error ?? 'Invalid request. Please check your input and try again.';
    } else if (status === 500) {
      message = 'Server error occurred. Please try again later.';
    } else if (status) {
      message = data?.error ?? `An error occurred (HTTP ${status}). Please try again.`;
    }
    
    return new ApiError(
      message,
      status,
      data?.message,
      data?.details
    );
  }
}

/**
 * Generic API response wrapper
 */
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get API base URL from environment or storage
 * Supports both React Web (localStorage) and React Native (AsyncStorage)
 */
function getApiBaseUrl(): string {
  // Try environment variable first
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Try localStorage (React Web)
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedUrl = window.localStorage.getItem('api_base_url');
    if (storedUrl) {
      return storedUrl;
    }
  }
  
  // Default to Go backend
  return 'http://localhost:8082';
}

/**
 * Set API base URL
 * Supports both React Web (localStorage) and React Native (AsyncStorage)
 */
export async function setApiBaseUrl(url: string): Promise<void> {
  // For React Web
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('api_base_url', url);
    return;
  }
  
  // For React Native - would need AsyncStorage
  // This is a placeholder - actual implementation would import AsyncStorage
  try {
    if (typeof AsyncStorage !== 'undefined') {
      await AsyncStorage.setItem('api_base_url', url);
    }
  } catch (error) {
    console.warn('AsyncStorage not available, using default URL');
  }
}

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Create and configure axios instance
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for authentication
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
      // Try to get auth token from localStorage (React Web)
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = window.localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      // For React Native - would need AsyncStorage
      try {
        if (typeof AsyncStorage !== 'undefined') {
          const token = await AsyncStorage.getItem('authToken');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        // AsyncStorage not available, continue without token
      }
      
      return config;
    },
    (error: unknown): Promise<never> => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorResponse>) => {
      // Log error for debugging
      if (error.response) {
        console.error('API Error Response:', {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url,
        });
      } else if (error.request) {
        console.error('API Network Error:', error.message);
      } else {
        console.error('API Request Error:', error.message);
      }
      
      // Convert to ApiError
      return Promise.reject(ApiError.fromAxiosError(error));
    }
  );

  return client;
};

const apiClient = createApiClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract data from API response
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data;
}

/**
 * Handle API errors consistently
 */
function handleError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }
  if (axios.isAxiosError(error)) {
    throw ApiError.fromAxiosError(error);
  }
  if (error instanceof Error) {
    throw new ApiError(error.message);
  }
  throw new ApiError('An unknown error occurred');
}

// ============================================================================
// HEALTH API
// ============================================================================

/**
 * Check the health status of the API
 * 
 * @returns Promise resolving to health check response
 * @throws ApiError if health check fails
 * 
 * @example
 * ```typescript
 * const health = await checkHealth();
 * console.log(health.status); // 'ok' or 'error'
 * console.log(health.checks.database.status); // 'healthy' or 'unhealthy'
 * ```
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await apiClient.get<HealthCheckResponse>('/health');
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// INITIALIZATION API
// ============================================================================

/**
 * Initialize the parking system with entry points and parking slots
 * 
 * @param config - Configuration containing entry points and parking slots
 * @returns Promise resolving to initialization response
 * @throws ApiError if initialization fails
 * 
 * @example
 * ```typescript
 * const result = await initializeSystem({
 *   entry_points: [
 *     { identifier: 'A', name: 'Entry Point A' },
 *     { identifier: 'B', name: 'Entry Point B' }
 *   ],
 *   parking_slots: [
 *     { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] }
 *   ]
 * });
 * console.log(result.entry_points_created); // 2
 * console.log(result.parking_slots_created); // 1
 * ```
 */
export async function initializeSystem(
  config: InitializeConfig
): Promise<InitializeResponse> {
  try {
    const response = await apiClient.post<ApiResponse<InitializeResponse>>(
      '/api/v1/initialize',
      config
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// ENTRY POINTS API
// ============================================================================

/**
 * List all entry points in the parking lot
 * 
 * @returns Promise resolving to array of entry points
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * const entryPoints = await listEntryPoints();
 * entryPoints.forEach(ep => {
 *   console.log(`${ep.identifier}: ${ep.name}`);
 * });
 * ```
 */
export async function listEntryPoints(): Promise<EntryPoint[]> {
  try {
    const response = await apiClient.get<ApiResponse<EntryPoint[]>>(
      '/api/v1/entry_points'
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Create a new entry point
 * 
 * @param identifier - Entry point identifier (e.g., 'A', 'B', 'C')
 * @param name - Entry point display name
 * @returns Promise resolving to created entry point
 * @throws ApiError if creation fails
 * 
 * @example
 * ```typescript
 * const newEntryPoint = await createEntryPoint('D', 'Entry Point D');
 * console.log(newEntryPoint.id); // '4'
 * console.log(newEntryPoint.identifier); // 'D'
 * ```
 */
export async function createEntryPoint(
  identifier: string,
  name: string
): Promise<EntryPoint> {
  try {
    const response = await apiClient.post<ApiResponse<EntryPoint>>(
      '/api/v1/entry_points',
      { entry_point: { identifier, name } }
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Update an existing entry point
 * 
 * @param id - Entry point ID to update
 * @param name - New name for the entry point
 * @returns Promise resolving to updated entry point
 * @throws ApiError if update fails
 * 
 * @example
 * ```typescript
 * const updated = await updateEntryPoint('1', 'Updated Entry Point A');
 * console.log(updated.name); // 'Updated Entry Point A'
 * ```
 */
export async function updateEntryPoint(
  id: string,
  name: string
): Promise<EntryPoint> {
  try {
    const response = await apiClient.put<ApiResponse<EntryPoint>>(
      `/api/v1/entry_points/${id}`,
      { entry_point: { name } }
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete an entry point
 * 
 * @param id - Entry point ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 * 
 * @example
 * ```typescript
 * await deleteEntryPoint('1');
 * console.log('Entry point deleted');
 * ```
 */
export async function deleteEntryPoint(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/entry_points/${id}`);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// SLOTS API
// ============================================================================

/**
 * List all parking slots in the parking lot
 * 
 * @returns Promise resolving to array of parking slots
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * const slots = await listSlots();
 * slots.forEach(slot => {
 *   console.log(`${slot.slot_label}: ${slot.available ? 'Available' : 'Occupied'}`);
 * });
 * ```
 */
export async function listSlots(): Promise<ParkingSlot[]> {
  try {
    const response = await apiClient.get<ApiResponse<ParkingSlot[]>>(
      '/api/v1/slots'
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get available parking slots for a specific vehicle type from a specific entry point
 * 
 * @param vehicleType - Type of vehicle ('S', 'M', or 'L')
 * @param entryPointId - Entry point identifier (e.g., 'A', 'B', 'C')
 * @returns Promise resolving to array of available parking slots
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * const availableSlots = await getAvailableSlots('S', 'A');
 * console.log(`Found ${availableSlots.length} available slots`);
 * ```
 */
export async function getAvailableSlots(
  vehicleType: string,
  entryPointId: string
): Promise<ParkingSlot[]> {
  try {
    const response = await apiClient.get<ApiResponse<{ available_slots: ParkingSlot[] }>>(
      '/api/v1/slots/available',
      {
        params: {
          vehicle_type: vehicleType,
          entry_point_id: entryPointId,
        },
      }
    );
    return response.data.data.available_slots;
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// SESSIONS API
// ============================================================================

/**
 * Park a vehicle at the closest available slot
 * 
 * CRITICAL: This endpoint uses Content-Type: application/x-www-form-urlencoded
 * NOT application/json like other POST endpoints.
 * 
 * @param vehicleType - Type of vehicle ('S', 'M', or 'L')
 * @param entryPointId - Entry point identifier (e.g., 'A', 'B', 'C')
 * @param parkedAt - Optional parked_at timestamp in ISO8601 format
 * @returns Promise resolving to created session
 * @throws ApiError with status 409 if no available slot
 * 
 * @example
 * ```typescript
 * // Park a small vehicle at entry point A
 * const session = await parkVehicle('S', 'A');
 * console.log(session.session_id); // 'session-123'
 * 
 * // Park with specific timestamp for testing
 * const testSession = await parkVehicle('S', 'A', '2024-01-15T10:30:00Z');
 * ```
 */
export async function parkVehicle(
  vehicleType: string,
  entryPointId: string,
  parkedAt?: string
): Promise<Session> {
  try {
    // CRITICAL: Use URLSearchParams for form-urlencoded format
    const params = new URLSearchParams();
    params.append('vehicle_type', vehicleType);
    params.append('entry_point_id', entryPointId);
    
    // Only add parked_at if provided
    if (parkedAt) {
      params.append('parked_at', parkedAt);
    }
    
    // CRITICAL: Override Content-Type to application/x-www-form-urlencoded
    const response = await apiClient.post<ApiResponse<Session>>(
      '/api/v1/sessions',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Unpark a vehicle and calculate the parking fee
 * 
 * CRITICAL: The exited_at parameter must be sent as a URL query parameter,
 * NOT in the request body.
 * 
 * @param sessionId - Session ID of the vehicle to unpark
 * @param exitedAt - Optional exited_at timestamp in ISO8601 format
 * @returns Promise resolving to session with fee calculation
 * @throws ApiError if unparking fails
 * 
 * @example
 * ```typescript
 * // Unpark with current time
 * const session = await unpackVehicle('session-123');
 * console.log(session.total_fee); // 40.0
 * 
 * // Unpark with specific timestamp for testing
 * const testSession = await unpackVehicle('session-123', '2024-01-15T14:30:00Z');
 * console.log(testSession.duration_hours); // 4.0
 * ```
 */
export async function unpackVehicle(
  sessionId: string,
  exitedAt?: string
): Promise<Session> {
  try {
    // CRITICAL: Send exited_at as URL query parameter
    const url = exitedAt
      ? `/api/v1/sessions/${sessionId}/unpark?exited_at=${encodeURIComponent(exitedAt)}`
      : `/api/v1/sessions/${sessionId}/unpark`;
    
    const response = await apiClient.post<ApiResponse<Session>>(url);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get details of a specific parking session
 * 
 * @param sessionId - Session ID to retrieve
 * @returns Promise resolving to session details
 * @throws ApiError if session not found (404)
 * 
 * @example
 * ```typescript
 * const session = await getSession('session-123');
 * console.log(session.vehicle_type); // 'S'
 * console.log(session.is_active); // true
 * ```
 */
export async function getSession(sessionId: string): Promise<Session> {
  try {
    const response = await apiClient.get<ApiResponse<Session>>(
      `/api/v1/sessions/${sessionId}`
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List all parking sessions with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated sessions list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * // Get first page with default page size
 * const page1 = await listSessions();
 * console.log(page1.sessions.length); // 20
 * console.log(page1.total); // 150
 * 
 * // Get second page with custom page size
 * const page2 = await listSessions(2, 50);
 * ```
 */
export async function listSessions(
  page: number = 1,
  perPage: number = 20
): Promise<{ sessions: Session[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<Session[]>>(
      '/api/v1/sessions',
      {
        params: {
          page,
          per_page: perPage,
        },
      }
    );
    
    // Extract total from response headers if available
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      sessions: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Parking API service
 * 
 * Provides all functions for interacting with the parking lot API.
 * 
 * @example
 * ```typescript
 * import * as parkingApi from './api/parkingApi';
 * 
 * // Check health
 * const health = await parkingApi.checkHealth();
 * 
 * // Park a vehicle
 * const session = await parkingApi.parkVehicle('S', 'A');
 * 
 * // Unpark a vehicle
 * const result = await parkingApi.unpackVehicle(session.session_id);
 * ```
 */
export default {
  // Health
  checkHealth,
  
  // Initialize
  initializeSystem,
  
  // Entry Points
  listEntryPoints,
  createEntryPoint,
  updateEntryPoint,
  deleteEntryPoint,
  
  // Slots
  listSlots,
  getAvailableSlots,
  
  // Sessions
  parkVehicle,
  unpackVehicle,
  getSession,
  listSessions,
  
  // Configuration
  setApiBaseUrl,
  getApiBaseUrl,
  
  // Types
  ApiError,
};
