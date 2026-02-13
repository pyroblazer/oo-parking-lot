import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  VehicleType,
  EntryPointIdentifier,
  SessionId,
  EntryPoint,
  ParkingSession,
  AvailableSlotsResponse,
  UnparkVehicleResult,
  ApiResponse,
} from './types';

// Use environment variable for API URL
const API_BASE_URL = Platform.OS === 'web'
  ? (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1')
  : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1');

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Match web timeout
});

// Request interceptor for authentication
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Custom error class
export class ApiError extends Error {
  readonly name: string = 'ApiError';
  readonly status?: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, status?: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static fromAxiosError(error: unknown): ApiError {
    if (!axios.isAxiosError(error)) {
      return new ApiError('An unknown error occurred');
    }
    
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data as { error?: string; message?: string; details?: Record<string, unknown> } | undefined;
    
    return new ApiError(
      data?.error ?? axiosError.message ?? 'An unknown error occurred',
      status,
      data?.message,
      data?.details
    );
  }
}

// Helper function to extract data
function extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data;
}

// Helper function to extract error message
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string }>;
    return axiosError.response?.data?.error ?? axiosError.message ?? 'An unknown error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

// API functions with consistent error handling
export const parkVehicle = async (vehicleType: VehicleType, entryPointId: EntryPointIdentifier): Promise<ParkingSession> => {
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
};

export const unparkVehicle = async (sessionId: SessionId): Promise<UnparkVehicleResult> => {
  try {
    const response = await api.post<ApiResponse<UnparkVehicleResult>>(`/sessions/${sessionId}/unpark`);
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

export const getSession = async (sessionId: SessionId): Promise<ParkingSession> => {
  try {
    const response = await api.get<ApiResponse<ParkingSession>>(`/sessions/${sessionId}`);
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

export const getAvailableSlots = async (
  vehicleType: VehicleType,
  entryPointId: EntryPointIdentifier
): Promise<AvailableSlotsResponse> => {
  try {
    const response = await api.get<ApiResponse<AvailableSlotsResponse>>('/slots/available', {
      params: {
        vehicle_type: vehicleType,
        entry_point_id: entryPointId,
      },
    });
    return extractData(response);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

export const getEntryPoints = async (): Promise<EntryPoint[]> => {
  try {
    const response = await api.get<ApiResponse<EntryPoint[]>>('/entry_points');
    return response.data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// API client class for reusable requests
export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return extractData(response);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return extractData(response);
  }
}

export default api;
