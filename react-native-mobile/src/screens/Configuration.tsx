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
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as ENV_API_BASE_URL } from '@env';
import * as parkingApi from '../api/parkingApi';

/** Build-time default from .env, matching the resolution in parkingApi */
const DEFAULT_API_URL = ENV_API_BASE_URL || 'http://localhost:8082';

// ============================================================================
// TYPES
// ============================================================================

type HealthStatus = 'online' | 'offline' | 'checking';
type ActiveTab = 'entryPoints' | 'parkingSlots' | 'system';

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

interface ModalState {
  editEntryPoint: parkingApi.EntryPoint | null;
  editSlot: parkingApi.ParkingSlot | null;
  showDeleteConfirmation: boolean;
  deleteTarget: { type: 'entryPoint' | 'slot'; id: string; identifier: string } | null;
  showInitializeConfirm: boolean;
  showInitializeSuccess: boolean;
}

interface FormState {
  addEntryPoint: { identifier: string; name: string };
  editEntryPointName: string;
  addSlot: { label: string; type: 'SP' | 'MP' | 'LP'; distances: number[] };
  editSlot: { label: string; type: 'SP' | 'MP' | 'LP'; distances: number[] };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#1e40af',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  background: '#f1f5f9',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  border: '#e2e8f0',
  slotAvailable: '#22c55e',
  slotOccupied: '#ef4444',
  slotSP: '#3b82f6',
  slotMP: '#a855f7',
  slotLP: '#f97316',
} as const;

const AUTO_REFRESH_INTERVAL = 120000;

const STORAGE_KEYS = {
  API_BASE_URL: 'api_base_url',
  TEST_MODE: 'test_mode',
} as const;

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

const MIN_ENTRY_POINTS = 3;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getSlotTypeColor = (slotType: string): string => {
  switch (slotType) {
    case 'SP': return COLORS.slotSP;
    case 'MP': return COLORS.slotMP;
    case 'LP': return COLORS.slotLP;
    default:   return COLORS.textSecondary;
  }
};

const getSlotTypeLabel = (slotType: string): string => {
  switch (slotType) {
    case 'SP': return 'Small';
    case 'MP': return 'Medium';
    case 'LP': return 'Large';
    default:   return 'Unknown';
  }
};

const isValidIdentifier = (identifier: string): boolean => /^[A-Z]$/.test(identifier);

const formatDistances = (
  distances: readonly number[],
  entryPoints: parkingApi.EntryPoint[]
): string =>
  entryPoints.map((ep, i) => `${ep.identifier}: ${distances[i] || 0}`).join(', ');

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleTimeString();
};

// ============================================================================
// SHARED SMALL COMPONENTS
// ============================================================================

const TabButton: React.FC<{
  title: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}> = ({ title, active, onPress, accessibilityLabel, testID }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    testID={testID}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{title}</Text>
  </TouchableOpacity>
);

const HealthStatusBadge: React.FC<{ status: HealthStatus; testID?: string }> = ({ status, testID }) => {
  const color =
    status === 'online' ? COLORS.success :
    status === 'offline' ? COLORS.danger :
    COLORS.warning;
  const label =
    status === 'online' ? 'Online' :
    status === 'offline' ? 'Offline' :
    'Checking...';
  return (
    <View style={[styles.healthBadge, { backgroundColor: color }]} testID={testID}>
      <View style={styles.healthIndicator} />
      <Text style={styles.healthText}>{label}</Text>
    </View>
  );
};

const ErrorBanner: React.FC<{ error: string; onDismiss: () => void }> = ({ error, onDismiss }) => (
  <View style={styles.errorBanner} testID="error-message">
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity onPress={onDismiss} style={styles.errorDismiss}>
      <Text style={styles.errorDismissText}>✕</Text>
    </TouchableOpacity>
  </View>
);

const Button: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
}> = ({ title, onPress, disabled, loading, variant = 'primary', accessibilityLabel, testID, style }) => {
  const variantStyle =
    variant === 'secondary' ? styles.buttonSecondary :
    variant === 'danger'    ? styles.buttonDanger :
    variant === 'warning'   ? styles.buttonWarning :
    styles.buttonPrimary;
  return (
    <TouchableOpacity
      style={[styles.button, variantStyle, (disabled || loading) && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      testID={testID}
    >
      {loading
        ? <ActivityIndicator size="small" color={COLORS.card} />
        : <Text style={styles.buttonText}>{title}</Text>
      }
    </TouchableOpacity>
  );
};

const InputField: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'url';
  maxLength?: number;
  accessibilityLabel?: string;
  error?: string;
  editable?: boolean;
}> = ({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', maxLength,
  accessibilityLabel, error, editable = true,
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.input, error ? styles.inputError : null, !editable ? styles.inputDisabled : null]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textSecondary}
      keyboardType={keyboardType}
      maxLength={maxLength}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      editable={editable}
    />
    {error && <Text style={styles.inputErrorText}>{error}</Text>}
  </View>
);

