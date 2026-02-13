/**
 * Core Type Definitions for OO Parking Lot Application
 *
 * This file contains all the type definitions, interfaces, and utility types
 * used throughout the application with strict typing and advanced TypeScript features.
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
  readonly id: number;
  readonly identifier: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
}

/** Parking slot interface */
export interface ParkingSlot {
  x: number;
  z: number;
  type: SlotTypeLiteral;
  status: SlotStatusLiteral;
  readonly id: number;
  readonly slot_label: string;
  readonly slot_type: 'SP' | 'MP' | 'LP';
  readonly distances: number[];
  readonly available: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Parking session interface */
export interface ParkingSession {
  readonly id: number;
  readonly session_id: string;  // String session ID for display and navigation
  readonly is_active: boolean;  // Whether session is currently active
  readonly is_continuous: boolean;  // Whether this is a continuous parking session
  readonly vehicle_type: string;
  readonly parking_slot_id: number;
  readonly entry_point_id: number;
  readonly parked_at: string;
  readonly exited_at?: string;
  readonly duration_hours?: number;  // Duration in hours
  readonly total_fee: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly parking_slot?: {
    readonly id: number;
    readonly slot_label: string;
    readonly slot_type: string;
    };
  readonly entry_point?: {
    readonly id: number;
    readonly identifier: string;
    readonly name: string;
  };
}

/** Available slots response interface */
export interface AvailableSlotsResponse {
  readonly available_slots: readonly ParkingSlot[];
  readonly total_count: number;
  readonly vehicle_type: VehicleType;
  readonly entry_point_id: EntryPointIdentifier;
}

/** Fee breakdown interface */
export interface FeeBreakdown {
  readonly remaining: {
    readonly total: number;
    readonly base_fee: number;
    readonly exceeding_hours: number;
    readonly exceeding_fee: number;
    readonly hourly_rate?: number;
  };
  readonly long_term: {
    readonly days: number;
    readonly fee: number;
  };
  readonly total_fee: number;
  readonly duration_hours: number;
  readonly is_continuous: boolean;
  readonly base_start_time?: string;
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
  readonly breakdown: FeeBreakdown;
}

/** Create parking slot request interface */
export interface CreateParkingSlotRequest {
  readonly slot_label: string;
  readonly slot_type: 'SP' | 'MP' | 'LP';
  readonly distances: number[];
}

/** Update parking slot request interface */
export interface UpdateParkingSlotRequest {
  readonly slot_label?: string;
  readonly slot_type?: 'SP' | 'MP' | 'LP';
  readonly distances?: number[];
}

/** Create entry point request interface */
export interface CreateEntryPointRequest {
  distance_to_slot_1: any;
  distance_to_slot_2: any;
  distance_to_slot_3: any;
  id: string | number | readonly string[] | undefined;
  readonly identifier: string;
  readonly name: string;
}

/** Update entry point request interface */
export interface UpdateEntryPointRequest {
  readonly identifier?: string;
  readonly name?: string;
  readonly distance_to_slot_1?: number;
  readonly distance_to_slot_2?: number;
  readonly distance_to_slot_3?: number;
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

/** Paginated API response */
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalCount: number;
    readonly totalPages: number;
  };
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
// 3D VISUALIZATION TYPES
// ============================================================================

/** 3D position */
export type Position3D = readonly [number, number, number];

/** 3D rotation */
export type Rotation3D = readonly [number, number, number];

/** 3D scale */
export type Scale3D = readonly [number, number, number];

/** 3D slot size */
export interface SlotSize3D {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

/** 3D vehicle properties */
export interface Vehicle3DProps {
  readonly position: Position3D;
  readonly type: VehicleType;
  readonly color?: string;
}

/** 3D slot properties */
export interface Slot3DProps {
  readonly position: Position3D;
  readonly type: SlotTypeLiteral;
  readonly status: SlotStatusLiteral;
  readonly onClick: () => void;
  readonly isSelected: boolean;
}

/** 3D entry point properties */
export interface EntryPoint3DProps {
  readonly position: Position3D;
  readonly label: EntryPointIdentifier;
}

/** Camera configuration */
export interface CameraConfig {
  readonly position: Position3D;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
}

/** Controls configuration */
export interface ControlsConfig {
  readonly enablePan: boolean;
  readonly enableZoom: boolean;
  readonly enableRotate: boolean;
  readonly minDistance: number;
  readonly maxDistance: number;
}

// ============================================================================
// ANIMATION TYPES
// ============================================================================

/** Animation duration in milliseconds */
export type AnimationDuration = number;

/** Animation easing function */
export type AnimationEasing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInQuint'
  | 'easeOutQuint'
  | 'easeInOutQuint'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'
  | 'easeInCirc'
  | 'easeOutCirc'
  | 'easeInOutCirc'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce';

/** Animation configuration */
export interface AnimationConfig {
  readonly duration: AnimationDuration;
  readonly easing: AnimationEasing;
  readonly delay?: number;
  readonly loop?: boolean;
  readonly direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
}

/** Stagger animation configuration */
export interface StaggerConfig extends AnimationConfig {
  readonly staggerDelay: number;
  readonly staggerDirection?: 'forward' | 'backward' | 'center-out' | 'center-in';
}

/** Parallax configuration */
export interface ParallaxConfig {
  readonly speed: number;
  readonly direction: 'horizontal' | 'vertical' | 'both';
  readonly offset?: number;
}

/** Scroll trigger configuration */
export interface ScrollTriggerConfig {
  readonly threshold?: number;
  readonly rootMargin?: string;
  readonly triggerOnce?: boolean;
}

// ============================================================================
// VISUAL EFFECT TYPES
// ============================================================================

/** Cursor position */
export interface CursorPosition {
  readonly x: number;
  readonly y: number;
}

/** Spotlight mask configuration */
export interface SpotlightMaskConfig {
  readonly size: number;
  readonly blur: number;
  readonly opacity: number;
  readonly color?: string;
}

/** Magnetic effect configuration */
export interface MagneticEffectConfig {
  readonly strength: number;
  readonly threshold: number;
  readonly smoothness: number;
}

/** Fluid particle configuration */
export interface FluidParticleConfig {
  readonly count: number;
  readonly size: number;
  readonly speed: number;
  readonly color: string;
  readonly blur: number;
}

/** Kinetic typography configuration */
export interface KineticTypographyConfig {
  readonly effect: 'wave' | 'glitch' | 'typewriter' | 'scramble' | 'reveal';
  readonly speed: number;
  readonly delay?: number;
  readonly characterDelay?: number;
}

// ============================================================================
// DESIGN TOKEN TYPES
// ============================================================================

/** Color palette */
export interface ColorPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
  readonly neutral: {
    readonly 50: string;
    readonly 100: string;
    readonly 200: string;
    readonly 300: string;
    readonly 400: string;
    readonly 500: string;
    readonly 600: string;
    readonly 700: string;
    readonly 800: string;
    readonly 900: string;
  };
}

/** Spacing scale */
export type SpacingScale =
  | 0
  | 0.5
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 8
  | 10
  | 12
  | 16
  | 20
  | 24
  | 32
  | 40
  | 48
  | 56
  | 64
  | 72
  | 80
  | 96;

/** Typography scale */
export type TypographyScale =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | '8xl'
  | '9xl';

/** Border radius scale */
export type BorderRadiusScale =
  | 'none'
  | 'sm'
  | 'base'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | 'full';

/** Shadow scale */
export type ShadowScale =
  | 'none'
  | 'sm'
  | 'base'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | 'inner';

/** Z-index scale */
export type ZIndexScale =
  | 0
  | 10
  | 20
  | 30
  | 40
  | 50
  | 'auto';

/** Design tokens interface */
export interface DesignTokens {
  readonly colors: ColorPalette;
  readonly spacing: Record<SpacingScale, string>;
  readonly typography: Record<TypographyScale, string>;
  readonly borderRadius: Record<BorderRadiusScale, string>;
  readonly shadows: Record<ShadowScale, string>;
  readonly zIndex: Record<ZIndexScale, number>;
  readonly transitions: {
    readonly fast: string;
    readonly base: string;
    readonly slow: string;
  };
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

/** Pick properties from T by key type */
export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

/** Omit properties from T by key type */
export type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P];
};

