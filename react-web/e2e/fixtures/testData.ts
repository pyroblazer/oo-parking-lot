/**
 * Test Data Generators
 * 
 * Provides test data generators and sample data for Playwright E2E tests.
 */

/**
 * Vehicle types
 */
export const VehicleTypes = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export type VehicleType = typeof VehicleTypes[keyof typeof VehicleTypes];

/**
 * Session statuses
 */
export const SessionStatuses = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type SessionStatus = typeof SessionStatuses[keyof typeof SessionStatuses];

/**
 * Slot statuses
 */
export const SlotStatuses = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
} as const;

export type SlotStatus = typeof SlotStatuses[keyof typeof SlotStatuses];

/**
 * Sample entry points
 */
export const SampleEntryPoints = [
  { id: 'ep-1', name: 'Main Gate', location: 'North' },
  { id: 'ep-2', name: 'North Entrance', location: 'North' },
  { id: 'ep-3', name: 'South Entrance', location: 'South' },
  { id: 'ep-4', name: 'East Entrance', location: 'East' },
  { id: 'ep-5', name: 'West Entrance', location: 'West' },
] as const;

/**
 * Sample parking slots
 */
export const SampleSlots = [
  { id: 'slot-1', slotNumber: 'A1', slotType: 'small', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-2', slotNumber: 'A2', slotType: 'small', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-3', slotNumber: 'A3', slotType: 'small', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-4', slotNumber: 'B1', slotType: 'medium', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-5', slotNumber: 'B2', slotType: 'medium', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-6', slotNumber: 'B3', slotType: 'medium', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-7', slotNumber: 'C1', slotType: 'large', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-8', slotNumber: 'C2', slotType: 'large', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-9', slotNumber: 'C3', slotType: 'large', floor: 1, status: 'available' as SlotStatus },
  { id: 'slot-10', slotNumber: 'A4', slotType: 'small', floor: 2, status: 'available' as SlotStatus },
] as const;

/**
 * Sample parking sessions
 */
export const SampleSessions = [
  {
    id: 'session-1',
    sessionId: 'SES-001',
    slotId: 'slot-1',
    entryPointId: 'ep-1',
    vehiclePlate: 'AB 123 CD',
    vehicleType: 'small' as VehicleType,
    entryTime: '2024-01-15T08:00:00Z',
    exitTime: null,
    status: 'active' as SessionStatus,
    fee: null,
  },
  {
    id: 'session-2',
    sessionId: 'SES-002',
    slotId: 'slot-4',
    entryPointId: 'ep-2',
    vehiclePlate: 'EF 456 GH',
    vehicleType: 'medium' as VehicleType,
    entryTime: '2024-01-15T07:30:00Z',
    exitTime: '2024-01-15T10:30:00Z',
    status: 'completed' as SessionStatus,
    fee: 30.00,
  },
  {
    id: 'session-3',
    sessionId: 'SES-003',
    slotId: 'slot-7',
    entryPointId: 'ep-3',
    vehiclePlate: 'IJ 789 KL',
    vehicleType: 'large' as VehicleType,
    entryTime: '2024-01-15T09:00:00Z',
    exitTime: null,
    status: 'active' as SessionStatus,
    fee: null,
  },
] as const;

/**
 * Mock API responses
 */
export const MockApiResponses = {
  /**
   * Mock health check response
   */
  healthCheck: {
    status: 'healthy',
    api: 'up',
    database: 'up',
    timestamp: new Date().toISOString(),
  },

  /**
   * Mock initialization response
   */
  initialization: {
    success: true,
    message: 'Parking lot initialized successfully',
    data: {
      totalSlots: 10,
      smallSlots: 3,
      mediumSlots: 4,
      largeSlots: 3,
      entryPoints: ['Main Gate', 'North Entrance'],
    },
  },

  /**
   * Mock park vehicle response
   */
  parkVehicle: {
    success: true,
    message: 'Vehicle parked successfully',
    data: {
      sessionId: 'SES-NEW-001',
      slotNumber: 'A1',
      entryTime: new Date().toISOString(),
    },
  },

  /**
   * Mock unpark vehicle response
   */
  unparkVehicle: {
    success: true,
    message: 'Vehicle unparked successfully',
    data: {
      sessionId: 'SES-NEW-001',
      exitTime: new Date().toISOString(),
      fee: {
        baseFee: 10.00,
        exceedingHours: 2,
        exceedingFee: 20.00,
        longTermFee: 0,
        totalFee: 30.00,
      },
    },
  },

  /**
   * Mock get session response
   */
  getSession: {
    success: true,
    data: {
      sessionId: 'SES-001',
      slotNumber: 'A1',
      vehiclePlate: 'AB 123 CD',
      vehicleType: 'small',
      entryPoint: 'Main Gate',
      entryTime: '2024-01-15T08:00:00Z',
      exitTime: null,
      status: 'active',
      duration: '2h 30m',
      fee: null,
    },
  },

  /**
   * Mock get slots response
   */
  getSlots: {
    success: true,
    data: SampleSlots,
  },

  /**
   * Mock get entry points response
   */
  getEntryPoints: {
    success: true,
    data: SampleEntryPoints,
  },

  /**
   * Mock get sessions response
   */
  getSessions: {
    success: true,
    data: SampleSessions,
    pagination: {
      page: 1,
      perPage: 10,
      total: 3,
      totalPages: 1,
    },
  },
} as const;

