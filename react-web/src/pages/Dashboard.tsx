/**
 * Dashboard Page
 * 
 * Main dashboard for the OO Parking Lot System displaying real-time statistics,
 * slot occupancy grid, entry point status, and recent activity feed.
 * 
 * @module Dashboard
 */

import { useState, useEffect, useMemo } from 'react';
import { useParking } from '../context/ParkingContext';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the Dashboard component
 */
interface DashboardProps {
  /** Optional custom class name for styling */
  className?: string;
}

/**
 * Statistics data structure
 */
interface DashboardStats {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  activeSessions: number;
  totalRevenueToday: number;
}

// ============================================================================
// DESIGN SYSTEM COLORS
// ============================================================================

const COLORS = {
  primary: '#1e40af',      // blue-800
  success: '#16a34a',      // green-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  background: '#f1f5f9',   // slate-100
  card: '#ffffff',         // white
  text: {
    primary: '#1e293b',    // slate-800
    secondary: '#64748b',   // slate-500
    light: '#94a3b8',      // slate-400
  },
  border: '#e2e8f0',       // slate-200
} as const;

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: COLORS.background,
    padding: '1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as const,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  } as const,

  headerTitle: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: COLORS.text.primary,
    margin: 0,
  } as const,

  headerSubtitle: {
    fontSize: '0.875rem',
    color: COLORS.text.primary,
    marginTop: '0.25rem',
  } as const,

  healthBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  } as const,

  healthDot: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  } as const,

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  } as const,

  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    border: `1px solid ${COLORS.border}`,
  } as const,

  statCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  } as const,

  statLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
    color: COLORS.text.primary,
  } as const,

  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: 1,
  } as const,

  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  } as const,

  slotGridSection: {
    backgroundColor: COLORS.card,
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${COLORS.border}`,
  } as const,

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  } as const,

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: COLORS.text.primary,
    margin: 0,
  } as const,

  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '0.75rem',
  } as const,

  slotCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    position: 'relative' as const,
  } as const,

  slotCellAvailable: {
    backgroundColor: '#dcfce7', // green-100
    borderColor: '#16a34a',      // green-600
  } as const,

  slotCellOccupied: {
    backgroundColor: '#fee2e2', // red-100
    borderColor: '#dc2626',      // red-600
  } as const,

  slotCellHover: {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  } as const,

  slotLabel: {
    fontSize: '0.875rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  } as const,

  slotType: {
    fontSize: '0.625rem',
    fontWeight: '600',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    marginBottom: '0.25rem',
  } as const,

  slotStatus: {
    fontSize: '0.625rem',
    fontWeight: '500',
  } as const,

  slotTooltip: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap' as const,
    zIndex: 10,
    opacity: 0,
    visibility: 'hidden' as const,
    transition: 'opacity 0.2s ease, visibility 0.2s ease',
  } as const,

  slotCellHoverTooltip: {
    opacity: 1,
    visibility: 'visible' as const,
  } as const,

  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  } as const,

  activityFeed: {
    backgroundColor: COLORS.card,
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${COLORS.border}`,
    maxHeight: '400px',
    overflowY: 'auto' as const,
  } as const,

  activityList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as const,

  activityItem: {
    padding: '0.75rem 0',
    borderBottom: `1px solid ${COLORS.border}`,
    transition: 'background-color 0.2s ease',
  } as const,

  activityItemHover: {
    backgroundColor: '#f8fafc',
  } as const,

  activityItemLast: {
    borderBottom: 'none',
  } as const,

  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  } as const,

  activitySessionId: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'monospace',
  } as const,

  activityStatus: {
    fontSize: '0.625rem',
    fontWeight: '600',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
  } as const,

  activityStatusActive: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  } as const,

  activityStatusCompleted: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  } as const,

  activityDetails: {
    fontSize: '0.75rem',
    color: COLORS.text.primary,
    marginBottom: '0.25rem',
  } as const,

  activityTime: {
    fontSize: '0.625rem',
    color: COLORS.text.primary,
  } as const,

  entryPointsSection: {
    backgroundColor: COLORS.card,
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${COLORS.border}`,
  } as const,

  entryPointsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  } as const,

  entryPointItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.5rem',
    transition: 'all 0.2s ease',
  } as const,

  entryPointItemHover: {
    backgroundColor: '#f1f5f9',
    transform: 'translateX(4px)',
  } as const,

  entryPointInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  } as const,

  entryPointIdentifier: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: COLORS.primary,
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: '0.5rem',
  } as const,

  entryPointName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: COLORS.text.primary,
  } as const,

  entryPointStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: COLORS.text.primary,
  } as const,

  entryPointStatus: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: '50%',
  } as const,

  entryPointStatusOnline: {
    backgroundColor: COLORS.success,
  } as const,

  entryPointStatusOffline: {
    backgroundColor: COLORS.danger,
  } as const,

  refreshIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: COLORS.text.primary,
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.5rem',
  } as const,

  refreshDot: {
    width: '0.375rem',
    height: '0.375rem',
    borderRadius: '50%',
    backgroundColor: COLORS.success,
    animation: 'pulse 2s infinite',
  } as const,

  loadingOverlay: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    backgroundColor: COLORS.card,
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  } as const,

  loadingSpinner: {
    width: '2rem',
    height: '2rem',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid COLORS.primary',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as const,

  loadingText: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: COLORS.text.primary,
  } as const,

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    color: '#991b1b',
  } as const,

  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
  } as const,

  emptyStateText: {
    fontSize: '0.875rem',
    color: COLORS.text.primary,
    marginTop: '0.5rem',
  } as const,

  // Responsive styles
  '@media (max-width: 1024px)': {
    mainContent: {
      gridTemplateColumns: '1fr',
    },
  } as const,

  '@media (max-width: 640px)': {
    container: {
      padding: '1rem',
    },
    statsGrid: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    headerTitle: {
      fontSize: '1.5rem',
    },
  } as const,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a date string to a readable date and time format
 * 
 * @param dateString - ISO date string
 * @returns Formatted date and time string
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a number as Philippine Peso currency
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get vehicle type display name
 * 
 * @param vehicleType - Vehicle type code
 * @returns Display name for the vehicle type
 */
function getVehicleTypeName(vehicleType: string): string {
  const names: Record<string, string> = {
    'S': 'Small',
    'M': 'Medium',
    'L': 'Large',
  };
  return names[vehicleType] || vehicleType;
}

/**
 * Get slot type display name
 * 
 * @param slotType - Slot type code
 * @returns Display name for the slot type
 */
function getSlotTypeName(slotType: string): string {
  const names: Record<string, string> = {
    'SP': 'Small',
    'MP': 'Medium',
    'LP': 'Large',
  };
  return names[slotType] || slotType;
}

/**
 * Calculate statistics from parking data
 * 
 * @param slots - Array of parking slots
 * @param activeSessions - Array of active sessions
 * @returns Dashboard statistics
 */
function calculateStats(
  slots: parkingApi.ParkingSlot[],
  activeSessions: parkingApi.Session[]
): DashboardStats {
  const totalSlots = slots.length;
  const availableSlots = slots.filter(slot => slot.available).length;
  const occupiedSlots = totalSlots - availableSlots;
  
  // Calculate total revenue today from completed sessions
  const today = new Date().toDateString();
  const revenueToday = activeSessions.reduce((sum, session) => {
    const sessionDate = new Date(session.parked_at).toDateString();
    if (sessionDate === today && session.total_fee) {
      return sum + session.total_fee;
    }
    return sum;
  }, 0);

  return {
    totalSlots,
    availableSlots,
    occupiedSlots,
    activeSessions: activeSessions.length,
    totalRevenueToday: revenueToday,
  };
}

/**
 * Count vehicles at each entry point
 * 
 * @param sessions - Array of parking sessions
 * @param entryPoints - Array of entry points
 * @returns Map of entry point ID to vehicle count
 */
function countVehiclesAtEntryPoints(
  sessions: parkingApi.Session[],
  entryPoints: parkingApi.EntryPoint[]
): Map<string, number> {
  const counts = new Map<string, number>();
  
  // Initialize all entry points with 0
  entryPoints.forEach(ep => {
    counts.set(ep.id, 0);
  });
  
  // Count active sessions at each entry point
  sessions.forEach(session => {
    const currentCount = counts.get(session.entry_point) || 0;
    counts.set(session.entry_point, currentCount + 1);
  });
  
  return counts;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Health Status Badge Component
 * 
 * Displays the current system health status with color coding
 * 
 * @param health - System health status
 * @returns Health badge component
 */
function HealthBadge({ health }: { health: 'online' | 'offline' | 'checking' }): JSX.Element {
  const getHealthColor = (): { bg: string; text: string; dot: string } => {
    switch (health) {
      case 'online':
        return { bg: '#dcfce7', text: '#16a34a', dot: '#16a34a' };
      case 'offline':
        return { bg: '#fee2e2', text: '#dc2626', dot: '#dc2626' };
      case 'checking':
        return { bg: '#fef3c7', text: '#d97706', dot: '#d97706' };
    }
  };

  const colors = getHealthColor();

  return (
    <div
      style={{
        ...styles.healthBadge,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <div
        style={{
          ...styles.healthDot,
          backgroundColor: colors.dot,
        }}
      />
      <span>{health.charAt(0).toUpperCase() + health.slice(1)}</span>
    </div>
  );
}

/**
 * Stat Card Component
 * 
 * Displays a single statistic with label and value
 * 
 * @param label - Statistic label
 * @param value - Statistic value
 * @param color - Text color for the value
 * @returns Stat card component
 */
function StatCard({
  label,
  value,
  color = COLORS.primary,
}: {
  label: string;
  value: string | number;
  color?: string;
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.statCard,
        ...(isHovered ? styles.statCardHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ ...styles.statLabel, color: COLORS.text.secondary }}>
        {label}
      </div>
      <div style={{ ...styles.statValue, color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

/**
 * Slot Cell Component
 * 
 * Displays a single parking slot with status indicator
 * 
 * @param slot - Parking slot data
 * @param entryPoints - Entry points for distance calculation
 * @returns Slot cell component
 */
function SlotCell({
  slot,
  entryPoints,
}: {
  slot: parkingApi.ParkingSlot;
  entryPoints: parkingApi.EntryPoint[];
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const isAvailable = slot.available;

  // Find closest entry point
  const closestEntryPoint = useMemo(() => {
    if (!slot.distances || slot.distances.length === 0) {
      return null;
    }
    
    let minDistance = Infinity;
    let closestIndex = -1;
    
    slot.distances.forEach((distance, index) => {
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    if (closestIndex >= 0 && closestIndex < entryPoints.length) {
      return entryPoints[closestIndex];
    }
    
    return null;
  }, [slot.distances, entryPoints]);

  return (
    <div
      style={{
        ...styles.slotCell,
        ...(isAvailable ? styles.slotCellAvailable : styles.slotCellOccupied),
        ...(isHovered ? styles.slotCellHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          ...styles.slotTooltip,
          ...(isHovered ? styles.slotCellHoverTooltip : {}),
        }}
      >
        {closestEntryPoint && (
          <div>Closest: {closestEntryPoint.identifier} ({slot.distances[entryPoints.indexOf(closestEntryPoint)]} units)</div>
        )}
        {!closestEntryPoint && <div>No distance data</div>}
      </div>
      
      <div style={styles.slotLabel}>{slot.slot_label}</div>
      <div
        style={{
          ...styles.slotType,
          backgroundColor: isAvailable ? '#bbf7d0' : '#fecaca',
          color: isAvailable ? '#16a34a' : '#dc2626',
        }}
      >
        {getSlotTypeName(slot.slot_type)}
      </div>
      <div
        style={{
          ...styles.slotStatus,
          color: isAvailable ? '#16a34a' : '#dc2626',
        }}
      >
        {isAvailable ? 'Available' : 'Occupied'}
      </div>
    </div>
  );
}

/**
 * Activity Item Component
 * 
 * Displays a single parking session activity
 * 
 * @param session - Parking session data
 * @param isLast - Whether this is the last item in the list
 * @returns Activity item component
 */
function ActivityItem({
  session,
  isLast,
}: {
  session: parkingApi.Session;
  isLast: boolean;
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = !session.exited_at;

  return (
    <li
      style={{
        ...styles.activityItem,
        ...(isLast ? styles.activityItemLast : {}),
        ...(isHovered ? styles.activityItemHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.activityHeader}>
        <span style={styles.activitySessionId}>{session.session_id}</span>
        <span
          style={{
            ...styles.activityStatus,
            ...(isActive ? styles.activityStatusActive : styles.activityStatusCompleted),
          }}
        >
          {isActive ? 'Active' : 'Completed'}
        </span>
      </div>
      <div style={styles.activityDetails}>
        {getVehicleTypeName(session.vehicle_type)} • {session.parking_slot.slot_label}
      </div>
      <div style={styles.activityDetails}>
        Entry: {session.entry_point}
      </div>
      <div style={styles.activityTime}>
        Parked at {formatDateTime(session.parked_at)}
      </div>
    </li>
  );
}

/**
 * Entry Point Item Component
 * 
 * Displays a single entry point with status and vehicle count
 * 
 * @param entryPoint - Entry point data
 * @param vehicleCount - Number of vehicles at this entry point
 * @returns Entry point item component
 */
function EntryPointItem({
  entryPoint,
  vehicleCount,
}: {
  entryPoint: parkingApi.EntryPoint;
  vehicleCount: number;
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.entryPointItem,
        ...(isHovered ? styles.entryPointItemHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.entryPointInfo}>
        <div style={styles.entryPointIdentifier}>{entryPoint.identifier}</div>
        <div>
          <div style={styles.entryPointName}>{entryPoint.name}</div>
          <div style={styles.entryPointStats}>
            <div
              style={{
                ...styles.entryPointStatus,
                ...styles.entryPointStatusOnline,
              }}
            />
            {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

/**
 * Dashboard Component
 * 
 * Main dashboard page displaying real-time parking lot statistics,
 * slot occupancy grid, entry point status, and recent activity feed.
 * 
 * @param props - Component props
 * @returns Dashboard component
 */
export function Dashboard({ className = '' }: DashboardProps): JSX.Element {
  const { state } = useParking();
  const { slots, entryPoints, activeSessions, systemHealth, loading, error } = state;

  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // Update last refresh time when data refreshes
  useEffect(() => {
    if (!loading) {
      setLastRefreshTime(new Date());
    }
  }, [loading]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateStats(slots, activeSessions);
  }, [slots, activeSessions]);

  // Count vehicles at entry points
  const vehicleCounts = useMemo(() => {
    return countVehiclesAtEntryPoints(activeSessions, entryPoints);
  }, [activeSessions, entryPoints]);

  // Get recent sessions (last 10)
  const recentSessions = useMemo(() => {
    return [...activeSessions]
      .sort((a, b) => new Date(b.parked_at).getTime() - new Date(a.parked_at).getTime())
      .slice(0, 10);
  }, [activeSessions]);

  // Loading state
  if (loading && slots.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className={className}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Parking Lot Dashboard</h1>
          <p style={styles.headerSubtitle}>Real-time monitoring and management</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <HealthBadge health={systemHealth} />
          <div style={styles.refreshIndicator}>
            <div style={styles.refreshDot} />
            <span>Auto-refresh: 30s</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Total Slots"
          value={stats.totalSlots}
          color={COLORS.primary}
        />
        <StatCard
          label="Available Slots"
          value={stats.availableSlots}
          color={COLORS.success}
        />
        <StatCard
          label="Occupied Slots"
          value={stats.occupiedSlots}
          color={COLORS.danger}
        />
        <StatCard
          label="Active Sessions"
          value={stats.activeSessions}
          color={COLORS.warning}
        />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(stats.totalRevenueToday)}
          color={COLORS.primary}
        />
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Slot Grid Section */}
        <div style={styles.slotGridSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Slot Occupancy</h2>
            <div style={{ fontSize: '0.75rem', color: COLORS.text.secondary }}>
              {stats.availableSlots} / {stats.totalSlots} available
            </div>
          </div>
          
          {slots.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🅿️</div>
              <div style={styles.emptyStateText}>No parking slots available</div>
            </div>
          ) : (
            <div style={styles.slotGrid}>
              {slots.map(slot => (
                <SlotCell
                  key={slot.id}
                  slot={slot}
                  entryPoints={entryPoints}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Activity Feed */}
          <div style={styles.activityFeed}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <div style={{ fontSize: '0.75rem', color: COLORS.text.secondary }}>
                Last 10 sessions
              </div>
            </div>
            
            {recentSessions.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div style={styles.emptyStateText}>No recent activity</div>
              </div>
            ) : (
              <ul style={styles.activityList}>
                {recentSessions.map((session, index) => (
                  <ActivityItem
                    key={session.session_id}
                    session={session}
                    isLast={index === recentSessions.length - 1}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Entry Points */}
          <div style={styles.entryPointsSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Entry Points</h2>
              <div style={{ fontSize: '0.75rem', color: COLORS.text.secondary }}>
                {entryPoints.length} active
              </div>
            </div>
            
            {entryPoints.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚪</div>
                <div style={styles.emptyStateText}>No entry points configured</div>
              </div>
            ) : (
              <div style={styles.entryPointsList}>
                {entryPoints.map(entryPoint => (
                  <EntryPointItem
                    key={entryPoint.id}
                    entryPoint={entryPoint}
                    vehicleCount={vehicleCounts.get(entryPoint.id) || 0}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last Refresh Time */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: COLORS.text.light }}>
        Last updated: {formatDateTime(lastRefreshTime.toISOString())}
      </div>

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .dashboard-main-content {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .dashboard-container {
            padding: 1rem !important;
          }
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .dashboard-header-title {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Dashboard;
