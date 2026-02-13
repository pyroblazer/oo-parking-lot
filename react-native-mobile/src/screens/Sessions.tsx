/**
 * Sessions Screen - React Native
 *
 * SCREEN-006: Sessions Management
 *
 * Displays all parking sessions with:
 * - Card list layout (not table)
 * - Pagination controls (Previous, Next, page numbers, per-page selector)
 * - Auto-refresh indicator with pulsing dot (30 seconds)
 * - Loading skeleton with shimmer animation
 * - Empty state with CTA to park vehicle
 * - Status color coding (green for active, gray for completed)
 * - Navigation to View Session on card press
 *
 * @module Sessions
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/** Session data type from API */
interface Session {
  session_id: string;
  vehicle_type: 'S' | 'M' | 'L';
  parking_slot: {
    slot_label: string;
    slot_type: 'SP' | 'MP' | 'LP';
  };
  entry_point: string;
  parked_at: string;
  exited_at?: string;
  is_active: boolean;
  duration_hours?: number;
  total_fee?: number;
}

/** API response for sessions list */
interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  per_page: number;
}

/** Navigation type */
type RootStackParamList = {
  ViewSession: { id: string };
  ParkVehicle: undefined;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** Design system colors from spec */
const COLORS = {
  success: '#16a34a',
  textSecondary: '#64748b',
  text: '#111827',
  background: '#f9fafb',
  surface: '#ffffff',
  border: '#e5e7eb',
  primary: '#1e40af',
  primaryLight: '#3b82f6',
};

/** Philippine Peso formatter */
const PESO_FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Per-page options */
const PER_PAGE_OPTIONS = [10, 20, 50, 100];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a date string to a readable format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get vehicle type label
 * @param type - Vehicle type (S/M/L)
 * @returns Vehicle type label
 */
function getVehicleTypeLabel(type: 'S' | 'M' | 'L'): string {
  switch (type) {
    case 'S':
      return 'Small';
    case 'M':
      return 'Medium';
    case 'L':
      return 'Large';
    default:
      return type;
  }
}

/**
 * Get vehicle type color
 * @param type - Vehicle type (S/M/L)
 * @returns Color for the badge
 */
function getVehicleTypeColor(type: 'S' | 'M' | 'L'): string {
  switch (type) {
    case 'S':
      return '#dcfce7'; // green
    case 'M':
      return '#dbeafe'; // blue
    case 'L':
      return '#ede9fe'; // purple
    default:
      return COLORS.textSecondary;
  }
}

/**
 * Get vehicle type text color
 * @param type - Vehicle type (S/M/L)
 * @returns Text color for the badge
 */
function getVehicleTypeTextColor(type: 'S' | 'M' | 'L'): string {
  switch (type) {
    case 'S':
      return '#16a34a';
    case 'M':
      return '#1e40af';
    case 'L':
      return '#7c3aed';
    default:
      return COLORS.text;
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Session Card Component
 * Displays session information in a card layout with touch feedback
 */
interface SessionCardProps {
  session: Session;
  onPress: (sessionId: string) => void;
}

function SessionCard({ session, onPress }: SessionCardProps): React.JSX.Element {
  const isActive = session.is_active;
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(session.session_id)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`Session ${session.session_id}, ${isActive ? 'Active' : 'Completed'}`}
      accessibilityRole="button"
    >
      {/* Session ID */}
      <Text style={styles.sessionId}>{session.session_id}</Text>
      
      {/* Vehicle Type Badge */}
      <View style={[styles.badge, { backgroundColor: getVehicleTypeColor(session.vehicle_type) }]}>
        <Text style={[styles.badgeText, { color: getVehicleTypeTextColor(session.vehicle_type) }]}>
          {getVehicleTypeLabel(session.vehicle_type)}
        </Text>
      </View>
      
      {/* Slot */}
      <Text style={styles.slot}>{session.parking_slot?.slot_label || 'N/A'}</Text>
      
      {/* Entry Point */}
      <Text style={styles.entryPoint}>
        Entry Point: {session.entry_point || 'N/A'}
      </Text>
      
      {/* Parked At */}
      <Text style={styles.parkedAt}>{formatDate(session.parked_at)}</Text>
      
      {/* Status Badge */}
      <View style={[
        styles.statusBadge,
        isActive ? styles.statusActive : styles.statusCompleted
      ]}>
        <Text style={[
          styles.statusText,
          isActive ? styles.statusTextActive : styles.statusTextCompleted
        ]}>
          {isActive ? 'Active' : 'Completed'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Loading Skeleton Component
 * Displays shimmer animation during data fetch
 */
function LoadingSkeleton(): React.JSX.Element {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    );
    
    shimmerAnimation.start();
    
    return () => {
      shimmerAnimation.stop();
    };
  }, [shimmerAnim]);
  
  const shimmerColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#e5e7eb', '#f3f4f6', '#e5e7eb'],
  });
  
  return (
    <View style={styles.skeletonContainer}>
      {[...Array(5)].map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <Animated.View style={[styles.skeletonRow, { backgroundColor: shimmerColor }]} />
          <Animated.View style={[styles.skeletonRow, { backgroundColor: shimmerColor }]} />
          <Animated.View style={[styles.skeletonRow, { backgroundColor: shimmerColor }]} />
          <Animated.View style={[styles.skeletonRow, { backgroundColor: shimmerColor }]} />
          <Animated.View style={[styles.skeletonRow, { backgroundColor: shimmerColor }]} />
          <Animated.View style={[styles.skeletonRow, { backgroundColor: shimmerColor }]} />
        </View>
      ))}
    </View>
  );
}

