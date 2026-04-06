/**
 * Core Type Definitions for OO Parking Lot React Native Application
 * 
 * This file contains all type definitions, interfaces, and utility types
 * used throughout the React Native application with strict typing.
 */

// ============================================================================
// PRIMITIVE TYPE ALIASES
// ============================================================================

/** Vehicle type identifier */
export type VehicleType = 'S' | 'M' | 'L';

/** Parking slot type identifier */
export type SlotTypeLiteral = 'SP' | 'MP' | 'LP';

/** Parking slot status */
export type SlotStatusLiteral = 'available' | 'occupied' | 'maintenance';

/** Session status */
export type SessionStatusLiteral = 'active' | 'completed' | 'cancelled';

/** Entry point identifier type */
export type EntryPointIdentifier = string;

/** Session ID type */
export type SessionId = string;

/** Slot ID type */
export type SlotId = string;

/** Entry point ID type */
export type EntryPointId = string;

/** Currency type (Philippine Peso) */
export type Currency = 'PHP';

/** Distance units */
export type DistanceUnit = 'meters' | 'feet' | 'units';

// ============================================================================
// ENUMS
// ============================================================================

/** Vehicle size enumeration */
export enum VehicleSize {
  SMALL = 'S',
  MEDIUM = 'M',
  LARGE = 'L',
}

/** Slot type enumeration */
export enum SlotType {
  SMALL_PARKING = 'SP',
  MEDIUM_PARKING = 'MP',
  LARGE_PARKING = 'LP',
}

/** Slot status enumeration */
export enum SlotStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
}

/** Session status enumeration */
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// BASIC INTERFACES
// ============================================================================

