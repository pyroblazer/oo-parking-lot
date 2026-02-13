/**
 * Configuration Screen
 *
 * A comprehensive configuration screen for the OO Parking Lot System.
 * Provides three sub-tabs for managing entry points, parking slots, and system settings.
 * Includes CRUD operations, system initialization, health status, and API configuration.
 *
 * @module Configuration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * System health status type
 */
type HealthStatus = 'online' | 'offline' | 'checking';

/**
 * Active tab type
 */
type ActiveTab = 'entryPoints' | 'parkingSlots' | 'system';

/**
 * Configuration state interface
 */
interface ConfigurationState {
  activeTab: ActiveTab;
  entryPoints: parkingApi.EntryPoint[];
  slots: parkingApi.ParkingSlot[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  healthStatus: HealthStatus;
  systemHealth: parkingApi.HealthCheckResponse | null;
  apiBaseUrl: string;
  lastRefreshTime: Date | null;
  configJson: string;
  previewData: parkingApi.InitializeResponse | null;
  initResult: parkingApi.InitializeResponse | null;
  healthTimestamp: string | null;
  databaseStatus: string;
}

/**
 * Modal state interface
 */
interface ModalState {
  editEntryPoint: parkingApi.EntryPoint | null;
  editSlot: parkingApi.ParkingSlot | null;
  showDeleteConfirmation: boolean;
  deleteTarget: { type: 'entryPoint' | 'slot'; id: string; identifier: string } | null;
  showInitializeConfirm: boolean;
  showInitializeSuccess: boolean;
}

/**
 * Form state interface
 */
interface FormState {
  addEntryPoint: { identifier: string; name: string };
  editEntryPointName: string;
  addSlot: { label: string; type: 'SP' | 'MP' | 'LP'; distances: number[] };
  editSlot: { label: string; type: 'SP' | 'MP' | 'LP'; distances: number[] };
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
 * Auto-refresh interval in milliseconds (120 seconds for health check)
 */
const AUTO_REFRESH_INTERVAL = 120000;

/**
 * AsyncStorage keys
 */
const STORAGE_KEYS = {
  API_BASE_URL: 'api_base_url',
  TEST_MODE: 'test_mode',
} as const;

/**
 * Default system configuration
 */
const DEFAULT_CONFIG: parkingApi.InitializeConfig = {
  entry_points: [
    { identifier: 'A', name: 'Entry Point A' },
    { identifier: 'B', name: 'Entry Point B' },
    { identifier: 'C', name: 'Entry Point C' },
  ],
  parking_slots: [
    { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] },
    { slot_label: 'SP-2', slot_type: 'SP', distances: [3, 2, 4] },
    { slot_label: 'SP-3', slot_type: 'SP', distances: [4, 1, 3] },
    { slot_label: 'MP-1', slot_type: 'MP', distances: [5, 2, 3] },
    { slot_label: 'MP-2', slot_type: 'MP', distances: [6, 3, 1] },
    { slot_label: 'LP-1', slot_type: 'LP', distances: [7, 4, 2] },
    { slot_label: 'LP-2', slot_type: 'LP', distances: [2, 5, 6] },
  ],
} as const;

/**
 * Minimum number of entry points required
 */
const MIN_ENTRY_POINTS = 3;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
 * Get slot type label
 *
 * @param slotType - Slot type code
 * @returns Human-readable slot type
 */
const getSlotTypeLabel = (slotType: string): string => {
  switch (slotType) {
    case 'SP':
      return 'Small';
    case 'MP':
      return 'Medium';
    case 'LP':
      return 'Large';
    default:
      return 'Unknown';
  }
};

/**
 * Validate entry point identifier
 *
 * @param identifier - Identifier to validate
 * @returns True if valid (single letter A-Z)
 */
const isValidIdentifier = (identifier: string): boolean => {
  return /^[A-Z]$/.test(identifier);
};

/**
 * Format distances array for display
 *
 * @param distances - Array of distances
 * @param entryPoints - Array of entry points
 * @returns Formatted distances string
 */
const formatDistances = (
  distances: readonly number[],
  entryPoints: parkingApi.EntryPoint[]
): string => {
  return entryPoints
    .map((ep, index) => `${ep.identifier}: ${distances[index] || 0}`)
    .join(', ');
};

/**
 * Format timestamp for display
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted timestamp string
 */
const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Tab button component
 */
const TabButton: React.FC<{
  title: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}> = ({ title, active, onPress, accessibilityLabel }) => {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

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

/**
 * Button component
 */
const Button: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  accessibilityLabel?: string;
}> = ({ title, onPress, disabled, variant = 'primary', accessibilityLabel }) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.buttonSecondary;
      case 'danger':
        return styles.buttonDanger;
      default:
        return styles.buttonPrimary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {disabled ? (
        <ActivityIndicator size="small" color={COLORS.card} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Input field component
 */
const InputField: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  maxLength?: number;
  accessibilityLabel?: string;
  error?: string;
}> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  accessibilityLabel,
  error,
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
};

/**
 * Card component
 */
const Card: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

/**
 * Section header component
 */
const SectionHeader: React.FC<{
  title: string;
  rightElement?: React.ReactNode;
}> = ({ title, rightElement }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rightElement}
    </View>
  );
};

