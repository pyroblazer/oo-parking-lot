import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  listSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  ApiError,
} from '../api/parkingApi';
import type { ParkingSlot } from '../api/parkingApi';
import type { ScreenProps } from '../types';

// Helper function to extract error message
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'An unknown error occurred';
};

// Helper function to get slot type colors
function getSlotTypeColor(slotType: string) {
  switch (slotType) {
    case 'SP':
      return {
        backgroundColor: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#16a34a',
      };
    case 'MP':
      return {
        backgroundColor: '#dbeafe',
        borderColor: '#1e40af',
        textColor: '#1e40af',
      };
    case 'LP':
      return {
        backgroundColor: '#ede9fe',
        borderColor: '#7c3aed',
        textColor: '#7c3aed',
      };
    default:
      return {
        backgroundColor: '#f3f4f6',
        borderColor: '#64748b',
        textColor: '#64748b',
      };
  }
}

interface SlotsManagementProps extends ScreenProps<{}> {}

function SlotsManagement({ navigation: _navigation }: SlotsManagementProps): React.JSX.Element {
  // State for slots list
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<'ALL' | 'SP' | 'MP' | 'LP'>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE'>('ALL');

  // Modal state - using key to force remount
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<ParkingSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalKey, setModalKey] = useState<number>(0);

  // Form data state
  const [formData, setFormData] = useState<{
    slot_label: string;
    slot_type: 'SP' | 'MP' | 'LP';
    distances: number[];
  }>({
    slot_label: '',
    slot_type: 'SP',
    distances: [0, 0, 0],
  });

  // Load slots
  const loadSlots = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const data = await listSlots();
      setSlots(data);
      setLoading(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  }, []);

  // Load slots on mount and set up auto-refresh
  useEffect(() => {
    loadSlots();
    const interval = setInterval(() => {
      loadSlots();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, [loadSlots]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadSlots();
    setRefreshing(false);
  }, [loadSlots]);

  // Filter slots
  const filteredSlots = slots.filter((slot) => {
    if (filterType !== 'ALL' && slot.slot_type !== filterType) {
      return false;
    }
    if (availabilityFilter === 'AVAILABLE' && !slot.available) {
      return false;
    }
    return true;
  });

  // Calculate slot counts
  const totalCount = {
    SP: slots.filter((s) => s.slot_type === 'SP').length,
    MP: slots.filter((s) => s.slot_type === 'MP').length,
    LP: slots.filter((s) => s.slot_type === 'LP').length,
  };

  const availableCount = {
    SP: slots.filter((s) => s.slot_type === 'SP' && s.available).length,
    MP: slots.filter((s) => s.slot_type === 'MP' && s.available).length,
    LP: slots.filter((s) => s.slot_type === 'LP' && s.available).length,
  };

  // Modal handlers
  const openCreateModal = useCallback((): void => {
    setEditingSlot(null);
    setFormData({
      slot_label: '',
      slot_type: 'SP',
      distances: [0, 0, 0],
    });
    setModalKey((prev) => prev + 1);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((slot: ParkingSlot): void => {
    setEditingSlot(slot);
    setFormData({
      slot_label: slot.slot_label,
      slot_type: slot.slot_type,
      distances: slot.distances ? [...slot.distances] : [0, 0, 0],
    });
    setModalKey((prev) => prev + 1);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback((): void => {
    setModalVisible(false);
    // Reset state after modal closes
    setTimeout(() => {
      setEditingSlot(null);
      setFormData({
        slot_label: '',
        slot_type: 'SP',
        distances: [0, 0, 0],
      });
    }, 300);
  }, []);

  const openDeleteModal = useCallback((slot: ParkingSlot): void => {
    setSelectedSlot(slot);
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteModal = useCallback((): void => {
    setDeleteModalVisible(false);
    setSelectedSlot(null);
  }, []);

  // Form validation
  const validateForm = useCallback((): boolean => {
    if (!formData.slot_label.trim()) {
      Alert.alert('Validation Error', 'Slot label is required');
      return false;
    }
    if (formData.distances.some((d) => d < 0)) {
      Alert.alert('Validation Error', 'Distances must be positive numbers');
      return false;
    }
    return true;
  }, [formData]);

  // CRUD operations
  const handleSave = useCallback(async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingSlot) {
        // Update existing slot
        await updateSlot(
          editingSlot.id,
          {
            slot_label: formData.slot_label,
            slot_type: formData.slot_type,
            distances: formData.distances,
          }
        );
        Alert.alert('Success', 'Slot updated successfully');
      } else {
        // Create new slot
        await createSlot({
          slot_label: formData.slot_label,
          slot_type: formData.slot_type,
          distances: formData.distances,
        });
        Alert.alert('Success', 'Slot created successfully');
      }
      closeModal();
      await loadSlots();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  }, [editingSlot, formData, validateForm, closeModal, loadSlots]);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!selectedSlot) {
      return;
    }

    setSaving(true);
    try {
      await deleteSlot(selectedSlot.id);
      Alert.alert('Success', 'Slot deleted successfully');
      closeDeleteModal();
      await loadSlots();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  }, [selectedSlot, closeDeleteModal, loadSlots]);

  // Render slot card
  const renderSlot = useCallback(({ item }: { item: ParkingSlot }): React.JSX.Element => {
    const colors = getSlotTypeColor(item.slot_type);
    return (
      <View
        style={[
          mainStyles.slotCard,
          { borderColor: colors.borderColor },
          !item.available && mainStyles.occupiedCard,
        ]}
        testID="slot-item"
      >
        <View style={[mainStyles.slotHeader, { backgroundColor: colors.backgroundColor }]}>
          <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
            <Text style={[mainStyles.slotLabel, { color: colors.textColor }]} testID="slot-label">
              {item.slot_label}
            </Text>
          </TouchableOpacity>
          <View style={[mainStyles.slotTypeBadge, { backgroundColor: colors.borderColor }]} testID="slot-type">
            <Text style={mainStyles.badgeText}>{item.slot_type}</Text>
          </View>
        </View>
        <View style={mainStyles.slotDetails}>
          <View
            style={[
              mainStyles.statusBadge,
              item.available ? mainStyles.available : mainStyles.occupied,
            ]}
            testID="slot-status"
          >
            <Text
              style={[
                mainStyles.statusText,
                item.available ? mainStyles.availableText : mainStyles.occupiedText,
              ]}
            >
              {item.available ? 'Available' : 'Occupied'}
            </Text>
          </View>
          {item.distances && item.distances.length > 0 && (
            <Text style={mainStyles.distanceText}>
              Distances: {item.distances.join(', ')}
            </Text>
          )}
          <View style={mainStyles.actionButtons}>
            <TouchableOpacity
              style={mainStyles.editButton}
              onPress={() => openEditModal(item)}
              activeOpacity={0.7}
              testID="edit-slot-button"
            >
              <Text style={mainStyles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={mainStyles.deleteButton}
              onPress={() => openDeleteModal(item)}
              activeOpacity={0.7}
              testID="delete-slot-button"
            >
              <Text style={mainStyles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [openEditModal, openDeleteModal]);

  return (
    <View style={mainStyles.container} testID="slots-management-page">
      <ScrollView
        style={mainStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={mainStyles.title}>🅿️ Slots Management</Text>

        {/* Error banner */}
        {error && (
          <View style={mainStyles.errorBox} testID="error-message">
            <Text style={mainStyles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Filter Bar */}
        <View style={mainStyles.filterBar}>
          <Text style={mainStyles.filterLabel}>Filter by Type:</Text>
          <View style={mainStyles.filterButtons}>
            <TouchableOpacity
              style={[
                mainStyles.filterButton,
                filterType === 'ALL' && mainStyles.activeFilter,
              ]}
              onPress={() => setFilterType('ALL')}
              activeOpacity={0.7}
              testID="filter-button-all"
            >
              <Text
                style={[
                  mainStyles.filterButtonText,
                  filterType === 'ALL' && mainStyles.activeFilterText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                mainStyles.filterButton,
                filterType === 'SP' && mainStyles.activeFilter,
              ]}
              onPress={() => setFilterType('SP')}
              activeOpacity={0.7}
              testID="filter-button-sp"
            >
              <Text
                style={[
                  mainStyles.filterButtonText,
                  filterType === 'SP' && mainStyles.activeFilterText,
                ]}
              >
                SP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                mainStyles.filterButton,
                filterType === 'MP' && mainStyles.activeFilter,
              ]}
              onPress={() => setFilterType('MP')}
              activeOpacity={0.7}
              testID="filter-button-mp"
            >
              <Text
                style={[
                  mainStyles.filterButtonText,
                  filterType === 'MP' && mainStyles.activeFilterText,
                ]}
              >
                MP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                mainStyles.filterButton,
                filterType === 'LP' && mainStyles.activeFilter,
              ]}
              onPress={() => setFilterType('LP')}
              activeOpacity={0.7}
              testID="filter-button-lp"
            >
              <Text
                style={[
                  mainStyles.filterButtonText,
                  filterType === 'LP' && mainStyles.activeFilterText,
                ]}
              >
                LP
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={mainStyles.filterLabel}>Filter by Availability:</Text>
          <TouchableOpacity
            style={mainStyles.availabilityToggle}
            onPress={() =>
              setAvailabilityFilter(
                availabilityFilter === 'ALL' ? 'AVAILABLE' : 'ALL'
              )
            }
            activeOpacity={0.7}
            testID="availability-toggle"
          >
            <Text style={mainStyles.toggleText}>
              {availabilityFilter === 'ALL' ? 'All' : 'Available Only'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Bar */}
        <View style={mainStyles.summaryBar}>
          <Text style={mainStyles.summaryText}>
            SP: {availableCount.SP}/{totalCount.SP} | MP:{' '}
            {availableCount.MP}/{totalCount.MP} | LP: {availableCount.LP}/
            {totalCount.LP}
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity style={mainStyles.createButton} onPress={openCreateModal} activeOpacity={0.7} testID="add-slot-button">
          <Text style={mainStyles.createButtonText}>+ Create New Slot</Text>
        </TouchableOpacity>

        {/* Slots Grid */}
        {loading ? (
          <View style={mainStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" testID="loading-indicator" />
            <Text style={mainStyles.loadingText}>Loading slots...</Text>
          </View>
        ) : filteredSlots.length === 0 ? (
          <View style={mainStyles.noSlots} testID="empty-state">
            <Text style={mainStyles.noSlotsText}>No slots found</Text>
          </View>
        ) : (
          <View style={mainStyles.slotsGrid}>
            {filteredSlots.map((slot) => (
              <View key={slot.id} style={mainStyles.slotGridItem}>
                {renderSlot({ item: slot })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal - Completely recreated */}
      <EditSlotModal
        key={modalKey}
        visible={modalVisible}
        editingSlot={editingSlot}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        onCancel={closeModal}
        saving={saving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        slotLabel={selectedSlot?.slot_label || ''}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        saving={saving}
      />
    </View>
  );
}

// ============================================================================
// EDIT SLOT MODAL COMPONENT
// ============================================================================

interface EditSlotModalProps {
  visible: boolean;
  editingSlot: ParkingSlot | null;
  formData: {
    slot_label: string;
    slot_type: 'SP' | 'MP' | 'LP';
    distances: number[];
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    slot_label: string;
    slot_type: 'SP' | 'MP' | 'LP';
    distances: number[];
  }>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const EditSlotModal: React.FC<EditSlotModalProps> = ({
  visible,
  editingSlot,
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={modalStyles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={modalStyles.modalContainer}
        >
          <View style={modalStyles.modalCard} testID="slot-modal">
            {/* Header */}
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>
                {editingSlot ? 'Edit Slot' : 'Create New Slot'}
              </Text>
              <TouchableOpacity
                onPress={onCancel}
                style={modalStyles.closeButton}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={modalStyles.modalScroll}
              contentContainerStyle={modalStyles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Slot Label Input */}
              <View style={modalStyles.fieldContainer}>
                <Text style={modalStyles.fieldLabel}>Slot Label:</Text>
                <Text style={modalStyles.fieldHint}>Unique identifier for this parking slot</Text>
                <TextInput
                  style={modalStyles.textInput}
                  value={formData.slot_label}
                  onChangeText={(text) => setFormData({ ...formData, slot_label: text })}
                  placeholder="e.g., SP-1, MP-2, LP-3"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  testID="slot-number-input"
                />
              </View>

              {/* Slot Type Selection */}
              <View style={modalStyles.fieldContainer}>
                <Text style={modalStyles.fieldLabel}>Slot Type</Text>
                <Text style={modalStyles.fieldHint}>Select the size of vehicles this slot can accommodate</Text>
                <View style={modalStyles.slotTypeContainer}>
                  {(['SP', 'MP', 'LP'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        modalStyles.slotTypeButton,
                        formData.slot_type === type && modalStyles.slotTypeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, slot_type: type })}
                      activeOpacity={0.7}
                      testID={`slot-type-picker-${type.toLowerCase()}`}
                    >
                      <View style={modalStyles.slotTypeButtonContent}>
                        <Text style={modalStyles.slotTypeCode}>{type}</Text>
                        <Text style={modalStyles.slotTypeName}>
                          {type === 'SP' ? 'Small' : type === 'MP' ? 'Medium' : 'Large'}
                        </Text>
                      </View>
                      {formData.slot_type === type && (
                        <View style={modalStyles.checkmark}>
                          <Text style={modalStyles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Distance Inputs */}
              <View style={modalStyles.fieldContainer}>
                <Text style={modalStyles.fieldLabel}>Distances from Entry Points</Text>
                <Text style={modalStyles.fieldHint}>Distance in meters from each entry point</Text>
                <View style={modalStyles.distancesContainer}>
                  {[
                    { index: 0, label: 'Entry Point A', icon: '🚪' },
                    { index: 1, label: 'Entry Point B', icon: '🚪' },
                    { index: 2, label: 'Entry Point C', icon: '🚪' },
                  ].map(({ index, label, icon }) => (
                    <View key={index} style={modalStyles.distanceField}>
                      <View style={modalStyles.distanceLabelRow}>
                        <Text style={modalStyles.distanceIcon}>{icon}</Text>
                        <Text style={modalStyles.distanceLabel}>{label}</Text>
                      </View>
                      <View style={modalStyles.distanceInputWrapper}>
                        <TextInput
                          style={modalStyles.distanceInput}
                          value={formData.distances[index]?.toString() || ''}
                          onChangeText={(text) => {
                            const newDistances = [...formData.distances];
                            newDistances[index] = parseInt(text) || 0;
                            setFormData({ ...formData, distances: newDistances });
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#999"
                          testID={`distance-input-${index}`}
                        />
                        <Text style={modalStyles.distanceUnit}>m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={modalStyles.modalFooter}>
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
                disabled={saving}
                testID="cancel-slot-button"
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.saveButton,
                  saving && modalStyles.saveButtonDisabled,
                ]}
                onPress={onSave}
                activeOpacity={0.7}
                disabled={saving || !formData.slot_label.trim()}
                testID="save-slot-button"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={modalStyles.saveButtonText}>
                    {editingSlot ? 'Save Changes' : 'Create Slot'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ============================================================================
// DELETE CONFIRMATION MODAL COMPONENT
// ============================================================================

interface DeleteConfirmationModalProps {
  visible: boolean;
  slotLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  slotLabel,
  onConfirm,
  onCancel,
  saving,
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={modalStyles.modalBackdrop}>
        <View style={modalStyles.confirmCard} testID="delete-confirmation-modal">
          <View style={modalStyles.confirmIconContainer}>
            <Text style={modalStyles.confirmIcon}>⚠️</Text>
          </View>
          <Text style={modalStyles.confirmTitle}>Delete Slot?</Text>
          <Text style={modalStyles.confirmText}>
            Are you sure you want to delete slot <Text style={modalStyles.confirmSlotLabel}>{slotLabel}</Text>?
          </Text>
          <Text style={modalStyles.confirmWarning}>This action cannot be undone.</Text>

          <View style={modalStyles.confirmButtons}>
            <TouchableOpacity
              style={modalStyles.confirmCancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
              disabled={saving}
              testID="cancel-delete-button"
            >
              <Text style={modalStyles.confirmCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.confirmDeleteButton}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={saving}
              testID="confirm-delete-button"
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={modalStyles.confirmDeleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// MODAL STYLES
// ============================================================================

const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 450,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 450,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  fieldHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  slotTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  slotTypeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 12,
    position: 'relative',
  },
  slotTypeButtonActive: {
    backgroundColor: '#f0f7ff',
    borderColor: '#667eea',
  },
  slotTypeButtonContent: {
    alignItems: 'center',
  },
  slotTypeCode: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  slotTypeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  distancesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
  },
  distanceField: {
    marginBottom: 16,
  },
  distanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  distanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  distanceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  distanceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  distanceUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#495057',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '85%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff3cd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmIcon: {
    fontSize: 32,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  confirmSlotLabel: {
    fontWeight: '700',
    color: '#667eea',
  },
  confirmWarning: {
    fontSize: 13,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#495057',
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmDeleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

// ============================================================================
// MAIN STYLES
// ============================================================================

const mainStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 16,
  },
  filterBar: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 10,
    marginBottom: 10,
  },
  activeFilter: {
    borderColor: '#667eea',
    backgroundColor: '#e8f0f8',
  },
  filterButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#667eea',
    fontWeight: '700',
  },
  availabilityToggle: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  toggleText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  summaryBar: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotGridItem: {
    width: '48%',
    marginBottom: 15,
  },
  slotCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    overflow: 'hidden',
  },
  occupiedCard: {
    opacity: 0.7,
  },
  slotHeader: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  slotTypeBadge: {
    padding: 5,
    borderRadius: 5,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  slotDetails: {
    padding: 15,
  },
  statusBadge: {
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  available: {
    backgroundColor: '#dcfce7',
  },
  occupied: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  availableText: {
    color: '#16a34a',
  },
  occupiedText: {
    color: '#dc2626',
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#667eea',
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
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
});

export default SlotsManagement;