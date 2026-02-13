/**
 * Test Data Fixtures
 * 
 * Provides sample data and data generators for E2E tests.
 */

/**
 * Vehicle Types
 */
export const VehicleTypes = {
  SMALL: 'small' as const,
  MEDIUM: 'medium' as const,
  LARGE: 'large' as const,
} as const;

/**
 * Vehicle Type Labels
 */
export const VehicleTypeLabels = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
} as const;

/**
 * Slot Status Types
 */
export const SlotStatus = {
  AVAILABLE: 'available' as const,
  OCCUPIED: 'occupied' as const,
  MAINTENANCE: 'maintenance' as const,
} as const;

/**
 * Session Status Types
 */
export const SessionStatus = {
  ACTIVE: 'active' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

/**
 * Test Vehicles
 */
export const testVehicles = {
  small: {
    type: VehicleTypes.SMALL,
    typeLabel: VehicleTypeLabels.small,
    plate: 'AB 123 C',
  },
  medium: {
    type: VehicleTypes.MEDIUM,
    typeLabel: VehicleTypeLabels.medium,
    plate: 'CD 456 E',
  },
  large: {
    type: VehicleTypes.LARGE,
    typeLabel: VehicleTypeLabels.large,
    plate: 'EF 789 G',
  },
} as const;

/**
 * Test Entry Points
 */
export const testEntryPoints = [
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
] as const;

/**
 * Test Parking Slots
 */
export const testSlots = {
  small: [
    {
      id: '1',
      slotNumber: 'SP-1',
      slotType: VehicleTypes.SMALL,
      typeLabel: VehicleTypeLabels.small,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
    {
      id: '2',
      slotNumber: 'SP-2',
      slotType: VehicleTypes.SMALL,
      typeLabel: VehicleTypeLabels.small,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
    {
      id: '3',
      slotNumber: 'SP-3',
      slotType: VehicleTypes.SMALL,
      typeLabel: VehicleTypeLabels.small,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
  ],
  medium: [
    {
      id: '4',
      slotNumber: 'MP-1',
      slotType: VehicleTypes.MEDIUM,
      typeLabel: VehicleTypeLabels.medium,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
    {
      id: '5',
      slotNumber: 'MP-2',
      slotType: VehicleTypes.MEDIUM,
      typeLabel: VehicleTypeLabels.medium,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
    {
      id: '6',
      slotNumber: 'MP-3',
      slotType: VehicleTypes.MEDIUM,
      typeLabel: VehicleTypeLabels.medium,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
  ],
  large: [
    {
      id: '7',
      slotNumber: 'LP-1',
      slotType: VehicleTypes.LARGE,
      typeLabel: VehicleTypeLabels.large,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
    {
      id: '8',
      slotNumber: 'LP-2',
      slotType: VehicleTypes.LARGE,
      typeLabel: VehicleTypeLabels.large,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
    {
      id: '9',
      slotNumber: 'LP-3',
      slotType: VehicleTypes.LARGE,
      typeLabel: VehicleTypeLabels.large,
      floor: 1,
      status: SlotStatus.AVAILABLE,
    },
  ],
} as const;

/**
 * Test Parking Sessions
 */
export const testSessions = {
  active: {
    id: '1',
    sessionId: 'SES-12345',
    slotId: '1',
    entryPointId: '1',
    vehiclePlate: 'AB 123 C',
    vehicleType: VehicleTypes.SMALL,
    typeLabel: VehicleTypeLabels.small,
    entryTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    exitTime: undefined,
    status: SessionStatus.ACTIVE,
    fee: undefined,
  },
  completed: {
    id: '2',
    sessionId: 'SES-12346',
    slotId: '2',
    entryPointId: '1',
    vehiclePlate: 'CD 456 E',
    vehicleType: VehicleTypes.MEDIUM,
    typeLabel: VehicleTypeLabels.medium,
    entryTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    exitTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: SessionStatus.COMPLETED,
    fee: 20.00,
  },
  cancelled: {
    id: '3',
    sessionId: 'SES-12347',
    slotId: '3',
    entryPointId: '2',
    vehiclePlate: 'EF 789 G',
    vehicleType: VehicleTypes.LARGE,
    typeLabel: VehicleTypeLabels.large,
    entryTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    exitTime: undefined,
    status: SessionStatus.CANCELLED,
    fee: undefined,
  },
} as const;

/**
 * Test Parking Configuration
 */
export const testParkingConfig = {
  minimal: {
    totalSlots: 3,
    smallSlots: 1,
    mediumSlots: 1,
    largeSlots: 1,
    entryPoints: ['Main Gate'],
  },
  standard: {
    totalSlots: 10,
    smallSlots: 3,
    mediumSlots: 4,
    largeSlots: 3,
    entryPoints: ['Main Gate', 'North Entrance'],
  },
  large: {
    totalSlots: 50,
    smallSlots: 15,
    mediumSlots: 20,
    largeSlots: 15,
    entryPoints: ['Main Gate', 'North Entrance', 'South Entrance'],
  },
} as const;

/**
 * Test API URLs
 */
export const testApiUrls = {
  local: 'http://localhost:8082',
  staging: 'https://staging-api.parkinglot.com',
  production: 'https://api.parkinglot.com',
} as const;

/**
 * Data Generators
 */
export const DataGenerators = {
  /**
   * Generate a random vehicle plate number
   * Format: XX 123 YY (e.g., AB 123 CD)
   */
  generateVehiclePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    return (
      letters[Math.floor(Math.random() * letters.length)] +
      letters[Math.floor(Math.random() * letters.length)] +
      ' ' +
      numbers[Math.floor(Math.random() * numbers.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      letters[Math.floor(Math.random() * letters.length)]
    );
  },

  /**
   * Generate a random session ID
   * Format: SES-XXXXX (e.g., SES-12345)
   */
  generateSessionId(): string {
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    return `SES-${randomNum}`;
  },

  /**
   * Generate a random slot number
   */
  generateSlotNumber(type: 'small' | 'medium' | 'large'): string {
    const prefix = type === 'small' ? 'SP' : type === 'medium' ? 'MP' : 'LP';
    const randomNum = Math.floor(Math.random() * 99) + 1;
    return `${prefix}-${randomNum}`;
  },

  /**
   * Generate a random entry point name
   */
  generateEntryPointName(): string {
    const names = ['Main Gate', 'North Entrance', 'South Entrance', 'East Entrance', 'West Entrance'];
    return names[Math.floor(Math.random() * names.length)];
  },

  /**
   * Generate a random parking configuration
   */
  generateParkingConfig() {
    const totalSlots = Math.floor(Math.random() * 47) + 3; // 3-50
    const smallSlots = Math.floor(totalSlots * 0.3);
    const mediumSlots = Math.floor(totalSlots * 0.4);
    const largeSlots = totalSlots - smallSlots - mediumSlots;
    
    const entryPointCount = Math.floor(Math.random() * 2) + 1; // 1-3
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
   * Generate a random vehicle type
   */
  generateVehicleType(): 'small' | 'medium' | 'large' {
    const types: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    return types[Math.floor(Math.random() * types.length)];
  },

  /**
   * Generate a random date within the last 24 hours
   */
  generateRecentDate(): Date {
    const hoursAgo = Math.floor(Math.random() * 24);
    return new Date(Date.now() - hoursAgo * 3600000);
  },

  /**
   * Generate a random fee amount
   */
  generateFee(): number {
    const hours = Math.floor(Math.random() * 24) + 1;
    const baseRate = 10;
    return Math.round(hours * baseRate * 100) / 100;
  },

  /**
   * Generate test session data
   */
  generateSessionData(overrides?: Partial<typeof testSessions.active>) {
    const vehicleType = this.generateVehicleType();
    const entryPoint = testEntryPoints[Math.floor(Math.random() * testEntryPoints.length)];
    
    return {
      id: Math.random().toString(),
      sessionId: this.generateSessionId(),
      slotId: Math.random().toString(),
      entryPointId: entryPoint.id,
      vehiclePlate: this.generateVehiclePlate(),
      vehicleType,
      typeLabel: VehicleTypeLabels[vehicleType],
      entryTime: this.generateRecentDate().toISOString(),
      exitTime: undefined,
      status: SessionStatus.ACTIVE,
      fee: undefined,
      ...overrides,
    };
  },

  /**
   * Generate multiple test sessions
   */
  generateSessions(count: number, status?: 'active' | 'completed' | 'cancelled') {
    const sessions: any[] = [];
    for (let i = 0; i < count; i++) {
      const sessionStatus = status || ['active', 'completed', 'cancelled'][Math.floor(Math.random() * 3)];
      sessions.push(this.generateSessionData({ status: sessionStatus }));
    }
    return sessions;
  },
};

/**
 * Validation Data
 */
export const ValidationData = {
  /**
   * Invalid vehicle plates
   */
  invalidVehiclePlates: [
    '', // Empty
    'ABC', // Too short
    'AB 123', // Missing suffix
    'AB 123 CDE', // Too long
    '12 345 AB', // Starts with number
    'AB 1234 C', // Too many numbers
    'AB-123-C', // Wrong separator
  ],

  /**
   * Invalid session IDs
   */
  invalidSessionIds: [
    '', // Empty
    'SES', // Missing number
    'SES-1234', // Too short
    'SES-123456', // Too long
    'SESSION-12345', // Wrong prefix
    '12345', // Missing prefix
  ],

  /**
   * Invalid slot numbers
   */
  invalidSlotNumbers: [
    '', // Empty
    'SP', // Missing number
    'SP-ABC', // Not a number
    'SP-12345', // Too long
  ],

  /**
   * Invalid parking configurations
   */
  invalidParkingConfigs: [
    {
      totalSlots: 0,
      smallSlots: 0,
      mediumSlots: 0,
      largeSlots: 0,
      entryPoints: [],
    },
    {
      totalSlots: -1,
      smallSlots: -1,
      mediumSlots: -1,
      largeSlots: -1,
      entryPoints: ['Main Gate'],
    },
    {
      totalSlots: 10,
      smallSlots: 5,
      mediumSlots: 5,
      largeSlots: 5,
      entryPoints: ['Main Gate'],
    },
  ],
};

/**
 * Fee Calculation Test Data
 */
export const FeeCalculationTestData = {
  /**
   * Test cases for fee calculation
   */
  testCases: [
    {
      duration: 1, // 1 hour
      vehicleType: VehicleTypes.SMALL,
      expectedFee: 10,
    },
    {
      duration: 2, // 2 hours
      vehicleType: VehicleTypes.SMALL,
      expectedFee: 20,
    },
    {
      duration: 1, // 1 hour
      vehicleType: VehicleTypes.MEDIUM,
      expectedFee: 15,
    },
    {
      duration: 2, // 2 hours
      vehicleType: VehicleTypes.MEDIUM,
      expectedFee: 30,
    },
    {
      duration: 1, // 1 hour
      vehicleType: VehicleTypes.LARGE,
      expectedFee: 20,
    },
    {
      duration: 2, // 2 hours
      vehicleType: VehicleTypes.LARGE,
      expectedFee: 40,
    },
  ],

  /**
   * Edge cases
   */
  edgeCases: [
    {
      duration: 0.5, // 30 minutes
      vehicleType: VehicleTypes.SMALL,
      expectedFee: 5,
    },
    {
      duration: 24, // 24 hours
      vehicleType: VehicleTypes.LARGE,
      expectedFee: 480,
    },
  ],
};

/**
 * Export all test data
 */
export const TestData = {
  VehicleTypes,
  VehicleTypeLabels,
  SlotStatus,
  SessionStatus,
  testVehicles,
  testEntryPoints,
  testSlots,
  testSessions,
  testParkingConfig,
  testApiUrls,
  DataGenerators,
  ValidationData,
  FeeCalculationTestData,
} as const;
