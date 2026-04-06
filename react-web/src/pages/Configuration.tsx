/**
 * Configuration Page
 *
 * A comprehensive configuration page for the OO Parking Lot System with three sub-tabs:
 * - Entry Points: Manage entry points with CRUD operations
 * - Parking Slots: View and manage parking slots
 * - System: Initialize/reset system and view health status
 *
 * @module Configuration
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as parkingApi from '../api/parkingApi';
import { useParking } from '../context/ParkingContext';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tab type for navigation
 */
type TabType = 'entryPoints' | 'parkingSlots' | 'system';

/**
 * Edit entry point modal state
 */
interface EditEntryPointModal {
  isOpen: boolean;
  entryPoint: parkingApi.EntryPoint | null;
}

/**
 * Delete confirmation state
 */
interface DeleteConfirmation {
  isOpen: boolean;
  entryPoint: parkingApi.EntryPoint | null;
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
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
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
    // SP slots
    { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] },
    { slot_label: 'SP-2', slot_type: 'SP', distances: [3, 2, 4] },
    { slot_label: 'SP-3', slot_type: 'SP', distances: [4, 1, 3] },
    // MP slots
    { slot_label: 'MP-1', slot_type: 'MP', distances: [5, 2, 3] },
    { slot_label: 'MP-2', slot_type: 'MP', distances: [6, 3, 1] },
    // LP slots
    { slot_label: 'LP-1', slot_type: 'LP', distances: [7, 4, 2] },
    { slot_label: 'LP-2', slot_type: 'LP', distances: [2, 5, 6] },
  ],
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: COLORS.background,
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '24px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid COLORS.border',
    paddingBottom: '0',
  },
  tab: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: COLORS.primary,
    borderBottomColor: COLORS.primary,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '24px',
  },
  tableHeader: {
    backgroundColor: COLORS.background,
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: COLORS.text,
    borderBottom: '2px solid COLORS.border',
  },
  tableCell: {
    padding: '12px',
    borderBottom: '1px solid COLORS.border',
    fontSize: '14px',
    color: COLORS.text,
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    color: 'white',
    boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
  },
  buttonSuccess: {
    backgroundColor: COLORS.success,
    color: 'white',
    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
    color: 'white',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
  },
  buttonSecondary: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: '1px solid #cbd5e1',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '10px',
    border: '1.5px solid #e5e7eb',
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    transition: 'all 0.2s ease',
    width: '100%',
  },
  inputFocus: {
    outline: 'none',
    borderColor: COLORS.primary,
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  select: {
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '10px',
    border: '1.5px solid #e5e7eb',
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    cursor: 'pointer',
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '6px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '9999px',
    textTransform: 'uppercase',
  },
  badgeSP: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeMP: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeLP: {
    backgroundColor: '#fce7f3',
    color: '#9d174d',
  },
  statusIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusOnline: {
    backgroundColor: COLORS.success,
  },
  statusOffline: {
    backgroundColor: COLORS.danger,
  },
  statusChecking: {
    backgroundColor: COLORS.warning,
  },
  modal: {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
    padding: '16px',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: '16px',
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: COLORS.background,
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: '0.3px',
    margin: '0',
  },
  modalCloseButton: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '18px',
    color: '#6b7280',
    fontWeight: '600',
  },
  modalCloseButtonHover: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  modalBody: {
    padding: '28px',
    overflowY: 'auto' as const,
    maxHeight: 'calc(90vh - 180px)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 28px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  success: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  warning: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#92400e',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  configSection: {
    marginBottom: '24px',
  },
  configTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: '12px',
  },
  configList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  },
  configItem: {
    padding: '8px 0',
    fontSize: '14px',
    color: COLORS.text,
    borderBottom: '1px solid COLORS.border',
  },
  configItemLast: {
    borderBottom: 'none',
  },
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Tab navigation component
 */
function TabNavigation({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }): JSX.Element {
  return (
    <div style={styles.tabs}>
      <button
        style={{ ...styles.tab, ...(activeTab === 'entryPoints' ? styles.tabActive : {}) }}
        onClick={() => onTabChange('entryPoints')}
      >
        Entry Points
      </button>
      <button
        style={{ ...styles.tab, ...(activeTab === 'parkingSlots' ? styles.tabActive : {}) }}
        onClick={() => onTabChange('parkingSlots')}
      >
        Parking Slots
      </button>
      <button
        style={{ ...styles.tab, ...(activeTab === 'system' ? styles.tabActive : {}) }}
        onClick={() => onTabChange('system')}
      >
        System
      </button>
    </div>
  );
}

