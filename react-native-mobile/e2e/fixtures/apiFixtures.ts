/**
 * API Fixtures for E2E Tests
 * 
 * Provides API helper methods for test setup and teardown.
 * These fixtures help manage test data through the backend API.
 */

// API Base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8082';

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ParkResponse {
  sessionId: string;
  slotId: string;
  slotNumber: string;
  entryPointId: string;
  entryPointName: string;
  vehicleType: 'small' | 'medium' | 'large';
  vehiclePlate: string;
  entryTime: string;
}

export interface UnparkResponse {
  sessionId: string;
  fee: number;
  exitTime: string;
  duration: number;
}

export interface SessionResponse {
  id: string;
  sessionId: string;
  slotId: string;
  slotNumber: string;
  entryPointId: string;
  entryPointName: string;
  vehicleType: 'small' | 'medium' | 'large';
  vehiclePlate: string;
  entryTime: string;
  exitTime?: string;
  status: 'active' | 'completed' | 'cancelled';
  fee?: number;
}

export interface SlotResponse {
  id: string;
  slotNumber: string;
  slotType: 'small' | 'medium' | 'large';
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface EntryPointResponse {
  id: string;
  identifier: string;
  name: string;
  location: string;
}

export interface InitializationResponse {
  success: boolean;
  message: string;
  totalSlots: number;
  smallSlots: number;
  mediumSlots: number;
  largeSlots: number;
  entryPoints: string[];
}

/**
 * API Helper Class
 */
export class ApiFixtures {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the API
   */
  private async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a POST request to the API
   */
  private async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a PUT request to the API
   */
  private async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a DELETE request to the API
   */
  private async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a parking session via API
   */
  async createParkingSession(data: {
    slotId: string;
    entryPointId: string;
    vehiclePlate: string;
    vehicleType: 'small' | 'medium' | 'large';
  }): Promise<ApiResponse<ParkResponse>> {
    return await this.post<ParkResponse>('/api/v1/sessions', data);
  }

  /**
   * Complete a parking session via API
   */
  async completeParkingSession(sessionId: string): Promise<ApiResponse<UnparkResponse>> {
    return await this.post<UnparkResponse>(`/api/v1/sessions/${sessionId}/exit`, {});
  }

  /**
   * Get a parking session by ID via API
   */
  async getSession(sessionId: string): Promise<ApiResponse<SessionResponse>> {
    return await this.get<SessionResponse>(`/api/v1/sessions/${sessionId}`);
  }

  /**
   * Get all parking sessions via API
   */
  async getSessions(params?: {
    status?: 'active' | 'completed' | 'cancelled';
    vehicleType?: 'small' | 'medium' | 'large';
  }): Promise<ApiResponse<SessionResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vehicleType) queryParams.append('vehicleType', params.vehicleType);
    
