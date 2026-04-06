/**
 * API Integration Tests for React Native Mobile
 *
 * Verifies all parkingApi functions call the correct endpoints with the correct
 * HTTP methods, headers, query parameters, and request bodies.
 * Mocks axios & AsyncStorage entirely — no real HTTP calls. Runs in <5s.
 */

// Mock functions prefixed with "mock" — Jest allows these in mock factories
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    isAxiosError: jest.fn(),
  },
}));

import {
  checkHealth,
  initializeSystem,
  listEntryPoints,
  createEntryPoint,
  updateEntryPoint,
  deleteEntryPoint,
  listSlots,
  getAvailableSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  parkVehicle,
  unpackVehicle,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listBillingAuditLogs,
  getBillingAuditLog,
  getBillingAuditLogsBySession,
  listKafkaEvents,
  getKafkaEvent,
  getKafkaEventsByStatus,
  getKafkaEventsByType,
  ApiError,
} from '../src/api/parkingApi';

// ---- Helpers ----
const ok = <T>(data: T, headers: Record<string, string> = {}) =>
  Promise.resolve({ data: { success: true, data }, headers });

const okRaw = <T>(data: T) => Promise.resolve({ data });

// ---- Tests ----
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Health API', () => {
  it('GET /health', async () => {
    mockGet.mockReturnValue(okRaw({ status: 'ok', service: 'go', version: '1.0', timestamp: 't', checks: { database: { status: 'healthy' } } }));
    const result = await checkHealth();
    expect(mockGet).toHaveBeenCalledWith('/health');
    expect(result.status).toBe('ok');
  });
});

describe('Initialize API', () => {
  it('POST /api/v1/initialize', async () => {
    const resp = { entry_points_created: 3, parking_slots_created: 6, message: 'ok' };
    mockPost.mockReturnValue(ok(resp));
    const result = await initializeSystem({ entry_points: [{ identifier: 'A', name: 'Gate A' }], parking_slots: [{ slot_label: 'S1', slot_type: 'SP', distances: [1, 2, 3] }] });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/initialize', expect.any(Object));
    expect(result.entry_points_created).toBe(3);
  });
});

describe('Entry Points API', () => {
  it('GET /api/v1/entry_points', async () => {
    mockGet.mockReturnValue(ok([{ id: '1', identifier: 'A', name: 'Gate A' }]));
    const result = await listEntryPoints();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/entry_points');
    expect(result[0].identifier).toBe('A');
  });

  it('POST /api/v1/entry_points — wraps in entry_point key', async () => {
    mockPost.mockReturnValue(ok({ id: '1', identifier: 'A', name: 'Gate A' }));
    await createEntryPoint('A', 'Gate A');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/entry_points', { entry_point: { identifier: 'A', name: 'Gate A' } });
  });

  it('PUT /api/v1/entry_points/:id — wraps in entry_point key', async () => {
    mockPut.mockReturnValue(ok({ id: '1', identifier: 'A', name: 'Updated' }));
    await updateEntryPoint('1', 'Updated');
    expect(mockPut).toHaveBeenCalledWith('/api/v1/entry_points/1', { entry_point: { name: 'Updated' } });
  });

  it('DELETE /api/v1/entry_points/:id', async () => {
    mockDelete.mockReturnValue(ok({ message: 'deleted' }));
    await deleteEntryPoint('1');
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/entry_points/1');
  });
});

describe('Slots API', () => {
  it('GET /api/v1/slots', async () => {
    mockGet.mockReturnValue(ok([]));
    await listSlots();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/slots');
  });

  it('GET /api/v1/slots/available', async () => {
    mockGet.mockReturnValue(ok({ available_slots: [{ id: '1', slot_label: 'S1', slot_type: 'SP', distances: [1], available: true }] }));
    const result = await getAvailableSlots('S', 'A');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/slots/available', { params: { vehicle_type: 'S', entry_point_id: 'A' } });
    expect(result).toHaveLength(1);
  });

  it('POST /api/v1/slots', async () => {
    mockPost.mockReturnValue(ok({ id: '1' }));
    await createSlot({ slot_label: 'S1', slot_type: 'SP', distances: [1] });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/slots', { slot_label: 'S1', slot_type: 'SP', distances: [1] });
  });

  it('PUT /api/v1/slots/:id', async () => {
    mockPut.mockReturnValue(ok({ id: '1' }));
    await updateSlot('1', { slot_type: 'MP' });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/slots/1', { slot_type: 'MP' });
  });

  it('DELETE /api/v1/slots/:id', async () => {
    mockDelete.mockReturnValue(ok({ message: 'deleted' }));
    await deleteSlot('1');
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/slots/1');
  });
});

