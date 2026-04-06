/**
 * Dashboard Screen
 * 
 * A comprehensive dashboard screen for the OO Parking Lot System.
 * Displays real-time parking statistics, slot occupancy grid, entry points status,
 * and recent activity feed with pull-to-refresh and auto-refresh functionality.
 * 
 * @module Dashboard
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * System health status type
 */
type HealthStatus = 'online' | 'offline' | 'checking';

/**
 * Dashboard state interface
 */
interface DashboardState {
  slots: parkingApi.ParkingSlot[];
  entryPoints: parkingApi.EntryPoint[];
  activeSessions: parkingApi.Session[];
  systemHealth: parkingApi.HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  healthStatus: HealthStatus;
  lastRefreshTime: Date | null;
}

/**
 * Stats data interface
 */
interface StatsData {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  activeSessions: number;
  totalRevenueToday: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Design system colors
 */
const COLORS = {
  primary: '#1e40af',      // blue-800
  success: '#16a34a',      // green-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  background: '#f1f5f9',   // slate-100
  card: '#ffffff',        // white
  text: '#0f172a',        // slate-900
  textSecondary: '#64748b', // slate-500
  border: '#e2e8f0',      // slate-200
  slotAvailable: '#22c55e', // green-500
  slotOccupied: '#ef4444',  // red-500
  slotSP: '#3b82f6',      // blue-500
  slotMP: '#a855f7',      // purple-500
  slotLP: '#f97316',      // orange-500
} as const;

/**
 * Auto-refresh interval in milliseconds (30 seconds)
 */
const AUTO_REFRESH_INTERVAL = 30000;

/**
 * Number of recent sessions to display
 */
const RECENT_SESSIONS_LIMIT = 10;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency in Philippine Peso
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "₱1,234.00")
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date for display
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get vehicle type label
 * 
 * @param vehicleType - Vehicle type code
 * @returns Human-readable vehicle type
 */
const getVehicleTypeLabel = (vehicleType: string): string => {
  switch (vehicleType) {
    case 'S':
      return 'Small';
    case 'M':
      return 'Medium';
    case 'L':
      return 'Large';
    default:
      return 'Unknown';
  }
};

/**
 * Get slot type color
 * 
 * @param slotType - Slot type code
 * @returns Color for the slot type
 */
const getSlotTypeColor = (slotType: string): string => {
  switch (slotType) {
    case 'SP':
      return COLORS.slotSP;
    case 'MP':
      return COLORS.slotMP;
    case 'LP':
      return COLORS.slotLP;
    default:
      return COLORS.textSecondary;
  }
};

/**
 * Calculate dashboard statistics
 * 
 * @param slots - Array of parking slots
 * @param sessions - Array of active sessions
 * @returns Statistics object
 */
const calculateStats = (
  slots: parkingApi.ParkingSlot[],
  sessions: parkingApi.Session[]
): StatsData => {
  const totalSlots = slots.length;
  const availableSlots = slots.filter(slot => slot.available).length;
  const occupiedSlots = totalSlots - availableSlots;
  const activeSessions = sessions.length;
  
  // Calculate total revenue from completed sessions today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalRevenueToday = sessions
    .filter(session => session.total_fee !== undefined && session.exited_at)
    .reduce((sum, session) => sum + (session.total_fee || 0), 0);
  
  return {
    totalSlots,
    availableSlots,
    occupiedSlots,
    activeSessions,
    totalRevenueToday,
  };
};

/**
 * Get entry point vehicle count
 * 
 * @param entryPointId - Entry point identifier
 * @param sessions - Array of active sessions
 * @returns Number of vehicles at entry point
 */
