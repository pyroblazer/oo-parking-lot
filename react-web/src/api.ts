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
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8082/api/v1';

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
  entryPointId: EntryPointIdentifier
): Promise<ParkingSession> {
  try {
    const params = new URLSearchParams();
    params.append('vehicle_type', vehicleType);
    params.append('entry_point_id', entryPointId);
    
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
    const response = await api.delete<ApiResponse<{ message: string }>>(
      `/slots/${id}`
    );
    return extractData(response);
  } catch (error) {
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
    const response = await api.post<ApiResponse<EntryPoint>>(
      '/entry_points',
      entryPointData
    );
    return extractData(response);
  } catch (error) {
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
      entryPointData
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
