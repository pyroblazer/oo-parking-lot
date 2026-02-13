import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { unparkVehicle } from '../api';
import type { 
  SessionId, 
  UnparkVehicleResult,
  AsyncState,
  ScreenProps
} from '../types';

// Helper function to extract error message consistently
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as { response?: { data?: { error?: string }; status?: number } };
    if (responseError.response?.status === 404) {
      return 'Session not found. It may have already been completed.';
    }
    return responseError.response?.data?.error ?? 'An unknown error occurred';
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const messageError = error as { message?: string };
    return messageError.message ?? 'An unknown error occurred';
  }
  return 'An unknown error occurred';
};

// Helper function to extract data consistently
const extractData = <T,>(response: T | { data: T }): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
};

// Create async state object helper
const createAsyncState = <T,>(): AsyncState<T, string> => ({
  data: null,
  loading: false,
  error: null,
});

// Helper function to get hourly rate by slot type
function getHourlyRate(slotType: string): number {
  switch (slotType) {
    case 'SP': return 20;
    case 'MP': return 60;
    case 'LP': return 100;
    default: return 20;
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

interface UnparkVehicleProps extends ScreenProps<{}> {}

interface LongTermBreakdown {
  days: number;
  fee: number;
}

interface ExtendedFeeBreakdown {
  total_fee: number;
  duration_hours: number;
  base_fee: number;
  exceeding_fee: number;
  exceeding_hours: number;
  long_term?: LongTermBreakdown;
}

function UnparkVehicle({ navigation }: UnparkVehicleProps): React.JSX.Element {
  const [sessionId, setSessionId] = useState<SessionId>('');
  const [state, setState] = useState<AsyncState<UnparkVehicleResult, string>>(createAsyncState<UnparkVehicleResult>());

  const handleCalculateFee = async (): Promise<void> => {
    if (!sessionId) {
      setState(prev => ({
        ...prev,
        error: 'Session ID is required',
      }));
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    try {
      const response = await unparkVehicle(sessionId);
      const responseData = extractData<UnparkVehicleResult>(response);
      setState({
        data: responseData,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      
      // Clear session ID on 404 error
      if (err && typeof err === 'object' && 'response' in err) {
        const responseError = err as { response?: { status?: number } };
        if (responseError.response?.status === 404) {
          setSessionId('');
        }
      }
    }
  };

  const handlePrintReceipt = (): void => {
    // Print functionality - can be implemented with react-native-print or similar
    console.log('Print Receipt for session:', sessionId);
  };

  const handleViewSessions = (): void => {
    navigation.navigate('Sessions');
  };

  const getFeeBreakdown = (session: UnparkVehicleResult): ExtendedFeeBreakdown => {
    const breakdown = session.fee_breakdown || {
      total_fee: session.total_fee,
      duration_hours: session.duration_hours,
      base_fee: 40,
      exceeding_fee: 0,
      exceeding_hours: 0,
    };

    // Calculate long-term if duration exceeds 24 hours
    const fullDays = Math.floor(session.duration_hours / 24);
    if (fullDays > 0) {
      return {
        ...breakdown,
        long_term: {
          days: fullDays,
          fee: fullDays * 5000,
        },
      };
    }

    return breakdown;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚗 Unpark Vehicle</Text>
      
      {state.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {state.error}</Text>
          {state.error.includes('Session not found') && (
            <TouchableOpacity onPress={handleViewSessions} style={styles.sessionsLink}>
              <Text style={styles.sessionsLinkText}>View Sessions List</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Session ID:</Text>
        <TextInput
          style={styles.input}
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="Enter Session ID"
          placeholderTextColor="#999"
          editable={!state.loading}
          keyboardType="numeric"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity 
          style={[styles.button, state.loading && styles.buttonDisabled]} 
          onPress={handleCalculateFee}
          disabled={state.loading}
          activeOpacity={0.7}
        >
          {state.loading ? (
            <ActivityIndicator testID="activity-indicator" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Calculate Fee</Text>
          )}
        </TouchableOpacity>
      </View>

      {state.data && (
        <View style={styles.feeBreakdownCard}>
          {state.data.is_continuous && (
            <View style={styles.continuousBanner}>
              <Text style={styles.continuousText}>⚠️ This vehicle returned within 1 hour of previous exit</Text>
              <Text style={styles.continuousSubtext}>Fee calculated from {formatTimestamp(state.data.parked_at)}</Text>
            </View>
          )}
          
          <Text style={styles.breakdownTitle}>Fee Breakdown</Text>
          
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownLine}>├─ Base Fee: ₱40.00 (first 3 hours)</Text>
          </View>
          
          {state.data.duration_hours > 3 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownLine}>├─ Exceeding {Math.ceil(state.data.duration_hours - 3)} hours</Text>
              <Text style={styles.breakdownLine}>│   Rate: ₱{getHourlyRate(state.data.parking_slot?.type || 'SP')}/hour</Text>
              <Text style={styles.breakdownLine}>│   Fee: ₱{((Math.ceil(state.data.duration_hours - 3)) * getHourlyRate(state.data.parking_slot?.type || 'SP')).toFixed(2)}</Text>
            </View>
          )}
          
          {(() => {
            const breakdown = getFeeBreakdown(state.data);
            if (breakdown.long_term && breakdown.long_term.days > 0) {
              return (
                <View style={styles.breakdownSection}>
                  <Text style={styles.breakdownLine}>├─ Long-Term: {breakdown.long_term.days} days</Text>
                  <Text style={styles.breakdownLine}>│   Rate: ₱5,000.00/day</Text>
                  <Text style={styles.breakdownLine}>│   Fee: ₱{(breakdown.long_term.days * 5000).toFixed(2)}</Text>
                </View>
              );
            }
            return null;
          })()}
          
          <View style={styles.separator} />
          
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>└─ Total Fee:</Text>
            <Text style={styles.totalFee}>{formatCurrency(state.data.total_fee)}</Text>
          </View>

          <View style={styles.sessionDetails}>
            <Text style={styles.sessionDetailLabel}>Session ID:</Text>
            <Text style={styles.sessionDetailValue}>{state.data.session_id}</Text>
            
            <Text style={styles.sessionDetailLabel}>Vehicle Type:</Text>
            <Text style={styles.sessionDetailValue}>{state.data.vehicle_type}</Text>
            
            <Text style={styles.sessionDetailLabel}>Parking Slot:</Text>
            <Text style={styles.sessionDetailValue}>{state.data.parking_slot.label} ({state.data.parking_slot.type})</Text>
            
            <Text style={styles.sessionDetailLabel}>Entry Point:</Text>
            <Text style={styles.sessionDetailValue}>{state.data.entry_point}</Text>
            
            <Text style={styles.sessionDetailLabel}>Parked At:</Text>
            <Text style={styles.sessionDetailValue}>{formatTimestamp(state.data.parked_at)}</Text>
            
            <Text style={styles.sessionDetailLabel}>Exited At:</Text>
            <Text style={styles.sessionDetailValue}>{formatTimestamp(state.data.exited_at)}</Text>
            
            <Text style={styles.sessionDetailLabel}>Duration:</Text>
            <Text style={styles.sessionDetailValue}>{Math.ceil(state.data.duration_hours)} hours</Text>
          </View>

          <TouchableOpacity 
            style={styles.printButton} 
            onPress={handlePrintReceipt}
            activeOpacity={0.7}
          >
            <Text style={styles.printButtonText}>🖨️ Print Receipt</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
    marginTop: 40,
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    margin: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 44,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
    minHeight: 44,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  errorText: {
    color: '#991b1b',
    textAlign: 'center',
    fontSize: 16,
  },
  sessionsLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  sessionsLinkText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  feeBreakdownCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  continuousBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  continuousText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '600',
  },
  continuousSubtext: {
    color: '#d97706',
    fontSize: 12,
    marginTop: 4,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  breakdownSection: {
    marginBottom: 10,
  },
  breakdownLine: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 15,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  totalFee: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  sessionDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sessionDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 5,
  },
  sessionDetailValue: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 10,
  },
  printButton: {
    backgroundColor: '#1e40af',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 44,
  },
  printButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UnparkVehicle;
