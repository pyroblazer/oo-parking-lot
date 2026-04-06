/**
 * Parking API Service Layer
 *
 * A comprehensive TypeScript API service for the OO Parking Lot System.
 * Adapted for React Native with AsyncStorage support.
 *
 * API URL resolution order:
 *   1. AsyncStorage key "api_base_url" (set at runtime via Configuration screen)
 *   2. env var API_BASE_URL (from .env via react-native-dotenv)
 *   3. Platform-aware fallback (localhost or 10.0.2.2)
 *
 * @module parkingApi
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Env var injected at build time by react-native-dotenv (babel plugin).
// Falls back to undefined if not set, in which case we use the platform default.
import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

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
  readonly id: string | number;
  readonly identifier: string;
  readonly name: string;
}

/**
 * Parking slot representation
 */
export interface ParkingSlot {
  readonly id: string | number;
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
  readonly license_plate?: string;
  readonly parking_slot: ParkingSlot;
  readonly entry_point: string | EntryPoint;
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
 * Recent exit session for continuous parking selection
 */
export interface RecentExit {
  readonly session_id: string;
  readonly vehicle_type: 'S' | 'M' | 'L';
  readonly license_plate: string;
  readonly slot_label: string;
  readonly entry_point: string;
  readonly parked_at: string;
  readonly exited_at: string;
  readonly minutes_since_exit: number;
  readonly total_fee: number;
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
    const baseURL = error.config?.baseURL || 'http://localhost:8082';
    
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
 * Platform-aware fallback URL when no env var or stored preference exists.
 *
 * - iOS Simulator:            http://localhost:8082
 * - Android emulator (ADB reverse): http://localhost:8082
 * - Android emulator (no reverse):  http://10.0.2.2:8082
 * - Physical device:          http://localhost:8082 (user must override via .env or UI)
 */
function getFallbackApiBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8082';
  }
  return 'http://localhost:8082';
}

/** Build-time default from .env, or platform fallback */
const DEFAULT_API_BASE_URL: string = ENV_API_BASE_URL || getFallbackApiBaseUrl();

/**
 * Get API base URL.
 *
 * Resolution order:
 *   1. AsyncStorage (user changed it at runtime via Configuration screen)
 *   2. .env file (API_BASE_URL, injected at build time)
 *   3. Platform-aware fallback
 */
async function getApiBaseUrl(): Promise<string> {
  try {
    const storedUrl = await AsyncStorage.getItem('api_base_url');
    if (storedUrl) {
      return storedUrl;
    }
  } catch (error) {
    console.warn('Error reading API base URL from AsyncStorage:', error);
  }

  return DEFAULT_API_BASE_URL;
}

/**
 * Set API base URL in AsyncStorage and reset the cached client
 * so the next API call uses the new URL.
 */
export async function setApiBaseUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem('api_base_url', url);
    // Invalidate cached client so it is recreated with the new URL
    apiClientPromise = null;
  } catch (error) {
    console.error('Error setting API base URL:', error);
    throw error;
  }
}

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Create and configure axios instance
 */
