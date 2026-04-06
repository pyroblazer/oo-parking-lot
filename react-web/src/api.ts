/**
 * API Module for OO Parking Lot Application
 * 
 * This module provides strongly-typed API functions for interacting with the backend.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  ApiErrorResponse,
  EntryPoint,
  ParkingSlot,
  ParkingSession,
  AvailableSlotsResponse,
  UnparkVehicleResult,
  VehicleType,
  EntryPointIdentifier,
  SessionId,
  RecentExit,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8082/api/v1';

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Custom axios instance with default configuration
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Request interceptor to add authentication tokens if available
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown): Promise<never> => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<ApiErrorResponse>): Promise<never> => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Error setting up request
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

/**
 * Extract data from API response
 */
function extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data;
}

/**
 * Extract error message from API error
 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message ?? 'An unknown error occurred';
  }
  return 'An unknown error occurred';
}

// ============================================================================
// HEALTH CHECK API
// ============================================================================

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
    };
  };
}

/**
 * Check the health status of the API
 * 
 * @returns Promise resolving to health check data
 * @throws Error if health check fails
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  try {
    // Health check endpoint returns a different format (no success/data wrapper)
    const response = await api.get<HealthCheckResponse>('/health');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// SYSTEM INITIALIZATION API
// ============================================================================

/**
 * System initialization request interface
 */
export interface SystemInitializationRequest {
  entry_points: Array<{
    identifier: string;
    name: string;
  }>;
  parking_slots: Array<{
    slot_label: string;
    slot_type: 'SP' | 'MP' | 'LP';
    distances: number[];
  }>;
}

/**
 * System initialization response interface
 */
export interface SystemInitializationResponse {
  entry_points_created: number;
  parking_slots_created: number;
  message: string;
}

/**
 * Initialize the parking system with entry points and parking slots
 * 
 * @param initData - System initialization data
 * @returns Promise resolving to initialization result
 * @throws Error if initialization fails
 */
