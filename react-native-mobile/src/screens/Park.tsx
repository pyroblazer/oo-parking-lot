/**
 * Park Screen
 * 
 * A 3-step wizard screen for parking vehicles in the OO Parking Lot System.
 * Features vehicle type selection, entry point selection, test mode with DateTimePicker,
 * slot preview, and confirmation receipt.
 * 
 * @module Park
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as parkingApi from '../api/parkingApi';
import type { EntryPoint, ParkingSlot, Session } from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Vehicle type options
 */
type VehicleType = 'S' | 'M' | 'L';

/**
 * Step number for the wizard
 */
type Step = 1 | 2 | 3;

/**
 * Vehicle type option for picker
 */
interface VehicleTypeOption {
  readonly value: VehicleType;
  readonly label: string;
  readonly description: string;
}

/**
 * Available slot with distance info
 */
interface AvailableSlotWithDistance extends ParkingSlot {
  readonly distance: number;
  readonly entryPoint: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Design system colors
 */
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
  shadow: 'rgba(0, 0, 0, 0.1)',
} as const;

/**
 * Vehicle type options
 */
const VEHICLE_TYPE_OPTIONS: readonly VehicleTypeOption[] = [
  { value: 'S', label: 'Small (S)', description: 'Compact vehicles' },
  { value: 'M', label: 'Medium (M)', description: 'Mid-size vehicles' },
  { value: 'L', label: 'Large (L)', description: 'Full-size vehicles' },
] as const;

/**
 * Slot type display names
 */
const SLOT_TYPE_NAMES: Record<string, string> = {
  SP: 'Small Parking',
  MP: 'Medium Parking',
  LP: 'Large Parking',
} as const;

/**
 * Vehicle type display names
 */
const VEHICLE_TYPE_NAMES: Record<VehicleType, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
} as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Park Screen Component
 */