const createApiClient = async (): Promise<AxiosInstance> => {
  const baseURL = await getApiBaseUrl();
  
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for authentication
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
      // Try to get auth token from AsyncStorage
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // AsyncStorage not available, continue without token
        console.warn('Error getting auth token:', error);
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

// Initialize API client lazily
let apiClientPromise: Promise<AxiosInstance> | null = null;

function getApiClient(): Promise<AxiosInstance> {
  if (!apiClientPromise) {
    apiClientPromise = createApiClient();
  }
  return apiClientPromise;
}

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
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const client = await getApiClient();
    const response = await client.get<HealthCheckResponse>('/health');
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
 */
export async function initializeSystem(
  config: InitializeConfig
): Promise<InitializeResponse> {
  try {
    const client = await getApiClient();
    const response = await client.post<ApiResponse<InitializeResponse>>(
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
 */
export async function listEntryPoints(): Promise<EntryPoint[]> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<EntryPoint[]>>(
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
 */
export async function createEntryPoint(
  identifier: string,
  name: string
): Promise<EntryPoint> {
  try {
    const client = await getApiClient();
    const response = await client.post<ApiResponse<EntryPoint>>(
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
 * @param entryPoint - Entry point object containing name
 * @returns Promise resolving to updated entry point
 * @throws ApiError if update fails
 */
export const updateEntryPoint = async (
  id: string | number,
  name: string
): Promise<EntryPoint> => {
  try {
    const client = await getApiClient();
    const response = await client.put<ApiResponse<EntryPoint>>(`/api/v1/entry_points/${id}`, { entry_point: { name } });
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
};

/**
 * Delete an entry point
 *
 * @param id - Entry point ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 */
export const deleteEntryPoint = async (id: string | number): Promise<{ message: string }> => {
  try {
    const client = await getApiClient();
    const response = await client.delete<ApiResponse<{ message: string }>>(`/api/v1/entry_points/${id}`);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
};

// ============================================================================
// SLOTS API
// ============================================================================

/**
 * List all parking slots in the parking lot
 * 
 * @returns Promise resolving to array of parking slots
 * @throws ApiError if retrieval fails
 */
export async function listSlots(): Promise<ParkingSlot[]> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<ParkingSlot[]>>(
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
 */
export async function getAvailableSlots(
  vehicleType: string,
  entryPointId: string
): Promise<ParkingSlot[]> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<{ available_slots: ParkingSlot[] }>>(
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

/**
 * Create a new parking slot
 *
 * @param slot - Slot object containing slot_label, slot_type, and distances
 * @returns Promise resolving to created parking slot
 * @throws ApiError if creation fails
 */
export const createSlot = async (
  slot: { slot_label: string; slot_type: 'SP' | 'MP' | 'LP'; distances: number[] }
): Promise<ParkingSlot> => {
  try {
    const client = await getApiClient();
    const response = await client.post<ApiResponse<ParkingSlot>>('/api/v1/slots', slot);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
};

/**
 * Update an existing parking slot
 *
 * @param id - Slot ID to update
 * @param slot - Slot object containing optional slot_label, slot_type, and distances
 * @returns Promise resolving to updated parking slot
 * @throws ApiError if update fails
 */
export const updateSlot = async (
  id: string | number,
  slot: { slot_label?: string; slot_type?: 'SP' | 'MP' | 'LP'; distances?: number[] }
): Promise<ParkingSlot> => {
  try {
    const client = await getApiClient();
    const response = await client.put<ApiResponse<ParkingSlot>>(`/api/v1/slots/${id}`, slot);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
};

/**
 * Delete a parking slot
 *
 * @param id - Slot ID to delete
 * @returns Promise resolving to deletion result
 * @throws ApiError if deletion fails
 */
export const deleteSlot = async (id: string | number): Promise<{ message: string }> => {
  try {
    const client = await getApiClient();
    const response = await client.delete<ApiResponse<{ message: string }>>(`/api/v1/slots/${id}`);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
};

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
 */
export async function parkVehicle(
  vehicleType: string,
  entryPointId: string,
  parkedAt?: string,
  licensePlate?: string,
  previousSessionId?: string
): Promise<Session> {
  try {
    const client = await getApiClient();

    const body: Record<string, string> = {
      vehicle_type: vehicleType,
      entry_point_id: entryPointId,
    };

    if (parkedAt) {
      body.parked_at = parkedAt;
    }

    if (licensePlate) {
      body.license_plate = licensePlate;
    }

    if (previousSessionId) {
      body.previous_session_id = previousSessionId;
    }

    const response = await client.post<ApiResponse<Session>>(
      '/api/v1/sessions',
      body
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get recent exit sessions for continuous parking selection
 *
 * @param vehicleType - Vehicle type to filter by
 * @returns Promise resolving to array of recent exit sessions
 * @throws ApiError if retrieval fails
 */
export async function fetchRecentExits(
  vehicleType: string
): Promise<RecentExit[]> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<RecentExit[]>>(
      `/api/v1/sessions/recent_exits?vehicle_type=${vehicleType}`
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
 */
export async function unpackVehicle(
  sessionId: string,
  exitedAt?: string
): Promise<Session> {
  try {
    const client = await getApiClient();
    
    // CRITICAL: Send exited_at as URL query parameter
    const url = exitedAt
      ? `/api/v1/sessions/${sessionId}/unpark?exited_at=${encodeURIComponent(exitedAt)}`
      : `/api/v1/sessions/${sessionId}/unpark`;
    
    const response = await client.post<ApiResponse<Session>>(url);
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
 */
export async function getSession(sessionId: string): Promise<Session> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<Session>>(
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
 */
export async function listSessions(
  page: number = 1,
  perPage: number = 20
): Promise<{ sessions: Session[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<Session[]>>(
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
// SESSIONS UPDATE/DELETE API
// ============================================================================

/**
 * Update a parking session
 * 
 * @param sessionId - Session ID to update
 * @param data - Update data (exited_at, total_fee)
 * @returns Promise resolving to updated session
 * @throws ApiError if update fails
 */
export async function updateSession(
  sessionId: string,
  data: { exited_at?: string; total_fee?: number }
): Promise<Session> {
  try {
    const client = await getApiClient();
    const response = await client.put<ApiResponse<Session>>(
      `/api/v1/sessions/${sessionId}`,
      data
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a parking session
 * 
 * @param sessionId - Session ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 */
export async function deleteSession(sessionId: string): Promise<{ message: string }> {
  try {
    const client = await getApiClient();
    const response = await client.delete<ApiResponse<{ message: string }>>(`/api/v1/sessions/${sessionId}`);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// VEHICLES API
// ============================================================================

/**
 * Vehicle representation
 */
export interface Vehicle {
  readonly id: string;
  readonly license_plate: string;
  readonly vehicle_type: 'S' | 'M' | 'L';
  readonly color?: string;
  readonly brand?: string;
  readonly model?: string;
  readonly year?: number;
  readonly metadata?: Record<string, unknown>;
  readonly first_seen_at: string;
  readonly last_seen_at?: string;
  readonly total_sessions: number;
  readonly total_spent: number;
  readonly total_hours_parked: number;
  readonly is_frequent: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * List all vehicles with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated vehicles list
 * @throws ApiError if retrieval fails
 */
export async function listVehicles(
  page: number = 1,
  perPage: number = 20
): Promise<{ vehicles: Vehicle[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<Vehicle[]>>(
      '/api/v1/vehicles',
      {
        params: {
          page,
          per_page: perPage,
        },
      }
    );
    
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      vehicles: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get a specific vehicle by ID
 * 
 * @param id - Vehicle ID
 * @returns Promise resolving to vehicle details
 * @throws ApiError if vehicle not found
 */
export async function getVehicle(id: string): Promise<Vehicle> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<Vehicle>>(
      `/api/v1/vehicles/${id}`
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Create a new vehicle
 * 
 * @param vehicle - Vehicle data
 * @returns Promise resolving to created vehicle
 * @throws ApiError if creation fails
 */
export async function createVehicle(
  vehicle: {
    license_plate: string;
    vehicle_type: 'S' | 'M' | 'L';
    color?: string;
    brand?: string;
    model?: string;
    year?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Vehicle> {
  try {
    const client = await getApiClient();
    const response = await client.post<ApiResponse<Vehicle>>(
      '/api/v1/vehicles',
      vehicle
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Update an existing vehicle
 * 
 * @param id - Vehicle ID to update
 * @param vehicle - Vehicle data to update
 * @returns Promise resolving to updated vehicle
 * @throws ApiError if update fails
 */
export async function updateVehicle(
  id: string,
  vehicle: {
    license_plate?: string;
    vehicle_type?: 'S' | 'M' | 'L';
    color?: string;
    brand?: string;
    model?: string;
    year?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Vehicle> {
  try {
    const client = await getApiClient();
    const response = await client.put<ApiResponse<Vehicle>>(
      `/api/v1/vehicles/${id}`,
      vehicle
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a vehicle
 *
 * @param id - Vehicle ID to delete
 * @returns Promise resolving to deletion result
 * @throws ApiError if deletion fails (e.g., vehicle has active sessions)
 */
export async function deleteVehicle(id: string): Promise<{ message: string }> {
  try {
    const client = await getApiClient();
    const response = await client.delete<ApiResponse<{ message: string }>>(`/api/v1/vehicles/${id}`);
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// BILLING AUDIT LOGS API
// ============================================================================

/**
 * Billing audit log representation
 */
export interface BillingAuditLog {
  readonly id: number;
  readonly parking_session_id: number;
  readonly vehicle_type: string;
  readonly slot_label: string;
  readonly slot_type: string;
  readonly entry_point: string;
  readonly parked_at: string;
  readonly exited_at: string;
  readonly total_fee: number;
  readonly base_fee: number;
  readonly exceeding_fee: number;
  readonly exceeding_hours: number;
  readonly long_term_days: number;
  readonly long_term_fee: number;
  readonly duration_hours: number;
  readonly is_continuous: boolean;
  readonly base_start_time?: string;
  readonly fee_breakdown?: {
    readonly base_fee: number;
    readonly exceeding_fee: number;
    readonly long_term_fee: number;
    readonly total_fee: number;
    readonly duration_hours: number;
  };
  readonly correlation_id?: string;
  readonly idempotency_key?: string;
  readonly billing_version: string;
  readonly calculated_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * List all billing audit logs with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated billing audit logs list
 * @throws ApiError if retrieval fails
 */
export async function listBillingAuditLogs(
  page: number = 1,
  perPage: number = 20
): Promise<{ logs: BillingAuditLog[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<BillingAuditLog[]>>(
      '/api/v1/billing_audit_logs',
      {
        params: {
          page,
          per_page: perPage,
        },
      }
    );
    
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      logs: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get a specific billing audit log by ID
 * 
 * @param id - Billing audit log ID
 * @returns Promise resolving to billing audit log details
 * @throws ApiError if log not found
 */
export async function getBillingAuditLog(id: number): Promise<BillingAuditLog> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<BillingAuditLog>>(
      `/api/v1/billing_audit_logs/${id}`
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get billing audit logs for a specific session
 * 
 * @param sessionId - Parking session ID
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated billing audit logs for the session
 * @throws ApiError if retrieval fails
 */
export async function getBillingAuditLogsBySession(
  sessionId: number,
  page: number = 1,
  perPage: number = 20
): Promise<{ logs: BillingAuditLog[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<BillingAuditLog[]>>(
      '/api/v1/billing_audit_logs',
      {
        params: {
          session_id: sessionId,
          page,
          per_page: perPage,
        },
      }
    );
    
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      logs: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// KAFKA EVENTS API
// ============================================================================

/**
 * Kafka event representation
 */
export interface KafkaEvent {
  readonly id: string;
  readonly event_type: string;
  readonly topic: string;
  readonly event_id: string;
  readonly payload: Record<string, unknown>;
  readonly status: 'pending' | 'published' | 'failed' | 'retrying';
  readonly retry_count: number;
  readonly error_message?: string;
  readonly partition: number;
  readonly offset?: number;
  readonly published_at?: string;
  readonly occurred_at: string;
  readonly idempotency_key?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * List all Kafka events with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated Kafka events list
 * @throws ApiError if retrieval fails
 */
export async function listKafkaEvents(
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<KafkaEvent[]>>(
      '/api/v1/kafka_events',
      {
        params: {
          page,
          per_page: perPage,
        },
      }
    );
    
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      events: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get a specific Kafka event by ID
 * 
 * @param id - Kafka event ID
 * @returns Promise resolving to Kafka event details
 * @throws ApiError if event not found
 */
export async function getKafkaEvent(id: string): Promise<KafkaEvent> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<KafkaEvent>>(
      `/api/v1/kafka_events/${id}`
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get Kafka events by status
 * 
 * @param status - Event status ('pending', 'published', 'failed', 'retrying')
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated Kafka events with the specified status
 * @throws ApiError if retrieval fails
 */
export async function getKafkaEventsByStatus(
  status: 'pending' | 'published' | 'failed' | 'retrying',
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<KafkaEvent[]>>(
      '/api/v1/kafka_events',
      {
        params: {
          status,
          page,
          per_page: perPage,
        },
      }
    );
    
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      events: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get Kafka events by event type
 * 
 * @param eventType - Event type (e.g., 'vehicle_parked', 'vehicle_unparked')
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated Kafka events with the specified type
 * @throws ApiError if retrieval fails
 */
export async function getKafkaEventsByType(
  eventType: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const client = await getApiClient();
    const response = await client.get<ApiResponse<KafkaEvent[]>>(
      '/api/v1/kafka_events',
      {
        params: {
          event_type: eventType,
          page,
          per_page: perPage,
        },
      }
    );
    
    const total = parseInt(
      response.headers['x-total-count'] || 
      response.headers['X-Total-Count'] || 
      String(response.data.data.length),
      10
    );
    
    return {
      events: extractData(response),
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
  createSlot,
  updateSlot,
  deleteSlot,
  
  // Sessions
  parkVehicle,
  unpackVehicle,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
  
  // Vehicles
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  
  // Billing Audit Logs
  listBillingAuditLogs,
  getBillingAuditLog,
  getBillingAuditLogsBySession,
  
  // Kafka Events
  listKafkaEvents,
  getKafkaEvent,
  getKafkaEventsByStatus,
  getKafkaEventsByType,
  
  // Configuration
  setApiBaseUrl,
  getApiBaseUrl,
  
  // Types
  ApiError,
};