export async function initializeSystem(
  initData: SystemInitializationRequest
): Promise<SystemInitializationResponse> {
  try {
    const response = await api.post<ApiResponse<SystemInitializationResponse>>(
      '/initialize',
      initData
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// PARKING SESSIONS API
// ============================================================================

/**
 * Park a vehicle at the parking lot
 * 
 * @param vehicleType - Type of vehicle (S, M, or L)
 * @param entryPointId - Entry point identifier
 * @returns Promise resolving to parking session data
 * @throws Error if parking fails
 */
export async function parkVehicle(
  vehicleType: VehicleType,
  entryPointId: EntryPointIdentifier,
  licensePlate?: string,
  previousSessionId?: string
): Promise<ParkingSession> {
  try {
    const params = new URLSearchParams();
    params.append('vehicle_type', vehicleType);
    params.append('entry_point_id', entryPointId);

    if (licensePlate) {
      params.append('license_plate', licensePlate);
    }

    if (previousSessionId) {
      params.append('previous_session_id', previousSessionId);
    }

    const response = await api.post<ApiResponse<ParkingSession>>('/sessions', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get recent exit sessions for continuous parking selection
 *
 * @param vehicleType - Vehicle type to filter by
 * @returns Promise resolving to array of recent exit sessions
 * @throws Error if retrieval fails
 */
export async function fetchRecentExits(
  vehicleType: VehicleType
): Promise<RecentExit[]> {
  try {
    const response = await api.get<ApiResponse<RecentExit[]>>(
      `/sessions/recent_exits?vehicle_type=${vehicleType}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get all parking sessions
 *
 * @returns Promise resolving to array of parking sessions
 * @throws Error if retrieval fails
 */
export async function getAllSessions(): Promise<ParkingSession[]> {
  try {
    const response = await api.get<ApiResponse<ParkingSession[]>>('/sessions');
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Unpark a vehicle from the parking lot
 * 
 * @param sessionId - Session ID of the vehicle to unpark
 * @param exitedAt - Optional exited_at timestamp in ISO8601 format (defaults to current time)
 * @returns Promise resolving to unpark result data
 * @throws Error if unparking fails
 */
export async function unparkVehicle(
  sessionId: SessionId,
  exitedAt?: string
): Promise<UnparkVehicleResult> {
  try {
    // Use current time if exitedAt is not provided
    const timestamp = exitedAt || new Date().toISOString();
    
    // Send exited_at as URL query parameter
    const url = `/sessions/${sessionId}/unpark?exited_at=${encodeURIComponent(timestamp)}`;
    
    const response = await api.post<ApiResponse<UnparkVehicleResult>>(url);
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get details of a parking session
 * 
 * @param sessionId - Session ID to retrieve
 * @returns Promise resolving to parking session data
 * @throws Error if retrieval fails
 */
export async function getSession(sessionId: SessionId): Promise<ParkingSession> {
  try {
    const response = await api.get<ApiResponse<ParkingSession>>(`/sessions/${sessionId}`);
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Delete a parking session
 * 
 * @param sessionId - Session ID to delete
 * @returns Promise resolving to deletion result
 * @throws Error if deletion fails
 */
export async function deleteSession(sessionId: SessionId): Promise<{ message: string }> {
  try {
    const response = await api.delete<ApiResponse<{ message: string }>>(
      `/sessions/${sessionId}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Update a parking session
 * 
 * @param sessionId - Session ID to update
 * @param exitedAt - Optional exited_at timestamp in ISO8601 format
 * @param totalFee - Optional total fee value
 * @returns Promise resolving to updated session
 * @throws Error if update fails
 */
export async function updateSession(
  sessionId: SessionId,
  exitedAt?: string,
  totalFee?: number
): Promise<ParkingSession> {
  try {
    const requestBody: any = {};
    
    if (exitedAt !== undefined) {
      requestBody.exited_at = exitedAt;
    }
    
    if (totalFee !== undefined) {
      requestBody.total_fee = totalFee;
    }
    
    const response = await api.put<ApiResponse<ParkingSession>>(
      `/sessions/${sessionId}`,
      requestBody
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// PARKING SLOTS API
// ============================================================================

/**
 * Get available parking slots based on vehicle type and entry point
 * 
 * @param vehicleType - Type of vehicle (S, M, or L)
 * @param entryPointId - Entry point identifier
 * @returns Promise resolving to available slots response
 * @throws Error if retrieval fails
 */
export async function getAvailableSlots(
  vehicleType: VehicleType,
  entryPointId: EntryPointIdentifier
): Promise<AvailableSlotsResponse> {
  try {
    const response = await api.get<ApiResponse<AvailableSlotsResponse>>(
      '/slots/available',
      {
        params: {
          vehicle_type: vehicleType,
          entry_point_id: entryPointId,
        },
      }
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get all parking slots
 * 
 * @returns Promise resolving to array of parking slots
 * @throws Error if retrieval fails
 */
export async function getAllSlots(): Promise<ParkingSlot[]> {
  try {
    const response = await api.get<ApiResponse<ParkingSlot[]>>('/slots');
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Create a new parking slot
 * 
 * @param slotData - Parking slot data to create
 * @returns Promise resolving to created parking slot
 * @throws Error if creation fails
 */
export async function createSlot(
  slotData: {
    slot_label: string;
    slot_type: 'SP' | 'MP' | 'LP';
    distances: number[];
  }
): Promise<ParkingSlot> {
  try {
    const response = await api.post<ApiResponse<ParkingSlot>>(
      '/slots',
      slotData
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Update a parking slot
 * 
 * @param id - Parking slot ID to update
 * @param slotData - Parking slot data to update
 * @returns Promise resolving to updated parking slot
 * @throws Error if update fails
 */
export async function updateSlot(
  id: number,
  slotData: {
    slot_label?: string;
    slot_type?: 'SP' | 'MP' | 'LP';
    distances?: number[];
  }
): Promise<ParkingSlot> {
  try {
    const response = await api.put<ApiResponse<ParkingSlot>>(
      `/slots/${id}`,
      slotData
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Delete a parking slot
 * 
 * @param id - Parking slot ID to delete
 * @returns Promise resolving to deletion result
 * @throws Error if deletion fails
 */
export async function deleteSlot(id: number): Promise<{ message: string }> {
  try {
    console.log('=== FRONTEND DELETE SLOT ===');
    console.log('Slot ID:', id);
    console.log('Slot ID type:', typeof id);
    console.log('Request URL:', `/slots/${id}`);
    
    const response = await api.delete<ApiResponse<{ message: string }>>(
      `/slots/${id}`
    );
    
    console.log('Delete response status:', response.status);
    console.log('Delete response data:', response.data);
    
    return extractData(response);
  } catch (error) {
    console.error('=== DELETE SLOT ERROR ===');
    console.error('Error details:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error response:', error.response);
      console.error('Axios error status:', error.response?.status);
      console.error('Axios error data:', error.response?.data);
      console.error('Axios error message:', error.message);
    }
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// ENTRY POINTS API
// ============================================================================

/**
 * Get all entry points
 * 
 * @returns Promise resolving to array of entry points
 * @throws Error if retrieval fails
 */
export async function getEntryPoints(): Promise<EntryPoint[]> {
  try {
    const response = await api.get<ApiResponse<EntryPoint[]>>('/entry_points');
    return response.data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Create a new entry point
 * 
 * @param entryPointData - Entry point data to create
 * @returns Promise resolving to created entry point
 * @throws Error if creation fails
 */
export async function createEntryPoint(
  entryPointData: {
    identifier: string;
    name: string;
  }
): Promise<EntryPoint> {
  try {
    console.log('=== CREATE ENTRY POINT FRONTEND ===');
    console.log('entryPointData:', entryPointData);
    console.log('Request payload:', { entry_point: entryPointData });

    const response = await api.post<ApiResponse<EntryPoint>>(
      '/entry_points',
      { entry_point: entryPointData }
    );

    console.log('Response:', response.data);
    return extractData(response);
  } catch (error) {
    console.error('Error in createEntryPoint:', error);
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Update an entry point
 * 
 * @param id - Entry point ID to update
 * @param entryPointData - Entry point data to update
 * @returns Promise resolving to updated entry point
 * @throws Error if update fails
 */
export async function updateEntryPoint(
  id: string,
  entryPointData: {
    identifier?: string;
    name?: string;
  }
): Promise<EntryPoint> {
  try {
    const response = await api.put<ApiResponse<EntryPoint>>(
      `/entry_points/${id}`,
      { entry_point: entryPointData }
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Delete an entry point
 * 
 * @param id - Entry point ID to delete
 * @returns Promise resolving to deletion result
 * @throws Error if deletion fails
 */
export async function deleteEntryPoint(id: string): Promise<{ message: string }> {
  try {
    const response = await api.delete<ApiResponse<{ message: string }>>(
      `/entry_points/${id}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// VEHICLES API
// ============================================================================

/**
 * Vehicle interface
 */
export interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: 'S' | 'M' | 'L';
  color?: string;
  brand?: string;
  model?: string;
  year?: number;
  metadata?: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at?: string;
  total_sessions: number;
  total_spent: number;
  total_hours_parked: number;
  is_frequent: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * List all vehicles with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @returns Promise resolving to paginated vehicles list
 * @throws Error if retrieval fails
 */
export async function listVehicles(
  page: number = 1,
  perPage: number = 20
): Promise<{ vehicles: Vehicle[]; total: number }> {
  try {
    const response = await api.get<ApiResponse<Vehicle[]>>(
      '/vehicles',
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
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get details of a specific vehicle
 * 
 * @param id - Vehicle ID to retrieve
 * @returns Promise resolving to vehicle details
 * @throws Error if vehicle not found (404)
 */
export async function getVehicle(id: string): Promise<Vehicle> {
  try {
    const response = await api.get<ApiResponse<Vehicle>>(
      `/vehicles/${id}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
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
 * @throws Error if creation fails
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
    
    const response = await api.post<ApiResponse<Vehicle>>(
      '/vehicles',
      requestBody
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
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
 * @throws Error if update fails
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
    
    const response = await api.put<ApiResponse<Vehicle>>(
      `/vehicles/${id}`,
      requestBody
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Delete a vehicle
 * 
 * @param id - Vehicle ID to delete
 * @returns Promise resolving to deletion result
 * @throws Error if deletion fails
 */
export async function deleteVehicle(id: string): Promise<{ message: string }> {
  try {
    const response = await api.delete<ApiResponse<{ message: string }>>(
      `/vehicles/${id}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// BILLING AUDIT LOGS API
// ============================================================================

/**
 * Billing audit log interface
 */
export interface BillingAuditLog {
  id: number;
  parking_session_id: number;
  vehicle_type: string;
  slot_label: string;
  slot_type: string;
  entry_point: string;
  parked_at: string;
  exited_at: string;
  total_fee: number;
  base_fee: number;
  exceeding_fee: number;
  exceeding_hours: number;
  long_term_days: number;
  long_term_fee: number;
  duration_hours: number;
  is_continuous: boolean;
  base_start_time?: string;
  fee_breakdown: {
    base_fee: number;
    exceeding_fee: number;
    long_term_fee: number;
    total_fee: number;
    duration_hours: number;
  };
  correlation_id?: string;
  idempotency_key?: string;
  billing_version: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * List all billing audit logs with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @returns Promise resolving to paginated billing audit logs list
 * @throws Error if retrieval fails
 */
export async function listBillingAuditLogs(
  page: number = 1,
  perPage: number = 20
): Promise<{ logs: BillingAuditLog[]; total: number }> {
  try {
    const response = await api.get<ApiResponse<BillingAuditLog[]>>(
      '/billing_audit_logs',
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
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get details of a specific billing audit log
 * 
 * @param id - Billing audit log ID to retrieve
 * @returns Promise resolving to billing audit log details
 * @throws Error if audit log not found (404)
 */
export async function getBillingAuditLog(id: string): Promise<BillingAuditLog> {
  try {
    const response = await api.get<ApiResponse<BillingAuditLog>>(
      `/billing_audit_logs/${id}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get billing audit logs by parking session ID
 * 
 * @param sessionId - Parking session ID to filter by
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @returns Promise resolving to paginated billing audit logs list
 * @throws Error if retrieval fails
 */
export async function getBillingAuditLogsBySession(
  sessionId: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ logs: BillingAuditLog[]; total: number }> {
  try {
    const response = await api.get<ApiResponse<BillingAuditLog[]>>(
      '/billing_audit_logs',
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
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// KAFKA EVENTS API
// ============================================================================

/**
 * Kafka event interface
 */
export interface KafkaEvent {
  id: string;
  event_type: string;
  topic: string;
  partition: number;
  offset?: number;
  event_key?: string;
  event_payload: Record<string, unknown>;
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  event_id: string;
  occurred_at: string;
  published_at?: string;
  status: 'pending' | 'published' | 'failed' | 'retrying';
  retry_count: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * List all Kafka events with pagination
 * 
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @returns Promise resolving to paginated Kafka events list
 * @throws Error if retrieval fails
 */
export async function listKafkaEvents(
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const response = await api.get<ApiResponse<KafkaEvent[]>>(
      '/kafka_events',
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
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get details of a specific Kafka event
 * 
 * @param id - Kafka event ID to retrieve
 * @returns Promise resolving to Kafka event details
 * @throws Error if event not found (404)
 */
export async function getKafkaEvent(id: string): Promise<KafkaEvent> {
  try {
    const response = await api.get<ApiResponse<KafkaEvent>>(
      `/kafka_events/${id}`
    );
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get Kafka events by status
 * 
 * @param status - Event status to filter by ('pending', 'published', 'failed', or 'retrying')
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @returns Promise resolving to paginated Kafka events list
 * @throws Error if retrieval fails
 */
export async function getKafkaEventsByStatus(
  status: 'pending' | 'published' | 'failed' | 'retrying',
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const response = await api.get<ApiResponse<KafkaEvent[]>>(
      '/kafka_events',
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
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Get Kafka events by event type
 * 
 * @param eventType - Event type to filter by (e.g., 'vehicle.parked', 'vehicle.unparked')
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @returns Promise resolving to paginated Kafka events list
 * @throws Error if retrieval fails
 */
export async function getKafkaEventsByType(
  eventType: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ events: KafkaEvent[]; total: number }> {
  try {
    const response = await api.get<ApiResponse<KafkaEvent[]>>(
      '/kafka_events',
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
    throw new Error(extractErrorMessage(error));
  }
}

// ============================================================================
// EXPORT DEFAULT API INSTANCE
// ============================================================================

export default api;

// ============================================================================
// API ERROR CLASS
// ============================================================================

/**
 * Custom API error class for better error handling
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
    return new ApiError(
      data?.error ?? error.message ?? 'An unknown error occurred',
      status,
      data?.message,
      data?.details
    );
  }
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

/**
 * API client class for making typed API requests
 */
export class ApiClient {
  private readonly client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL ?? API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: InternalAxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return extractData(response);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: unknown, config?: InternalAxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return extractData(response);
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: unknown, config?: InternalAxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return extractData(response);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: InternalAxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return extractData(response);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: unknown, config?: InternalAxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return extractData(response);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const apiClient = new ApiClient();
