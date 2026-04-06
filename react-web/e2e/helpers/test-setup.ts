/**
 * Test Setup Helpers
 *
 * Provides utilities for accessing pre-initialized test data
 */

import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8082';

/**
 * Get all existing entry points (from global setup)
 */
export async function getEntryPoints(request: APIRequestContext): Promise<any[]> {
  try {
    const response = await request.get(`${API_BASE_URL}/api/v1/entry_points`);
    if (!response.ok()) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

/**
 * Get all existing slots (from global setup)
 */
export async function getSlots(request: APIRequestContext): Promise<any[]> {
  try {
    const response = await request.get(`${API_BASE_URL}/api/v1/slots`);
    if (!response.ok()) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

/**
 * Get all existing sessions
 */
export async function getSessions(request: APIRequestContext): Promise<any[]> {
  try {
    const response = await request.get(`${API_BASE_URL}/api/v1/sessions`);
    if (!response.ok()) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

/**
 * Get slots by type
 */
export async function getSlotsByType(request: APIRequestContext, type: 'SP' | 'MP' | 'LP'): Promise<any[]> {
  const slots = await getSlots(request);
  return slots.filter((slot: any) => slot.slot_type === type);
}

/**
 * Get first available slot of given type
 */
export async function getAvailableSlot(request: APIRequestContext, type: 'SP' | 'MP' | 'LP'): Promise<any | null> {
  const slots = await getSlotsByType(request, type);
  return slots.find((slot: any) => slot.available) || slots[0] || null;
}

/**
 * Park a vehicle and return session ID
 */
export async function parkVehicle(
  request: APIRequestContext,
  vehicleType: 'S' | 'M' | 'L',
  entryPointId?: string,
): Promise<string | null> {
  try {
    const entryPoints = await getEntryPoints(request);
    const epId = entryPointId || entryPoints[0]?.id;

    if (!epId) return null;

    const response = await request.post(`${API_BASE_URL}/api/v1/sessions`, {
      form: { vehicle_type: vehicleType, entry_point_id: epId },
    });

    if (!response.ok()) return null;

    const data = await response.json();
    return data.data?.id || null;
  } catch {
    return null;
  }
}

/**
 * Unpark a vehicle and return fee info
 */
export async function unparkVehicle(
  request: APIRequestContext,
  sessionId: string,
  exitedAt?: string,
): Promise<any | null> {
  try {
    const url = `${API_BASE_URL}/api/v1/sessions/${sessionId}/unpark`;
    const params = exitedAt ? `?exited_at=${encodeURIComponent(exitedAt)}` : '';
    const response = await request.post(`${url}${params}`);

    if (!response.ok()) return null;

    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
}

/**
 * Get session details
 */
export async function getSessionDetails(request: APIRequestContext, sessionId: string): Promise<any | null> {
  try {
    const response = await request.get(`${API_BASE_URL}/api/v1/sessions/${sessionId}`);
    if (!response.ok()) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  maxAttempts: number = 30,
  intervalMs: number = 1000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return false;
}