export const Park: React.FC = () => {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [entryPoint, setEntryPoint] = useState<string>('');
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [overrideParkTime, setOverrideParkTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableSlot, setAvailableSlot] = useState<AvailableSlotWithDistance | null>(null);
  const [parkingResult, setParkingResult] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEntryPoints, setLoadingEntryPoints] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [successAnimation] = useState(new Animated.Value(0));

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Load entry points on component mount
   */
  useEffect(() => {
    loadEntryPoints();
  }, [loadEntryPoints]);

  // ==========================================================================
  // API CALLS
  // ==========================================================================

  /**
   * Load entry points from API
   */
  const loadEntryPoints = useCallback(async () => {
    setLoadingEntryPoints(true);
    setError(null);
    try {
      const points = await parkingApi.listEntryPoints();
      setEntryPoints(points);
    } catch (err) {
      const errorMessage = err instanceof parkingApi.ApiError 
        ? err.message 
        : 'Failed to load entry points';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoadingEntryPoints(false);
    }
  }, []);

  /**
   * Find available slot for vehicle type and entry point
   */
  const findAvailableSlot = useCallback(async () => {
    if (!vehicleType || !entryPoint) {
      Alert.alert('Validation Error', 'Please select vehicle type and entry point');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const slots = await parkingApi.getAvailableSlots(vehicleType, entryPoint);
      
      if (slots.length === 0) {
        setError('No available slots for the selected vehicle type and entry point');
        Alert.alert(
          'No Available Slots',
          'There are no available parking slots for the selected vehicle type from this entry point.'
        );
        return;
      }

      // Get the best slot (closest to entry point)
      const bestSlot = slots[0];
      const slotWithDistance: AvailableSlotWithDistance = {
        ...bestSlot,
        distance: bestSlot.distances[0] || 0,
        entryPoint,
      };
      
      setAvailableSlot(slotWithDistance);
      setCurrentStep(2);
    } catch (err) {
      const errorMessage = err instanceof parkingApi.ApiError 
        ? err.message 
        : 'Failed to find available slot';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [vehicleType, entryPoint]);

  /**
   * Confirm and park vehicle
   */
  const confirmPark = useCallback(async () => {
    if (!availableSlot || !vehicleType || !entryPoint) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Format override time if provided
      const parkedAt = overrideParkTime 
        ? overrideParkTime.toISOString() 
        : undefined;

      const result = await parkingApi.parkVehicle(vehicleType, entryPoint, parkedAt);
      setParkingResult(result);
      
      // Trigger success animation
      Animated.timing(successAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      setCurrentStep(3);
    } catch (err) {
      const errorMessage = err instanceof parkingApi.ApiError 
        ? err.message 
        : 'Failed to park vehicle';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [availableSlot, vehicleType, entryPoint, overrideParkTime, successAnimation]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle date change from DateTimePicker
   */
  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setOverrideParkTime(selectedDate);
    }
  }, []);

  /**
   * Handle back button press
   */
  const handleBack = useCallback(() => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(1);
      setAvailableSlot(null);
      setParkingResult(null);
      setVehicleType('');
      setEntryPoint('');
      setOverrideParkTime(null);
      setTestModeEnabled(false);
      setError(null);
    }
  }, [currentStep]);

  /**
   * Handle park another vehicle
   */
  const handleParkAnother = useCallback(() => {
    setCurrentStep(1);
    setAvailableSlot(null);
    setParkingResult(null);
    setVehicleType('');
    setEntryPoint('');
    setOverrideParkTime(null);
    setTestModeEnabled(false);
    setError(null);
    
    // Reset animation
    successAnimation.setValue(0);
  }, [successAnimation]);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * Format override time for display
   */
  const formatOverrideTime = useCallback((date: Date | null) => {
    if (!date) return 'Not set';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Check if form is valid
   */
  const isFormValid = useCallback(() => {
    return vehicleType !== '' && entryPoint !== '';
  }, [vehicleType, entryPoint]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Park Vehicle</Text>
            <Text style={styles.headerSubtitle}>
              {currentStep === 1 && 'Enter vehicle details'}
              {currentStep === 2 && 'Review available slot'}
              {currentStep === 3 && 'Parking complete'}
            </Text>
          </View>

          {/* Step Indicators */}
          <View style={styles.stepIndicator}>
            <View style={[
              styles.stepDot,
              currentStep >= 1 && styles.stepDotActive,
            ]}>
              <Text style={[
                styles.stepDotText,
                currentStep >= 1 && styles.stepDotTextActive,
              ]}>1</Text>
            </View>
            <View style={[
              styles.stepLine,
              currentStep >= 2 && styles.stepLineActive,
            ]} />
            <View style={[
              styles.stepDot,
              currentStep >= 2 && styles.stepDotActive,
            ]}>
              <Text style={[
                styles.stepDotText,
                currentStep >= 2 && styles.stepDotTextActive,
              ]}>2</Text>
            </View>
            <View style={[
              styles.stepLine,
              currentStep >= 3 && styles.stepLineActive,
            ]} />
            <View style={[
              styles.stepDot,
              currentStep >= 3 && styles.stepDotActive,
            ]}>
              <Text style={[
                styles.stepDotText,
                currentStep >= 3 && styles.stepDotTextActive,
              ]}>3</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step 1: Vehicle Details Form */}
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                {/* Vehicle Type Picker */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Vehicle Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={vehicleType}
                      onValueChange={(value: VehicleType) => setVehicleType(value)}
                      style={styles.picker}
                      enabled={!loading}
                    >
                      <Picker.Item label="Select vehicle type" value="" />
                      {VEHICLE_TYPE_OPTIONS.map((option) => (
                        <Picker.Item
                          key={option.value}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </Picker>
                  </View>
                  {vehicleType && (
                    <Text style={styles.helperText}>
                      {VEHICLE_TYPE_OPTIONS.find(opt => opt.value === vehicleType)?.description}
                    </Text>
                  )}
                </View>

                {/* Entry Point Picker */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Entry Point</Text>
                  {loadingEntryPoints ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.loadingText}>Loading entry points...</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={entryPoint}
                        onValueChange={(value: string) => setEntryPoint(value)}
                        style={styles.picker}
                        enabled={!loading}
                      >
                        <Picker.Item label="Select entry point" value="" />
                        {entryPoints.map((point) => (
                          <Picker.Item
                            key={point.id}
                            label={`${point.identifier} - ${point.name}`}
                            value={point.identifier}
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Advanced / Test Options */}
                <View style={styles.advancedSection}>
                  <TouchableOpacity
                    style={styles.advancedHeader}
                    onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    accessibilityLabel="Toggle advanced options"
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showAdvancedOptions }}
                  >
                    <Text style={styles.advancedTitle}>Advanced / Test Options</Text>
                    <Text style={styles.advancedChevron}>
                      {showAdvancedOptions ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>

                  {showAdvancedOptions && (
                    <View style={styles.advancedContent}>
                      {/* Test Mode Toggle */}
                      <View style={styles.toggleContainer}>
                        <View style={styles.toggleInfo}>
                          <Text style={styles.toggleLabel}>Test Mode</Text>
                          <Text style={styles.toggleDescription}>
                            Enable to override parking time
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.toggle,
                            testModeEnabled && styles.toggleActive,
                          ]}
                          onPress={() => setTestModeEnabled(!testModeEnabled)}
                          accessibilityLabel="Toggle test mode"
                          accessibilityRole="switch"
                          accessibilityState={{ checked: testModeEnabled }}
                        >
                          <View style={[
                            styles.toggleKnob,
                            testModeEnabled && styles.toggleKnobActive,
                          ]} />
                        </TouchableOpacity>
                      </View>

                      {/* Override Park Time */}
                      {testModeEnabled && (
                        <View style={styles.dateTimeSection}>
                          <Text style={styles.label}>Override Park Time</Text>
                          <TouchableOpacity
                            style={styles.dateTimeButton}
                            onPress={() => setShowDatePicker(true)}
                            accessibilityLabel="Select override park time"
                            accessibilityRole="button"
                          >
                            <Text style={styles.dateTimeButtonText}>
                              {formatOverrideTime(overrideParkTime)}
                            </Text>
                            <Text style={styles.dateTimeButtonIcon}>📅</Text>
                          </TouchableOpacity>
                          <Text style={styles.helperText}>
                            Leave empty to use server time
                          </Text>

                          {showDatePicker && (
                            <DateTimePicker
                              value={overrideParkTime || new Date()}
                              mode="datetime"
                              display="default"
                              onChange={handleDateChange}
                              minimumDate={new Date(2020, 0, 1)}
                              maximumDate={new Date(2030, 11, 31)}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Find Available Slot Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!isFormValid() || loading) && styles.primaryButtonDisabled,
                  ]}
                  onPress={findAvailableSlot}
                  disabled={!isFormValid() || loading}
                  accessibilityLabel="Find available slot"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isFormValid() || loading }}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Find Available Slot</Text>
                  )}
                </TouchableOpacity>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 2: Slot Preview */}
            {currentStep === 2 && availableSlot && (
              <View style={styles.stepContent}>
                <Text style={styles.previewTitle}>
                  Best Available Slot for {VEHICLE_TYPE_NAMES[vehicleType]} from Entry Point {entryPoint}:
                </Text>

                {/* Slot Card */}
                <View style={styles.slotCard}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotLabel}>{availableSlot.slot_label}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>✅ Available</Text>
                    </View>
                  </View>

                  <View style={styles.slotDetails}>
                    <View style={styles.slotDetailRow}>
                      <Text style={styles.slotDetailLabel}>Slot Type:</Text>
                      <Text style={styles.slotDetailValue}>
                        {SLOT_TYPE_NAMES[availableSlot.slot_type]}
                      </Text>
                    </View>

                    <View style={styles.slotDetailRow}>
                      <Text style={styles.slotDetailLabel}>Distance:</Text>
                      <Text style={styles.slotDetailValue}>
                        {availableSlot.distance} unit from Entry {availableSlot.entryPoint}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleBack}
                    disabled={loading}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryButtonText}>← Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      loading && styles.primaryButtonDisabled,
                    ]}
                    onPress={confirmPark}
                    disabled={loading}
                    accessibilityLabel="Confirm and park vehicle"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: loading }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.surface} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirm & Park →</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 3: Confirmation Receipt */}
            {currentStep === 3 && parkingResult && (
              <View style={styles.stepContent}>
                {/* Success Animation */}
                <Animated.View
                  style={[
                    styles.successIcon,
                    {
                      opacity: successAnimation,
                      transform: [
                        {
                          scale: successAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.successIconText}>✅</Text>
                </Animated.View>

                <Text style={styles.successTitle}>Vehicle Parked Successfully!</Text>

                {/* Receipt Card */}
                <View style={styles.receiptCard}>
                  <View style={styles.receiptHeader}>
                    <Text style={styles.receiptTitle}>Parking Receipt</Text>
                  </View>

                  <View style={styles.receiptBody}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Session ID:</Text>
                      <Text style={styles.receiptValue}>{parkingResult.session_id}</Text>
                    </View>

                    <View style={styles.receiptDivider} />

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Slot:</Text>
                      <Text style={styles.receiptValue}>
                        {parkingResult.parking_slot.slot_label} ({SLOT_TYPE_NAMES[parkingResult.parking_slot.slot_type]})
                      </Text>
                    </View>

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Entry Point:</Text>
                      <Text style={styles.receiptValue}>{parkingResult.entry_point}</Text>
                    </View>

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Vehicle Type:</Text>
                      <Text style={styles.receiptValue}>
                        {VEHICLE_TYPE_NAMES[parkingResult.vehicle_type]} ({parkingResult.vehicle_type})
                      </Text>
                    </View>

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Parked At:</Text>
                      <Text style={styles.receiptValue}>
                        {formatDate(parkingResult.parked_at)}
                      </Text>
                    </View>

                    {testModeEnabled && overrideParkTime && (
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Test Mode:</Text>
                        <Text style={styles.receiptValueWarning}>Enabled</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleParkAnother}
                    accessibilityLabel="Park another vehicle"
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryButtonText}>Park Another Vehicle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      // Navigate to Sessions screen
                      // This would typically use navigation.navigate('Sessions')
                      Alert.alert('Navigation', 'Navigate to Sessions screen');
                    }}
                    accessibilityLabel="View session"
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryButtonText}>View Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepDotTextActive: {
    color: COLORS.surface,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: COLORS.text,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  advancedSection: {
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background,
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  advancedChevron: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  advancedContent: {
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 24 }],
  },
  dateTimeSection: {
    marginTop: 16,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateTimeButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  dateTimeButtonIcon: {
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 52,
    flex: 1,
    marginRight: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 24,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  slotCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  slotLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  slotDetails: {
    gap: 12,
  },
  slotDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotDetailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  slotDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  successIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  receiptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  receiptHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.surface,
  },
  receiptBody: {
    padding: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  receiptValueWarning: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    flex: 1,
    textAlign: 'right',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
});

export default Park;
