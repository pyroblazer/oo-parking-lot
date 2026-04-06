import { APIRequestContext } from '@playwright/test';

/**
 * API Fixtures for Test Setup
 * 
 * Provides API helper functions for setting up and tearing down test data.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8082';

/**
 * API response interfaces
 */
export interface HealthCheckResponse {
  status: string;
  api: string;
  database: string;
  timestamp: string;
}

export interface InitializationResponse {
  success: boolean;
  message: string;
  data?: {
    totalSlots: number;
    smallSlots: number;
    mediumSlots: number;
    largeSlots: number;
    entryPoints: string[];
  };
}

export interface ParkingSessionResponse {
  success: boolean;
  message: string;
  data?: {
    sessionId: string;
    slotNumber: string;
    entryTime: string;
    vehiclePlate: string;
    vehicleType: string;
    entryPoint: string;
  };
}

export interface UnparkSessionResponse {
  success: boolean;
  message: string;
  data?: {
    sessionId: string;
    exitTime: string;
    fee: {
      baseFee: number;
      exceedingHours: number;
      exceedingFee: number;
      longTermFee: number;
      totalFee: number;
    };
  };
}

export interface GetSessionResponse {
  success: boolean;
  data?: {
    sessionId: string;
    slotNumber: string;
    vehiclePlate: string;
    vehicleType: string;
    entryPoint: string;
    entryTime: string;
    exitTime: string | null;
    status: string;
    duration: string;
    fee: number | null;
  };
}

export interface SlotsResponse {
  success: boolean;
  data?: Array<{
    id: string;
    slotNumber: string;
    slotType: 'small' | 'medium' | 'large';
    floor: number;
    status: 'available' | 'occupied' | 'maintenance';
  }>;
}

export interface EntryPointsResponse {
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    location: string;
  }>;
}

export interface SessionsResponse {
  success: boolean;
  data?: Array<{
    id: string;
    sessionId: string;
    slotNumber: string;
    vehiclePlate: string;
    vehicleType: string;
    entryTime: string;
    exitTime: string | null;
    status: string;
    fee: number | null;
  }>;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API Fixtures Class
 */
export class ApiFixtures {
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Perform a health check
   * @returns Health check response
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.request.get(`${API_BASE_URL}/health`);
    return await response.json();
  }