/**
 * Test data generators
 */
export const TestDataGenerators = {
  /**
   * Generate a random vehicle plate number
   * Format: XX 123 YY (e.g., AB 123 CD)
   */
  generateVehiclePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    const num1 = numbers[Math.floor(Math.random() * numbers.length)];
    const num2 = numbers[Math.floor(Math.random() * numbers.length)];
    const num3 = numbers[Math.floor(Math.random() * numbers.length)];
    const letter3 = letters[Math.floor(Math.random() * letters.length)];
    const letter4 = letters[Math.floor(Math.random() * letters.length)];
    
    return `${letter1}${letter2} ${num1}${num2}${num3} ${letter3}${letter4}`;
  },

  /**
   * Generate a random session ID
   * Format: SES-XXXXX (e.g., SES-12345)
   */
  generateSessionId(): string {
    const randomNum = Math.floor(Math.random() * 90000) + 1000;
    return `SES-${randomNum}`;
  },

  /**
   * Generate a random entry point name
   */
  generateEntryPointName(): string {
    const names = ['Main Gate', 'North Entrance', 'South Entrance', 'East Entrance', 'West Entrance', 'Front Gate', 'Back Gate'];
    return names[Math.floor(Math.random() * names.length)];
  },

  /**
   * Generate a random slot number
   * Format: X1, X2, etc. (e.g., A1, B2)
   */
  generateSlotNumber(): string {
    const letters = 'ABCDEFGHIJK';
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 10) + 1;
    return `${letter}${number}`;
  },

  /**
   * Generate a random vehicle type
   */
  generateVehicleType(): VehicleType {
    const types: VehicleType[] = [VehicleTypes.SMALL, VehicleTypes.MEDIUM, VehicleTypes.LARGE];
    return types[Math.floor(Math.random() * types.length)];
  },

  /**
   * Generate a random slot type
   */
  generateSlotType(): 'small' | 'medium' | 'large' {
    const types: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    return types[Math.floor(Math.random() * types.length)];
  },

  /**
   * Generate a random slot status
   */
  generateSlotStatus(): SlotStatus {
    const statuses: SlotStatus[] = [SlotStatuses.AVAILABLE, SlotStatuses.OCCUPIED, SlotStatuses.MAINTENANCE];
    return statuses[Math.floor(Math.random() * statuses.length)];
  },

  /**
   * Generate a random session status
   */
  generateSessionStatus(): SessionStatus {
    const statuses: SessionStatus[] = [SessionStatuses.ACTIVE, SessionStatuses.COMPLETED, SessionStatuses.CANCELLED];
    return statuses[Math.floor(Math.random() * statuses.length)];
  },

  /**
   * Generate a parking lot configuration
   */
  generateParkingConfig(): {
    totalSlots: number;
    smallSlots: number;
    mediumSlots: number;
    largeSlots: number;
    entryPoints: string[];
  } {
    const totalSlots = Math.floor(Math.random() * 50) + 10;
    const smallSlots = Math.floor(totalSlots * 0.3);
    const mediumSlots = Math.floor(totalSlots * 0.4);
    const largeSlots = totalSlots - smallSlots - mediumSlots;
    
    const entryPointCount = Math.floor(Math.random() * 3) + 1;
    const entryPoints: string[] = [];
    for (let i = 0; i < entryPointCount; i++) {
      entryPoints.push(this.generateEntryPointName());
    }
    
    return {
      totalSlots,
      smallSlots,
      mediumSlots,
      largeSlots,
      entryPoints,
    };
  },

  /**
   * Generate a parking session
   */
  generateParkingSession(): {
    sessionId: string;
    slotId: string;
    entryPointId: string;
    vehiclePlate: string;
    vehicleType: VehicleType;
    entryTime: string;
    exitTime: string | null;
    status: SessionStatus;
    fee: number | null;
  } {
    const now = new Date();
    const entryTime = new Date(now.getTime() - Math.random() * 86400000); // Random time in last 24h
    
    return {
      sessionId: this.generateSessionId(),
      slotId: `slot-${Math.floor(Math.random() * 10) + 1}`,
      entryPointId: `ep-${Math.floor(Math.random() * 5) + 1}`,
      vehiclePlate: this.generateVehiclePlate(),
      vehicleType: this.generateVehicleType(),
      entryTime: entryTime.toISOString(),
      exitTime: Math.random() > 0.5 ? now.toISOString() : null,
      status: this.generateSessionStatus(),
      fee: Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 10 : null,
    };
  },

  /**
   * Generate a parking slot
   */
  generateParkingSlot(): {
    id: string;
    slotNumber: string;
    slotType: 'small' | 'medium' | 'large';
    floor: number;
    status: SlotStatus;
  } {
    return {
      id: `slot-${Math.floor(Math.random() * 1000) + 1}`,
      slotNumber: this.generateSlotNumber(),
      slotType: this.generateSlotType(),
      floor: Math.floor(Math.random() * 5) + 1,
      status: this.generateSlotStatus(),
    };
  },

  /**
   * Generate an entry point
   */
  generateEntryPoint(): {
    id: string;
    name: string;
    location: string;
  } {
    const locations = ['North', 'South', 'East', 'West', 'Front', 'Back'];
    return {
      id: `ep-${Math.floor(Math.random() * 100) + 1}`,
      name: this.generateEntryPointName(),
      location: locations[Math.floor(Math.random() * locations.length)],
    };
  },

  /**
   * Generate a date string in ISO format
   * @param daysOffset - Number of days from now (negative for past, positive for future)
   */
  generateDate(daysOffset: number = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString();
  },

  /**
   * Generate a timestamp
   * @param hoursOffset - Number of hours from now
   */
  generateTimestamp(hoursOffset: number = 0): string {
    const date = new Date();
    date.setHours(date.getHours() + hoursOffset);
    return date.toISOString();
  },
};