/**
 * Health status card component
 */
function HealthStatusCard({ 
  systemHealth, 
  onTestConnection 
}: { 
  systemHealth: 'online' | 'offline' | 'checking';
  onTestConnection: () => void;
}): JSX.Element {
  const statusColor = systemHealth === 'online' ? styles.statusOnline : 
                      systemHealth === 'offline' ? styles.statusOffline : 
                      styles.statusChecking;
  
  const statusText = systemHealth === 'online' ? 'Online' : 
                     systemHealth === 'offline' ? 'Offline' : 
                     'Checking...';

  return (
    <div style={styles.card}>
      <h3 style={styles.configTitle}>System Health</h3>
      <div style={{ ...styles.statusIndicator, marginBottom: '16px' }}>
        <span style={{ ...styles.statusDot, ...statusColor }}></span>
        <span style={{ fontWeight: '600' }}>{statusText}</span>
      </div>
      <button
        style={{ ...styles.button, ...styles.buttonPrimary }}
        onClick={onTestConnection}
      >
        Test Connection
      </button>
    </div>
  );
}

/**
 * API base URL settings component
 */
function ApiBaseUrlSettings(): JSX.Element {
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');

  useEffect(() => {
    // Load saved URL from localStorage
    const saved = localStorage.getItem('api_base_url');
    if (saved) {
      setApiBaseUrl(saved);
      setSavedUrl(saved);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (apiBaseUrl.trim()) {
      localStorage.setItem('api_base_url', apiBaseUrl.trim());
      setSavedUrl(apiBaseUrl.trim());
      // Reload page to apply new URL
      window.location.reload();
    }
  }, [apiBaseUrl]);

  return (
    <div style={styles.card}>
      <h3 style={styles.configTitle}>API Base URL</h3>
      <div style={styles.formGroup}>
        <label style={styles.label}>Base URL</label>
        <input
          type="text"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          placeholder="http://localhost:8082"
          style={styles.input}
        />
      </div>
      <button
        style={{ ...styles.button, ...styles.buttonPrimary }}
        onClick={handleSave}
      >
        Save
      </button>
      {savedUrl && (
        <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '8px' }}>
          Current: {savedUrl}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// ENTRY POINTS SUB-TAB
// ============================================================================

/**
 * Entry Points sub-tab component
 */
function EntryPointsTab({
  entryPoints,
  onRefresh,
}: {
  entryPoints: parkingApi.EntryPoint[];
  onRefresh: () => void;
}): JSX.Element {
  const { fetchEntryPoints } = useParking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Add form state
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  
  // Edit modal state
  const [editModal, setEditModal] = useState<EditEntryPointModal>({ isOpen: false, entryPoint: null });
  const [editName, setEditName] = useState('');
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({ isOpen: false, entryPoint: null });

  /**
   * Handle add entry point
   */
  const handleAddEntryPoint = useCallback(async () => {
    if (!identifier.trim() || !name.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (identifier.length !== 1 || !/[A-Z]/.test(identifier)) {
      setError('Identifier must be a single uppercase letter (A-Z)');
      return;
    }

    // Check for duplicate identifier
    const duplicate = entryPoints.find(ep => ep.identifier === identifier.toUpperCase());
    if (duplicate) {
      setError(`Entry point with identifier "${identifier.toUpperCase()}" already exists`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await parkingApi.createEntryPoint(identifier.toUpperCase(), name.trim());
      
      setSuccess('Entry point created successfully');
      setIdentifier('');
      setName('');
      
      await fetchEntryPoints();
      onRefresh();
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to create entry point');
    } finally {
      setLoading(false);
    }
  }, [identifier, name, entryPoints, fetchEntryPoints]);

  /**
   * Handle edit entry point
   */
  const handleEditEntryPoint = useCallback(async () => {
    if (!editModal.entryPoint || !editName.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await parkingApi.updateEntryPoint(editModal.entryPoint.id, editName.trim());
      
      setSuccess('Entry point updated successfully');
      setEditModal({ isOpen: false, entryPoint: null });
      
      await fetchEntryPoints();
      onRefresh();
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to update entry point');
    } finally {
      setLoading(false);
    }
  }, [editModal, editName, fetchEntryPoints]);

  /**
   * Handle delete entry point
   */
  const handleDeleteEntryPoint = useCallback(async () => {
    if (!deleteConfirmation.entryPoint) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await parkingApi.deleteEntryPoint(deleteConfirmation.entryPoint.id);
      
      setSuccess('Entry point deleted successfully');
      setDeleteConfirmation({ isOpen: false, entryPoint: null });
      
      await fetchEntryPoints();
      onRefresh();
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to delete entry point');
    } finally {
      setLoading(false);
    }
  }, [deleteConfirmation, fetchEntryPoints]);

  /**
   * Open edit modal
   */
  const openEditModal = useCallback((entryPoint: parkingApi.EntryPoint) => {
    setEditModal({ isOpen: true, entryPoint });
    setEditName(entryPoint.name);
  }, []);

  /**
   * Open delete confirmation
   */
  const openDeleteConfirmation = useCallback((entryPoint: parkingApi.EntryPoint) => {
    // Check if minimum 3 entry points would remain
    if (entryPoints.length <= 3) {
      setError('Cannot delete — minimum 3 entry points required');
      return;
    }
    setDeleteConfirmation({ isOpen: true, entryPoint });
  }, [entryPoints.length]);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Add Entry Point Form */}
      <div style={styles.card}>
        <h3 style={styles.configTitle}>Add New Entry Point</h3>
        <div style={styles.formRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Identifier (A-Z)</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
              maxLength={1}
              placeholder="A"
              style={styles.input}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entry Point A"
              style={styles.input}
            />
          </div>
        </div>
        <button
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={handleAddEntryPoint}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Entry Point'}
        </button>
      </div>

      {/* Entry Points Table */}
      <div style={styles.card}>
        <h3 style={styles.configTitle}>Entry Points ({entryPoints.length})</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>ID</th>
              <th style={styles.tableHeader}>Identifier</th>
              <th style={styles.tableHeader}>Name</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entryPoints.map((entryPoint) => (
              <tr key={entryPoint.id}>
                <td style={styles.tableCell}>{entryPoint.id}</td>
                <td style={styles.tableCell}>
                  <span style={{ ...styles.badge, ...styles.badgeSP }}>
                    {entryPoint.identifier}
                  </span>
                </td>
                <td style={styles.tableCell}>{entryPoint.name}</td>
                <td style={styles.tableCell}>
                  <button
                    style={{ ...styles.button, ...styles.buttonSecondary, marginRight: '8px' }}
                    onClick={() => openEditModal(entryPoint)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.buttonDanger }}
                    onClick={() => openDeleteConfirmation(entryPoint)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entryPoints.length === 0 && (
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '24px' }}>
            No entry points found. Add your first entry point above.
          </p>
        )}
      </div>

      {/* Edit Entry Point Modal */}
      {editModal.isOpen && editModal.entryPoint && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Entry Point</h2>
              <button
                style={styles.modalCloseButton}
                onClick={() => setEditModal({ isOpen: false, entryPoint: null })}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Entry Point ID</label>
                <input
                  type="text"
                  value={editModal.entryPoint.id}
                  disabled
                  style={{ ...styles.input, backgroundColor: COLORS.background, cursor: 'not-allowed' }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Identifier</label>
                <input
                  type="text"
                  value={editModal.entryPoint.identifier}
                  disabled
                  style={{ ...styles.input, backgroundColor: COLORS.background, cursor: 'not-allowed' }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Entry Point A"
                  style={styles.input}
                  autoFocus
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setEditModal({ isOpen: false, entryPoint: null })}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleEditEntryPoint}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && deleteConfirmation.entryPoint && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Confirm Delete</h2>
              <button
                style={styles.modalCloseButton}
                onClick={() => setDeleteConfirmation({ isOpen: false, entryPoint: null })}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <span style={{ fontSize: '32px' }}>⚠️</span>
                </div>
                <p style={{ fontSize: '15px', color: COLORS.text, marginBottom: '8px', fontWeight: '600' }}>
                  Are you sure you want to delete entry point{' '}
                  <strong style={{ color: COLORS.primary }}>{deleteConfirmation.entryPoint.identifier}</strong>?
                </p>
                <p style={{ fontSize: '13px', color: COLORS.danger, marginTop: '16px' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setDeleteConfirmation({ isOpen: false, entryPoint: null })}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonDanger }}
                onClick={handleDeleteEntryPoint}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PARKING SLOTS SUB-TAB
// ============================================================================

/**
 * Parking Slots sub-tab component
 */
function ParkingSlotsTab({
  slots,
  entryPoints,
}: {
  slots: parkingApi.ParkingSlot[];
  entryPoints: parkingApi.EntryPoint[];
}): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add form state
  const [slotLabel, setSlotLabel] = useState('');
  const [slotType, setSlotType] = useState<'SP' | 'MP' | 'LP'>('SP');
  const [distances, setDistances] = useState<number[]>([]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editSlotLabel, setEditSlotLabel] = useState('');
  const [editSlotType, setEditSlotType] = useState<'SP' | 'MP' | 'LP'>('SP');
  const [editDistances, setEditDistances] = useState<number[]>([]);

  // Initialize distances when entry points change
  useEffect(() => {
    setDistances(new Array(entryPoints.length).fill(0));
  }, [entryPoints.length]);

  /**
   * Get slot type badge style
   */
  const getSlotTypeBadgeStyle = (type: 'SP' | 'MP' | 'LP') => {
    switch (type) {
      case 'SP':
        return styles.badgeSP;
      case 'MP':
        return styles.badgeMP;
      case 'LP':
        return styles.badgeLP;
    }
  };

  /**
   * Handle add slot
   */
  const handleAddSlot = useCallback(async () => {
    if (!slotLabel.trim()) {
      setError('Slot label is required');
      return;
    }
    try {
      setLoading(true);
      await parkingApi.createSlot(slotLabel, slotType, distances);
      setSuccess('Slot created successfully');
      setSlotLabel('');
      setSlotType('SP');
      setDistances(new Array(entryPoints.length).fill(0));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  }, [slotLabel, slotType, distances, entryPoints.length]);

  /**
   * Handle edit slot
   */
  const handleEditSlot = useCallback(async () => {
    if (!editingSlotId || !editSlotLabel.trim()) {
      setError('Slot label is required');
      return;
    }
    try {
      setLoading(true);
      await parkingApi.updateSlot(editingSlotId, editSlotLabel, editSlotType, editDistances);
      setSuccess('Slot updated successfully');
      setShowEditModal(false);
      setEditingSlotId(null);
      setTimeout(() => setSuccess(null), 3000);
      window.location.reload();
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to update slot');
    } finally {
      setLoading(false);
    }
  }, [editingSlotId, editSlotLabel, editSlotType, editDistances]);

  /**
   * Handle delete slot
   */
  const handleDeleteSlot = useCallback(async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) return;

    try {
      setLoading(true);
      await parkingApi.deleteSlot(slotId);
      setSuccess('Slot deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      window.location.reload();
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to delete slot');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Open edit modal
   */
  const openEditModal = useCallback((slot: parkingApi.ParkingSlot) => {
    setEditingSlotId(slot.id);
    setEditSlotLabel(slot.slot_label);
    setEditSlotType(slot.slot_type);
    setEditDistances([...slot.distances]);
    setShowEditModal(true);
  }, []);

  /**
   * Close edit modal
   */
  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingSlotId(null);
    setEditSlotLabel('');
    setEditSlotType('SP');
    setEditDistances([]);
  }, []);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Add Slot Form */}
      <div style={styles.card}>
        <h3 style={styles.configTitle}>Add New Parking Slot</h3>
        <div style={styles.formRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Slot Label</label>
            <input
              type="text"
              value={slotLabel}
              onChange={(e) => setSlotLabel(e.target.value)}
              placeholder="SP-1"
              style={styles.input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Slot Type</label>
            <select
              value={slotType}
              onChange={(e) => setSlotType(e.target.value as 'SP' | 'MP' | 'LP')}
              style={styles.select}
            >
              <option value="SP">SP (Small)</option>
              <option value="MP">MP (Medium)</option>
              <option value="LP">LP (Large)</option>
            </select>
          </div>
        </div>
        
        {/* Distance inputs for each entry point */}
        <div style={{ marginBottom: '16px' }}>
          <label style={styles.label}>Distances from Entry Points</label>
          {entryPoints.map((ep, index) => (
            <div key={ep.id} style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '4px', display: 'block' }}>
                Entry Point {ep.identifier}
              </label>
              <input
                type="number"
                min="0"
                value={distances[index] || ''}
                onChange={(e) => {
                  const newDistances = [...distances];
                  newDistances[index] = parseFloat(e.target.value) || 0;
                  setDistances(newDistances);
                }}
                placeholder="Distance"
                style={styles.input}
              />
            </div>
          ))}
        </div>

        <button
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={handleAddSlot}
          disabled={loading}
        >
          Add Slot
        </button>
      </div>

      {/* Parking Slots Table */}
      <div style={styles.card}>
        <h3 style={styles.configTitle}>Parking Slots ({slots.length})</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>ID</th>
              <th style={styles.tableHeader}>Slot Label</th>
              <th style={styles.tableHeader}>Slot Type</th>
              <th style={styles.tableHeader}>Distances</th>
              <th style={styles.tableHeader}>Available</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td style={styles.tableCell}>{slot.id}</td>
                <td style={styles.tableCell}>
                  <strong>{slot.slot_label}</strong>
                </td>
                <td style={styles.tableCell}>
                  <span style={{ ...styles.badge, ...getSlotTypeBadgeStyle(slot.slot_type) }}>
                    {slot.slot_type}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {slot.distances.map((dist, i) => (
                    <span key={i} style={{ marginRight: '8px' }}>
                      {entryPoints[i]?.identifier}: {dist}
                    </span>
                  ))}
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.statusIndicator}>
                    <span
                      style={{
                        ...styles.statusDot,
                        ...(slot.available ? styles.statusOnline : styles.statusOffline),
                      }}
                    ></span>
                    <span>{slot.available ? 'Yes' : 'No'}</span>
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <button
                    style={{ ...styles.button, ...styles.buttonSecondary, marginRight: '8px' }}
                    onClick={() => openEditModal(slot)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.buttonDanger }}
                    onClick={() => handleDeleteSlot(slot.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {slots.length === 0 && (
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '24px' }}>
            No parking slots found. Initialize the system to create default slots.
          </p>
        )}
      </div>

      {/* Edit Slot Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 28px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              flexShrink: 0,
            }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1e293b',
                letterSpacing: '0.3px',
                margin: '0',
              }}>
                Edit Parking Slot
              </h2>
              <button
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#6b7280',
                  fontWeight: '600',
                }}
                onClick={closeEditModal}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{
              padding: '28px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Slot ID */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px',
                }}>
                  Slot ID
                </label>
                <input
                  type="text"
                  value={editingSlotId || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e5e7eb',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Slot Label */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px',
                }}>
                  Slot Label
                </label>
                <input
                  type="text"
                  value={editSlotLabel}
                  onChange={(e) => setEditSlotLabel(e.target.value)}
                  placeholder="SP-1"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Slot Type */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '12px',
                }}>
                  Slot Type
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['SP', 'MP', 'LP'] as const).map((type) => {
                    const isSelected = editSlotType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditSlotType(type)}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '12px',
                          border: `2px solid ${isSelected ? '#1e40af' : '#e5e7eb'}`,
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1e40af' : '#1e293b',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1 }}>{type}</div>
                          <div style={{ fontSize: '11px', fontWeight: '500', opacity: 0.85 }}>
                            {type === 'SP' ? 'Small' : type === 'MP' ? 'Medium' : 'Large'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Distances */}
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '16px',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📏</span>
                    <span>Distances from Entry Points</span>
                  </span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {entryPoints.map((ep, index) => (
                    <div key={ep.id} style={{
                      backgroundColor: '#ffffff',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🚪</span>
                        <label style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                          Entry Point {ep.identifier}
                        </label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={editDistances[index] || ''}
                          onChange={(e) => {
                            const newDistances = [...editDistances];
                            newDistances[index] = parseFloat(e.target.value) || 0;
                            setEditDistances(newDistances);
                          }}
                          placeholder="0"
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            fontSize: '14px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            boxSizing: 'border-box',
                          }}
                        />
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#1e40af',
                          minWidth: '24px',
                          textAlign: 'center',
                        }}>m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '20px 28px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#fafafa',
              flexShrink: 0,
            }}>
              <button
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                }}
                onClick={closeEditModal}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#1e40af',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
                }}
                onClick={handleEditSlot}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SYSTEM SUB-TAB
