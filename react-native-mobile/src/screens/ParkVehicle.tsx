import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { parkVehicle, listEntryPoints as getEntryPoints, fetchRecentExits, type Session, type RecentExit } from '../api/parkingApi';
import type {
  VehicleType,
  EntryPointIdentifier,
  EntryPoint,
  AsyncStateWithSuccess,
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

// Helper function to extract data consistently
const extractData = <T,>(response: T | { data: T }): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
};

// Create async state object helper
const createAsyncStateWithSuccess = <T,>(): AsyncStateWithSuccess<T, string> => ({
  data: null,
  loading: false,
  error: null,
  success: false,
});

interface ParkVehicleProps extends ScreenProps<{}> {}

function ParkVehicle({ navigation }: ParkVehicleProps): React.JSX.Element {
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [entryPointId, setEntryPointId] = useState<EntryPointIdentifier>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [previousSessionId, setPreviousSessionId] = useState<string>('');
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [recentExits, setRecentExits] = useState<RecentExit[]>([]);
  const [loadingRecentExits, setLoadingRecentExits] = useState<boolean>(false);
  const [state, setState] = useState<AsyncStateWithSuccess<Session, string>>(createAsyncStateWithSuccess<Session>());

  useEffect(() => {
    void loadEntryPoints();
  }, []);

  const loadEntryPoints = async (): Promise<void> => {
    try {
      const data = await getEntryPoints();
      const entryPointsData = extractData<EntryPoint[]>(data);
      setEntryPoints(entryPointsData);
      // Do not auto-select entry point - user must explicitly select it
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: extractErrorMessage(err),
      }));
    }
  };

  const loadRecentExits = async (type: VehicleType): Promise<void> => {
    setLoadingRecentExits(true);
    try {
      const data = await fetchRecentExits(type);
      const recentExitsData = extractData<RecentExit[]>(data);
      setRecentExits(recentExitsData);
      // Reset previous session selection when vehicle type changes
      setPreviousSessionId('');
    } catch (err) {
      setRecentExits([]);
      setPreviousSessionId('');
    } finally {
      setLoadingRecentExits(false);
    }
  };

  const handleVehicleTypeChange = async (newType: VehicleType | ''): Promise<void> => {
    setVehicleType(newType);
    if (newType) {
      await loadRecentExits(newType);
    } else {
      setRecentExits([]);
      setPreviousSessionId('');
    }
  };

  const handlePark = async (): Promise<void> => {
    const errors: string[] = [];
    if (!vehicleType) {
      errors.push('vehicle type');
    }
    if (!entryPointId) {
      errors.push('entry point');
    }
    
    if (errors.length > 0) {
      setState(prev => ({
        ...prev,
        error: `Please select: ${errors.join(', ')}`,
      }));
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
      success: false,
    });

    try {
      const response = await parkVehicle(
        vehicleType,
        entryPointId,
        undefined,
        licensePlate || undefined,
        previousSessionId || undefined
      );
      const responseData = extractData<Session>(response);
      setState({
        data: responseData,
        loading: false,
        error: null,
        success: true,
      });

      // Navigate to session details after successful parking
      setTimeout(() => {
        navigation.navigate('ViewSession', { id: responseData.session_id });
      }, 1500);
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: extractErrorMessage(err),
        success: false,
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚗️ Park Vehicle</Text>
      
      {state.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {state.error}</Text>
        </View>
      )}

      {state.success && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✅ Vehicle parked successfully!</Text>
          {state.data && state.data.session_id && (
            <>
              <Text style={styles.successText}>Session ID: {state.data.session_id}</Text>
              <TouchableOpacity 
                style={styles.viewSessionButton}
                onPress={() => navigation.navigate('ViewSession', { id: state.data?.session_id })}
              >
                <Text style={styles.viewSessionButtonText}>View Session</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Vehicle Type:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicleType as VehicleType | undefined}
            onValueChange={(itemValue: VehicleType | "") => void handleVehicleTypeChange(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select vehicle type" value="" />
            <Picker.Item label="Small (S)" value="S" />
            <Picker.Item label="Medium (M)" value="M" />
            <Picker.Item label="Large (L)" value="L" />
          </Picker>
        </View>

        <Text style={styles.label}>License Plate (Optional):</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., ABC-1234"
          value={licensePlate}
          onChangeText={setLicensePlate}
          editable={!state.loading}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Entry Point:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={entryPointId}
            onValueChange={(itemValue: EntryPointIdentifier) => setEntryPointId(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select entry point" value="" />
            {entryPoints.map((ep) => (
              <Picker.Item key={ep.id} label={`${ep.name} (${ep.identifier})`} value={ep.identifier} />
            ))}
          </Picker>
        </View>

        {vehicleType && recentExits.length > 0 && (
          <View style={styles.recentExitsContainer}>
            <Text style={styles.label}>Returning from previous parking? (within 1 hour)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={previousSessionId}
                onValueChange={(itemValue: string) => setPreviousSessionId(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="New Parking" value="" />
                {recentExits.map((exit) => (
                  <Picker.Item
                    key={exit.session_id}
                    label={`${exit.slot_label} · Entry ${exit.entry_point} · ${exit.minutes_since_exit}m ago${exit.license_plate ? ` · ${exit.license_plate}` : ''}`}
                    value={exit.session_id}
                  />
                ))}
              </Picker>
            </View>
            {loadingRecentExits && <Text style={styles.loadingText}>Loading recent sessions...</Text>}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, state.loading && styles.buttonDisabled]} 
          onPress={handlePark}
          disabled={state.loading}
          testID="park-vehicle-button"
        >
          {state.loading ? (
            <ActivityIndicator color="#fff" testID="activity-indicator" />
          ) : (
            <Text style={styles.buttonText}>Park Vehicle</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📋 Vehicle Types</Text>
        <Text style={styles.infoText}>• Small (S): Can park in SP, MP, or LP slots</Text>
        <Text style={styles.infoText}>• Medium (M): Can park in MP or LP slots</Text>
        <Text style={styles.infoText}>• Large (L): Can only park in LP slots</Text>
      </View>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#64748b',
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
    marginBottom: 20,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  successBox: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  successText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  viewSessionButton: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  viewSessionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f0f4f8',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  recentExitsContainer: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
});

export default ParkVehicle;