/**
 * Empty State Component
 * Displays when no sessions exist
 */
interface EmptyStateProps {
  onParkVehicle: () => void;
}

function EmptyState({ onParkVehicle }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🚗</Text>
      <Text style={styles.emptyStateTitle}>No Sessions Found</Text>
      <Text style={styles.emptyStateMessage}>
        No parking sessions have been recorded yet.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={onParkVehicle}
        accessible={true}
        accessibilityLabel="Park a vehicle"
        accessibilityRole="button"
      >
        <Text style={styles.emptyStateButtonText}>Park a Vehicle</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Pagination Controls Component
 * Displays Previous, Next, page numbers, and per-page selector
 */
interface PaginationControlsProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

function PaginationControls({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: PaginationControlsProps): React.JSX.Element {
  const totalPages = Math.ceil(total / perPage);
  const startItem = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, total);
  
  // Generate page numbers (show max 5 pages)
  const pageNumbers: number[] = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Show first 2, current, and last 2
    if (page <= 3) {
      pageNumbers.push(1, 2, 3, 4, 5);
    } else if (page >= totalPages - 2) {
      pageNumbers.push(
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pageNumbers.push(page - 2, page - 1, page, page + 1, page + 2);
    }
  }
  
  return (
    <View style={styles.paginationContainer}>
      {/* Total count display */}
      <Text style={styles.paginationInfo}>
        Showing {startItem}-{endItem} of {total} sessions
      </Text>
      
      {/* Pagination buttons */}
      <View style={styles.paginationButtons}>
        {/* Previous button */}
        <TouchableOpacity
          style={[
            styles.paginationButton,
            page === 1 && styles.paginationButtonDisabled
          ]}
          onPress={() => onPageChange(page - 1)}
          disabled={page === 1}
          accessible={true}
          accessibilityLabel="Previous page"
          accessibilityRole="button"
          accessibilityState={{ disabled: page === 1 }}
        >
          <Text style={[
            styles.paginationButtonText,
            page === 1 && styles.paginationButtonTextDisabled
          ]}>
            Previous
          </Text>
        </TouchableOpacity>
        
        {/* Page numbers */}
        <View style={styles.pageNumbers}>
          {pageNumbers.map((pageNum) => (
            <TouchableOpacity
              key={pageNum}
              style={[
                styles.pageNumber,
                page === pageNum && styles.pageNumberActive
              ]}
              onPress={() => onPageChange(pageNum)}
              accessible={true}
              accessibilityLabel={`Page ${pageNum}`}
              accessibilityRole="button"
              accessibilityState={{ selected: page === pageNum }}
            >
              <Text style={[
                styles.pageNumberText,
                page === pageNum && styles.pageNumberTextActive
              ]}>
                {pageNum}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Next button */}
        <TouchableOpacity
          style={[
            styles.paginationButton,
            page === totalPages && styles.paginationButtonDisabled
          ]}
          onPress={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          accessible={true}
          accessibilityLabel="Next page"
          accessibilityRole="button"
          accessibilityState={{ disabled: page === totalPages }}
        >
          <Text style={[
            styles.paginationButtonText,
            page === totalPages && styles.paginationButtonTextDisabled
          ]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Per-page selector */}
      <View style={styles.perPageSelector}>
        <Text style={styles.perPageLabel}>Per page:</Text>
        <View style={styles.perPageOptions}>
          {PER_PAGE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.perPageOption,
                perPage === option && styles.perPageOptionActive
              ]}
              onPress={() => onPerPageChange(option)}
              accessible={true}
              accessibilityLabel={`Show ${option} per page`}
              accessibilityRole="button"
              accessibilityState={{ selected: perPage === option }}
            >
              <Text style={[
                styles.perPageOptionText,
                perPage === option && styles.perPageOptionTextActive
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Auto-Refresh Indicator Component
 * Displays pulsing dot and auto-refresh label
 */
interface AutoRefreshIndicatorProps {
  isRefreshing: boolean;
}

function AutoRefreshIndicator({ isRefreshing }: AutoRefreshIndicatorProps): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim]);
  
  return (
    <View style={styles.autoRefreshContainer}>
      <Animated.View
        style={[
          styles.pulsingDot,
          {
            transform: [{ scale: pulseAnim }],
            opacity: isRefreshing ? 1 : 0.5,
          }
        ]}
      />
      <Text style={styles.autoRefreshText}>
        Auto-refresh: 30s
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

/**
 * Sessions Screen Component
 */
export default function SessionsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  // State for sessions list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  
  // State for loading and error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref for auto-refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for app state
  const appStateRef = useRef<AppStateStatus>('active');
  
  /**
   * Load sessions from API
   */
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRefreshing(true);
      
      const response = await parkingApi.listSessions(page, perPage);
      setSessions(response.sessions);
      setTotal(response.total);
    } catch (err) {
      console.error('Error loading sessions:', err);
      if (err instanceof parkingApi.ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load sessions. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, perPage]);
  
  /**
   * Handle page change
   */
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);
  
  /**
   * Handle per-page change
   */
  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing per-page
  }, []);
  
  /**
   * Handle session card press - navigate to View Session
   */
  const handleSessionPress = useCallback((sessionId: string) => {
    navigation.navigate('ViewSession', { id: sessionId });
  }, [navigation]);
  
  /**
   * Handle park vehicle button press
   */
  const handleParkVehicle = useCallback(() => {
    navigation.navigate('ParkVehicle');
  }, [navigation]);
  
  /**
   * Set up auto-refresh interval (30 seconds)
   * Pauses when app is in background
   */
  useEffect(() => {
    const startAutoRefresh = () => {
      refreshIntervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active') {
          loadSessions();
        }
      }, 30000);
    };
    
    startAutoRefresh();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadSessions]);
  
  /**
   * Handle app state changes to pause/resume auto-refresh
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  /**
   * Load sessions on mount and when page/perPage changes
   */
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sessions Management</Text>
        <AutoRefreshIndicator isRefreshing={isRefreshing} />
      </View>
      
      {/* Content */}
      {loading && sessions.length === 0 ? (
        <LoadingSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Sessions</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadSessions}
            accessible={true}
            accessibilityLabel="Retry loading sessions"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sessions.length === 0 ? (
        <EmptyState onParkVehicle={handleParkVehicle} />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {sessions.map((session) => (
            <SessionCard
              key={session.session_id}
              session={session}
              onPress={handleSessionPress}
            />
          ))}
        </ScrollView>
      )}
      
      {/* Pagination Controls */}
      {!loading && sessions.length > 0 && (
        <PaginationControls
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  autoRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  autoRefreshText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 44, // Minimum touch target
  },
  sessionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slot: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  entryPoint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  parkedAt: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusCompleted: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: COLORS.success,
  },
  statusTextCompleted: {
    color: COLORS.textSecondary,
  },
  skeletonContainer: {
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  skeletonRow: {
    height: 16,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyStateIcon: {
    fontSize: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 44, // Minimum touch target
  },
  emptyStateButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 44, // Minimum touch target
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  paginationInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minHeight: 44, // Minimum touch target
  },
  paginationButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  paginationButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: 4,
  },
  pageNumber: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    minHeight: 44, // Minimum touch target
  },
  pageNumberActive: {
    backgroundColor: COLORS.primary,
  },
  pageNumberText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: COLORS.surface,
  },
  perPageSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  perPageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  perPageOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  perPageOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    minHeight: 44, // Minimum touch target
  },
  perPageOptionActive: {
    backgroundColor: COLORS.primary,
  },
  perPageOptionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  perPageOptionTextActive: {
    color: COLORS.surface,
  },
});
