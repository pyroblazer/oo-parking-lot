import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { unpackVehicle } from '../api/parkingApi';
import type { Session } from '../api/parkingApi';
import type { NavigationProp, RouteProp } from '../types';

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

// Hourly rate by slot type
const HOURLY_RATES: Record<string, number> = {
  SP: 20,
  MP: 60,
  LP: 100,
} as const;

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

interface UnparkVehicleProps {
  navigation: NavigationProp;
  route: RouteProp<{ sessionId?: string }>;
}

function UnparkVehicle({ navigation, route }: UnparkVehicleProps): React.JSX.Element {
  const [sessionId, setSessionId] = useState(route.params?.sessionId || '');
  const [result, setResult] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculateFee = async (): Promise<void> => {
    const trimmed = sessionId.trim();
    if (!trimmed) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sessionData = await unpackVehicle(trimmed, new Date().toISOString());
      setResult(sessionData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate fee';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (): void => {
    setSessionId('');
    setResult(null);
    setError(null);
  };

  // Helper to get fee breakdown from either field name
  const feeBreakdown = result && ('fee_breakdown' in result ? result.fee_breakdown : result.breakdown);
  const slotLabel = result?.parking_slot?.slot_label || 'N/A';
  const slotType = result?.parking_slot?.slot_type || 'SP';
  const hourlyRate = HOURLY_RATES[slotType] || 20;
  const entryPointDisplay = typeof result?.entry_point === 'string'
    ? result.entry_point
    : result?.entry_point.identifier ?? 'N/A';
  const vehicleType = result?.vehicle_type || 'S';
  const totalFee = result?.total_fee ?? 0;
  const durationHours = result?.duration_hours ?? 0;
  const isContinuous = result?.is_continuous ?? false;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>Unpark Vehicle</Text>
        <Text style={styles.subtitle}>
          {result ? 'Fee Calculation Result' : 'Enter a session ID to calculate the parking fee'}
        </Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Input Form */}
        {!result && (
          <View style={styles.card}>
            <Text style={styles.label}>Session ID</Text>
            <TextInput
              style={styles.input}
              value={sessionId}
              onChangeText={setSessionId}
              placeholder="Enter Session ID"
              placeholderTextColor="#64748b"
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleCalculateFee}
            />

            <TouchableOpacity
              style={[styles.calculateButton, (loading || !sessionId.trim()) && styles.buttonDisabled]}
              onPress={handleCalculateFee}
              disabled={loading || !sessionId.trim()}
              activeOpacity={0.7}
              accessibilityLabel="Calculate fee"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || !sessionId.trim() }}
            >
              {loading ? (
                <ActivityIndicator testID="activity-indicator" color="#fff" />
              ) : (
                <Text style={styles.calculateButtonText}>Calculate Fee</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            {/* Success Header */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeaderIcon}>✅</Text>
              <Text style={styles.resultHeaderTitle}>Vehicle Unparked Successfully</Text>
            </View>

            {/* Continuous Parking Badge */}
            {isContinuous && (
              <View style={styles.continuousBanner}>
                <Text style={styles.continuousText}>🔄 Continuous Parking Session</Text>
                <Text style={styles.continuousSubtext}>
                  Fee calculated from original parked time
                </Text>
              </View>
            )}

            {/* Fee Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Fee Breakdown</Text>

              {/* Base Fee */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Fee (first 3 hours)</Text>
                <Text style={styles.breakdownValue}>₱40.00</Text>
              </View>

              {/* Exceeding Hours */}
              {(() => {
                const exceedingHours = feeBreakdown?.remaining?.exceeding_hours
                  ?? (durationHours > 3 ? Math.ceil(durationHours - 3) : 0);
                const exceedingFee = feeBreakdown?.remaining?.exceeding_fee
                  ?? (exceedingHours > 0 ? exceedingHours * hourlyRate : 0);
                if (exceedingHours > 0) {
                  return (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Exceeding {exceedingHours}h × ₱{hourlyRate}/hr
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(exceedingFee)}</Text>
                    </View>
                  );
                }
                return null;
              })()}

              {/* Long Term */}
              {(() => {
                const days = feeBreakdown?.long_term?.days ?? 0;
                const longFee = feeBreakdown?.long_term?.fee ?? 0;
                if (days > 0) {
                  return (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Long-term {days} day(s) × ₱5,000/day
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(longFee)}</Text>
                    </View>
                  );
                }
                return null;
              })()}

              <View style={styles.divider} />

              {/* Total */}
              <View style={styles.breakdownRow}>
                <Text style={styles.totalLabel}>Total Fee</Text>
                <Text style={styles.totalFee}>{formatCurrency(totalFee)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Session Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Session Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Session ID</Text>
                <Text style={styles.detailValueMono}>{result.session_id}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle Type</Text>
                <Text style={styles.detailValue}>
                  {VEHICLE_TYPE_NAMES[vehicleType]} ({vehicleType})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Parking Slot</Text>
                <Text style={styles.detailValue}>
                  {slotLabel} ({SLOT_TYPE_NAMES[slotType] || slotType})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Entry Point</Text>
                <Text style={styles.detailValue}>{entryPointDisplay}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Parked At</Text>
                <Text style={styles.detailValue}>{formatTimestamp(result.parked_at)}</Text>
              </View>

              {result.exited_at && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Exited At</Text>
                  <Text style={styles.detailValue}>{formatTimestamp(result.exited_at)}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{Math.ceil(durationHours)} hour{Math.ceil(durationHours) !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.viewSessionButton}
                onPress={() => {
                  if (result.session_id) {
                    navigation.navigate('ViewSession', { id: result.session_id });
                  }
                }}
                activeOpacity={0.7}
                accessibilityLabel="View session details"
                accessibilityRole="button"
              >
                <Text style={styles.viewSessionButtonText}>View Session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
                activeOpacity={0.7}
                accessibilityLabel="Unpark another vehicle"
                accessibilityRole="button"
              >
                <Text style={styles.resetButtonText}>Unpark Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    minHeight: 48,
    marginBottom: 16,
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  calculateButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultHeader: {
    backgroundColor: COLORS.success,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  resultHeaderIcon: {
    fontSize: 20,
  },
  resultHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.surface,
  },
  continuousBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  continuousText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  continuousSubtext: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 4,
  },
  breakdownSection: {
    padding: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalFee: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  detailsSection: {
    padding: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
  detailValueMono: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  viewSessionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  viewSessionButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UnparkVehicle;