// ============================================================================
// ENTRY POINTS SUB-TAB
// ============================================================================

/**
 * Entry points table row component
 */
const EntryPointRow: React.FC<{
  entryPoint: parkingApi.EntryPoint;
  onEdit: (entryPoint: parkingApi.EntryPoint) => void;
  onDelete: (entryPoint: parkingApi.EntryPoint) => void;
}> = ({ entryPoint, onEdit, onDelete }) => {
  return (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText} numberOfLines={1}>
          {entryPoint.id.slice(0, 8)}
        </Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellIdentifier]}>
        <View style={styles.identifierBadge}>
          <Text style={styles.identifierText}>{entryPoint.identifier}</Text>
        </View>
      </View>
      <View style={[styles.tableCell, styles.tableCellName]}>
        <Text style={styles.tableCellText} numberOfLines={1}>
          {entryPoint.name}
        </Text>
      </View>
      <View style={styles.tableCellActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(entryPoint)}
          accessibilityLabel={`Edit entry point ${entryPoint.identifier}`}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDelete]}
          onPress={() => onDelete(entryPoint)}
          accessibilityLabel={`Delete entry point ${entryPoint.identifier}`}
          accessibilityRole="button"
        >
          <Text style={[styles.actionButtonText, styles.actionButtonTextDelete]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Entry points sub-tab component
 */
const EntryPointsTab: React.FC<{
  entryPoints: parkingApi.EntryPoint[];
  loading: boolean;
  formState: FormState['addEntryPoint'];
  onFormChange: (state: FormState['addEntryPoint']) => void;
  onAdd: () => void;
  onEdit: (entryPoint: parkingApi.EntryPoint) => void;
  onDelete: (entryPoint: parkingApi.EntryPoint) => void;
}> = ({ entryPoints, loading, formState, onFormChange, onAdd, onEdit, onDelete }) => {
  return (
    <View style={styles.tabContent}>
      {/* Add Entry Point Form */}
      <Card style={styles.formCard}>
        <SectionHeader title="Add New Entry Point" />
        <View style={styles.formRow}>
          <InputField
            label="Identifier (A-Z)"
            value={formState.identifier}
            onChangeText={(text) => onFormChange({ ...formState, identifier: text.toUpperCase() })}
            placeholder="A"
            maxLength={1}
            accessibilityLabel="Entry point identifier"
            error={
              formState.identifier && !isValidIdentifier(formState.identifier)
                ? 'Must be a single letter A-Z'
                : undefined
            }
          />
          <InputField
            label="Name"
            value={formState.name}
            onChangeText={(text) => onFormChange({ ...formState, name: text })}
            placeholder="Entry Point Name"
            accessibilityLabel="Entry point name"
          />
        </View>
        <Button
          title="Add Entry Point"
          onPress={onAdd}
          disabled={loading || !formState.identifier || !formState.name || !isValidIdentifier(formState.identifier)}
          accessibilityLabel="Add new entry point"
        />
      </Card>

      {/* Entry Points Table */}
      <Card style={styles.tableCard}>
        <SectionHeader
          title={`Entry Points (${entryPoints.length})`}
          rightElement={
            <Text style={styles.minEntryPointsNote}>
              Minimum {MIN_ENTRY_POINTS} required
            </Text>
          }
        />
        {loading && entryPoints.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading entry points...</Text>
          </View>
        ) : entryPoints.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🚪</Text>
            <Text style={styles.emptyStateTitle}>No Entry Points</Text>
            <Text style={styles.emptyStateMessage}>
              Add entry points to get started
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={styles.tableCell}>
                  <Text style={styles.tableHeaderText}>ID</Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellIdentifier]}>
                  <Text style={styles.tableHeaderText}>Identifier</Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellName]}>
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={styles.tableCellActions}>
                  <Text style={styles.tableHeaderText}>Actions</Text>
                </View>
              </View>
              {/* Table Rows */}
              {entryPoints.map((entryPoint) => (
                <EntryPointRow
                  key={entryPoint.id}
                  entryPoint={entryPoint}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </Card>
    </View>
  );
};

// ============================================================================
// PARKING SLOTS SUB-TAB
// ============================================================================

/**
 * Parking slots table row component
 */
const SlotRow: React.FC<{
  slot: parkingApi.ParkingSlot;
  entryPoints: parkingApi.EntryPoint[];
  onEdit: (slot: parkingApi.ParkingSlot) => void;
  onDelete: (slot: parkingApi.ParkingSlot) => void;
}> = ({ slot, entryPoints, onEdit, onDelete }) => {
  const slotColor = getSlotTypeColor(slot.slot_type);

  return (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText} numberOfLines={1}>
          {slot.id.slice(0, 8)}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{slot.slot_label}</Text>
      </View>
      <View style={styles.tableCell}>
        <View style={[styles.slotTypeBadge, { backgroundColor: slotColor }]}>
          <Text style={styles.slotTypeText}>{slot.slot_type}</Text>
        </View>
      </View>
      <View style={[styles.tableCell, styles.tableCellDistances]}>
        <Text style={styles.tableCellTextSmall} numberOfLines={2}>
          {formatDistances(slot.distances, entryPoints)}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <View style={styles.availabilityContainer}>
          <View
            style={[
              styles.availabilityIndicator,
              { backgroundColor: slot.available ? COLORS.slotAvailable : COLORS.slotOccupied },
            ]}
          />
          <Text
            style={[
              styles.availabilityText,
              { color: slot.available ? COLORS.slotAvailable : COLORS.slotOccupied },
            ]}
          >
            {slot.available ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>
      <View style={styles.tableCellActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(slot)}
          accessibilityLabel={`Edit slot ${slot.slot_label}`}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDelete]}
          onPress={() => onDelete(slot)}
          accessibilityLabel={`Delete slot ${slot.slot_label}`}
          accessibilityRole="button"
        >
          <Text style={[styles.actionButtonText, styles.actionButtonTextDelete]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Parking slots sub-tab component
 */
const ParkingSlotsTab: React.FC<{
  slots: parkingApi.ParkingSlot[];
  entryPoints: parkingApi.EntryPoint[];
  loading: boolean;
  formState: FormState['addSlot'];
  onFormChange: (state: FormState['addSlot']) => void;
  onAdd: () => void;
  onEdit: (slot: parkingApi.ParkingSlot) => void;
  onDelete: (slot: parkingApi.ParkingSlot) => void;
}> = ({ slots, entryPoints, loading, formState, onFormChange, onAdd, onEdit, onDelete }) => {
  return (
    <View style={styles.tabContent}>
      {/* Add Slot Form */}
      <Card style={styles.formCard}>
        <SectionHeader title="Add New Slot" />
        <InputField
          label="Slot Label"
          value={formState.label}
          onChangeText={(text) => onFormChange({ ...formState, label: text })}
          placeholder="SP-1"
          accessibilityLabel="Slot label"
        />
        <View style={styles.slotTypeSelector}>
          <Text style={styles.slotTypeLabel}>Slot Type:</Text>
          <View style={styles.slotTypeButtons}>
            {(['SP', 'MP', 'LP'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.slotTypeButton,
                  formState.type === type && styles.slotTypeButtonActive,
                  { borderColor: getSlotTypeColor(type) },
                ]}
                onPress={() => onFormChange({ ...formState, type })}
                accessibilityLabel={`Select ${getSlotTypeLabel(type)} slot type`}
                accessibilityRole="radio"
                accessibilityState={{ checked: formState.type === type }}
              >
                <Text
                  style={[
                    styles.slotTypeButtonText,
                    formState.type === type && { color: getSlotTypeColor(type) },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {entryPoints.length > 0 && (
          <View style={styles.distancesContainer}>
            <Text style={styles.distancesLabel}>Distances from Entry Points:</Text>
            {entryPoints.map((ep, index) => (
              <InputField
                key={ep.id}
                label={`Entry Point ${ep.identifier}`}
                value={formState.distances[index]?.toString() || ''}
                onChangeText={(text) => {
                  const newDistances = [...formState.distances];
                  newDistances[index] = parseFloat(text) || 0;
                  onFormChange({ ...formState, distances: newDistances });
                }}
                placeholder="0"
                keyboardType="numeric"
                accessibilityLabel={`Distance from entry point ${ep.identifier}`}
              />
            ))}
          </View>
        )}
        <Button
          title="Add Slot"
          onPress={onAdd}
          disabled={loading || !formState.label}
          accessibilityLabel="Add new parking slot"
        />
      </Card>

      {/* Parking Slots Table */}
      <Card style={styles.tableCard}>
        <SectionHeader title={`Parking Slots (${slots.length})`} />
        {loading && slots.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading parking slots...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🅿️</Text>
            <Text style={styles.emptyStateTitle}>No Parking Slots</Text>
            <Text style={styles.emptyStateMessage}>
              Add parking slots to get started
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={styles.tableCell}>
                  <Text style={styles.tableHeaderText}>ID</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableHeaderText}>Label</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableHeaderText}>Type</Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellDistances]}>
                  <Text style={styles.tableHeaderText}>Distances</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableHeaderText}>Available</Text>
                </View>
                <View style={styles.tableCellActions}>
                  <Text style={styles.tableHeaderText}>Actions</Text>
                </View>
              </View>
              {/* Table Rows */}
              {slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  entryPoints={entryPoints}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </Card>
    </View>
  );
};

// ============================================================================
// SYSTEM SUB-TAB
// ============================================================================

/**
 * System sub-tab component
 */
const SystemTab: React.FC<{
  entryPoints: parkingApi.EntryPoint[];
  slots: parkingApi.ParkingSlot[];
  loading: boolean;
  onInitialize: () => void;
  onPreview: () => void;
  healthStatus: HealthStatus;
  systemHealth: parkingApi.HealthCheckResponse | null;
  onTestConnection: () => void;
  apiBaseUrl: string;
  onApiUrlChange: (url: string) => void;
  onSaveApiUrl: () => void;
  configJson: string;
  onConfigJsonChange: (json: string) => void;
  previewData: parkingApi.InitializeResponse | null;
  healthTimestamp: string | null;
  databaseStatus: string;
}> = ({
  entryPoints,
  slots,
  loading,
  onInitialize,
  onPreview,
  healthStatus,
  systemHealth,
  onTestConnection,
  apiBaseUrl,
  onApiUrlChange,
  onSaveApiUrl,
  configJson,
  onConfigJsonChange,
  previewData,
  healthTimestamp,
  databaseStatus,
}) => {
  const getHealthDotColor = () => {
    switch (healthStatus) {
      case 'online':
        return styles.onlineDot;
      case 'offline':
        return styles.offlineDot;
      case 'checking':
        return styles.checkingDot;
      default:
        return styles.checkingDot;
    }
  };

  return (
    <View style={styles.tabContent}>
      {/* Health Status Card */}
      <Card style={styles.healthCard}>
        <SectionHeader title="System Health" rightElement={<HealthStatusBadge status={healthStatus} />} />
        <View style={styles.healthStatus}>
          <View style={[styles.healthDot, getHealthDotColor()]} />
          <Text style={styles.healthText}>{healthStatus === 'online' ? 'Online' : healthStatus === 'offline' ? 'Offline' : 'Checking...'}</Text>
        </View>
        {systemHealth && (
          <View style={styles.healthDetails}>
            <Text style={styles.healthDetailText}>
              Service: {systemHealth.service} v{systemHealth.version}
            </Text>
            <Text style={styles.healthDetailText}>
              Database: {databaseStatus}
            </Text>
            <Text style={styles.healthDetailText}>
              Last checked: {formatTimestamp(healthTimestamp)}
            </Text>
          </View>
        )}
        <Button
          title="Test Connection"
          onPress={onTestConnection}
          disabled={healthStatus === 'checking'}
          accessibilityLabel="Test API connection"
        />
      </Card>

      {/* Initialize System Section */}
      <Card style={styles.initializeCard}>
        <SectionHeader title="Initialize System" />
        <Text style={styles.initializeDescription}>
          This will create entry points and parking slots in one operation.
        </Text>

        <Text style={styles.label}>Configuration (JSON):</Text>
        <TextInput
          style={styles.jsonInput}
          value={configJson}
          onChangeText={onConfigJsonChange}
          placeholder='{"entry_points": [...], "parking_slots": [...]}'
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Button
          title="Preview Configuration"
          onPress={onPreview}
          variant="secondary"
          accessibilityLabel="Preview configuration"
        />

        {previewData && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview:</Text>
            <Text style={styles.previewText}>Entry Points: {previewData.entry_points_created || 0}</Text>
            <Text style={styles.previewText}>Parking Slots: {previewData.parking_slots_created || 0}</Text>
          </View>
        )}

        <Button
          title="Initialize System"
          onPress={onInitialize}
          disabled={loading}
          variant="warning"
          accessibilityLabel="Initialize system with configuration"
        />
      </Card>

      {/* API Configuration Card */}
      <Card style={styles.apiConfigCard}>
        <SectionHeader title="API Configuration" />
        <InputField
          label="API Base URL"
          value={apiBaseUrl}
          onChangeText={onApiUrlChange}
          placeholder="http://localhost:8082"
          accessibilityLabel="API base URL"
        />
        <Button
          title="Save"
          onPress={onSaveApiUrl}
          accessibilityLabel="Save API base URL"
        />
      </Card>

      {/* Current System Status */}
      <Card style={styles.statusCard}>
        <SectionHeader title="Current System Status" />
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Entry Points:</Text>
          <Text style={styles.statusValue}>{entryPoints.length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Parking Slots:</Text>
          <Text style={styles.statusValue}>{slots.length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Available Slots:</Text>
          <Text style={styles.statusValue}>{slots.filter((s) => s.available).length}</Text>
        </View>
      </Card>
    </View>
  );
};

// ============================================================================
// MODALS
// ============================================================================

/**
 * Edit entry point modal component
 */
const EditEntryPointModal: React.FC<{
  visible: boolean;
  entryPoint: parkingApi.EntryPoint | null;
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ visible, entryPoint, name, onNameChange, onSave, onCancel, loading }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Entry Point</Text>
            {entryPoint && (
              <>
                <InputField
                  label="ID"
                  value={entryPoint.id}
                  onChangeText={() => {}}
                  editable={false}
                  accessibilityLabel="Entry point ID"
                />
                <InputField
                  label="Name"
                  value={name}
                  onChangeText={onNameChange}
                  placeholder="Entry Point Name"
                  accessibilityLabel="Entry point name"
                />
                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={onCancel}
                    variant="secondary"
                    accessibilityLabel="Cancel edit"
                  />
                  <Button
                    title="Save"
                    onPress={onSave}
                    disabled={loading || !name}
                    accessibilityLabel="Save changes"
                  />
                </View>
              </>
            )}
          </Card>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

/**
 * Edit slot modal component
 */
const EditSlotModal: React.FC<{
  visible: boolean;
  slot: parkingApi.ParkingSlot | null;
  entryPoints: parkingApi.EntryPoint[];
  label: string;
  type: 'SP' | 'MP' | 'LP';
  distances: number[];
  onLabelChange: (label: string) => void;
  onTypeChange: (type: 'SP' | 'MP' | 'LP') => void;
  onDistanceChange: (index: number, value: number) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({
  visible,
  slot,
  entryPoints,
  label,
  type,
  distances,
  onLabelChange,
  onTypeChange,
  onDistanceChange,
  onSave,
  onCancel,
  loading,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Parking Slot</Text>
            {slot && (
              <>
                <InputField
                  label="ID"
                  value={slot.id}
                  onChangeText={() => {}}
                  editable={false}
                  accessibilityLabel="Slot ID"
                />
                <InputField
                  label="Slot Label"
                  value={label}
                  onChangeText={onLabelChange}
                  placeholder="SP-1"
                  accessibilityLabel="Slot label"
                />
                <View style={styles.slotTypeSelector}>
                  <Text style={styles.slotTypeLabel}>Slot Type:</Text>
                  <View style={styles.slotTypeButtons}>
                    {(['SP', 'MP', 'LP'] as const).map((slotType) => (
                      <TouchableOpacity
                        key={slotType}
                        style={[
                          styles.slotTypeButton,
                          type === slotType && styles.slotTypeButtonActive,
                          { borderColor: getSlotTypeColor(slotType) },
                        ]}
                        onPress={() => onTypeChange(slotType)}
                        accessibilityLabel={`Select ${getSlotTypeLabel(slotType)} slot type`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: type === slotType }}
                      >
                        <Text
                          style={[
                            styles.slotTypeButtonText,
                            type === slotType && { color: getSlotTypeColor(slotType) },
                          ]}
                        >
                          {slotType}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {entryPoints.length > 0 && (
                  <View style={styles.distancesContainer}>
                    <Text style={styles.distancesLabel}>Distances from Entry Points:</Text>
                    {entryPoints.map((ep, index) => (
                      <InputField
                        key={ep.id}
                        label={`Entry Point ${ep.identifier}`}
                        value={distances[index]?.toString() || ''}
                        onChangeText={(text) => onDistanceChange(index, parseFloat(text) || 0)}
                        placeholder="0"
                        keyboardType="numeric"
                        accessibilityLabel={`Distance from entry point ${ep.identifier}`}
                      />
                    ))}
                  </View>
                )}
                <View style={styles.modalButtons}>
                  <Button
                    title="Cancel"
                    onPress={onCancel}
                    variant="secondary"
                    accessibilityLabel="Cancel edit"
                  />
                  <Button
                    title="Save"
                    onPress={onSave}
                    disabled={loading || !label}
                    accessibilityLabel="Save changes"
                  />
                </View>
              </>
            )}
          </Card>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

/**
 * Initialize confirmation modal component
 */
const InitializeConfirmModal: React.FC<{
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ visible, onConfirm, onCancel, loading }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent accessibilityViewIsModal>
      <View style={styles.modalBackdrop}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Initialize System?</Text>
          <Text style={styles.confirmText}>
            This will create entry points and parking slots.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>Initialize</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Initialize success modal component
 */
const InitializeSuccessModal: React.FC<{
  visible: boolean;
  result: parkingApi.InitializeResponse | null;
  onNavigate: () => void;
}> = ({ visible, result, onNavigate }) => {
  if (!result) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent accessibilityViewIsModal>
      <View style={styles.modalBackdrop}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>System Initialized Successfully</Text>
          <Text style={styles.successText}>
            ✅ {result.entry_points_created} Entry Points Created
          </Text>
          <Text style={styles.successText}>
            ✅ {result.parking_slots_created} Parking Slots Created
          </Text>
          <Text style={styles.successMessage}>{result.message}</Text>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={onNavigate}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// MAIN CONFIGURATION COMPONENT
// ============================================================================

/**
 * Configuration screen component
 */
const Configuration: React.FC = () => {
  const navigation = useNavigation();
  const [state, setState] = useState<ConfigurationState>({
    activeTab: 'entryPoints',
    entryPoints: [],
    slots: [],
    loading: true,
    error: null,
    refreshing: false,
    healthStatus: 'checking',
    systemHealth: null,
    apiBaseUrl: 'http://localhost:8082',
    lastRefreshTime: null,
    configJson: JSON.stringify(DEFAULT_CONFIG, null, 2),
    previewData: null,
    initResult: null,
    healthTimestamp: null,
    databaseStatus: 'unknown',
  });

  const [modalState, setModalState] = useState<ModalState>({
    editEntryPoint: null,
    editSlot: null,
    showDeleteConfirmation: false,
    deleteTarget: null,
    showInitializeConfirm: false,
    showInitializeSuccess: false,
  });

  const [formState, setFormState] = useState<FormState>({
    addEntryPoint: { identifier: '', name: '' },
    editEntryPointName: '',
    addSlot: { label: '', type: 'SP', distances: [] },
    editSlot: { label: '', type: 'SP', distances: [] },
  });

  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Load API base URL from AsyncStorage
   */
  const loadApiBaseUrl = useCallback(async () => {
    try {
      const url = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
      if (url && isMountedRef.current) {
        setState((prev) => ({ ...prev, apiBaseUrl: url }));
      }
    } catch (error) {
      console.warn('Error loading API base URL:', error);
    }
  }, []);

  /**
   * Save API base URL to AsyncStorage
   */
  const saveApiBaseUrl = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, state.apiBaseUrl);
      await parkingApi.setApiBaseUrl(state.apiBaseUrl);
      Alert.alert('Success', 'API base URL saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API base URL');
    }
  }, [state.apiBaseUrl]);

  /**
   * Fetch all configuration data
   */
  const fetchConfigurationData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [entryPoints, slots, health] = await Promise.all([
        parkingApi.listEntryPoints(),
        parkingApi.listSlots(),
        parkingApi.checkHealth(),
      ]);

      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        entryPoints,
        slots,
        systemHealth: health,
        loading: false,
        healthStatus: health.status === 'ok' ? 'online' : 'offline',
        healthTimestamp: health.timestamp || new Date().toISOString(),
        databaseStatus: health.checks?.database?.status || 'unknown',
        lastRefreshTime: new Date(),
      }));

      // Initialize distances for add slot form
      setFormState((prev) => ({
        ...prev,
        addSlot: {
          ...prev.addSlot,
          distances: entryPoints.map(() => 0),
        },
      }));
    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage =
        error instanceof parkingApi.ApiError ? error.message : 'Failed to load configuration data';

      setState((prev) => ({
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
    setState((prev) => ({ ...prev, refreshing: true }));
    await fetchConfigurationData();
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, refreshing: false }));
    }
  }, [fetchConfigurationData]);

  /**
   * Add entry point
   */
  const handleAddEntryPoint = useCallback(async () => {
    const { identifier, name } = formState.addEntryPoint;

    if (!identifier || !name || !isValidIdentifier(identifier)) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      await parkingApi.createEntryPoint(identifier, name);
      setFormState((prev) => ({
        ...prev,
        addEntryPoint: { identifier: '', name: '' },
      }));
      await fetchConfigurationData();
    } catch (error) {
      const errorMessage =
        error instanceof parkingApi.ApiError ? error.message : 'Failed to create entry point';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [formState.addEntryPoint, fetchConfigurationData]);

  /**
   * Edit entry point
   */
  const handleEditEntryPoint = useCallback(
    async (entryPoint: parkingApi.EntryPoint) => {
      setModalState((prev) => ({
        ...prev,
        editEntryPoint: entryPoint,
      }));
      setFormState((prev) => ({
        ...prev,
        editEntryPointName: entryPoint.name,
      }));
    },
    []
  );

  /**
   * Save entry point edit
   */
  const handleSaveEntryPointEdit = useCallback(async () => {
    if (!modalState.editEntryPoint) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      await parkingApi.updateEntryPoint(modalState.editEntryPoint.id, formState.editEntryPointName);
      setModalState((prev) => ({ ...prev, editEntryPoint: null }));
      await fetchConfigurationData();
    } catch (error) {
      const errorMessage =
        error instanceof parkingApi.ApiError ? error.message : 'Failed to update entry point';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [modalState.editEntryPoint, formState.editEntryPointName, fetchConfigurationData]);

  /**
   * Delete entry point
   */
  const handleDeleteEntryPoint = useCallback(
    (entryPoint: parkingApi.EntryPoint) => {
      if (state.entryPoints.length <= MIN_ENTRY_POINTS) {
        Alert.alert(
          'Cannot Delete',
          `Cannot delete — minimum ${MIN_ENTRY_POINTS} entry points required`
        );
        return;
      }

      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete entry point ${entryPoint.identifier}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setState((prev) => ({ ...prev, loading: true }));
              try {
                await parkingApi.deleteEntryPoint(entryPoint.id);
                await fetchConfigurationData();
              } catch (error) {
                const errorMessage =
                  error instanceof parkingApi.ApiError ? error.message : 'Failed to delete entry point';
                setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
              }
            },
          },
        ]
      );
    },
    [state.entryPoints.length, fetchConfigurationData]
  );

  /**
   * Add slot (stub - no API endpoint available)
   */
  const handleAddSlot = useCallback(async () => {
    Alert.alert(
      'Not Implemented',
      'Slot creation is not yet available through the API. Please use the system initialization to create slots.'
    );
  }, []);

  /**
   * Edit slot
   */
  const handleEditSlot = useCallback(
    (slot: parkingApi.ParkingSlot) => {
      setModalState((prev) => ({
        ...prev,
        editSlot: slot,
      }));
      setFormState((prev) => ({
        ...prev,
        editSlot: {
          label: slot.slot_label,
          type: slot.slot_type,
          distances: [...slot.distances],
        },
      }));
    },
    []
  );

  /**
   * Save slot edit (stub - no API endpoint available)
   */
  const handleSaveSlotEdit = useCallback(async () => {
    Alert.alert(
      'Not Implemented',
      'Slot update is not yet available through the API. Please use the system initialization to update slots.'
    );
    setModalState((prev) => ({ ...prev, editSlot: null }));
  }, []);

  /**
   * Delete slot (stub - no API endpoint available)
   */
  const handleDeleteSlot = useCallback((_slot: parkingApi.ParkingSlot) => {
  Alert.alert(
      'Not Implemented',
      'Slot deletion is not yet available through the API. Please use the system initialization to manage slots.'
    );
  }, []);

  /**
   * Preview configuration
   */
  const handlePreviewConfig = useCallback(() => {
    try {
      const config = JSON.parse(state.configJson) as parkingApi.InitializeConfig;
      const entryPointsCount = config.entry_points?.length || 0;
      const parkingSlotsCount = config.parking_slots?.length || 0;
      setState((prev) => ({
        ...prev,
        previewData: {
          entry_points_created: entryPointsCount,
          parking_slots_created: parkingSlotsCount,
          message: `Configuration preview: ${entryPointsCount} entry points, ${parkingSlotsCount} parking slots`,
        },
      }));
    } catch (error) {
      Alert.alert('Invalid JSON', 'Please check the configuration format and try again.');
    }
  }, [state.configJson]);

  /**
   * Open initialize confirmation modal
   */
  const handleInitializeSystem = useCallback(() => {
    setModalState((prev) => ({ ...prev, showInitializeConfirm: true }));
  }, []);

  /**
   * Confirm and execute initialization
   */
  const confirmInitializeSystem = useCallback(async () => {
    setModalState((prev) => ({ ...prev, showInitializeConfirm: false }));
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const config = JSON.parse(state.configJson) as parkingApi.InitializeConfig;
      const result = await parkingApi.initializeSystem(config);
      setState((prev) => ({ ...prev, loading: false, initResult: result }));
      setModalState((prev) => ({ ...prev, showInitializeSuccess: true }));
      await fetchConfigurationData();
    } catch (error) {
      const errorMessage =
        error instanceof parkingApi.ApiError ? error.message : 'Failed to initialize system';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      Alert.alert('Error', errorMessage);
    }
  }, [state.configJson, fetchConfigurationData]);

  /**
   * Close initialize success modal and navigate to dashboard
   */
  const handleNavigateToDashboard = useCallback(() => {
    setModalState((prev) => ({ ...prev, showInitializeSuccess: false }));
    navigation.navigate('Dashboard' as never);
  }, [navigation]);

  /**
   * Test connection
   */
  const handleTestConnection = useCallback(async () => {
    setState((prev) => ({ ...prev, healthStatus: 'checking' }));
    try {
      const health = await parkingApi.checkHealth();
      setState((prev) => ({
        ...prev,
        systemHealth: health,
        healthStatus: health.status === 'ok' ? 'online' : 'offline',
        healthTimestamp: health.timestamp || new Date().toISOString(),
        databaseStatus: health.checks?.database?.status || 'unknown',
      }));
      Alert.alert(
        'Connection Test',
        health.status === 'ok' ? '✅ Connection successful!' : '❌ Connection failed!'
      );
    } catch (error) {
      setState((prev) => ({ ...prev, healthStatus: 'offline', databaseStatus: 'error' }));
      Alert.alert('Connection Test', '❌ Connection failed!');
    }
  }, []);

  /**
   * Dismiss error banner
   */
  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Navigate back to Dashboard
   */
  const navigateToDashboard = useCallback(() => {
    navigation.navigate('Dashboard' as never);
  }, [navigation]);

  /**
   * Navigate to Park screen
   */
  const navigateToPark = useCallback(() => {
    navigation.navigate('ParkVehicle' as never);
  }, [navigation]);

  /**
   * Navigate to Sessions screen
   */
  const navigateToSessions = useCallback(() => {
    navigation.navigate('Sessions' as never);
  }, [navigation]);

  /**
   * Setup auto-refresh and initial data load
   */
  useEffect(() => {
    loadApiBaseUrl();
    fetchConfigurationData();

    autoRefreshIntervalRef.current = setInterval(() => {
      fetchConfigurationData();
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [loadApiBaseUrl, fetchConfigurationData]);

  // Render loading state
  if (state.loading && state.entryPoints.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading configuration...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={navigateToDashboard} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuration</Text>
        </View>
        <HealthStatusBadge status={state.healthStatus} />
      </View>

      {/* Error Banner */}
      {state.error && <ErrorBanner error={state.error} onDismiss={dismissError} />}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Entry Points"
          active={state.activeTab === 'entryPoints'}
          onPress={() => setState((prev) => ({ ...prev, activeTab: 'entryPoints' }))}
          accessibilityLabel="Entry Points tab"
        />
        <TabButton
          title="Parking Slots"
          active={state.activeTab === 'parkingSlots'}
          onPress={() => setState((prev) => ({ ...prev, activeTab: 'parkingSlots' }))}
          accessibilityLabel="Parking Slots tab"
        />
        <TabButton
          title="System"
          active={state.activeTab === 'system'}
          onPress={() => setState((prev) => ({ ...prev, activeTab: 'system' }))}
          accessibilityLabel="System tab"
        />
      </View>

      {/* Tab Content */}
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
        {state.activeTab === 'entryPoints' && (
          <EntryPointsTab
            entryPoints={state.entryPoints}
            loading={state.loading}
            formState={formState.addEntryPoint}
            onFormChange={(addEntryPoint) =>
              setFormState((prev) => ({ ...prev, addEntryPoint }))
            }
            onAdd={handleAddEntryPoint}
            onEdit={handleEditEntryPoint}
            onDelete={handleDeleteEntryPoint}
          />
        )}

        {state.activeTab === 'parkingSlots' && (
          <ParkingSlotsTab
            slots={state.slots}
            entryPoints={state.entryPoints}
            loading={state.loading}
            formState={formState.addSlot}
            onFormChange={(addSlot) => setFormState((prev) => ({ ...prev, addSlot }))}
            onAdd={handleAddSlot}
            onEdit={handleEditSlot}
            onDelete={handleDeleteSlot}
          />
        )}

        {state.activeTab === 'system' && (
          <SystemTab
            entryPoints={state.entryPoints}
            slots={state.slots}
            loading={state.loading}
            onInitialize={handleInitializeSystem}
            onPreview={handlePreviewConfig}
            healthStatus={state.healthStatus}
            systemHealth={state.systemHealth}
            onTestConnection={handleTestConnection}
            apiBaseUrl={state.apiBaseUrl}
            onApiUrlChange={(url) => setState((prev) => ({ ...prev, apiBaseUrl: url }))}
            onSaveApiUrl={saveApiBaseUrl}
            configJson={state.configJson}
            onConfigJsonChange={(json) => setState((prev) => ({ ...prev, configJson: json }))}
            previewData={state.previewData}
            healthTimestamp={state.healthTimestamp}
            databaseStatus={state.databaseStatus}
          />
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <Button
            title="🚗 Park Vehicle"
            onPress={navigateToPark}
            variant="secondary"
            accessibilityLabel="Navigate to Park Vehicle screen"
          />
          <Button
            title="📋 Sessions"
            onPress={navigateToSessions}
            variant="secondary"
            accessibilityLabel="Navigate to Sessions screen"
          />
        </View>
      </ScrollView>

      {/* Edit Entry Point Modal */}
      <EditEntryPointModal
        visible={!!modalState.editEntryPoint}
        entryPoint={modalState.editEntryPoint}
        name={formState.editEntryPointName}
        onNameChange={(name) => setFormState((prev) => ({ ...prev, editEntryPointName: name }))}
        onSave={handleSaveEntryPointEdit}
        onCancel={() => setModalState((prev) => ({ ...prev, editEntryPoint: null }))}
        loading={state.loading}
      />

      {/* Edit Slot Modal */}
      <EditSlotModal
        visible={!!modalState.editSlot}
        slot={modalState.editSlot}
        entryPoints={state.entryPoints}
        label={formState.editSlot.label}
        type={formState.editSlot.type}
        distances={formState.editSlot.distances}
        onLabelChange={(label) =>
          setFormState((prev) => ({ ...prev, editSlot: { ...prev.editSlot, label } }))
        }
        onTypeChange={(type) =>
          setFormState((prev) => ({ ...prev, editSlot: { ...prev.editSlot, type } }))
        }
        onDistanceChange={(index, value) => {
          const newDistances = [...formState.editSlot.distances];
          newDistances[index] = value;
          setFormState((prev) => ({
            ...prev,
            editSlot: { ...prev.editSlot, distances: newDistances },
          }));
        }}
        onSave={handleSaveSlotEdit}
        onCancel={() => setModalState((prev) => ({ ...prev, editSlot: null }))}
        loading={state.loading}
      />

      {/* Initialize Confirmation Modal */}
      <InitializeConfirmModal
        visible={modalState.showInitializeConfirm}
        onConfirm={confirmInitializeSystem}
        onCancel={() => setModalState((prev) => ({ ...prev, showInitializeConfirm: false }))}
        loading={state.loading}
      />

      {/* Initialize Success Modal */}
      <InitializeSuccessModal
        visible={modalState.showInitializeSuccess}
        result={state.initResult}
        onNavigate={handleNavigateToDashboard}
      />
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const { width: _width } = Dimensions.get('window');

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  tabContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.border,
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputErrorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  formCard: {
    marginBottom: 16,
  },
  formRow: {
    gap: 12,
  },
  tableCard: {
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    minWidth: 80,
  },
  tableCellIdentifier: {
    minWidth: 60,
  },
  tableCellName: {
    minWidth: 120,
  },
  tableCellDistances: {
    minWidth: 150,
  },
  tableCellActions: {
    minWidth: 140,
    flexDirection: 'row',
    gap: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tableCellText: {
    fontSize: 13,
    color: COLORS.text,
  },
  tableCellTextSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  identifierBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identifierText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.card,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonDelete: {
    borderColor: COLORS.danger,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtonTextDelete: {
    color: COLORS.danger,
  },
  minEntryPointsNote: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '500',
  },
  emptyState: {
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
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotTypeSelector: {
    marginBottom: 12,
  },
  slotTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  slotTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  slotTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  slotTypeButtonActive: {
    backgroundColor: COLORS.card,
  },
  slotTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  distancesContainer: {
    marginBottom: 12,
  },
  distancesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  initializeCard: {
    marginBottom: 16,
  },
  initializeDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  healthCard: {
    marginBottom: 16,
  },
  healthDetails: {
    marginBottom: 12,
  },
  healthDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  apiConfigCard: {
    marginBottom: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalCard: {
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  jsonInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  healthStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: COLORS.success,
  },
  offlineDot: {
    backgroundColor: COLORS.danger,
  },
  checkingDot: {
    backgroundColor: COLORS.warning,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  successCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  navigateButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
});

export default Configuration;