/** Make all properties of T readonly recursively */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** Create a type with keys of T and values of U */
export type RecordByKeys<T, U> = {
  [P in keyof T]: U;
};

/** Extract the type of a promise */
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

/** Extract the type of an array element */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/** Create a union of all values in an object */
export type ValueOf<T> = T[keyof T];

/** Create a tuple from T */
export type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;

type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : _TupleOf<T, N, [...R, T]>;

/** Create a type with optional keys */
export type PartialByKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Create a type with required keys */
export type RequiredByKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Merge two types */
export type Merge<T, U> = Omit<T, keyof U> & U;

/** Create a function type */
export type FunctionType<T extends any[], R> = (...args: T) => R;

/** Create a type for event handlers */
export type EventHandler<T = Event> = (event: T) => void;

/** Create a type for async event handlers */
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

/** Create a type for component props */
export type ComponentProps<T> = T extends ComponentType<infer P> ? P : never;

// ============================================================================
// GENERIC TYPE HELPERS
// ============================================================================

/** Create a discriminated union */
export type DiscriminatedUnion<T, K extends keyof T> = T extends {
  [P in K]: infer U;
}
  ? { [P in K]: U } & Omit<T, K>
  : never;

/** Create a type that matches one of the keys */
export type OneOf<T extends Record<string, any>> = {
  [K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, undefined>>;
}[keyof T];

/** Create a type with at least one property */
export type AtLeastOne<T, U = { [K in keyof T]?: T[K] }> = Partial<T> & U & {
  [K in keyof T]: T[K];
};

/** Create a type with exactly one property */
export type ExactlyOne<T, U = { [K in keyof T]?: T[K] }> = Partial<T> & U & {
  [K in keyof T]?: T[K];
};

/** Create a type for nullable values */
export type Nullable<T> = T | null;

/** Create a type for optional values */
export type Optional<T> = T | undefined;

/** Create a type for nullable or undefined values */
export type Nullish<T> = T | null | undefined;

/** Create a type for non-nullable values */
export type NonNullable<T> = T extends null | undefined ? never : T;

// ============================================================================
// ROUTE TYPES
// ============================================================================

/** Route path parameter */
export type RouteParam = string;

/** Route query parameter */
export type QueryParam = string | string[] | undefined;

/** Route configuration */
export interface RouteConfig {
  readonly path: string;
  readonly element: ReactElement;
  readonly children?: readonly RouteConfig[];
  readonly index?: boolean;
}

/** App routes */
export type AppRoutes =
  | '/'
  | '/park'
  | '/unpark'
  | '/session/:id'
  | '/slots';

// ============================================================================
// STORYBOOK TYPES
// ============================================================================

/** Storybook meta configuration */
export interface StoryMeta<T> {
  readonly title: string;
  readonly component: ComponentType<T>;
  readonly tags?: readonly string[];
  readonly argTypes?: Record<string, unknown>;
  readonly parameters?: {
    readonly layout?: 'centered' | 'fullscreen' | 'padded';
    readonly backgrounds?: {
      readonly default?: string;
      readonly values?: readonly {
        readonly name: string;
        readonly value: string;
      }[];
    };
  };
}

/** Storybook story type */
export type Story<T> = {
  readonly args?: Partial<T>;
  readonly parameters?: Record<string, unknown>;
};

/** Storybook controls configuration */
export type StoryControls<T> = {
  [K in keyof T]?: {
    readonly control?: {
      readonly type: 'color' | 'date' | 'number' | 'object' | 'select' | 'text' | 'boolean' | 'check' | 'multi-select';
      readonly options?: readonly string[];
      readonly min?: number;
      readonly max?: number;
      readonly step?: number;
    };
    readonly description?: string;
    readonly table?: {
      readonly category?: string;
      readonly defaultValue?: { readonly summary: string };
      readonly type?: { readonly summary: string };
    };
  };
};
