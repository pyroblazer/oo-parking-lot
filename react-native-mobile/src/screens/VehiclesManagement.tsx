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
} from 'react-native';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  ApiError,
} from '../api/parkingApi';
import type { Vehicle, ScreenProps } from '../types';

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

// Helper function to get vehicle type colors
function getVehicleTypeColor(vehicleType: string) {
  switch (vehicleType) {
    case 'S':
      return {
        backgroundColor: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#16a34a',
      };
    case 'M':
      return {
        backgroundColor: '#dbeafe',
        borderColor: '#1e40af',
        textColor: '#1e40af',
      };
    case 'L':
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

// Helper function to get vehicle type label
function getVehicleTypeLabel(vehicleType: string): string {
  switch (vehicleType) {
    case 'S':
      return 'Small';
    case 'M':
      return 'Medium';
    case 'L':
      return 'Large';
    default:
      return vehicleType;
  }
}

interface VehiclesManagementProps extends ScreenProps<{}> {}

function VehiclesManagement({ navigation: _navigation }: VehiclesManagementProps): React.JSX.Element {
  // State for vehicles list
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const _perPage = 20;
  const [total, setTotal] = useState(0);

  // Filter state
  const [filterType, setFilterType] = useState<'ALL' | 'S' | 'M' | 'L'>('ALL');

  // Modal state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form data state
  const [formData, setFormData] = useState<{
    license_plate: string;
    vehicle_type: 'S' | 'M' | 'L';
    color?: string;
    brand?: string;
    model?: string;
    year?: string;
  }>({
    license_plate: '',
    vehicle_type: 'S',
    color: '',
    brand: '',
    model: '',
    year: '',
  });

  // Load vehicles function
  const loadVehicles = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const data = await listVehicles(page, _perPage);
      setVehicles(data.vehicles);
      setTotal(data.total);
      setLoading(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  }, [page]);

  // Load vehicles on mount and set up auto-refresh
  useEffect(() => {
    loadVehicles();
    const interval = setInterval(() => {
      loadVehicles();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, [loadVehicles]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (filterType !== 'ALL' && vehicle.vehicle_type !== filterType) {
      return false;
    }
    return true;
  });

  // Calculate vehicle counts
  const totalCount = {
    S: vehicles.filter((v) => v.vehicle_type === 'S').length,
    M: vehicles.filter((v) => v.vehicle_type === 'M').length,
    L: vehicles.filter((v) => v.vehicle_type === 'L').length,
  };

  // Modal handlers
  const openCreateModal = (): void => {
    setEditingVehicle(null);
    setFormData({
      license_plate: '',
      vehicle_type: 'S',
      color: '',
      brand: '',
      model: '',
      year: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (vehicle: Vehicle): void => {
    setEditingVehicle(vehicle);
    setFormData({
      license_plate: vehicle.license_plate,
      vehicle_type: vehicle.vehicle_type,
      color: vehicle.color || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year ? vehicle.year.toString() : '',
    });
    setModalVisible(true);
  };

  const closeModal = (): void => {
    setModalVisible(false);
    setEditingVehicle(null);
    setFormData({
      license_plate: '',
      vehicle_type: 'S',
      color: '',
      brand: '',
      model: '',
      year: '',
    });
  };

  const openDeleteModal = (vehicle: Vehicle): void => {
    setSelectedVehicle(vehicle);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = (): void => {
    setDeleteModalVisible(false);
    setSelectedVehicle(null);
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.license_plate.trim()) {
      Alert.alert('Validation Error', 'License plate is required');
      return false;
    }
    if (formData.year && (isNaN(parseInt(formData.year)) || parseInt(formData.year) < 1900 || parseInt(formData.year) > new Date().getFullYear() + 1)) {
      Alert.alert('Validation Error', 'Please enter a valid year');
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
      const vehicleData: {
        license_plate: string;
        vehicle_type: 'S' | 'M' | 'L';
        color?: string;
        brand?: string;
        model?: string;
        year?: number;
      } = {
        license_plate: formData.license_plate,
        vehicle_type: formData.vehicle_type,
      };

      if (formData.color) vehicleData.color = formData.color;
      if (formData.brand) vehicleData.brand = formData.brand;
      if (formData.model) vehicleData.model = formData.model;
      if (formData.year) vehicleData.year = parseInt(formData.year);

      if (editingVehicle) {
        // Update existing vehicle
        await updateVehicle(editingVehicle.id, vehicleData);
        Alert.alert('Success', 'Vehicle updated successfully');
      } else {
        // Create new vehicle
        await createVehicle(vehicleData);
        Alert.alert('Success', 'Vehicle created successfully');
      }
      closeModal();
      await loadVehicles();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!selectedVehicle) {
      return;
    }

    setSaving(true);
    try {
      await deleteVehicle(selectedVehicle.id);
      Alert.alert('Success', 'Vehicle deleted successfully');
      closeDeleteModal();
      await loadVehicles();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Render vehicle card
  const renderVehicle = (vehicle: Vehicle): React.JSX.Element => {
    const colors = getVehicleTypeColor(vehicle.vehicle_type);
    return (
      <TouchableOpacity
        style={[
          styles.vehicleCard,
          { borderColor: colors.borderColor },
        ]}
        onPress={() => openEditModal(vehicle)}
        testID="vehicle-item"
      >
        <View style={[styles.vehicleHeader, { backgroundColor: colors.backgroundColor }]}>
          <Text style={[styles.licensePlate, { color: colors.textColor }]}>
            {vehicle.license_plate}
          </Text>
          <View style={[styles.vehicleTypeBadge, { backgroundColor: colors.borderColor }]}>
            <Text style={styles.badgeText}>{getVehicleTypeLabel(vehicle.vehicle_type)}</Text>
          </View>
        </View>
        <View style={styles.vehicleDetails}>
          {vehicle.brand && (
            <Text style={styles.detailText}>Brand: {vehicle.brand}</Text>
          )}
          {vehicle.model && (
            <Text style={styles.detailText}>Model: {vehicle.model}</Text>
          )}
          {vehicle.year && (
            <Text style={styles.detailText}>Year: {vehicle.year}</Text>
          )}
          {vehicle.color && (
            <Text style={styles.detailText}>Color: {vehicle.color}</Text>
          )}
          {vehicle.is_frequent && (
            <View style={styles.frequentBadge}>
              <Text style={styles.frequentText}>⭐ Frequent</Text>
            </View>
          )}
          <View style={styles.stats}>
            <Text style={styles.statText}>Sessions: {vehicle.total_sessions}</Text>
            <Text style={styles.statText}>Total: ₱{vehicle.total_spent.toFixed(2)}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditModal(vehicle)}
              testID="edit-vehicle-button"
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => openDeleteModal(vehicle)}
              testID="delete-vehicle-button"
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} testID="vehicles-management-page">
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.title} testID="vehicles-title">🚗 Vehicles Management</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox} testID="error-message">
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Filter Bar */}
        <View style={styles.filterBar} testID="filter-bar">
          <Text style={styles.filterLabel}>Filter by Type:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'ALL' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('ALL')}
              testID="filter-all"
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
                filterType === 'S' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('S')}
              testID="filter-small"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'S' && styles.activeFilterText,
                ]}
              >
                Small
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'M' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('M')}
              testID="filter-medium"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'M' && styles.activeFilterText,
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'L' && styles.activeFilter,
              ]}
              onPress={() => setFilterType('L')}
              testID="filter-large"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === 'L' && styles.activeFilterText,
                ]}
              >
                Large
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Bar */}
        <View style={styles.summaryBar} testID="summary-bar">
          <Text style={styles.summaryText}>
            Small: {totalCount.S} | Medium: {totalCount.M} | Large: {totalCount.L} | Total: {total}
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal} testID="create-vehicle-button">
          <Text style={styles.createButtonText}>+ Add New Vehicle</Text>
        </TouchableOpacity>

        {/* Vehicles List */}
        {loading ? (
          <View style={styles.loadingContainer} testID="loading-indicator">
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={styles.noVehicles} testID="empty-state">
            <Text style={styles.noVehiclesText}>No vehicles found</Text>
          </View>
        ) : (
          <View style={styles.vehiclesList}>
            {filteredVehicles.map((vehicle) => (
              <View key={vehicle.id} style={styles.vehicleGridItem}>
                {renderVehicle(vehicle)}
              </View>
            ))}
          </View>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
              onPress={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              testID="pagination-previous"
            >
              <Text style={styles.paginationButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationText}>Page {page}</Text>
            <TouchableOpacity
              style={[styles.paginationButton, page * _perPage >= total && styles.paginationButtonDisabled]}
              onPress={() => setPage(page + 1)}
              disabled={page * _perPage >= total}
              testID="pagination-next"
            >
              <Text style={styles.paginationButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView scrollEnabled showsVerticalScrollIndicator>
              <Text style={styles.modalTitle}>
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </Text>

              <Text style={styles.label}>License Plate:</Text>
              <TextInput
                style={styles.input}
                value={formData.license_plate}
                onChangeText={(text) =>
                  setFormData({ ...formData, license_plate: text.toUpperCase() })
                }
                placeholder="e.g., ABC-1234"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Vehicle Type:</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => setFormData({ ...formData, vehicle_type: 'S' })}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      formData.vehicle_type === 'S' && styles.radioSelected,
                    ]}
                  />
                  <Text style={styles.radioLabel}>Small (S)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => setFormData({ ...formData, vehicle_type: 'M' })}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      formData.vehicle_type === 'M' && styles.radioSelected,
                    ]}
                  />
                  <Text style={styles.radioLabel}>Medium (M)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => setFormData({ ...formData, vehicle_type: 'L' })}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      formData.vehicle_type === 'L' && styles.radioSelected,
                    ]}
                  />
                  <Text style={styles.radioLabel}>Large (L)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Brand (Optional):</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
                placeholder="e.g., Toyota"
              />

              <Text style={styles.label}>Model (Optional):</Text>
              <TextInput
                style={styles.input}
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
                placeholder="e.g., Corolla"
              />

              <Text style={styles.label}>Year (Optional):</Text>
              <TextInput
                style={styles.input}
                value={formData.year}
                onChangeText={(text) => setFormData({ ...formData, year: text })}
                placeholder="e.g., 2020"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Color (Optional):</Text>
              <TextInput
                style={styles.input}
                value={formData.color}
                onChangeText={(text) => setFormData({ ...formData, color: text })}
                placeholder="e.g., Red"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal} testID="cancel-vehicle-button">
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
                testID="save-vehicle-button"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
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
          <View style={styles.confirmCard} testID="delete-confirmation-modal">
            <Text style={styles.confirmTitle}>
              Delete Vehicle {selectedVehicle?.license_plate}?
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
                testID="confirm-delete-button"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Vehicle</Text>
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
  vehiclesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vehicleGridItem: {
    width: '48%',
    marginBottom: 15,
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    overflow: 'hidden',
  },
  vehicleHeader: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licensePlate: {
    fontSize: 18,
    fontWeight: '700',
  },
  vehicleTypeBadge: {
    padding: 5,
    borderRadius: 5,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  vehicleDetails: {
    padding: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  frequentBadge: {
    backgroundColor: '#fef3c7',
    padding: 5,
    borderRadius: 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  frequentText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
  noVehicles: {
    backgroundColor: '#f9f9f9',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  noVehiclesText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  paginationButton: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#64748b',
  },
  paginationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    flex: 1,
    overflow: 'hidden',
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
    backgroundColor: '#64748b',
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

export default VehiclesManagement;
