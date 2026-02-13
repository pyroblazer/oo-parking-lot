import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import parkingApi from '../api/parkingApi';
import type { 
  SessionId, 
  ParkingSession,
  AsyncState,
  ScreenProps
} from '../types';

// Helper function to extract error message consistently
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as { response?: { data?: { error?: string } } };
    return responseError.response?.data?.error ?? 'An unknown error occurred';
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const messageError = error as { message?: string };
    return messageError.message ?? 'An unknown error occurred';
  }
  return 'An unknown error occurred';
};

// Create async state object helper
const createAsyncState = <T,>(): AsyncState<T, string> => ({
  data: null,
  loading: false,
  error: null,
});

interface ViewSessionProps extends ScreenProps<{ id: SessionId }> {}

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

function ViewSession({ route, navigation }: ViewSessionProps): React.JSX.Element {
  const { id } = route.params;
  const [state, setState] = useState<AsyncState<ParkingSession, string>>(createAsyncState<ParkingSession>());

  const loadSession = useCallback(async (): Promise<void> => {
    if (!id) {
      setState({
        data: null,
        loading: false,
        error: 'Invalid session ID',
      });
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    try {
      const sessionData = await parkingApi.getSession(id);
      setState({
        data: sessionData as unknown as ParkingSession,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: extractErrorMessage(err),
      });
    }
  }, [id]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleBack = (): void => {
    navigation.goBack();
  };

  if (state.loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {state.error}</Text>
        </View>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadSession}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('Sessions' as never)}
        >
          <Text style={styles.browseButtonText}>Browse Sessions</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!state.data) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Session Not Found</Text>
        <Text style={styles.notFoundMessage}>Session ID not found — It may have been deleted or never existed</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadSession}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('Sessions' as never)}
        >
          <Text style={styles.browseButtonText}>Browse Sessions</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const session = state.data;
  const vehicleTypeColor = getVehicleTypeColor(session.vehicle_type);
  const slotTypeColor = getSlotTypeColor(session.parking_slot?.type || 'SP');

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleBack}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>🔍 View Session Details</Text>
      
      <View style={styles.sessionCard}>
        <ScrollView style={styles.cardContainer}>
          {/* Session ID */}
          <View style={styles.sessionIdRow}>
            <Text style={styles.label}>Session:</Text>
            <Text style={styles.sessionId}>{session.session_id}</Text>
          </View>
          
          {/* Status Badge */}
          <View style={[styles.badge, session.is_active ? styles.activeBadge : styles.completedBadge]}>
            <Text style={styles.badgeText}>{session.is_active ? 'Active' : 'Completed'}</Text>
          </View>
          
          {/* Vehicle Type */}
          <View style={styles.row}>
            <Text style={styles.label}>Vehicle:</Text>
            <View style={[styles.vehicleBadge, vehicleTypeColor]}>
              <Text style={styles.badgeText}>{session.vehicle_type}</Text>
            </View>
          </View>
          
          {/* Slot Information */}
          <View style={styles.row}>
            <Text style={styles.label}>Slot:</Text>
            <Text style={styles.slotLabel}>{session.parking_slot?.label || 'N/A'}</Text>
            <View style={[styles.slotTypeBadge, slotTypeColor]}>
              <Text style={styles.badgeText}>{session.parking_slot?.type || 'SP'}</Text>
            </View>
          </View>
          
          {/* Entry Point */}
          <View style={styles.row}>
            <Text style={styles.label}>Entry Point:</Text>
            <View style={styles.entryPointBadge}>
              <Text style={styles.entryPointIdentifier}>{session.entry_point?.charAt(0) || '?'}</Text>
            </View>
            <Text style={styles.entryPointName}>{session.entry_point || 'N/A'}</Text>
          </View>
          
          {/* Parked At */}
          <View style={styles.row}>
            <Text style={styles.label}>Parked At:</Text>
            <Text style={styles.timestamp}>{formatTimestamp(session.parked_at)}</Text>
          </View>
          
          {/* Exited At (if completed) */}
          {session.exited_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Exited At:</Text>
              <Text style={styles.timestamp}>{formatTimestamp(session.exited_at)}</Text>
            </View>
          )}
          
          {/* Duration (if completed) */}
          {session.exited_at && session.duration_hours && (
            <View style={styles.row}>
              <Text style={styles.label}>Duration:</Text>
              <Text style={styles.duration}>{session.duration_hours.toFixed(1)} hours</Text>
            </View>
          )}
          
          {/* Total Fee (if completed) */}
          {session.exited_at && session.total_fee && (
            <View style={styles.row}>
              <Text style={styles.label}>Total Fee:</Text>
              <Text style={styles.fee}>₱{session.total_fee.toFixed(2)}</Text>
            </View>
          )}
          
          {/* Continuous Parking Badge */}
          {session.is_continuous && (
            <View style={[styles.badge, styles.continuousBadge]}>
              <Text style={styles.badgeText}>Continuous Parking</Text>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Unpark Button (only for active sessions) */}
      {session.is_active && (
        <TouchableOpacity 
          style={styles.unparkButton} 
          onPress={() => navigation.navigate('UnparkVehicle' as never, { sessionId: session.session_id })}
          activeOpacity={0.7}
        >
          <Text style={styles.unparkButtonText}>Unpark This Vehicle</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  notFoundMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardContainer: {
    padding: 20,
  },
  sessionIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sessionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  completedBadge: {
    backgroundColor: '#f3f4f6',
  },
  continuousBadge: {
    backgroundColor: '#fef3c7',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    flex: 1,
  },
  vehicleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  slotTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  entryPointBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  entryPointIdentifier: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  entryPointName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  fee: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  unparkButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  unparkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 20,
    borderRadius: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 48,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  browseButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  browseButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#667eea',
    textAlign: 'center',
  },
});

export default ViewSession;