const getEntryPointVehicleCount = (
  entryPointId: string,
  sessions: parkingApi.Session[]
): number => {
  return sessions.filter(session => {
    const ep = typeof session.entry_point === 'string'
      ? session.entry_point
      : session.entry_point.identifier;
    return ep === entryPointId;
  }).length;
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Health status badge component
 */
const HealthStatusBadge: React.FC<{ status: HealthStatus }> = ({ status }) => {
  const getStatusColor = (): string => {
    switch (status) {
      case 'online':
        return COLORS.success;
      case 'offline':
        return COLORS.danger;
      case 'checking':
        return COLORS.warning;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={[styles.healthBadge, { backgroundColor: getStatusColor() }]}>
      <View style={styles.healthIndicator} />
      <Text style={styles.healthText}>{getStatusText()}</Text>
    </View>
  );
};

/**
 * Stat card component
 */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  color: string;
  icon: string;
}> = ({ title, value, color, icon }) => {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
};

/**
 * Slot grid cell component
 */
const SlotCell: React.FC<{
  slot: parkingApi.ParkingSlot;
  onPress: (slot: parkingApi.ParkingSlot) => void;
}> = ({ slot, onPress }) => {
  const isAvailable = slot.available;
  const slotColor = isAvailable ? COLORS.slotAvailable : COLORS.slotOccupied;
  const typeColor = getSlotTypeColor(slot.slot_type);

  return (
    <TouchableOpacity
      style={styles.slotCell}
      onPress={() => onPress(slot)}
      accessibilityLabel={`Slot ${slot.slot_label}, ${isAvailable ? 'available' : 'occupied'}, type ${slot.slot_type}`}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
    >
      <View style={[styles.slotIndicator, { backgroundColor: slotColor }]} />
      <Text style={styles.slotLabel}>{slot.slot_label}</Text>
      <View style={[styles.slotTypeBadge, { backgroundColor: typeColor }]}>
        <Text style={styles.slotTypeText}>{slot.slot_type}</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Entry point status item component
 */
const EntryPointItem: React.FC<{
  entryPoint: parkingApi.EntryPoint;
  vehicleCount: number;
}> = ({ entryPoint, vehicleCount }) => {
  return (
    <View style={styles.entryPointItem}>
      <View style={styles.entryPointInfo}>
        <View style={styles.entryPointIdentifier}>
          <Text style={styles.entryPointIdentifierText}>{entryPoint.identifier}</Text>
        </View>
        <Text style={styles.entryPointName}>{entryPoint.name}</Text>
      </View>
      <View style={styles.entryPointStats}>
        <View style={styles.vehicleCountBadge}>
          <Text style={styles.vehicleCountText}>{vehicleCount}</Text>
        </View>
        <Text style={styles.vehicleCountLabel}>vehicles</Text>
      </View>
    </View>
  );
};

/**
 * Activity feed item component
 */
const ActivityFeedItem: React.FC<{ session: parkingApi.Session }> = ({ session }) => {
  const isActive = !session.exited_at;
  const statusColor = isActive ? COLORS.success : COLORS.textSecondary;
  const statusText = isActive ? 'Active' : 'Completed';

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityStatusIndicator, { backgroundColor: statusColor }]} />
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activitySessionId}>{session.session_id}</Text>
          <Text style={[styles.activityStatus, { color: statusColor }]}>{statusText}</Text>
        </View>
        <View style={styles.activityDetails}>
          <Text style={styles.activityDetail}>
            {getVehicleTypeLabel(session.vehicle_type)} • {session.parking_slot.slot_label}
          </Text>
          <Text style={styles.activityDetail}>
            Entry: {typeof session.entry_point === 'string' ? session.entry_point : session.entry_point.identifier ?? ''}
          </Text>
          <Text style={styles.activityDetail}>
            {formatDate(session.parked_at)}
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC<{
  icon: string;
  title: string;
  message: string;
}> = ({ icon, title, message }) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
    </View>
  );
};

/**
 * Error banner component
 */
