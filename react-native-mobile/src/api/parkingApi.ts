/**
 * Parking API Service Layer
 * 
 * A comprehensive TypeScript API service for the OO Parking Lot System.
 * Adapted for React Native with AsyncStorage support.
 * 
 * @module parkingApi
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  readonly entry_point: string;
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

/**
 * Paginated sessions response
 */
interface _SessionsResponse {
  readonly sessions: readonly Session[];
  readonly total: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get API base URL from AsyncStorage or default
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
  
  // Default to Go backend
  return 'http://localhost:8082';
}

/**
 * Set API base URL in AsyncStorage
 */
export async function setApiBaseUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem('api_base_url', url);
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
  id: string,
  entryPoint: { name: string }
): Promise<EntryPoint> => {
  try {
    const client = await getApiClient();
    const response = await client.put<EntryPoint>(`/api/v1/entry_points/${id}`, { entry_point: entryPoint });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an entry point
 *
 * @param id - Entry point ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 */
export const deleteEntryPoint = async (id: string): Promise<void> => {
  try {
    const client = await getApiClient();
    await client.delete(`/api/v1/entry_points/${id}`);
  } catch (error) {
    throw error;
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
    const response = await client.post<ParkingSlot>('/api/v1/slots', { slot });
    return response.data;
  } catch (error) {
    throw error;
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
  id: string,
  slot: { slot_label?: string; slot_type?: 'SP' | 'MP' | 'LP'; distances?: number[] }
): Promise<ParkingSlot> => {
  try {
    const client = await getApiClient();
    const response = await client.put<ParkingSlot>(`/api/v1/slots/${id}`, { slot });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a parking slot
 *
 * @param id - Slot ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 */
export const deleteSlot = async (id: string): Promise<void> => {
  try {
    const client = await getApiClient();
    await client.delete(`/api/v1/slots/${id}`);
  } catch (error) {
    throw error;
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
  parkedAt?: string
): Promise<Session> {
  try {
    const client = await getApiClient();
    
    // CRITICAL: Use URLSearchParams for form-urlencoded format
    const params = new URLSearchParams();
    params.append('vehicle_type', vehicleType);
    params.append('entry_point_id', entryPointId);
    
    // Only add parked_at if provided
    if (parkedAt) {
      params.append('parked_at', parkedAt);
    }
    
    // CRITICAL: Override Content-Type to application/x-www-form-urlencoded
    const response = await client.post<ApiResponse<Session>>(
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
  
  // Configuration
  setApiBaseUrl,
  getApiBaseUrl,
  
  // Types
  ApiError,
};