    const queryString = queryParams.toString();
    return await this.get<SessionResponse[]>(`/api/v1/sessions${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get available parking slots via API
   */
  async getAvailableSlots(params?: {
    vehicleType?: 'small' | 'medium' | 'large';
  }): Promise<ApiResponse<SlotResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.vehicleType) queryParams.append('vehicleType', params.vehicleType);
    
    const queryString = queryParams.toString();
    return await this.get<SlotResponse[]>(`/api/v1/slots/available${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get all parking slots via API
   */
  async getAllSlots(): Promise<ApiResponse<SlotResponse[]>> {
    return await this.get<SlotResponse[]>('/api/v1/slots');
  }

  /**
   * Get all entry points via API
   */
  async getEntryPoints(): Promise<ApiResponse<EntryPointResponse[]>> {
    return await this.get<EntryPointResponse[]>('/api/v1/entry-points');
  }

  /**
   * Initialize parking lot via API
   */
  async initializeParkingLot(data: {
    totalSlots: number;
    smallSlots: number;
    mediumSlots: number;
    largeSlots: number;
    entryPoints: string[];
  }): Promise<ApiResponse<InitializationResponse>> {
    return await this.post<InitializationResponse>('/api/v1/initializations', data);
  }

  /**
   * Clear all parking data via API (for test cleanup)
   */
  async clearAllSessions(): Promise<ApiResponse<void>> {
    try {
      return await this.delete<void>('/api/v1/sessions');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear all slots via API (for test cleanup)
   */
  async clearAllSlots(): Promise<ApiResponse<void>> {
    try {
      return await this.delete<void>('/api/v1/slots');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reset parking lot via API (for test cleanup)
   */
  async resetParkingLot(): Promise<ApiResponse<void>> {
    try {
      return await this.delete<void>('/api/v1/initializations');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Health check via API
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return await this.get<{ status: string; timestamp: string }>('/api/v1/health');
  }

  /**
   * Setup test data - create parking lot with sample data
   */
  async setupTestData(): Promise<{
    success: boolean;
    error?: string;
  }> {
    const initResult = await this.initializeParkingLot({
      totalSlots: 10,
      smallSlots: 3,
      mediumSlots: 4,
      largeSlots: 3,
      entryPoints: ['Main Gate', 'North Entrance'],
    });

    if (!initResult.success) {
      return {
        success: false,
        error: initResult.error || 'Failed to initialize parking lot',
      };
    }

    return { success: true };
  }

  /**
   * Cleanup test data - remove all sessions and slots
   */
  async cleanupTestData(): Promise<{
    success: boolean;
    error?: string;
  }> {
    const clearSessionsResult = await this.clearAllSessions();
    if (!clearSessionsResult.success) {
      return {
        success: false,
        error: clearSessionsResult.error || 'Failed to clear sessions',
      };
    }

    const clearSlotsResult = await this.clearAllSlots();
    if (!clearSlotsResult.success) {
      return {
        success: false,
        error: clearSlotsResult.error || 'Failed to clear slots',
      };
    }

    return { success: true };
  }

  /**
   * Create a test session for use in tests
   */
  async createTestSession(vehicleType: 'small' | 'medium' | 'large' = 'small'): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> {
    // First get available slots
    const slotsResult = await this.getAvailableSlots({ vehicleType });
    if (!slotsResult.success || !slotsResult.data || slotsResult.data.length === 0) {
      return {
        success: false,
        error: 'No available slots for test session',
      };
    }

    // Get entry points
    const entryPointsResult = await this.getEntryPoints();
    if (!entryPointsResult.success || !entryPointsResult.data || entryPointsResult.data.length === 0) {
      return {
        success: false,
        error: 'No entry points available',
      };
    }

    // Create session
    const sessionResult = await this.createParkingSession({
      slotId: slotsResult.data[0].id,
      entryPointId: entryPointsResult.data[0].id,
      vehiclePlate: 'AB 123 C',
      vehicleType,
    });

    if (!sessionResult.success) {
      return {
        success: false,
        error: sessionResult.error || 'Failed to create test session',
      };
    }

    return {
      success: true,
      sessionId: sessionResult.data?.sessionId,
    };
  }

  /**
   * Complete a test session
   */
  async completeTestSession(sessionId: string): Promise<{
    success: boolean;
    fee?: number;
    error?: string;
  }> {
    const result = await this.completeParkingSession(sessionId);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to complete test session',
      };
    }

    return {
      success: true,
      fee: result.data?.fee,
    };
  }

  /**
   * Wait for API to be ready
   */
  async waitForApiReady(maxAttempts: number = 30, interval: number = 1000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.healthCheck();
        if (result.success && result.data?.status === 'ok') {
          return true;
        }
      } catch {
        // API not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  // ==================== Vehicles API ====================

  /**
   * List vehicles
   */
  async listVehicles(page: number = 1, perPage: number = 20): Promise<ApiResponse<any>> {
    return await this.get(`/api/v1/vehicles?page=${page}&per_page=${perPage}`);
  }

  /**
   * Create a vehicle
   */
  async createVehicle(data: {
    license_plate: string;
    vehicle_type: 'S' | 'M' | 'L';
    color?: string;
    brand?: string;
    model?: string;
    year?: number;
  }): Promise<ApiResponse<any>> {
    return await this.post('/api/v1/vehicles', data);
  }

  /**
   * Update a vehicle
   */
  async updateVehicle(id: string, data: {
    license_plate?: string;
    vehicle_type?: 'S' | 'M' | 'L';
    color?: string;
    brand?: string;
    model?: string;
    year?: number;
  }): Promise<ApiResponse<any>> {
    return await this.put(`/api/v1/vehicles/${id}`, data);
  }

  /**
   * Delete a vehicle
   */
  async deleteVehicle(id: string): Promise<ApiResponse<any>> {
    return await this.delete(`/api/v1/vehicles/${id}`);
  }

  // ==================== Billing Audit Logs API ====================

  /**
   * List billing audit logs
   */
  async listBillingAuditLogs(page: number = 1, perPage: number = 20): Promise<ApiResponse<any>> {
    return await this.get(`/api/v1/billing_audit_logs?page=${page}&per_page=${perPage}`);
  }

  /**
   * Get billing audit logs by session
   */
  async getBillingAuditLogsBySession(sessionId: string): Promise<ApiResponse<any>> {
    return await this.get(`/api/v1/billing_audit_logs/session/${sessionId}`);
  }

  // ==================== Kafka Events API ====================

  /**
   * List kafka events
   */
  async listKafkaEvents(page: number = 1, perPage: number = 20): Promise<ApiResponse<any>> {
    return await this.get(`/api/v1/kafka_events?page=${page}&per_page=${perPage}`);
  }

  /**
   * Get kafka events by status
   */
  async getKafkaEventsByStatus(status: string): Promise<ApiResponse<any>> {
    return await this.get(`/api/v1/kafka_events/status/${status}`);
  }

  /**
   * Get kafka events by event type
   */
  async getKafkaEventsByType(eventType: string): Promise<ApiResponse<any>> {
    return await this.get(`/api/v1/kafka_events/event-type/${eventType}`);
  }
}

/**
 * Create a singleton instance of API fixtures
 */
export const apiFixtures = new ApiFixtures();

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  parkSuccess: {
    success: true,
    data: {
      sessionId: 'SES-12345',
      slotId: '1',
      slotNumber: 'SP-1',
      entryPointId: '1',
      entryPointName: 'Main Gate',
      vehicleType: 'small',
      vehiclePlate: 'AB 123 C',
      entryTime: new Date().toISOString(),
    } as ParkResponse,
  },

  unparkSuccess: {
    success: true,
    data: {
      sessionId: 'SES-12345',
      fee: 10.00,
      exitTime: new Date().toISOString(),
      duration: 1,
    } as UnparkResponse,
  },

  sessionSuccess: {
    success: true,
    data: {
      id: '1',
      sessionId: 'SES-12345',
      slotId: '1',
      slotNumber: 'SP-1',
      entryPointId: '1',
      entryPointName: 'Main Gate',
      vehicleType: 'small',
      vehiclePlate: 'AB 123 C',
      entryTime: new Date(Date.now() - 3600000).toISOString(),
      exitTime: undefined,
      status: 'active',
      fee: undefined,
    } as SessionResponse,
  },

  availableSlotsSuccess: {
    success: true,
    data: [
      {
        id: '1',
        slotNumber: 'SP-1',
        slotType: 'small',
        floor: 1,
        status: 'available',
      },
      {
        id: '2',
        slotNumber: 'SP-2',
        slotType: 'small',
        floor: 1,
        status: 'available',
      },
      {
        id: '3',
        slotNumber: 'SP-3',
        slotType: 'small',
        floor: 1,
        status: 'available',
      },
    ] as SlotResponse[],
  },

  entryPointsSuccess: {
    success: true,
    data: [
      {
        id: '1',
        identifier: 'A',
        name: 'Main Gate',
        location: 'Front of building',
      },
      {
        id: '2',
        identifier: 'B',
        name: 'North Entrance',
        location: 'North side of building',
      },
      {
        id: '3',
        identifier: 'C',
        name: 'South Entrance',
        location: 'South side of building',
      },
    ] as EntryPointResponse[],
  },

  initializationSuccess: {
    success: true,
    data: {
      success: true,
      message: 'Parking lot initialized successfully',
      totalSlots: 10,
      smallSlots: 3,
      mediumSlots: 4,
      largeSlots: 3,
      entryPoints: ['Main Gate', 'North Entrance'],
    } as InitializationResponse,
  },

  healthCheckSuccess: {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  },

  errorResponse: {
    success: false,
    error: 'An error occurred',
  },
};

/**
 * Export API fixtures
 */
export const ApiFixturesExport = {
  ApiFixtures,
  apiFixtures,
  mockApiResponses,
} as const;