const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const SectionHeader: React.FC<{ title: string; rightElement?: React.ReactNode }> = ({ title, rightElement }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {rightElement}
  </View>
);

// ============================================================================
// ENTRY POINTS SUB-TAB
// ============================================================================

const EntryPointRow: React.FC<{
  entryPoint: parkingApi.EntryPoint;
  onEdit: (ep: parkingApi.EntryPoint) => void;
  onDelete: (ep: parkingApi.EntryPoint) => void;
}> = ({ entryPoint, onEdit, onDelete }) => {
  const displayId = entryPoint.id != null ? String(entryPoint.id).slice(0, 8) : '—';
  return (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText} numberOfLines={1}>{displayId}</Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellIdentifier]}>
        <View style={styles.identifierBadge}>
          <Text style={styles.identifierText}>{entryPoint.identifier}</Text>
        </View>
      </View>
      <View style={[styles.tableCell, styles.tableCellName]}>
        <Text style={styles.tableCellText} numberOfLines={1}>{entryPoint.name}</Text>
      </View>
      <View style={styles.tableCellActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(entryPoint)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDelete]} onPress={() => onDelete(entryPoint)}>
          <Text style={[styles.actionButtonText, styles.actionButtonTextDelete]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EntryPointsTab: React.FC<{
  entryPoints: parkingApi.EntryPoint[];
  loading: boolean;
  formState: FormState['addEntryPoint'];
  onFormChange: (state: FormState['addEntryPoint']) => void;
  onAdd: () => void;
  onEdit: (ep: parkingApi.EntryPoint) => void;
  onDelete: (ep: parkingApi.EntryPoint) => void;
}> = ({ entryPoints, loading, formState, onFormChange, onAdd, onEdit, onDelete }) => (
  <View style={styles.tabContent}>
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
        loading={loading}
        disabled={!formState.identifier || !formState.name || !isValidIdentifier(formState.identifier)}
        accessibilityLabel="Add new entry point"
      />
    </Card>

    <Card style={styles.tableCard}>
      <SectionHeader
        title={`Entry Points (${entryPoints.length})`}
        rightElement={
          <Text style={styles.minEntryPointsNote}>Minimum {MIN_ENTRY_POINTS} required</Text>
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
          <Text style={styles.emptyStateMessage}>Add entry points to get started</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <View style={styles.tableCell}><Text style={styles.tableHeaderText}>ID</Text></View>
              <View style={[styles.tableCell, styles.tableCellIdentifier]}><Text style={styles.tableHeaderText}>Identifier</Text></View>
              <View style={[styles.tableCell, styles.tableCellName]}><Text style={styles.tableHeaderText}>Name</Text></View>
              <View style={styles.tableCellActions}><Text style={styles.tableHeaderText}>Actions</Text></View>
            </View>
            {entryPoints.map((ep) => (
              <EntryPointRow key={ep.id ?? ep.identifier} entryPoint={ep} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </View>
        </ScrollView>
      )}
    </Card>
  </View>
);

// ============================================================================
// PARKING SLOTS SUB-TAB
// ============================================================================

const SlotRow: React.FC<{
  slot: parkingApi.ParkingSlot;
  entryPoints: parkingApi.EntryPoint[];
  onEdit: (slot: parkingApi.ParkingSlot) => void;
  onDelete: (slot: parkingApi.ParkingSlot) => void;
}> = ({ slot, entryPoints, onEdit, onDelete }) => {
  const slotColor = getSlotTypeColor(slot.slot_type);
  const displayId = slot.id != null ? String(slot.id).slice(0, 8) : '—';
  return (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText} numberOfLines={1}>{displayId}</Text>
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
          <View style={[styles.availabilityIndicator, { backgroundColor: slot.available ? COLORS.slotAvailable : COLORS.slotOccupied }]} />
          <Text style={[styles.availabilityText, { color: slot.available ? COLORS.slotAvailable : COLORS.slotOccupied }]}>
            {slot.available ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>
      <View style={styles.tableCellActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(slot)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDelete]} onPress={() => onDelete(slot)}>
          <Text style={[styles.actionButtonText, styles.actionButtonTextDelete]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ParkingSlotsTab: React.FC<{
  slots: parkingApi.ParkingSlot[];
  entryPoints: parkingApi.EntryPoint[];
  loading: boolean;
  formState: FormState['addSlot'];
  onFormChange: (state: FormState['addSlot']) => void;
  onAdd: () => void;
  onEdit: (slot: parkingApi.ParkingSlot) => void;
  onDelete: (slot: parkingApi.ParkingSlot) => void;
}> = ({ slots, entryPoints, loading, formState, onFormChange, onAdd, onEdit, onDelete }) => (
  <View style={styles.tabContent}>
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
              style={[styles.slotTypeButton, formState.type === type && styles.slotTypeButtonActive, { borderColor: getSlotTypeColor(type) }]}
              onPress={() => onFormChange({ ...formState, type })}
              accessibilityLabel={`Select ${getSlotTypeLabel(type)} slot type`}
              accessibilityRole="radio"
              accessibilityState={{ checked: formState.type === type }}
            >
              <Text style={[styles.slotTypeButtonText, formState.type === type && { color: getSlotTypeColor(type) }]}>
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
                while (newDistances.length <= index) newDistances.push(0);
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
        loading={loading}
        disabled={!formState.label}
        accessibilityLabel="Add new parking slot"
      />
    </Card>

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
          <Text style={styles.emptyStateMessage}>Add parking slots to get started</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <View style={styles.tableCell}><Text style={styles.tableHeaderText}>ID</Text></View>
              <View style={styles.tableCell}><Text style={styles.tableHeaderText}>Label</Text></View>
              <View style={styles.tableCell}><Text style={styles.tableHeaderText}>Type</Text></View>
              <View style={[styles.tableCell, styles.tableCellDistances]}><Text style={styles.tableHeaderText}>Distances</Text></View>
              <View style={styles.tableCell}><Text style={styles.tableHeaderText}>Available</Text></View>
              <View style={styles.tableCellActions}><Text style={styles.tableHeaderText}>Actions</Text></View>
            </View>
            {slots.map((slot) => (
              <SlotRow key={slot.id ?? slot.slot_label} slot={slot} entryPoints={entryPoints} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </View>
        </ScrollView>
      )}
    </Card>
  </View>
);

// ============================================================================
// SYSTEM SUB-TAB
// ============================================================================

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
  entryPoints, slots, loading, onInitialize, onPreview,
  healthStatus, systemHealth, onTestConnection,
  apiBaseUrl, onApiUrlChange, onSaveApiUrl,
  configJson, onConfigJsonChange, previewData,
  healthTimestamp, databaseStatus,
}) => {
  const healthDotStyle =
    healthStatus === 'online' ? styles.onlineDot :
    healthStatus === 'offline' ? styles.offlineDot :
    styles.checkingDot;

  return (
    <View style={styles.tabContent}>
      <Card style={styles.healthCard}>
        <SectionHeader title="System Health" rightElement={<HealthStatusBadge status={healthStatus} testID="health-status-badge" />} />
        <View style={styles.healthStatusRow}>
          <View style={[styles.healthDot, healthDotStyle]} />
          <Text style={styles.healthStatusText}>
            {healthStatus === 'online' ? 'Online' : healthStatus === 'offline' ? 'Offline' : 'Checking...'}
          </Text>
        </View>
        {systemHealth && (
          <View style={styles.healthDetails}>
            <Text style={styles.healthDetailText}>Service: {systemHealth.service} v{systemHealth.version}</Text>
            <Text style={styles.healthDetailText}>Database: {databaseStatus}</Text>
            <Text style={styles.healthDetailText}>Last checked: {formatTimestamp(healthTimestamp)}</Text>
          </View>
        )}
        <Button
          title="Test Connection"
          onPress={onTestConnection}
          loading={healthStatus === 'checking'}
          disabled={healthStatus === 'checking'}
          accessibilityLabel="Test API connection"
        />
      </Card>

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
          testID="config-json-input"
        />
        <Button title="Preview Configuration" onPress={onPreview} variant="secondary" accessibilityLabel="Preview configuration" testID="preview-button" />
        {previewData && (
          <View style={styles.previewCard} testID="success-message">
            <Text style={styles.previewTitle}>Preview:</Text>
            <Text style={styles.previewText}>Entry Points: {previewData.entry_points_created || 0}</Text>
            <Text style={styles.previewText}>Parking Slots: {previewData.parking_slots_created || 0}</Text>
          </View>
        )}
        <Button title="Initialize System" onPress={onInitialize} loading={loading} disabled={loading} variant="warning" accessibilityLabel="Initialize system" testID="initialize-button" />
      </Card>

      <Card style={styles.apiConfigCard}>
        <SectionHeader title="API Configuration" />
        <InputField
          label="API Base URL"
          value={apiBaseUrl}
          onChangeText={onApiUrlChange}
          placeholder={DEFAULT_API_URL}
          keyboardType="url"
          accessibilityLabel="API base URL"
        />
        <Button title="Save" onPress={onSaveApiUrl} accessibilityLabel="Save API base URL" />
      </Card>

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
 * Edit Entry Point Modal
 */
const EditEntryPointModal: React.FC<{
  visible: boolean;
  entryPoint: parkingApi.EntryPoint | null;
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ visible, entryPoint, name, onNameChange, onSave, onCancel, loading }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
    statusBarTranslucent
    accessibilityViewIsModal
  >
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.modalBox}>
        {/* Fixed header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Edit Entry Point {entryPoint?.identifier ?? ''}
          </Text>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onCancel}>
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable body */}
        <ScrollView
          style={styles.modalScrollArea}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {entryPoint && (
            <>
              <InputField
                label="Identifier"
                value={entryPoint.identifier}
                onChangeText={() => {}}
                editable={false}
                accessibilityLabel="Entry point identifier"
              />
              <InputField
                label="Name"
                value={name}
                onChangeText={onNameChange}
                placeholder="Entry Point Name"
                accessibilityLabel="Entry point name"
              />
            </>
          )}
        </ScrollView>

        {/* Fixed footer */}
        <View style={styles.modalFooter}>
          <Button title="Cancel" onPress={onCancel} variant="secondary" style={styles.modalFooterBtn} accessibilityLabel="Cancel edit" />
          <Button title="Save" onPress={onSave} loading={loading} disabled={!name} style={styles.modalFooterBtn} accessibilityLabel="Save changes" />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

/**
 * Edit Slot Modal
 *
 * Key fix: The modal uses a flat View structure with a fixed header, a flex-1
 * ScrollView for the body, and a fixed footer. This prevents the Android
 * collapse-to-zero height bug that occurred when using Card with flex:1
 * wrapping a ScrollView with flexGrow:1.
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
  visible, slot, entryPoints, label, type, distances,
  onLabelChange, onTypeChange, onDistanceChange,
  onSave, onCancel, loading,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
    statusBarTranslucent
    accessibilityViewIsModal
  >
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/*
       * modalBox: fixed white rounded card.
       * Do NOT use flex:1 here — that makes it fill the screen.
       * maxHeight constrains it; the inner ScrollView handles overflow.
       */}
      <View style={styles.modalBox}>

        {/* ── Fixed header ─────────────────────────────────────── */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Parking Slot</Text>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onCancel}>
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/*
         * ── Scrollable body ──────────────────────────────────────
         * flex:1 here works because modalBox has a constrained height
         * (maxHeight:'85%'), so the parent has a definite size for
         * the child to flex into. This is the critical fix.
         */}
        <ScrollView
          style={styles.modalScrollArea}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {/* Slot ID (read-only) */}
          <InputField
            label="ID"
            value={slot?.id != null ? String(slot.id) : ''}
            onChangeText={() => {}}
            editable={false}
            accessibilityLabel="Slot ID"
          />

          {/* Slot Label */}
          <InputField
            label="Slot Label"
            value={label}
            onChangeText={onLabelChange}
            placeholder="SP-1"
            accessibilityLabel="Slot label"
          />

          {/* Slot Type selector */}
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
                  <Text style={[styles.slotTypeButtonText, type === slotType && { color: getSlotTypeColor(slotType) }]}>
                    {slotType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distances */}
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
        </ScrollView>

        {/* ── Fixed footer ─────────────────────────────────────── */}
        <View style={styles.modalFooter}>
          <Button title="Cancel" onPress={onCancel} variant="secondary" style={styles.modalFooterBtn} accessibilityLabel="Cancel edit" />
          <Button title="Save" onPress={onSave} loading={loading} disabled={!label} style={styles.modalFooterBtn} accessibilityLabel="Save changes" />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const InitializeConfirmModal: React.FC<{
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ visible, onConfirm, onCancel, loading }) => (
  <Modal visible={visible} animationType="fade" transparent accessibilityViewIsModal testID="initialize-confirm-modal">
    <View style={styles.modalBackdrop}>
      <View style={styles.confirmCard}>
        <Text style={styles.confirmTitle}>Initialize System?</Text>
        <Text style={styles.confirmText}>This will create entry points and parking slots.</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} disabled={loading} activeOpacity={0.7}>
            <Text style={styles.confirmButtonText}>Initialize</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const InitializeSuccessModal: React.FC<{
  visible: boolean;
  result: parkingApi.InitializeResponse | null;
  onNavigate: () => void;
}> = ({ visible, result, onNavigate }) => {
  if (!result) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent accessibilityViewIsModal testID="initialize-success-modal">
      <View style={styles.modalBackdrop}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>System Initialized Successfully</Text>
          <Text style={styles.successText}>✅ {result.entry_points_created} Entry Points Created</Text>
          <Text style={styles.successText}>✅ {result.parking_slots_created} Parking Slots Created</Text>
          <Text style={styles.successMessage}>{result.message}</Text>
          <TouchableOpacity style={styles.navigateButton} onPress={onNavigate} activeOpacity={0.7}>
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
    apiBaseUrl: DEFAULT_API_URL,
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

  const loadApiBaseUrl = useCallback(async () => {
    try {
      const url = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
      if (url && isMountedRef.current) setState((prev) => ({ ...prev, apiBaseUrl: url }));
    } catch (error) {
      console.warn('Error loading API base URL:', error);
    }
  }, []);

  const saveApiBaseUrl = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, state.apiBaseUrl);
      await parkingApi.setApiBaseUrl(state.apiBaseUrl);
      Alert.alert('Success', 'API base URL saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save API base URL');
    }
  }, [state.apiBaseUrl]);

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
        entryPoints, slots, systemHealth: health,
        loading: false,
        healthStatus: health.status === 'ok' ? 'online' : 'offline',
        healthTimestamp: health.timestamp || new Date().toISOString(),
        databaseStatus: health.checks?.database?.status || 'unknown',
        lastRefreshTime: new Date(),
      }));
      setFormState((prev) => ({
        ...prev,
        addSlot: { ...prev.addSlot, distances: entryPoints.map(() => 0) },
      }));
    } catch (error) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev, loading: false,
        error: error instanceof parkingApi.ApiError ? error.message : 'Failed to load configuration data',
        healthStatus: 'offline',
      }));
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const [entryPoints, slots] = await Promise.all([
        parkingApi.listEntryPoints(),
        parkingApi.listSlots(),
      ]);
      if (!isMountedRef.current) return;
      setState((prev) => ({ ...prev, entryPoints, slots, loading: false, lastRefreshTime: new Date() }));
      setFormState((prev) => ({
        ...prev,
        addSlot: { ...prev.addSlot, distances: entryPoints.map(() => 0) },
      }));
    } catch (error) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev, loading: false,
        error: error instanceof parkingApi.ApiError ? error.message : 'Failed to refresh data',
      }));
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    try { await fetchConfigurationData(); }
    finally { if (isMountedRef.current) setState((prev) => ({ ...prev, refreshing: false })); }
  }, [fetchConfigurationData]);

  const handleAddEntryPoint = useCallback(async () => {
    const { identifier, name } = formState.addEntryPoint;
    if (!identifier || !name || !isValidIdentifier(identifier)) return;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await parkingApi.createEntryPoint(identifier, name);
      setFormState((prev) => ({ ...prev, addEntryPoint: { identifier: '', name: '' } }));
      await refreshData();
      Alert.alert('Success', `Entry point "${identifier}" created successfully`);
    } catch (error) {
      setState((prev) => ({
        ...prev, loading: false,
        error: error instanceof parkingApi.ApiError ? error.message : 'Failed to create entry point',
      }));
    }
  }, [formState.addEntryPoint, refreshData]);

  const handleEditEntryPoint = useCallback((entryPoint: parkingApi.EntryPoint) => {
    setModalState((prev) => ({ ...prev, editEntryPoint: entryPoint }));
    setFormState((prev) => ({ ...prev, editEntryPointName: entryPoint.name }));
  }, []);

  const handleSaveEntryPointEdit = useCallback(async () => {
    if (!modalState.editEntryPoint) return;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await parkingApi.updateEntryPoint(modalState.editEntryPoint.id, formState.editEntryPointName);
      setModalState((prev) => ({ ...prev, editEntryPoint: null }));
      await refreshData();
      Alert.alert('Success', 'Entry point updated successfully');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof parkingApi.ApiError ? error.message : 'Failed to update entry point',
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [modalState.editEntryPoint, formState.editEntryPointName, refreshData]);

  const handleDeleteEntryPoint = useCallback((entryPoint: parkingApi.EntryPoint) => {
    if (state.entryPoints.length <= MIN_ENTRY_POINTS) {
      Alert.alert('Cannot Delete', `Cannot delete — minimum ${MIN_ENTRY_POINTS} entry points required`);
      return;
    }
    Alert.alert('Confirm Delete', `Delete entry point ${entryPoint.identifier}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setState((prev) => ({ ...prev, loading: true }));
          try {
            await parkingApi.deleteEntryPoint(entryPoint.id);
            await refreshData();
            Alert.alert('Success', `Entry point "${entryPoint.identifier}" deleted`);
          } catch (error) {
            setState((prev) => ({
              ...prev, loading: false,
              error: error instanceof parkingApi.ApiError ? error.message : 'Failed to delete entry point',
            }));
          }
        },
      },
    ]);
  }, [state.entryPoints.length, refreshData]);

  const handleAddSlot = useCallback(async () => {
    const { label, type, distances: rawDistances } = formState.addSlot;
    if (!label) { Alert.alert('Validation Error', 'Slot label is required'); return; }
    const entryPointCount = state.entryPoints.length;
    if (entryPointCount === 0) { Alert.alert('Validation Error', 'Must have at least one entry point'); return; }
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const normalizedDistances = Array(entryPointCount).fill(0);
      rawDistances.forEach((d, i) => { if (i < entryPointCount && typeof d === 'number' && !isNaN(d)) normalizedDistances[i] = d; });
      await parkingApi.createSlot({ slot_label: label, slot_type: type, distances: normalizedDistances });
      setFormState((prev) => ({ ...prev, addSlot: { label: '', type: 'SP', distances: state.entryPoints.map(() => 0) } }));
      await refreshData();
      Alert.alert('Success', `Slot "${label}" created successfully`);
    } catch (error) {
      setState((prev) => ({
        ...prev, loading: false,
        error: error instanceof parkingApi.ApiError ? error.message : 'Failed to create slot',
      }));
    }
  }, [formState.addSlot, state.entryPoints, refreshData]);

  const handleEditSlot = useCallback((slot: parkingApi.ParkingSlot) => {
    setModalState((prev) => ({ ...prev, editSlot: slot }));
    const distances = [...slot.distances];
    while (distances.length < state.entryPoints.length) distances.push(0);
    distances.length = state.entryPoints.length;
    setFormState((prev) => ({ ...prev, editSlot: { label: slot.slot_label, type: slot.slot_type, distances } }));
  }, [state.entryPoints]);

  const handleSaveSlotEdit = useCallback(async () => {
    if (!modalState.editSlot) return;
    const { label, type, distances: rawDistances } = formState.editSlot;
    if (!label) { Alert.alert('Validation Error', 'Slot label is required'); return; }
    const entryPointCount = state.entryPoints.length;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const normalizedDistances = Array(entryPointCount).fill(0);
      rawDistances.forEach((d, i) => { if (i < entryPointCount && typeof d === 'number' && !isNaN(d)) normalizedDistances[i] = d; });
      await parkingApi.updateSlot(modalState.editSlot!.id, { slot_label: label, slot_type: type, distances: normalizedDistances });
      setModalState((prev) => ({ ...prev, editSlot: null }));
      await refreshData();
      Alert.alert('Success', 'Parking slot updated successfully');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof parkingApi.ApiError ? error.message : 'Failed to update slot',
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [modalState.editSlot, formState.editSlot, state.entryPoints, refreshData]);

  const handleDeleteSlot = useCallback((slot: parkingApi.ParkingSlot) => {
    Alert.alert('Confirm Delete', `Delete slot ${slot.slot_label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setState((prev) => ({ ...prev, loading: true }));
          try {
            await parkingApi.deleteSlot(slot.id);
            await refreshData();
            Alert.alert('Success', `Slot "${slot.slot_label}" deleted`);
          } catch (error) {
            setState((prev) => ({
              ...prev, loading: false,
              error: error instanceof parkingApi.ApiError ? error.message : 'Failed to delete slot',
            }));
          }
        },
      },
    ]);
  }, [refreshData]);

  const handlePreviewConfig = useCallback(() => {
    try {
      const config = JSON.parse(state.configJson) as parkingApi.InitializeConfig;
      setState((prev) => ({
        ...prev,
        previewData: {
          entry_points_created: config.entry_points?.length || 0,
          parking_slots_created: config.parking_slots?.length || 0,
          message: `Preview: ${config.entry_points?.length || 0} entry points, ${config.parking_slots?.length || 0} slots`,
        },
      }));
    } catch {
      Alert.alert('Invalid JSON', 'Please check the configuration format and try again.');
    }
  }, [state.configJson]);

  const handleInitializeSystem = useCallback(() => {
    setModalState((prev) => ({ ...prev, showInitializeConfirm: true }));
  }, []);

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
      const msg = error instanceof parkingApi.ApiError ? error.message : 'Failed to initialize system';
      setState((prev) => ({ ...prev, loading: false, error: msg }));
      Alert.alert('Error', msg);
    }
  }, [state.configJson, fetchConfigurationData]);

  const handleNavigateToDashboard = useCallback(() => {
    setModalState((prev) => ({ ...prev, showInitializeSuccess: false }));
    navigation.navigate('Dashboard' as never);
  }, [navigation]);

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
      Alert.alert('Connection Test', health.status === 'ok' ? '✅ Connection successful!' : '❌ Connection failed!');
    } catch {
      setState((prev) => ({ ...prev, healthStatus: 'offline', databaseStatus: 'error' }));
      Alert.alert('Connection Test', '❌ Connection failed!');
    }
  }, []);

  useEffect(() => {
    loadApiBaseUrl();
    fetchConfigurationData();
    autoRefreshIntervalRef.current = setInterval(fetchConfigurationData, AUTO_REFRESH_INTERVAL);
    return () => {
      isMountedRef.current = false;
      if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current);
    };
  }, [loadApiBaseUrl, fetchConfigurationData]);

  useEffect(() => {
    const count = state.entryPoints.length;
    setFormState((prev) => {
      const newDistances = Array(count).fill(0);
      prev.addSlot.distances.forEach((d, i) => { if (i < count) newDistances[i] = d; });
      return { ...prev, addSlot: { ...prev.addSlot, distances: newDistances } };
    });
  }, [state.entryPoints.length]);

  if (state.loading && state.entryPoints.length === 0 && state.slots.length === 0) {
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
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuration</Text>
        </View>
        <HealthStatusBadge status={state.healthStatus} />
      </View>

      {/* Error Banner */}
      {state.error && <ErrorBanner error={state.error} onDismiss={() => setState((prev) => ({ ...prev, error: null }))} />}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton title="Entry Points" active={state.activeTab === 'entryPoints'} onPress={() => setState((prev) => ({ ...prev, activeTab: 'entryPoints' }))} accessibilityLabel="Entry Points tab" testID="entry-points-tab" />
        <TabButton title="Parking Slots" active={state.activeTab === 'parkingSlots'} onPress={() => setState((prev) => ({ ...prev, activeTab: 'parkingSlots' }))} accessibilityLabel="Parking Slots tab" testID="parking-slots-tab" />
        <TabButton title="System" active={state.activeTab === 'system'} onPress={() => setState((prev) => ({ ...prev, activeTab: 'system' }))} accessibilityLabel="System tab" testID="system-tab" />
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {state.activeTab === 'entryPoints' && (
          <EntryPointsTab
            entryPoints={state.entryPoints} loading={state.loading}
            formState={formState.addEntryPoint}
            onFormChange={(addEntryPoint) => setFormState((prev) => ({ ...prev, addEntryPoint }))}
            onAdd={handleAddEntryPoint} onEdit={handleEditEntryPoint} onDelete={handleDeleteEntryPoint}
          />
        )}
        {state.activeTab === 'parkingSlots' && (
          <ParkingSlotsTab
            slots={state.slots} entryPoints={state.entryPoints} loading={state.loading}
            formState={formState.addSlot}
            onFormChange={(addSlot) => setFormState((prev) => ({ ...prev, addSlot }))}
            onAdd={handleAddSlot} onEdit={handleEditSlot} onDelete={handleDeleteSlot}
          />
        )}
        {state.activeTab === 'system' && (
          <SystemTab
            entryPoints={state.entryPoints} slots={state.slots} loading={state.loading}
            onInitialize={handleInitializeSystem} onPreview={handlePreviewConfig}
            healthStatus={state.healthStatus} systemHealth={state.systemHealth}
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
        <View style={styles.navigationButtons}>
          <Button title="🚗 Park Vehicle" onPress={() => navigation.navigate('Park' as never)} variant="secondary" accessibilityLabel="Navigate to Park Vehicle screen" />
          <Button title="📋 Sessions" onPress={() => navigation.navigate('Sessions' as never)} variant="secondary" accessibilityLabel="Navigate to Sessions screen" />
        </View>
      </ScrollView>

      {/* Modals */}
      <EditEntryPointModal
        visible={!!modalState.editEntryPoint}
        entryPoint={modalState.editEntryPoint}
        name={formState.editEntryPointName}
        onNameChange={(name) => setFormState((prev) => ({ ...prev, editEntryPointName: name }))}
        onSave={handleSaveEntryPointEdit}
        onCancel={() => setModalState((prev) => ({ ...prev, editEntryPoint: null }))}
        loading={state.loading}
      />

      <EditSlotModal
        visible={!!modalState.editSlot}
        slot={modalState.editSlot}
        entryPoints={state.entryPoints}
        label={formState.editSlot.label}
        type={formState.editSlot.type}
        distances={formState.editSlot.distances}
        onLabelChange={(label) => setFormState((prev) => ({ ...prev, editSlot: { ...prev.editSlot, label } }))}
        onTypeChange={(type) => setFormState((prev) => ({ ...prev, editSlot: { ...prev.editSlot, type } }))}
        onDistanceChange={(index, value) => {
          const newDistances = [...formState.editSlot.distances];
          while (newDistances.length <= index) newDistances.push(0);
          newDistances[index] = value;
          setFormState((prev) => ({ ...prev, editSlot: { ...prev.editSlot, distances: newDistances } }));
        }}
        onSave={handleSaveSlotEdit}
        onCancel={() => setModalState((prev) => ({ ...prev, editSlot: null }))}
        loading={state.loading}
      />

      <InitializeConfirmModal
        visible={modalState.showInitializeConfirm}
        onConfirm={confirmInitializeSystem}
        onCancel={() => setModalState((prev) => ({ ...prev, showInitializeConfirm: false }))}
        loading={state.loading}
      />

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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.text },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  healthBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  healthIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.card, marginRight: 6 },
  healthText: { fontSize: 12, fontWeight: '600', color: COLORS.card },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2',
    paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 8,
  },
  errorIcon: { fontSize: 20, marginRight: 12 },
  errorText: { flex: 1, fontSize: 14, color: COLORS.danger },
  errorDismiss: { padding: 4 },
  errorDismissText: { fontSize: 18, color: COLORS.textSecondary },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: COLORS.primary },
  tabButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  tabButtonTextActive: { color: COLORS.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  tabContent: { padding: 16 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  button: {
    paddingVertical: 13, paddingHorizontal: 24, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  buttonPrimary: { backgroundColor: COLORS.primary },
  buttonSecondary: { backgroundColor: '#64748b' },
  buttonDanger: { backgroundColor: COLORS.danger },
  buttonWarning: { backgroundColor: COLORS.warning },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 15, fontWeight: '700', color: COLORS.card, letterSpacing: 0.3 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, letterSpacing: 0.2 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: '#cbd5e1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  inputError: { borderColor: COLORS.danger, borderWidth: 2 },
  inputDisabled: { opacity: 0.6, backgroundColor: '#e5e7eb' },
  inputErrorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  formCard: { marginBottom: 16 },
  formRow: { gap: 12 },
  tableCard: { overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.background, borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingVertical: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8 },
  tableCell: { paddingHorizontal: 8, justifyContent: 'center', minWidth: 80 },
  tableCellIdentifier: { minWidth: 60 },
  tableCellName: { minWidth: 120 },
  tableCellDistances: { minWidth: 150 },
  tableCellActions: { minWidth: 140, flexDirection: 'row', gap: 4 },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  tableCellText: { fontSize: 13, color: COLORS.text },
  tableCellTextSmall: { fontSize: 11, color: COLORS.textSecondary },
  identifierBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  identifierText: { fontSize: 14, fontWeight: '700', color: COLORS.card },
  actionButton: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.background, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  actionButtonDelete: { borderColor: COLORS.danger },
  actionButtonText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  actionButtonTextDelete: { color: COLORS.danger },
  minEntryPointsNote: { fontSize: 11, color: COLORS.warning, fontWeight: '500' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyStateMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  slotTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  slotTypeText: { fontSize: 10, fontWeight: '600', color: COLORS.card },
  availabilityContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  availabilityIndicator: { width: 8, height: 8, borderRadius: 4 },
  availabilityText: { fontSize: 12, fontWeight: '600' },
  slotTypeSelector: { marginBottom: 20, backgroundColor: 'rgba(99,102,241,0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' },
  slotTypeLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 12, letterSpacing: 0.3 },
  slotTypeButtons: { flexDirection: 'row', gap: 10 },
  slotTypeButton: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2.5,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  slotTypeButtonActive: { backgroundColor: COLORS.card, shadowOpacity: 0.15, elevation: 4 },
  slotTypeButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2 },
  distancesContainer: { marginBottom: 8, backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  distancesLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  initializeCard: { marginBottom: 16 },
  initializeDescription: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  healthCard: { marginBottom: 16 },
  healthStatusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  healthStatusText: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginLeft: 8 },
  healthDetails: { marginBottom: 12 },
  healthDetailText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  healthDot: { width: 12, height: 12, borderRadius: 6 },
  onlineDot: { backgroundColor: COLORS.success },
  offlineDot: { backgroundColor: COLORS.danger },
  checkingDot: { backgroundColor: COLORS.warning },
  apiConfigCard: { marginBottom: 16 },
  statusCard: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusLabel: { fontSize: 14, color: COLORS.textSecondary },
  statusValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  navigationButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  jsonInput: {
    backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
    minHeight: 120, textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewCard: { backgroundColor: COLORS.background, borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 12 },
  previewTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  previewText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },

  // ── Modal styles (the critical fix is here) ──────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  /**
   * modalBox uses a definite height (not maxHeight) so that its children
   * with flex:1 (the ScrollView) have a concrete parent size to fill.
   * maxHeight alone does NOT provide a definite size for flex layout,
   * causing the ScrollView to collapse to zero height on Android.
   */
  modalBox: {
    width: '100%',
    maxWidth: 480,
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    // flexDirection column is the default — explicit for clarity
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    // flexShrink:0 prevents the header from being squashed by the flex child
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    flex: 1,
    marginRight: 8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '700',
    lineHeight: 18,
  },
  /**
   * modalScrollArea: flex:1 here is valid because modalBox has maxHeight
   * (a definite size), so this child can flex to fill the remaining space
   * between the fixed header and fixed footer.
   */
  modalScrollArea: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#fafafa',
    // flexShrink:0 prevents the footer from being squashed by the flex child
    flexShrink: 0,
  },
  modalFooterBtn: { flex: 1 },

  // Confirm / Success modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 24, width: '80%', maxWidth: 400 },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  confirmText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  confirmButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.card },
  cancelButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.border },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  successCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 24, width: '80%', maxWidth: 400, alignItems: 'center' },
  successIcon: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  successText: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 8, textAlign: 'center' },
  successMessage: { fontSize: 14, color: COLORS.textSecondary, marginTop: 16, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  navigateButton: { width: '100%', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
});

export default Configuration;