describe('Sessions API', () => {
  it('POST /api/v1/sessions — JSON body', async () => {
    mockPost.mockReturnValue(ok({ session_id: 's1', vehicle_type: 'S', parking_slot: {}, entry_point: 'A', parked_at: 't' }));
    const result = await parkVehicle('S', 'A');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/sessions', { vehicle_type: 'S', entry_point_id: 'A' });
    expect(result.session_id).toBe('s1');
  });

  it('POST /api/v1/sessions with parked_at', async () => {
    mockPost.mockReturnValue(ok({ session_id: 's2' }));
    await parkVehicle('M', 'B', '2024-01-01T10:00:00Z');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/sessions', { vehicle_type: 'M', entry_point_id: 'B', parked_at: '2024-01-01T10:00:00Z' });
  });

  it('POST /api/v1/sessions/:id/unpark with exited_at', async () => {
    mockPost.mockReturnValue(ok({ session_id: 's1', total_fee: 40 }));
    await unpackVehicle('s1', '2024-01-01T12:00:00Z');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/sessions/s1/unpark?exited_at=2024-01-01T12%3A00%3A00Z');
  });

  it('POST /api/v1/sessions/:id/unpark without exited_at', async () => {
    mockPost.mockReturnValue(ok({ session_id: 's1', total_fee: 40 }));
    await unpackVehicle('s1');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/sessions/s1/unpark');
  });

  it('GET /api/v1/sessions/:id', async () => {
    mockGet.mockReturnValue(ok({ session_id: 's1' }));
    await getSession('s1');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/sessions/s1');
  });

  it('GET /api/v1/sessions with pagination', async () => {
    mockGet.mockReturnValue(ok([], { 'x-total-count': '10' }));
    const result = await listSessions(2, 5);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/sessions', { params: { page: 2, per_page: 5 } });
    expect(result.total).toBe(10);
  });

  it('PUT /api/v1/sessions/:id', async () => {
    mockPut.mockReturnValue(ok({ session_id: 's1' }));
    await updateSession('s1', { exited_at: 't', total_fee: 100 });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/sessions/s1', { exited_at: 't', total_fee: 100 });
  });

  it('DELETE /api/v1/sessions/:id', async () => {
    mockDelete.mockReturnValue(ok({ message: 'deleted' }));
    await deleteSession('s1');
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/sessions/s1');
  });
});

describe('Vehicles API', () => {
  it('GET /api/v1/vehicles', async () => {
    mockGet.mockReturnValue(ok([], { 'x-total-count': '0' }));
    const result = await listVehicles(1, 20);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/vehicles', { params: { page: 1, per_page: 20 } });
    expect(result.total).toBe(0);
  });

  it('GET /api/v1/vehicles/:id', async () => {
    mockGet.mockReturnValue(ok({ id: 'v1' }));
    await getVehicle('v1');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/vehicles/v1');
  });

  it('POST /api/v1/vehicles', async () => {
    mockPost.mockReturnValue(ok({ id: 'v1' }));
    await createVehicle({ license_plate: 'ABC', vehicle_type: 'S' });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/vehicles', { license_plate: 'ABC', vehicle_type: 'S' });
  });

  it('PUT /api/v1/vehicles/:id', async () => {
    mockPut.mockReturnValue(ok({ id: 'v1' }));
    await updateVehicle('v1', { license_plate: 'XYZ' });
    expect(mockPut).toHaveBeenCalledWith('/api/v1/vehicles/v1', { license_plate: 'XYZ' });
  });

  it('DELETE /api/v1/vehicles/:id', async () => {
    mockDelete.mockReturnValue(ok({ message: 'deleted' }));
    await deleteVehicle('v1');
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/vehicles/v1');
  });
});

describe('Billing Audit Logs API', () => {
  it('GET /api/v1/billing_audit_logs', async () => {
    mockGet.mockReturnValue(ok([], { 'x-total-count': '5' }));
    const result = await listBillingAuditLogs();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/billing_audit_logs', { params: { page: 1, per_page: 20 } });
    expect(result.total).toBe(5);
  });

  it('GET /api/v1/billing_audit_logs/:id', async () => {
    mockGet.mockReturnValue(ok({ id: 1 }));
    await getBillingAuditLog(1);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/billing_audit_logs/1');
  });

  it('GET /api/v1/billing_audit_logs by session_id', async () => {
    mockGet.mockReturnValue(ok([]));
    await getBillingAuditLogsBySession(42);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/billing_audit_logs', { params: { session_id: 42, page: 1, per_page: 20 } });
  });
});

describe('Kafka Events API', () => {
  it('GET /api/v1/kafka_events', async () => {
    mockGet.mockReturnValue(ok([], { 'x-total-count': '3' }));
    const result = await listKafkaEvents(1, 50);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/kafka_events', { params: { page: 1, per_page: 50 } });
    expect(result.total).toBe(3);
  });

  it('GET /api/v1/kafka_events/:id', async () => {
    mockGet.mockReturnValue(ok({ id: 'e1' }));
    await getKafkaEvent('e1');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/kafka_events/e1');
  });

  it('GET /api/v1/kafka_events by status', async () => {
    mockGet.mockReturnValue(ok([]));
    await getKafkaEventsByStatus('failed');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/kafka_events', { params: { status: 'failed', page: 1, per_page: 20 } });
  });

  it('GET /api/v1/kafka_events by event_type', async () => {
    mockGet.mockReturnValue(ok([]));
    await getKafkaEventsByType('vehicle.parked');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/kafka_events', { params: { event_type: 'vehicle.parked', page: 1, per_page: 20 } });
  });
});

describe('Error handling', () => {
  it('ApiError.fromAxiosError — network error', () => {
    const err: any = new Error('Network Error');
    err.request = {};
    err.config = { baseURL: 'http://localhost:8082' };
    const apiErr = ApiError.fromAxiosError(err);
    expect(apiErr.message).toContain('Cannot connect');
    expect(apiErr.code).toBe('NETWORK_ERROR');
  });

  it('ApiError.fromAxiosError — 409 conflict', () => {
    const err: any = new Error('Conflict');
    err.response = { status: 409, data: { error: 'no slot' } };
    err.config = { url: '/sessions', data: 'vehicle_type=S&entry_point_id=A' };
    const apiErr = ApiError.fromAxiosError(err);
    expect(apiErr.message).toContain('No available');
    expect(apiErr.status).toBe(409);
  });

  it('ApiError.fromAxiosError — 404 session not found', () => {
    const err: any = new Error('Not Found');
    err.response = { status: 404, data: { error: 'not found' } };
    err.config = { url: '/sessions/123/unpark' };
    const apiErr = ApiError.fromAxiosError(err);
    expect(apiErr.message).toContain('Session not found');
    expect(apiErr.status).toBe(404);
  });
});
