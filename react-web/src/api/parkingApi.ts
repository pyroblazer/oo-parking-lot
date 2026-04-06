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
  readonly fee_breakdown: {
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
 * Kafka event representation
 */
export interface KafkaEvent {
  readonly id: string;
  readonly event_type: string;
  readonly topic: string;
  readonly partition: number;
  readonly offset?: number;
  readonly event_key?: string;
  readonly event_payload: Record<string, unknown>;
  readonly correlation_id?: string;
  readonly causation_id?: string;
  readonly idempotency_key?: string;
  readonly event_id: string;
  readonly occurred_at: string;
  readonly published_at?: string;
  readonly status: 'pending' | 'published' | 'failed' | 'retrying';
  readonly retry_count: number;
  readonly error_message?: string;
  readonly metadata?: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
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

/**
 * Get details of a specific entry point
 * 
 * @param id - Entry point ID to retrieve
 * @returns Promise resolving to entry point details
 * @throws ApiError if entry point not found (404)
 * 
 * @example
 * ```typescript
 * const entryPoint = await getEntryPoint('1');
 * console.log(entryPoint.identifier); // 'A'
 * console.log(entryPoint.name); // 'Entry Point A'
 * ```
 */
export async function getEntryPoint(id: string): Promise<EntryPoint> {
  try {
    const response = await apiClient.get<ApiResponse<EntryPoint>>(
      `/api/v1/entry_points/${id}`
    );
    return extractData(response);
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

/**
 * Create a new parking slot
 *
 * @param slotLabel - Slot label (e.g., 'SP-1', 'MP-1', 'LP-1')
 * @param slotType - Slot type ('SP', 'MP', or 'LP')
 * @param distances - Array of distances from each entry point [distance_from_A, distance_from_B, distance_from_C]
 * @returns Promise resolving to created parking slot
 * @throws ApiError if creation fails
 *
 * @example
 * ```typescript
 * const newSlot = await createSlot('SP-4', 'SP', [5, 10, 15]);
 * console.log(newSlot.id); // '4'
 * console.log(newSlot.slot_label); // 'SP-4'
 * ```
 */
export async function createSlot(
  slotLabel: string,
  slotType: 'SP' | 'MP' | 'LP',
  distances: number[]
): Promise<ParkingSlot> {
  try {
    const response = await apiClient.post<ApiResponse<ParkingSlot>>(
      '/api/v1/slots',
      {
        slot_label: slotLabel,
        slot_type: slotType,
        distances: distances,
      }
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Update an existing parking slot
 *
 * @param id - Slot ID to update
 * @param slotLabel - New slot label (optional, keeps existing if not provided)
 * @param slotType - New slot type (optional, keeps existing if not provided)
 * @param distances - New distances array (optional, keeps existing if not provided)
 * @returns Promise resolving to updated parking slot
 * @throws ApiError if update fails
 *
 * @example
 * ```typescript
 * // Update only the label
 * const updated = await updateSlot('1', 'SP-1-Updated');
 *
 * // Update only distances
 * const updated = await updateSlot('1', undefined, undefined, [10, 20, 30]);
 *
 * // Update both label and type
 * const updated = await updateSlot('1', 'MP-1', 'MP', [15, 25, 35]);
 * ```
 */
export async function updateSlot(
  id: string,
  slotLabel?: string,
  slotType?: 'SP' | 'MP' | 'LP',
  distances?: number[]
): Promise<ParkingSlot> {
  try {
    const requestBody: any = {};
    
    if (slotLabel !== undefined) {
      requestBody.slot_label = slotLabel;
    }
    
    if (slotType !== undefined) {
      requestBody.slot_type = slotType;
    }
    
    if (distances !== undefined) {
      requestBody.distances = distances;
    }
    
    const response = await apiClient.put<ApiResponse<ParkingSlot>>(
      `/api/v1/slots/${id}`,
      requestBody
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a parking slot
 *
 * @param id - Slot ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 *
 * @example
 * ```typescript
 * await deleteSlot('1');
 * console.log('Slot deleted');
 * ```
 */
export async function deleteSlot(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/slots/${id}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get details of a specific parking slot
 *
 * @param id - Slot ID to retrieve
 * @returns Promise resolving to parking slot details
 * @throws ApiError if slot not found (404)
 *
 * @example
 * ```typescript
 * const slot = await getSlot('1');
 * console.log(slot.slot_label); // 'SP-1'
 * console.log(slot.available); // true
 * ```
 */
export async function getSlot(id: string): Promise<ParkingSlot> {
  try {
    const response = await apiClient.get<ApiResponse<ParkingSlot>>(
      `/api/v1/slots/${id}`
    );
    return extractData(response);
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

/**
 * Update a parking session
 * 
 * @param sessionId - Session ID to update
 * @param exitedAt - Optional exited_at timestamp in ISO8601 format
 * @param totalFee - Optional total fee value
 * @returns Promise resolving to updated session
 * @throws ApiError if update fails
 * 
 * @example
 * ```typescript
 * const updated = await updateSession('session-123', '2024-01-15T14:30:00Z', 40.0);
 * console.log(updated.exited_at); // '2024-01-15T14:30:00Z'
 * console.log(updated.total_fee); // 40.0
 * ```
 */
export async function updateSession(
  sessionId: string,
  exitedAt?: string,
  totalFee?: number
): Promise<Session> {
  try {
    const requestBody: any = {};
    
    if (exitedAt !== undefined) {
      requestBody.exited_at = exitedAt;
    }
    
    if (totalFee !== undefined) {
      requestBody.total_fee = totalFee;
    }
    
    const response = await apiClient.put<ApiResponse<Session>>(
      `/api/v1/sessions/${sessionId}`,
      requestBody
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
 * 
 * @example
 * ```typescript
 * await deleteSession('session-123');
 * console.log('Session deleted');
 * ```
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/sessions/${sessionId}`);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// VEHICLES API
// ============================================================================

/**
 * List all vehicles with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated vehicles list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * // Get first page with default page size
 * const page1 = await listVehicles();
 * console.log(page1.vehicles.length); // 20
 * console.log(page1.total); // 150
 * 
 * // Get second page with custom page size
 * const page2 = await listVehicles(2, 50);
 * ```
 */
export async function listVehicles(
  page: number = 1,
  perPage: number = 20
): Promise<{ vehicles: Vehicle[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<Vehicle[]>>(
      '/api/v1/vehicles',
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
      vehicles: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get details of a specific vehicle
 * 
 * @param id - Vehicle ID to retrieve
 * @returns Promise resolving to vehicle details
 * @throws ApiError if vehicle not found (404)
 * 
 * @example
 * ```typescript
 * const vehicle = await getVehicle('vehicle-123');
 * console.log(vehicle.license_plate); // 'ABC-1234'
 * console.log(vehicle.vehicle_type); // 'S'
 * ```
 */
export async function getVehicle(id: string): Promise<Vehicle> {
  try {
    const response = await apiClient.get<ApiResponse<Vehicle>>(
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
 * @param licensePlate - Vehicle license plate
 * @param vehicleType - Type of vehicle ('S', 'M', or 'L')
 * @param color - Optional vehicle color
 * @param brand - Optional vehicle brand
 * @param model - Optional vehicle model
 * @param year - Optional vehicle year
 * @param metadata - Optional additional metadata
 * @returns Promise resolving to created vehicle
 * @throws ApiError if creation fails
 * 
 * @example
 * ```typescript
 * const newVehicle = await createVehicle(
 *   'ABC-1234',
 *   'S',
 *   'Red',
 *   'Toyota',
 *   'Vios',
 *   2020
 * );
 * console.log(newVehicle.id); // 'vehicle-123'
 * console.log(newVehicle.license_plate); // 'ABC-1234'
 * ```
 */
export async function createVehicle(
  licensePlate: string,
  vehicleType: 'S' | 'M' | 'L',
  color?: string,
  brand?: string,
  model?: string,
  year?: number,
  metadata?: Record<string, unknown>
): Promise<Vehicle> {
  try {
    const requestBody: any = {
      license_plate: licensePlate,
      vehicle_type: vehicleType,
    };
    
    if (color !== undefined) {
      requestBody.color = color;
    }
    
    if (brand !== undefined) {
      requestBody.brand = brand;
    }
    
    if (model !== undefined) {
      requestBody.model = model;
    }
    
    if (year !== undefined) {
      requestBody.year = year;
    }
    
    if (metadata !== undefined) {
      requestBody.metadata = metadata;
    }
    
    const response = await apiClient.post<ApiResponse<Vehicle>>(
      '/api/v1/vehicles',
      requestBody
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
 * @param licensePlate - Optional new license plate
 * @param vehicleType - Optional new vehicle type
 * @param color - Optional new color
 * @param brand - Optional new brand
 * @param model - Optional new model
 * @param year - Optional new year
 * @param metadata - Optional new metadata
 * @returns Promise resolving to updated vehicle
 * @throws ApiError if update fails
 * 
 * @example
 * ```typescript
 * // Update only color
 * const updated = await updateVehicle('vehicle-123', undefined, undefined, 'Blue');
 * 
 * // Update multiple fields
 * const updated = await updateVehicle('vehicle-123', 'XYZ-5678', 'M', 'Blue', 'Honda', 'City', 2021);
 * ```
 */
export async function updateVehicle(
  id: string,
  licensePlate?: string,
  vehicleType?: 'S' | 'M' | 'L',
  color?: string,
  brand?: string,
  model?: string,
  year?: number,
  metadata?: Record<string, unknown>
): Promise<Vehicle> {
  try {
    const requestBody: any = {};
    
    if (licensePlate !== undefined) {
      requestBody.license_plate = licensePlate;
    }
    
    if (vehicleType !== undefined) {
      requestBody.vehicle_type = vehicleType;
    }
    
    if (color !== undefined) {
      requestBody.color = color;
    }
    
    if (brand !== undefined) {
      requestBody.brand = brand;
    }
    
    if (model !== undefined) {
      requestBody.model = model;
    }
    
    if (year !== undefined) {
      requestBody.year = year;
    }
    
    if (metadata !== undefined) {
      requestBody.metadata = metadata;
    }
    
    const response = await apiClient.put<ApiResponse<Vehicle>>(
      `/api/v1/vehicles/${id}`,
      requestBody
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
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails
 * 
 * @example
 * ```typescript
 * await deleteVehicle('vehicle-123');
 * console.log('Vehicle deleted');
 * ```
 */
export async function deleteVehicle(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/vehicles/${id}`);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// BILLING AUDIT LOGS API
// ============================================================================

/**
 * List all billing audit logs with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated billing audit logs list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * // Get first page with default page size
 * const page1 = await listBillingAuditLogs();
 * console.log(page1.logs.length); // 20
 * console.log(page1.total); // 150
 * 
 * // Get second page with custom page size
 * const page2 = await listBillingAuditLogs(2, 50);
 * ```
 */
export async function listBillingAuditLogs(
  page: number = 1,
  perPage: number = 20
): Promise<{ logs: BillingAuditLog[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<BillingAuditLog[]>>(
      '/api/v1/billing_audit_logs',
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
      logs: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get details of a specific billing audit log
 * 
 * @param id - Billing audit log ID to retrieve
 * @returns Promise resolving to billing audit log details
 * @throws ApiError if audit log not found (404)
 * 
 * @example
 * ```typescript
 * const log = await getBillingAuditLog('1');
 * console.log(log.parking_session_id); // 123
 * console.log(log.total_fee); // 40.0
 * ```
 */
export async function getBillingAuditLog(id: string): Promise<BillingAuditLog> {
  try {
    const response = await apiClient.get<ApiResponse<BillingAuditLog>>(
      `/api/v1/billing_audit_logs/${id}`
    );
    return extractData(response);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get billing audit logs by parking session ID
 * 
 * @param sessionId - Parking session ID to filter by
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated billing audit logs list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * const logs = await getBillingAuditLogsBySession('session-123');
 * console.log(logs.logs.length); // 1
 * console.log(logs.logs[0].total_fee); // 40.0
 * ```
 */
export async function getBillingAuditLogsBySession(
  sessionId: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ logs: BillingAuditLog[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<BillingAuditLog[]>>(
      '/api/v1/billing_audit_logs',
      {
        params: {
          session_id: sessionId,
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
 * List all Kafka events with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated Kafka events list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * // Get first page with default page size
 * const page1 = await listKafkaEvents();
 * console.log(page1.events.length); // 20
 * console.log(page1.total); // 150
 * 
 * // Get second page with custom page size
 * const page2 = await listKafkaEvents(2, 50);
 * ```
 */
export async function listKafkaEvents(
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<KafkaEvent[]>>(
      '/api/v1/kafka_events',
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
      events: extractData(response),
      total,
    };
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get details of a specific Kafka event
 * 
 * @param id - Kafka event ID to retrieve
 * @returns Promise resolving to Kafka event details
 * @throws ApiError if event not found (404)
 * 
 * @example
 * ```typescript
 * const event = await getKafkaEvent('event-123');
 * console.log(event.event_type); // 'vehicle.parked'
 * console.log(event.status); // 'published'
 * ```
 */
export async function getKafkaEvent(id: string): Promise<KafkaEvent> {
  try {
    const response = await apiClient.get<ApiResponse<KafkaEvent>>(
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
 * @param status - Event status to filter by ('pending', 'published', 'failed', or 'retrying')
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated Kafka events list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * const events = await getKafkaEventsByStatus('failed');
 * console.log(events.events.length); // 5
 * console.log(events.events[0].error_message); // 'Connection timeout'
 * ```
 */
export async function getKafkaEventsByStatus(
  status: 'pending' | 'published' | 'failed' | 'retrying',
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<KafkaEvent[]>>(
      '/api/v1/kafka_events',
      {
        params: {
          status,
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
 * @param eventType - Event type to filter by (e.g., 'vehicle.parked', 'vehicle.unparked')
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20, max: 100)
 * @returns Promise resolving to paginated Kafka events list
 * @throws ApiError if retrieval fails
 * 
 * @example
 * ```typescript
 * const events = await getKafkaEventsByType('vehicle.parked');
 * console.log(events.events.length); // 50
 * console.log(events.events[0].topic); // 'vehicle.parked'
 * ```
 */
export async function getKafkaEventsByType(
  eventType: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const response = await apiClient.get<ApiResponse<KafkaEvent[]>>(
      '/api/v1/kafka_events',
      {
        params: {
          event_type: eventType,
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
  getEntryPoint,
  
  // Slots
  listSlots,
  getAvailableSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getSlot,
  
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