/**
 * Test data sets for specific scenarios
 */
export const TestDataSets = {
  /**
   * Data for testing parking flow
   */
  parkingFlow: {
    vehiclePlate: 'TEST 123 AB',
    vehicleType: 'small' as VehicleType,
    entryPoint: 'Main Gate',
    expectedSlot: 'A1',
  },

  /**
   * Data for testing unparking flow
   */
  unparkingFlow: {
    sessionId: 'SES-TEST-001',
    expectedFee: 30.00,
    expectedDuration: '3h 0m',
  },

  /**
   * Data for testing fee calculation
   */
  feeCalculation: [
    {
      description: 'Short stay (under 3 hours)',
      vehicleType: 'small' as VehicleType,
      duration: 2,
      expectedFee: 10.00,
    },
    {
      description: 'Medium stay (3-24 hours)',
      vehicleType: 'medium' as VehicleType,
      duration: 5,
      expectedFee: 25.00,
    },
    {
      description: 'Long stay (over 24 hours)',
      vehicleType: 'large' as VehicleType,
      duration: 30,
      expectedFee: 200.00,
    },
  ],

  /**
   * Data for testing slot availability
   */
  slotAvailability: {
    totalSlots: 10,
    availableSlots: 7,
    occupiedSlots: 3,
    maintenanceSlots: 0,
  },

  /**
   * Data for testing pagination
   */
  pagination: {
    page1: {
      page: 1,
      perPage: 5,
      expectedCount: 5,
    },
    page2: {
      page: 2,
      perPage: 5,
      expectedCount: 3,
    },
  },
} as const;

/**
 * Error test data
 */
export const ErrorTestData = {
  /**
   * Invalid vehicle plate formats
   */
  invalidVehiclePlates: [
    '',
    '123',
    'AB',
    'ABCD 123',
    'AB 12345 CD',
  ],

  /**
   * Invalid session IDs
   */
  invalidSessionIds: [
    '',
    '123',
    'SESSION-001',
    'SES-',
  ],

  /**
   * Invalid slot numbers
   */
  invalidSlotNumbers: [
    '',
    '1',
    'AA',
    'A0',
  ],

  /**
   * API error responses
   */
  apiErrors: {
    notFound: {
      status: 404,
      message: 'Resource not found',
    },
    badRequest: {
      status: 400,
      message: 'Invalid request',
    },
    serverError: {
      status: 500,
      message: 'Internal server error',
    },
    unauthorized: {
      status: 401,
      message: 'Unauthorized',
    },
  },
} as const;
