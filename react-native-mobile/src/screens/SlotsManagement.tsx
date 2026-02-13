import React, { useState, useEffect } from 'react';
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
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  listSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  ApiError,
} from '../api/parkingApi';
import type { ParkingSlot, ScreenProps } from '../types';

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

  // Modal state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<ParkingSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

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

  // Load slots on mount and set up auto-refresh
  useEffect(() => {
    loadSlots();
    const interval = setInterval(() => {
      loadSlots();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSlots = async (): Promise<void> => {
    try {
      setError(null);
      const data = await listSlots();
      setSlots(data);
      setLoading(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadSlots();
    setRefreshing(false);
  };

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
  const openCreateModal = (): void => {
    setEditingSlot(null);
    setFormData({
      slot_label: '',
      slot_type: 'SP',
      distances: [0, 0, 0],
    });
    setModalVisible(true);
  };

  const openEditModal = (slot: ParkingSlot): void => {
    setEditingSlot(slot);
    setFormData({
      slot_label: slot.slot_label,
      slot_type: slot.slot_type,
      distances: slot.distances ? [...slot.distances] : [0, 0, 0],
    });
    setModalVisible(true);
  };

  const closeModal = (): void => {
    setModalVisible(false);
    setEditingSlot(null);
    setFormData({
      slot_label: '',
      slot_type: 'SP',
      distances: [0, 0, 0],
    });
  };

  const openDeleteModal = (slot: ParkingSlot): void => {
    setSelectedSlot(slot);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = (): void => {
    setDeleteModalVisible(false);
    setSelectedSlot(null);
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.slot_label.trim()) {
      Alert.alert('Validation Error', 'Slot label is required');
      return false;
    }
    if (formData.distances.some((d) => d < 0)) {
      Alert.alert('Validation Error', 'Distances must be positive numbers');
      return false;
    }
    return true;
  };

  // CRUD operations
  const handleSave = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingSlot) {
        // Update existing slot
        await updateSlot(
          editingSlot.id,
          formData.slot_label,
          formData.slot_type,
          formData.distances
        );
        Alert.alert('Success', 'Slot updated successfully');
      } else {
        // Create new slot
        await createSlot(
          formData.slot_label,
          formData.slot_type,
          formData.distances
        );
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
  };

  const confirmDelete = async (): Promise<void> => {
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
  };

  // Render slot card
  const renderSlot = ({ item }: { item: ParkingSlot }): React.JSX.Element => {
    const colors = getSlotTypeColor(item.slot_type);
    return (
      <TouchableOpacity
        style={[
          styles.slotCard,
          { borderColor: colors.borderColor },
          !item.available && styles.occupiedCard,
        ]}
        onPress={() => openEditModal(item)}
      >
        <View style={[styles.slotHeader, { backgroundColor: colors.backgroundColor }]}>
          <Text style={[styles.slotLabel, { color: colors.textColor }]}>
            {item.slot_label}
          </Text>
          <View style={[styles.slotTypeBadge, { backgroundColor: colors.borderColor }]}>
            <Text style={styles.badgeText}>{item.slot_type}</Text>
          </View>
        </View>
        <View style={styles.slotDetails}>
          <View
            style={[
              styles.statusBadge,
              item.available ? styles.available : styles.occupied,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.available ? styles.availableText : styles.occupiedText,
              ]}
            >
              {item.available ? 'Available' : 'Occupied'}
            </Text>
          </View>
          {item.distances && item.distances.length > 0 && (
            <Text style={styles.distanceText}>
              Distances: {item.distances.join(', ')}
            </Text>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => openDeleteModal(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.title}>🅿️ Slots Management</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Filter by Type:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'ALL' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('ALL')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'ALL' && styles.activeFilterText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'SP' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('SP')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'SP' && styles.activeFilterText,
                ]}
              >
                SP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'MP' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('MP')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'MP' && styles.activeFilterText,
                ]}
              >
                MP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'LP' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('LP')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'LP' && styles.activeFilterText,
                ]}
              >
                LP
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Filter by Availability:</Text>
          <TouchableOpacity
            style={styles.availabilityToggle}
            onPress={() =>
              setAvailabilityFilter(
                availabilityFilter === 'ALL' ? 'AVAILABLE' : 'ALL'
              )
            }
          >
            <Text style={styles.toggleText}>
              {availabilityFilter === 'ALL' ? 'All' : 'Available Only'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Bar */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            SP: {availableCount.SP}/{totalCount.SP} | MP:{' '}
            {availableCount.MP}/{totalCount.MP} | LP: {availableCount.LP}/
            {totalCount.LP}
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>+ Create New Slot</Text>
        </TouchableOpacity>

        {/* Slots Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading slots...</Text>
          </View>
        ) : filteredSlots.length === 0 ? (
          <View style={styles.noSlots}>
            <Text style={styles.noSlotsText}>No slots found</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {filteredSlots.map((slot) => (
              <View key={slot.id} style={styles.slotGridItem}>
                {renderSlot({ item: slot })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingSlot ? 'Edit Slot' : 'Create New Slot'}
            </Text>

            <Text style={styles.label}>Slot Label:</Text>
            <TextInput
              style={styles.input}
              value={formData.slot_label}
              onChangeText={(text) =>
                setFormData({ ...formData, slot_label: text })
              }
              placeholder="e.g., SP-5"
            />

            <Text style={styles.label}>Slot Type:</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setFormData({ ...formData, slot_type: 'SP' })}
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.slot_type === 'SP' && styles.radioSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>SP (Small)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setFormData({ ...formData, slot_type: 'MP' })}
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.slot_type === 'MP' && styles.radioSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>MP (Medium)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setFormData({ ...formData, slot_type: 'LP' })}
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.slot_type === 'LP' && styles.radioSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>LP (Large)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Distances to Entry Points:</Text>
            <Text style={styles.subLabel}>Distance from A:</Text>
            <TextInput
              style={styles.input}
              value={formData.distances[0]?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  distances: [
                    parseInt(text) || 0,
                    formData.distances[1] || 0,
                    formData.distances[2] || 0,
                  ],
                })
              }
              keyboardType="numeric"
            />
            <Text style={styles.subLabel}>Distance from B:</Text>
            <TextInput
              style={styles.input}
              value={formData.distances[1]?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  distances: [
                    formData.distances[0] || 0,
                    parseInt(text) || 0,
                    formData.distances[2] || 0,
                  ],
                })
              }
              keyboardType="numeric"
            />
            <Text style={styles.subLabel}>Distance from C:</Text>
            <TextInput
              style={styles.input}
              value={formData.distances[2]?.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  distances: [
                    formData.distances[0] || 0,
                    formData.distances[1] || 0,
                    parseInt(text) || 0,
                  ],
                })
              }
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingSlot ? 'Save Changes' : 'Create Slot'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              Delete Slot {selectedSlot?.slot_label}?
            </Text>
            <Text style={styles.confirmText}>
              This action cannot be undone.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeDeleteModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Slot</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  radioGroup: {
    marginBottom: 15,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default SlotsManagement;
