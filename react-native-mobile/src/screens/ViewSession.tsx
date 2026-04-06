import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as parkingApi from '../api/parkingApi';
import type { Session } from '../api/parkingApi';

// Slot type display names
const SLOT_TYPE_NAMES: Record<string, string> = {
  SP: 'Small Parking',
  MP: 'Medium Parking',
  LP: 'Large Parking',
} as const;

// Vehicle type display names
const VEHICLE_TYPE_NAMES: Record<string, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
} as const;

// Helper function to extract error message consistently
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof parkingApi.ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};

// Helper function to format timestamp in human-readable format
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

// Helper function to get vehicle type color
function getVehicleTypeColor(vehicleType: 'S' | 'M' | 'L'): { backgroundColor: string; color: string } {
  switch (vehicleType) {
    case 'S':
      return { backgroundColor: '#dcfce7', color: '#16a34a' };
    case 'M':
      return { backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'L':
      return { backgroundColor: '#ede9fe', color: '#7c3aed' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#64748b' };
  }
}

// Helper function to get slot type color
function getSlotTypeColor(slotType: 'SP' | 'MP' | 'LP'): { backgroundColor: string; color: string } {
  switch (slotType) {
    case 'SP':
      return { backgroundColor: '#dcfce7', color: '#16a34a' };
    case 'MP':
      return { backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'LP':
      return { backgroundColor: '#ede9fe', color: '#7c3aed' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#64748b' };
  }
}

interface ViewSessionRouteParams {
  id: string;
}

interface ViewSessionProps {
  route: {
    params: ViewSessionRouteParams;
    key: string;
    name: string;
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

function ViewSession({ route, navigation }: ViewSessionProps): React.JSX.Element {
  const { id } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (): Promise<void> => {
    if (!id) {
      setError('Invalid session ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionData = await parkingApi.getSession(id);
      setSession(sessionData);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleBack = (): void => {
    navigation.goBack();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={loadSession}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Sessions')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Browse Sessions</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Not found state
  if (!session) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={styles.notFoundTitle}>Session Not Found</Text>
          <Text style={styles.notFoundMessage}>
            Session ID not found — It may have been deleted or never existed
          </Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={loadSession}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Sessions')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Browse Sessions</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Resolve entry point display value
  const entryPointDisplay = typeof session.entry_point === 'string'
    ? session.entry_point
    : session.entry_point.identifier ?? 'N/A';

  const slotLabel = session.parking_slot?.slot_label || 'N/A';
  const slotType = session.parking_slot?.slot_type || 'SP';
  const slotTypeColor = getSlotTypeColor(slotType);
  const vehicleTypeColor = getVehicleTypeColor(session.vehicle_type);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Session Card */}
      <View style={styles.sessionCard}>
        {/* Header with Session ID */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderLabel}>Session Details</Text>
          <View style={[
            styles.statusBadge,
            session.is_active ? styles.activeBadge : styles.completedBadge,
          ]}>
            <Text style={styles.statusBadgeText}>
              {session.is_active ? '● Active' : '✓ Completed'}
            </Text>
          </View>
        </View>

        {/* Session ID */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Session ID</Text>
          <Text style={styles.detailValueMono}>{session.session_id}</Text>
        </View>

        <View style={styles.divider} />

        {/* Vehicle Type */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle Type</Text>
          <View style={[styles.typeBadge, vehicleTypeColor]}>
            <Text style={styles.typeBadgeText}>
              {VEHICLE_TYPE_NAMES[session.vehicle_type]} ({session.vehicle_type})
            </Text>
          </View>
        </View>

        {/* Parking Slot */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Parking Slot</Text>
          <View style={styles.slotInfo}>
            <Text style={styles.slotLabelText}>{slotLabel}</Text>
            <View style={[styles.typeBadge, slotTypeColor]}>
              <Text style={styles.typeBadgeText}>
                {SLOT_TYPE_NAMES[slotType] || slotType}
              </Text>
            </View>
          </View>
        </View>

        {/* Entry Point */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Entry Point</Text>
          <View style={styles.entryPointInfo}>
            <View style={styles.entryPointCircle}>
              <Text style={styles.entryPointLetter}>
                {entryPointDisplay.charAt(0)}
              </Text>
            </View>
            <Text style={styles.entryPointText}>{entryPointDisplay}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Parked At */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Parked At</Text>
          <Text style={styles.detailValue}>{formatTimestamp(session.parked_at)}</Text>
        </View>

        {/* Exited At (completed sessions only) */}
        {session.exited_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Exited At</Text>
            <Text style={styles.detailValue}>{formatTimestamp(session.exited_at)}</Text>
          </View>
        )}

        {/* Duration (completed sessions only) */}
        {session.exited_at && session.duration_hours != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValueBold}>{session.duration_hours.toFixed(1)} hour{session.duration_hours !== 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Total Fee (completed sessions only) */}
        {session.exited_at && session.total_fee != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Fee</Text>
            <Text style={styles.feeValue}>₱{session.total_fee.toFixed(2)}</Text>
          </View>
        )}

        {/* Fee Breakdown (completed sessions with breakdown) */}
        {session.fee_breakdown && (
          <View style={styles.feeBreakdownBox}>
            <Text style={styles.feeBreakdownTitle}>Fee Breakdown</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Base Fee</Text>
              <Text style={styles.detailValue}>₱{session.fee_breakdown.remaining.base_fee.toFixed(2)}</Text>
            </View>
            {session.fee_breakdown.remaining.exceeding_hours > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Exceeding ({session.fee_breakdown.remaining.exceeding_hours}h)
                </Text>
                <Text style={styles.detailValue}>
                  ₱{session.fee_breakdown.remaining.exceeding_fee.toFixed(2)}
                </Text>
              </View>
            )}
            {session.fee_breakdown.long_term.days > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Long Term ({session.fee_breakdown.long_term.days} day(s))
                </Text>
                <Text style={styles.detailValue}>
                  ₱{session.fee_breakdown.long_term.fee.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.divider, { marginVertical: 8 }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { fontWeight: '700' }]}>Total</Text>
              <Text style={styles.feeValue}>₱{session.fee_breakdown.total_fee.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Continuous Parking Badge */}
        {session.is_continuous && (
          <View style={styles.continuousBadge}>
            <Text style={styles.continuousBadgeText}>🔄 Continuous Parking</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {session.is_active ? (
        <TouchableOpacity
          style={styles.unparkButton}
          onPress={() => navigation.navigate('UnparkVehicle', { sessionId: session.session_id })}
          activeOpacity={0.7}
          accessibilityLabel="Unpark this vehicle"
          accessibilityRole="button"
        >
          <Text style={styles.unparkButtonText}>Unpark This Vehicle</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Sessions')}
          activeOpacity={0.7}
          accessibilityLabel="Browse all sessions"
          accessibilityRole="button"
        >
          <Text style={styles.browseButtonText}>Browse All Sessions</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const COLORS = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.primary,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
  },
  cardHeaderLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.surface,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: '#bbf7d0',
  },
  completedBadge: {
    backgroundColor: '#f3f4f6',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  detailValueMono: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  slotLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  entryPointInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  entryPointCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryPointLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.surface,
  },
  entryPointText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
    flex: 1,
    textAlign: 'right',
  },
  feeBreakdownBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feeBreakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  continuousBadge: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    alignItems: 'center',
  },
  continuousBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  unparkButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  unparkButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  browseButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 52,
  },
  browseButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
  },
  notFoundBox: {
    backgroundColor: COLORS.surface,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  notFoundIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  notFoundMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default ViewSession;