/** Base interface for all entities with ID */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Base interface for all entities with numeric ID */
export interface NumericBaseEntity {
  readonly id: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Entry point interface */
export interface EntryPoint {
  readonly id: string | number;
  readonly name: string;
  readonly identifier: EntryPointIdentifier;
  readonly x?: number;
  readonly z?: number;
  readonly description?: string;
}

/** Parking slot interface */
export interface ParkingSlot {
  readonly id: string | number;
  readonly label: string;
  readonly type: SlotTypeLiteral;
  readonly status: SlotStatusLiteral;
  readonly x?: number;
  readonly z?: number;
  readonly distance_from_entry?: number;
  readonly vehicle_type?: VehicleType;
}

/** Parking session interface */
export interface ParkingSession {
  readonly session_id: SessionId;
  readonly vehicle_type: VehicleType;
  readonly parking_slot: ParkingSlot;
  readonly entry_point: EntryPointIdentifier;
  readonly parked_at: string;
  readonly exited_at?: string;
  readonly duration_hours?: number;
  readonly total_fee?: number;
  readonly is_active: boolean;
  readonly is_continuous?: boolean;
}

/** Vehicle interface */
export interface Vehicle {
  readonly id: string;
  readonly license_plate: string;
  readonly vehicle_type: VehicleType;
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

/** Billing audit log interface */
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
  readonly fee_breakdown?: BillingFeeBreakdown;
  readonly correlation_id?: string;
  readonly idempotency_key?: string;
  readonly billing_version: string;
  readonly calculated_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Billing fee breakdown interface */
export interface BillingFeeBreakdown {
  readonly base_fee: number;
  readonly exceeding_fee: number;
  readonly long_term_fee: number;
  readonly total_fee: number;
  readonly duration_hours: number;
}

/** Kafka event interface */
export interface KafkaEvent {
  readonly id: string;
  readonly event_type: string;
  readonly topic: string;
  readonly event_id: string;
  readonly payload: Record<string, unknown>;
  readonly status: 'pending' | 'published' | 'failed' | 'retrying';
  readonly retry_count: number;
  readonly error_message?: string;
  readonly partition: number;
  readonly offset?: number;
  readonly published_at?: string;
  readonly occurred_at: string;
  readonly idempotency_key?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Available slots response interface */
export interface AvailableSlotsResponse {
  readonly available_slots: readonly ParkingSlot[];
  readonly total_count?: number;
  readonly vehicle_type?: VehicleType;
  readonly entry_point_id?: EntryPointIdentifier;
}

/** Unpark vehicle result interface */
export interface UnparkVehicleResult {
  readonly session_id: SessionId;
  readonly vehicle_type: VehicleType;
  readonly parking_slot: ParkingSlot;
  readonly entry_point: EntryPointIdentifier;
  readonly parked_at: string;
  readonly exited_at: string;
  readonly duration_hours: number;
  readonly total_fee: number;
  readonly is_continuous: boolean;
  readonly fee_breakdown?: FeeBreakdown;
}

/** Fee breakdown interface */
export interface FeeBreakdown {
  readonly base_fee: number;
  readonly exceeding_hours: number;
  readonly exceeding_fee: number;
  readonly long_term?: LongTermBreakdown;
  readonly remaining: FeeBreakdownRemaining;
  readonly total_fee: number;
}

/** Long term breakdown interface */
export interface LongTermBreakdown {
  readonly days: number;
  readonly fee: number;
}

/** Fee breakdown remaining interface */
export interface FeeBreakdownRemaining {
  readonly base_fee: number;
  readonly exceeding_hours: number;
  readonly exceeding_fee: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  readonly data: T;
  readonly message?: string;
  readonly error?: string;
  readonly status?: number;
}

/** API error response */
export interface ApiErrorResponse {
  readonly error: string;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
  readonly status: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

/** Park vehicle form values */
export interface ParkVehicleFormValues {
  readonly vehicleType: VehicleType;
  readonly entryPointId: EntryPointIdentifier;
}

/** Unpark vehicle form values */
export interface UnparkVehicleFormValues {
  readonly sessionId: SessionId;
}

/** Search slots form values */
export interface SearchSlotsFormValues {
  readonly vehicleType: VehicleType;
  readonly entryPointId: EntryPointIdentifier;
}

/** Slot form data for create/edit */
export interface SlotFormData {
  readonly slot_label: string;
  readonly slot_type: 'SP' | 'MP' | 'LP';
  readonly distances: number[];
}

/** Entry point form data for create/edit */
export interface EntryPointFormData {
  readonly identifier: string;
  readonly name: string;
}

/** Form validation error */
export interface FormValidationError {
  readonly field: string;
  readonly message: string;
}

/** Form validation result */
export type ValidationResult<T> = 
  | { readonly valid: true; readonly data: T }
  | { readonly valid: false; readonly errors: readonly FormValidationError[] };

// ============================================================================
// UI STATE TYPES
// ============================================================================

/** Async operation state */
export interface AsyncState<T, E = Error> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: E | null;
}

/** Async state with success flag */
export interface AsyncStateWithSuccess<T, E = Error> extends AsyncState<T, E> {
  readonly success: boolean;
}

/** Component props with loading state */
export interface WithLoading {
  readonly loading?: boolean;
  readonly disabled?: boolean;
}

/** Component props with error state */
export interface WithError {
  readonly error?: string | null;
}

/** Component props with success state */
export interface WithSuccess {
  readonly success?: string | null;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/** Stack navigation prop list type */
export interface StackNavigationPropList {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

/** Navigation prop type for screens */
export interface NavigationProp {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

/** Route prop type for screens */
export interface RouteProp<TParams extends Record<string, unknown> = Record<string, unknown>> {
  params: TParams;
  key: string;
  name: string;
}

/** Screen props type */
export interface ScreenProps<TParams extends Record<string, unknown> = Record<string, unknown>> {
  navigation: NavigationProp;
  route: RouteProp<TParams>;
}

// ============================================================================
// SCREEN MANAGEMENT TYPES
// ============================================================================

/** Slot management screen props */
export interface SlotManagementScreenProps {
  navigation: StackNavigationPropList;
}

/** Slot filters for filtering slots */
export interface SlotFilters {
  readonly type: 'ALL' | 'SP' | 'MP' | 'LP';
  readonly availability: 'ALL' | 'AVAILABLE';
}

/** Slot modal state */
export interface SlotModalState {
  readonly visible: boolean;
  readonly mode: 'create' | 'edit';
  readonly slot?: ParkingSlot;
}

/** Entry points management screen props */
export interface EntryPointsManagementScreenProps {
  navigation: StackNavigationPropList;
}

/** Entry point modal state */
export interface EntryPointModalState {
  readonly visible: boolean;
  readonly mode: 'create' | 'edit';
  readonly entryPoint?: EntryPoint;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/** Configuration tab type */
export type ConfigurationTab = 'entry-points' | 'parking-slots' | 'system';

/** Configuration JSON data */
export interface ConfigJsonData {
  readonly entry_points_count?: number;
  readonly parking_slots_count?: number;
}

/** Initialize response */
export interface InitializeResponse {
  readonly entry_points_created: number;
  readonly parking_slots_created: number;
  readonly message: string;
}

/** Health status type */
export type HealthStatus = 'online' | 'offline' | 'checking';

/** Configuration screen props */
export interface ConfigurationScreenProps {
  navigation: StackNavigationPropList;
}

// ============================================================================
// PLATFORM TYPES
// ============================================================================

/** Platform information */
export interface PlatformInfo {
  readonly isWeb: boolean;
  readonly isIOS: boolean;
  readonly isAndroid: boolean;
  readonly version: number | string;
}

/** Responsive dimensions */
export interface ResponsiveDimensions {
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
}

/** Network status */
export interface NetworkStatus {
  readonly isOnline: boolean;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/** Storage interface */
export interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Make all properties of T optional recursively */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make all properties of T required recursively */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/** Extract type of a promise */
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

/** Extract type of an array element */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/** Create a union of all values in an object */
export type ValueOf<T> = T[keyof T];

/** Create a type for nullable values */
export type Nullable<T> = T | null;

/** Create a type for optional values */
export type Optional<T> = T | undefined;

/** Create a type for nullable or undefined values */
export type Nullish<T> = T | null | undefined;

/** Create a type for non-nullable values */
export type NonNullable<T> = T extends null | undefined ? never : T;

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================