const ErrorBanner: React.FC<{ error: string; onDismiss: () => void }> = ({ error, onDismiss }) => {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.errorDismiss}>
        <Text style={styles.errorDismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

/**
 * Dashboard screen component
 */
const Dashboard: React.FC = () => {
  const navigation = useNavigation();
  const [state, setState] = useState<DashboardState>({
    slots: [],
    entryPoints: [],
    activeSessions: [],
    systemHealth: null,
    loading: true,
    error: null,
    refreshing: false,
    healthStatus: 'checking',
    lastRefreshTime: null,
  });

  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch all dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch data in parallel
      const [slots, entryPoints, sessions, health] = await Promise.all([
        parkingApi.listSlots(),
        parkingApi.listEntryPoints(),
        parkingApi.listSessions(1, RECENT_SESSIONS_LIMIT),
        parkingApi.checkHealth(),
      ]);

      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        slots,
        entryPoints,
        activeSessions: sessions.sessions,
        systemHealth: health,
        loading: false,
        healthStatus: health.status === 'ok' ? 'online' : 'offline',
        lastRefreshTime: new Date(),
      }));
    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to load dashboard data. Please try again.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        healthStatus: 'offline',
      }));
    }
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await fetchDashboardData();
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  }, [fetchDashboardData]);

  /**
   * Handle slot press
   */
  const handleSlotPress = useCallback((slot: parkingApi.ParkingSlot) => {
    Alert.alert(
      `Slot ${slot.slot_label}`,
      `Type: ${slot.slot_type}\nStatus: ${slot.available ? 'Available' : 'Occupied'}`,
      [
        { text: 'OK', style: 'default' },
      ]
    );
  }, []);

  /**
   * Navigate to Park screen
   */
  const navigateToPark = useCallback(() => {
    navigation.navigate('Park' as never);
  }, [navigation]);

  /**
   * Navigate to Sessions screen
   */
  const navigateToSessions = useCallback(() => {
    navigation.navigate('Sessions' as never);
  }, [navigation]);

  /**
   * Navigate to Configuration screen
   */
  const navigateToConfiguration = useCallback(() => {
    navigation.navigate('Configuration' as never);
  }, [navigation]);

  /**
   * Dismiss error banner
   */
  const dismissError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();

    // Setup auto-refresh interval
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchDashboardData();
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchDashboardData]);

  // Calculate statistics
  const stats = calculateStats(state.slots, state.activeSessions);

  // Render loading state
  if (state.loading && state.slots.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          {state.lastRefreshTime && (
            <Text style={styles.lastRefreshText}>
              Last updated: {formatDate(state.lastRefreshTime.toISOString())}
            </Text>
          )}
        </View>
        <HealthStatusBadge status={state.healthStatus} />
      </View>

      {/* Error Banner */}
      {state.error && (
        <ErrorBanner error={state.error} onDismiss={dismissError} />
      )}

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            <StatCard
              title="Total Slots"
              value={stats.totalSlots}
              color={COLORS.primary}
              icon="🅿️"
            />
            <StatCard
              title="Available"
              value={stats.availableSlots}
              color={COLORS.success}
              icon="✅"
            />
            <StatCard
              title="Occupied"
              value={stats.occupiedSlots}
              color={COLORS.danger}
              icon="🔴"
            />
            <StatCard
              title="Active Sessions"
              value={stats.activeSessions}
              color={COLORS.warning}
              icon="🚗"
            />
            <StatCard
              title="Revenue Today"
              value={formatCurrency(stats.totalRevenueToday)}
              color={COLORS.primary}
              icon="💰"
            />
          </ScrollView>
        </View>

        {/* Slot Occupancy Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Slot Occupancy</Text>
            <TouchableOpacity onPress={navigateToPark} style={styles.sectionButton}>
              <Text style={styles.sectionButtonText}>Park Vehicle</Text>
            </TouchableOpacity>
          </View>
          {state.slots.length === 0 ? (
            <EmptyState
              icon="🅿️"
              title="No Slots Available"
              message="There are no parking slots configured yet."
            />
          ) : (
            <View style={styles.slotGrid}>
              {state.slots.map(slot => (
                <SlotCell
                  key={slot.id}
                  slot={slot}
                  onPress={handleSlotPress}
                />
              ))}
            </View>
          )}
        </View>

        {/* Entry Points Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entry Points</Text>
          {state.entryPoints.length === 0 ? (
            <EmptyState
              icon="🚪"
              title="No Entry Points"
              message="There are no entry points configured yet."
            />
          ) : (
            <View style={styles.entryPointsList}>
              {state.entryPoints.map(entryPoint => (
                <EntryPointItem
                  key={entryPoint.id}
                  entryPoint={entryPoint}
                  vehicleCount={getEntryPointVehicleCount(entryPoint.identifier, state.activeSessions)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity Feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={navigateToSessions} style={styles.sectionButton}>
              <Text style={styles.sectionButtonText}>View All</Text>
            </TouchableOpacity>
          </View>
          {state.activeSessions.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No Recent Activity"
              message="There are no recent parking sessions."
            />
          ) : (
            <View style={styles.activityFeed}>
              {state.activeSessions.map(session => (
                <ActivityFeedItem
                  key={session.session_id}
                  session={session}
                />
              ))}
            </View>
          )}
        </View>

        {/* Configuration Button */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={navigateToConfiguration}
            style={styles.configButton}
            accessibilityLabel="Go to configuration"
            accessibilityRole="button"
          >
            <Text style={styles.configButtonText}>⚙️ Configuration</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  lastRefreshText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.card,
    marginRight: 6,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.card,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.danger,
  },
  errorDismiss: {
    padding: 4,
  },
  errorDismissText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  sectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.card,
  },
  statsContainer: {
    paddingVertical: 8,
  },
  statCard: {
    width: 140,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  slotCell: {
    width: (width - 48) / 3,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  slotIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  slotTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.card,
  },
  entryPointsList: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
  },
  entryPointItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entryPointInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entryPointIdentifier: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryPointIdentifierText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.card,
  },
  entryPointName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  entryPointStats: {
    alignItems: 'center',
  },
  vehicleCountBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.card,
  },
  vehicleCountLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  activityFeed: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activitySessionId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityDetails: {
    gap: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyState: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  configButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  configButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default Dashboard;