  /**
   * Initialize the parking lot system
   * @param config - Initialization configuration
   * @returns Initialization response
   */
  async initializeSystem(config: {
    totalSlots: number;
    smallSlots: number;
    mediumSlots: number;
    largeSlots: number;
    entryPoints: string[];
  }): Promise<InitializationResponse> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/initializations`, {
      data: config,
    });
    return await response.json();
  }

  /**
   * Create a parking session (park a vehicle)
   * @param data - Parking session data
   * @returns Parking session response
   */
  async createParkingSession(data: {
    slotId: string;
    entryPointId: string;
    vehiclePlate: string;
    vehicleType: 'small' | 'medium' | 'large';
  }): Promise<ParkingSessionResponse> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/sessions`, {
      data,
    });
    return await response.json();
  }

  /**
   * Complete a parking session (unpark a vehicle)
   * @param sessionId - The session ID to complete
   * @returns Unpark session response
   */
  async completeParkingSession(sessionId: string): Promise<UnparkSessionResponse> {
    const response = await this.request.post(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}/exit`
    );
    return await response.json();
  }

  /**
   * Get a specific session by ID
   * @param sessionId - The session ID to retrieve
   * @returns Session response
   */
  async getSession(sessionId: string): Promise<GetSessionResponse> {
    const response = await this.request.get(
      `${API_BASE_URL}/api/v1/sessions/${sessionId}`
    );
    return await response.json();
  }

  /**
   * Get all parking sessions
   * @param params - Optional query parameters
   * @returns Sessions response
   */
  async getSessions(params?: {
    page?: number;
    perPage?: number;
    status?: string;
    vehicleType?: string;
  }): Promise<SessionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vehicleType) queryParams.append('vehicleType', params.vehicleType);

    const url = `${API_BASE_URL}/api/v1/sessions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request.get(url);
    return await response.json();
  }

  /**
   * Get all parking slots
   * @param params - Optional query parameters
   * @returns Slots response
   */
  async getSlots(params?: {
    type?: 'small' | 'medium' | 'large';
    status?: 'available' | 'occupied' | 'maintenance';
    floor?: number;
  }): Promise<SlotsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.floor) queryParams.append('floor', params.floor.toString());

    const url = `${API_BASE_URL}/api/v1/slots${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request.get(url);
    return await response.json();
  }

  /**
   * Get available parking slots
   * @param vehicleType - Optional vehicle type filter
   * @returns Slots response
   */
  async getAvailableSlots(vehicleType?: 'small' | 'medium' | 'large'): Promise<SlotsResponse> {
    const params: { type?: 'small' | 'medium' | 'large'; status: 'available' } = {
      status: 'available',
    };
    if (vehicleType) {
      params.type = vehicleType;
    }
    return await this.getSlots(params);
  }

  /**
   * Get all entry points
   * @returns Entry points response
   */
  async getEntryPoints(): Promise<EntryPointsResponse> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/entry_points`);
    return await response.json();
  }

  /**
   * Create an entry point
   * @param data - Entry point data
   * @returns Response
   */
  async createEntryPoint(data: {
    name: string;
    location: string;
  }): Promise<any> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/entry_points`, {
      data,
    });
    return await response.json();
  }

  /**
   * Update an entry point
   * @param id - Entry point ID
   * @param data - Entry point data to update
   * @returns Response
   */
  async updateEntryPoint(id: string, data: {
    name?: string;
    location?: string;
  }): Promise<any> {
    const response = await this.request.put(`${API_BASE_URL}/api/v1/entry_points/${id}`, {
      data,
    });
    return await response.json();
  }

  /**
   * Delete an entry point
   * @param id - Entry point ID
   * @returns Response
   */
  async deleteEntryPoint(id: string): Promise<any> {
    const response = await this.request.delete(`${API_BASE_URL}/api/v1/entry_points/${id}`);
    return await response.json();
  }

  /**
   * Create a parking slot
   * @param data - Slot data
   * @returns Response
   */
  async createSlot(data: {
    slotNumber: string;
    slotType: 'small' | 'medium' | 'large';
    floor: number;
  }): Promise<any> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/slots`, {
      data,
    });
    return await response.json();
  }

  /**
   * Update a parking slot
   * @param id - Slot ID
   * @param data - Slot data to update
   * @returns Response
   */
  async updateSlot(id: string, data: {
    slotNumber?: string;
    slotType?: 'small' | 'medium' | 'large';
    floor?: number;
    status?: 'available' | 'occupied' | 'maintenance';
  }): Promise<any> {
    const response = await this.request.put(`${API_BASE_URL}/api/v1/slots/${id}`, {
      data,
    });
    return await response.json();
  }

  /**
   * Delete a parking slot
   * @param id - Slot ID
   * @returns Response
   */
  async deleteSlot(id: string): Promise<any> {
    const response = await this.request.delete(`${API_BASE_URL}/api/v1/slots/${id}`);
    return await response.json();
  }

  /**
   * Clear all parking sessions
   * @returns Response
   */
  async clearAllSessions(): Promise<any> {
    try {
      const response = await this.request.delete(`${API_BASE_URL}/api/v1/sessions`);
      return await response.json();
    } catch (error) {
      // Some APIs might not support bulk delete
      console.warn('Clear all sessions not supported:', error);
      return { success: false, message: 'Not supported' };
    }
  }

  /**
   * Clear all parking slots
   * @returns Response
   */
  async clearAllSlots(): Promise<any> {
    try {
      const response = await this.request.delete(`${API_BASE_URL}/api/v1/slots`);
      return await response.json();
    } catch (error) {
      console.warn('Clear all slots not supported:', error);
      return { success: false, message: 'Not supported' };
    }
  }

  /**
   * Clear all entry points
   * @returns Response
   */
  async clearAllEntryPoints(): Promise<any> {
    try {
      const response = await this.request.delete(`${API_BASE_URL}/api/v1/entry_points`);
      return await response.json();
    } catch (error) {
      console.warn('Clear all entry points not supported:', error);
      return { success: false, message: 'Not supported' };
    }
  }

  /**
   * Clear all test data (sessions, slots, entry points)
   * @returns Object indicating success/failure for each operation
   */
  async clearAllData(): Promise<{
    sessions: boolean;
    slots: boolean;
    entryPoints: boolean;
  }> {
    const results = {
      sessions: false,
      slots: false,
      entryPoints: false,
    };

    try {
      await this.clearAllSessions();
      results.sessions = true;
    } catch (error) {
      console.error('Failed to clear sessions:', error);
    }

    try {
      await this.clearAllSlots();
      results.slots = true;
    } catch (error) {
      console.error('Failed to clear slots:', error);
    }

    try {
      await this.clearAllEntryPoints();
      results.entryPoints = true;
    } catch (error) {
      console.error('Failed to clear entry points:', error);
    }

    return results;
  }

  /**
   * Setup test data with default configuration
   * @returns Object containing created data IDs
   */
  async setupTestData(): Promise<{
    entryPointIds: string[];
    slotIds: string[];
    sessionIds: string[];
  }> {
    const entryPointIds: string[] = [];
    const slotIds: string[] = [];
    const sessionIds: string[] = [];

    try {
      // Create entry points
      const ep1 = await this.createEntryPoint({ name: 'Test Gate 1', location: 'North' });
      if (ep1.success) entryPointIds.push(ep1.data?.id || 'ep-1');

      const ep2 = await this.createEntryPoint({ name: 'Test Gate 2', location: 'South' });
      if (ep2.success) entryPointIds.push(ep2.data?.id || 'ep-2');

      // Create slots
      const slotTypes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
      for (let i = 0; i < 9; i++) {
        const type = slotTypes[i % 3];
        const slot = await this.createSlot({
          slotNumber: `${String.fromCharCode(65 + Math.floor(i / 3))}${(i % 3) + 1}`,
          slotType: type,
          floor: Math.floor(i / 3) + 1,
        });
        if (slot.success) slotIds.push(slot.data?.id || `slot-${i}`);
      }

      // Create a test session
      if (slotIds.length > 0 && entryPointIds.length > 0) {
        const session = await this.createParkingSession({
          slotId: slotIds[0],
          entryPointId: entryPointIds[0],
          vehiclePlate: 'TEST 123 AB',
          vehicleType: 'small',
        });
        if (session.success) sessionIds.push(session.data?.sessionId || 'session-1');
      }
    } catch (error) {
      console.error('Failed to setup test data:', error);
    }

    return { entryPointIds, slotIds, sessionIds };
  }

  /**
   * Teardown test data
   * @param data - Data IDs to clean up
   */
  async teardownTestData(data: {
    entryPointIds?: string[];
    slotIds?: string[];
    sessionIds?: string[];
  }): Promise<void> {
    // Delete sessions first
    if (data.sessionIds) {
      for (const sessionId of data.sessionIds) {
        try {
          await this.completeParkingSession(sessionId);
        } catch (error) {
          // Session might already be completed
          console.warn(`Failed to complete session ${sessionId}:`, error);
        }
      }
    }

    // Delete slots
    if (data.slotIds) {
      for (const slotId of data.slotIds) {
        try {
          await this.deleteSlot(slotId);
        } catch (error) {
          console.warn(`Failed to delete slot ${slotId}:`, error);
        }
      }
    }

    // Delete entry points
    if (data.entryPointIds) {
      for (const entryPointId of data.entryPointIds) {
        try {
          await this.deleteEntryPoint(entryPointId);
        } catch (error) {
          console.warn(`Failed to delete entry point ${entryPointId}:`, error);
        }
      }
    }
  }

  /**
   * Wait for API to be healthy
   * @param maxAttempts - Maximum number of attempts (default: 30)
   * @param interval - Interval between attempts in ms (default: 1000)
   * @returns True if API is healthy
   */
  async waitForApiHealthy(maxAttempts: number = 30, interval: number = 1000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const health = await this.healthCheck();
        if (health.status === 'healthy' && health.api === 'up' && health.database === 'up') {
          return true;
        }
      } catch (error) {
        // API might not be ready yet
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  /**
   * Verify API health status
   * @returns Object with health status details
   */
  async verifyApiHealth(): Promise<{
    isHealthy: boolean;
    apiStatus: string;
    dbStatus: string;
    timestamp: string;
  }> {
    try {
      const health = await this.healthCheck();
      return {
        isHealthy: health.status === 'healthy',
        apiStatus: health.api,
        dbStatus: health.database,
        timestamp: health.timestamp,
      };
    } catch (error) {
      return {
        isHealthy: false,
        apiStatus: 'unknown',
        dbStatus: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ==================== Vehicles API ====================

  /**
   * List vehicles
   */
  async listVehicles(page?: number, perPage?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());
    const url = `${API_BASE_URL}/api/v1/vehicles${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request.get(url);
    return await response.json();
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
  }): Promise<any> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/vehicles`, { data });
    return await response.json();
  }

  /**
   * Get a vehicle by ID
   */
  async getVehicle(id: string): Promise<any> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/vehicles/${id}`);
    return await response.json();
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
  }): Promise<any> {
    const response = await this.request.put(`${API_BASE_URL}/api/v1/vehicles/${id}`, { data });
    return await response.json();
  }

  /**
   * Delete a vehicle
   */
  async deleteVehicle(id: string): Promise<any> {
    const response = await this.request.delete(`${API_BASE_URL}/api/v1/vehicles/${id}`);
    return await response.json();
  }

  // ==================== Billing Audit Logs API ====================

  /**
   * List billing audit logs
   */
  async listBillingAuditLogs(page?: number, perPage?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());
    const url = `${API_BASE_URL}/api/v1/billing_audit_logs${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request.get(url);
    return await response.json();
  }

  /**
   * Get a billing audit log by ID
   */
  async getBillingAuditLog(id: string): Promise<any> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/billing_audit_logs/${id}`);
    return await response.json();
  }

  /**
   * Get billing audit logs by session ID
   */
  async getBillingAuditLogsBySession(sessionId: string): Promise<any> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/billing_audit_logs/session/${sessionId}`);
    return await response.json();
  }

  // ==================== Kafka Events API ====================

  /**
   * List kafka events
   */
  async listKafkaEvents(page?: number, perPage?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());
    const url = `${API_BASE_URL}/api/v1/kafka_events${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.request.get(url);
    return await response.json();
  }

  /**
   * Get a kafka event by ID
   */
  async getKafkaEvent(id: string): Promise<any> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/kafka_events/${id}`);
    return await response.json();
  }

  /**
   * Get kafka events by status
   */
  async getKafkaEventsByStatus(status: string): Promise<any> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/kafka_events/status/${status}`);
    return await response.json();
  }

  /**
   * Get kafka events by event type
   */
  async getKafkaEventsByType(eventType: string): Promise<any> {
    const response = await this.request.get(`${API_BASE_URL}/api/v1/kafka_events/event-type/${eventType}`);
    return await response.json();
  }

  // ==================== Park/Unpark Direct API ====================

  /**
   * Park a vehicle via the sessions API (form-urlencoded)
   */
  async parkVehicle(vehicleType: string, entryPointId: string): Promise<any> {
    const response = await this.request.post(`${API_BASE_URL}/api/v1/sessions`, {
      form: { vehicle_type: vehicleType, entry_point_id: entryPointId },
    });
    return await response.json();
  }

  /**
   * Unpark a vehicle via the sessions API
   */
  async unparkVehicle(sessionId: string, exitedAt?: string): Promise<any> {
    const url = `${API_BASE_URL}/api/v1/sessions/${sessionId}/unpark`;
    const params = exitedAt ? `?exited_at=${encodeURIComponent(exitedAt)}` : '';
    const response = await this.request.post(`${url}${params}`);
    return await response.json();
  }
}

/**
 * Create API fixtures instance
 * @param request - Playwright API request context
 * @returns ApiFixtures instance
 */
export function createApiFixtures(request: APIRequestContext): ApiFixtures {
  return new ApiFixtures(request);
}