// ============================================================================

/**
 * System sub-tab component
 */
function SystemTab({ onRefresh }: { onRefresh: () => void }): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Handle initialize system
   */
  const handleInitializeSystem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await parkingApi.initializeSystem(DEFAULT_CONFIG);
      
      setSuccess(
        `System initialized successfully! Created ${result.entry_points_created} entry points and ${result.parking_slots_created} parking slots.`
      );
      
      onRefresh();
    } catch (err) {
      setError(err instanceof parkingApi.ApiError ? err.message : 'Failed to initialize system');
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Initialize System Card */}
      <div style={styles.card}>
        <h3 style={{ ...styles.configTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚠️ Initialize / Reset System
        </h3>
        <p style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '16px' }}>
          This will set up the parking lot with the default configuration from the specification.
        </p>
        <button
          data-testid="initialize-button"
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={handleInitializeSystem}
          disabled={loading}
        >
          {loading ? 'Initializing...' : '🔄 Initialize System'}
        </button>
      </div>

      {/* Default Configuration Display */}
      <div style={styles.card}>
        <h3 style={styles.configTitle}>Default Configuration</h3>
        
        <div style={styles.configSection}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '8px' }}>
            Entry Points (3)
          </h4>
          <ul style={styles.configList}>
            {DEFAULT_CONFIG.entry_points.map((ep) => (
              <li key={ep.identifier} style={styles.configItem}>
                <strong>{ep.identifier}:</strong> {ep.name}
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.configSection}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '8px' }}>
            SP Slots (3)
          </h4>
          <ul style={styles.configList}>
            {DEFAULT_CONFIG.parking_slots
              .filter((slot) => slot.slot_type === 'SP')
              .map((slot) => (
                <li key={slot.slot_label} style={styles.configItem}>
                  <strong>{slot.slot_label}:</strong> distances [{slot.distances.join(', ')}]
                </li>
              ))}
          </ul>
        </div>

        <div style={styles.configSection}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '8px' }}>
            MP Slots (2)
          </h4>
          <ul style={styles.configList}>
            {DEFAULT_CONFIG.parking_slots
              .filter((slot) => slot.slot_type === 'MP')
              .map((slot) => (
                <li key={slot.slot_label} style={styles.configItem}>
                  <strong>{slot.slot_label}:</strong> distances [{slot.distances.join(', ')}]
                </li>
              ))}
          </ul>
        </div>

        <div style={styles.configSection}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '8px' }}>
            LP Slots (2)
          </h4>
          <ul style={styles.configList}>
            {DEFAULT_CONFIG.parking_slots
              .filter((slot) => slot.slot_type === 'LP')
              .map((slot) => (
                <li key={slot.slot_label} style={styles.configItem}>
                  <strong>{slot.slot_label}:</strong> distances [{slot.distances.join(', ')}]
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CONFIGURATION PAGE
// ============================================================================

/**
 * Configuration page component
 * 
 * Main component that manages the configuration page with three sub-tabs:
 * - Entry Points: Manage entry points with CRUD operations
 * - Parking Slots: View and manage parking slots
 * - System: Initialize/reset system and view health status
 * 
 * @returns Configuration page JSX element
 */
export default function Configuration(): JSX.Element {
  const { state, checkHealth, refreshAll } = useParking();
  const [activeTab, setActiveTab] = useState<TabType>('entryPoints');
  const [, setApiBaseUrl] = useState('');

  useEffect(() => {
    // Load API base URL from localStorage
    const savedUrl = localStorage.getItem('api_base_url');
    if (savedUrl) {
      setApiBaseUrl(savedUrl);
    }
  }, []);

  /**
   * Handle test connection
   */
  const handleTestConnection = useCallback(async () => {
    await checkHealth();
  }, [checkHealth]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  /**
   * Render active tab content
   */
  const renderTabContent = (): JSX.Element => {
    switch (activeTab) {
      case 'entryPoints':
        return (
          <EntryPointsTab
            entryPoints={state.entryPoints}
            onRefresh={handleRefresh}
          />
        );
      case 'parkingSlots':
        return (
          <ParkingSlotsTab
            slots={state.slots}
            entryPoints={state.entryPoints}
          />
        );
      case 'system':
        return <SystemTab onRefresh={handleRefresh} />;
      default:
        return <></>;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Configuration</h1>
        <p style={styles.subtitle}>Manage entry points, parking slots, and system settings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Main content area */}
        <div>
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        <div>
          <HealthStatusCard
            systemHealth={state.systemHealth}
            onTestConnection={handleTestConnection}
          />
          <ApiBaseUrlSettings />
        </div>
      </div>
    </div>
  );
}
