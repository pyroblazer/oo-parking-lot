import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ListRenderItemInfo } from 'react-native';
import { getAvailableSlots, getEntryPoints } from '../api';
import type { 
  VehicleType, 
  EntryPointIdentifier, 
  EntryPoint, 
  ParkingSlot, 
  AvailableSlotsResponse,
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

interface AvailableSlotsProps extends ScreenProps<{}> {}

function AvailableSlots({ navigation: _navigation }: AvailableSlotsProps): React.JSX.Element {
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [entryPointId, setEntryPointId] = useState<EntryPointIdentifier>('');
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [state, setState] = useState<AsyncState<AvailableSlotsResponse, string>>(createAsyncState<AvailableSlotsResponse>());

  useEffect(() => {
    void loadEntryPoints();
  }, []);

  const loadEntryPoints = async (): Promise<void> => {
    try {
      const data = await getEntryPoints();
      const entryPointsData = extractData<EntryPoint[]>(data);
      setEntryPoints(entryPointsData);
      if (entryPointsData.length > 0) {
        setEntryPointId(entryPointsData[0].identifier);
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: extractErrorMessage(err),
      }));
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!vehicleType || !entryPointId) {
      setState(prev => ({
        ...prev,
        error: 'Please select vehicle type and entry point',
      }));
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    try {
      const response = await getAvailableSlots(vehicleType, entryPointId);
      const responseData = extractData<AvailableSlotsResponse>(response);
      setSlots([...(responseData.available_slots || [])]);
      setState({
        data: responseData,
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
  };

  const renderSlot = ({ item }: ListRenderItemInfo<ParkingSlot>): React.JSX.Element => (
    <TouchableOpacity style={styles.slotCard}>
      <View style={styles.slotHeader}>
        <View style={[styles.slotType, item.type === 'SP' ? styles.slotTypeSP : item.type === 'MP' ? styles.slotTypeMP : styles.slotTypeLP]}>
          <Text style={styles.slotTypeText}>{item.type}</Text>
        </View>
        <Text style={styles.slotLabel}>{item.label}</Text>
      </View>
      <View style={styles.slotDetails}>
        <Text style={styles.slotDetail}><Text style={styles.slotDetailLabel}>Distance:</Text> {item.distance_from_entry} units</Text>
        <Text style={[styles.slotDetail, styles.available]}>✅ Available</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🅿️ Available Parking Slots</Text>
      
      {state.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {state.error}</Text>
        </View>
      )}

      <View style={styles.searchForm}>
        <Text style={styles.label}>Vehicle Type:</Text>
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setVehicleType('S')}
        >
          <Text style={[styles.pickerButtonText, vehicleType === 'S' && styles.pickerButtonActive]}>
            Small (S) {vehicleType === 'S' ? '✓' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setVehicleType('M')}
        >
          <Text style={[styles.pickerButtonText, vehicleType === 'M' && styles.pickerButtonActive]}>
            Medium (M) {vehicleType === 'M' ? '✓' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.pickerButton}
          onPress={() => setVehicleType('L')}
        >
          <Text style={[styles.pickerButtonText, vehicleType === 'L' && styles.pickerButtonActive]}>
            Large (L) {vehicleType === 'L' ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Entry Point:</Text>
      {entryPoints.map((ep) => (
        <TouchableOpacity 
          key={ep.id}
          style={[styles.pickerButton, entryPointId === ep.identifier && styles.pickerButtonActive]}
          onPress={() => setEntryPointId(ep.identifier)}
        >
          <Text style={styles.pickerButtonText}>
            {ep.name} ({ep.identifier}) {entryPointId === ep.identifier ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity 
        style={[styles.searchButton, state.loading && styles.searchButtonDisabled]} 
        onPress={handleSearch}
        disabled={state.loading}
      >
        {state.loading ? (
          <ActivityIndicator testID="activity-indicator" color="#fff" />
        ) : (
          <Text style={styles.searchButtonText}>Search Available Slots</Text>
        )}
      </TouchableOpacity>

      {slots.length > 0 ? (
        <FlatList
          data={slots}
          renderItem={renderSlot}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.slotsList}
          numColumns={2}
        />
      ) : (
        <View style={styles.noSlots}>
          <Text style={styles.noSlotsText}>No available slots found for the selected criteria.</Text>
        </View>
      )}
    </View>
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
  },
  searchForm: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  pickerButton: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  pickerButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#e8f0f8',
  },
  pickerButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  slotsList: {
    marginTop: 20,
  },
  slotCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  slotHeader: {
    backgroundColor: '#667eea',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotType: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 5,
    borderRadius: 5,
    fontWeight: '600',
    fontSize: 14,
  },
  slotTypeSP: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  slotTypeMP: {
    backgroundColor: 'rgba(255, 193, 7, 0.8)',
  },
  slotTypeLP: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  slotTypeText: {
    color: 'white',
  },
  slotLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  slotDetails: {
    padding: 15,
  },
  slotDetail: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  slotDetailLabel: {
    fontWeight: '600',
    color: '#888',
  },
  available: {
    color: '#4caf50',
    fontWeight: '600',
  },
  noSlots: {
    backgroundColor: '#f9f9f9',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  noSlotsText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
  },
});

export default AvailableSlots;
