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
  RefreshControl,
} from 'react-native';
import {
  listEntryPoints,
  createEntryPoint,
  updateEntryPoint,
  deleteEntryPoint,
  ApiError,
} from '../api/parkingApi';
import type { EntryPoint, ScreenProps } from '../types';

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

interface EntryPointsManagementProps extends ScreenProps<{}> {}

function EntryPointsManagement({ navigation: _navigation }: EntryPointsManagementProps): React.JSX.Element {
  // State for entry points list
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [editingEntryPoint, setEditingEntryPoint] = useState<EntryPoint | null>(null);
  const [selectedEntryPoint, setSelectedEntryPoint] = useState<EntryPoint | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form data state
  const [formData, setFormData] = useState<{
    identifier: string;
    name: string;
  }>({
    identifier: '',
    name: '',
  });

  // Load entry points on mount and set up auto-refresh
  useEffect(() => {
    loadEntryPoints();
    const interval = setInterval(() => {
      loadEntryPoints();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const loadEntryPoints = async (): Promise<void> => {
    try {
      setError(null);
      const data = await listEntryPoints();
      setEntryPoints(data);
      setLoading(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadEntryPoints();
    setRefreshing(false);
  };

  // Modal handlers
  const openCreateModal = (): void => {
    setEditingEntryPoint(null);
    setFormData({
      identifier: '',
      name: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (entryPoint: EntryPoint): void => {
    setEditingEntryPoint(entryPoint);
    setFormData({
      identifier: entryPoint.identifier,
      name: entryPoint.name,
    });
    setModalVisible(true);
  };

  const closeModal = (): void => {
    setModalVisible(false);
    setEditingEntryPoint(null);
    setFormData({
      identifier: '',
      name: '',
    });
  };

  const openDeleteModal = (entryPoint: EntryPoint): void => {
    setSelectedEntryPoint(entryPoint);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = (): void => {
    setDeleteModalVisible(false);
    setSelectedEntryPoint(null);
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.identifier.trim()) {
      Alert.alert('Validation Error', 'Identifier is required');
      return false;
    }
    if (formData.identifier.length !== 1) {
      Alert.alert('Validation Error', 'Identifier must be a single character');
      return false;
    }
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
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
      if (editingEntryPoint) {
        // Update existing entry point
        await updateEntryPoint(
          editingEntryPoint.id,
          formData.name
        );
        Alert.alert('Success', 'Entry point updated successfully');
      } else {
        // Create new entry point
        await createEntryPoint(
          formData.identifier,
          formData.name
        );
        Alert.alert('Success', 'Entry point created successfully');
      }
      closeModal();
      await loadEntryPoints();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!selectedEntryPoint) {
      return;
    }

    setSaving(true);
    try {
      await deleteEntryPoint(selectedEntryPoint.id);
      Alert.alert('Success', 'Entry point deleted successfully');
      closeDeleteModal();
      await loadEntryPoints();
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container} testID="entry-points-management-page">
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.title}>🚪 Entry Points Management</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox} testID="error-message">
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Add Entry Point Button */}
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal} testID="add-entry-point-button">
          <Text style={styles.addButtonText}>+ Add Entry Point</Text>
        </TouchableOpacity>

        {/* Minimum 3 entry points warning */}
        {entryPoints.length < 3 && (
          <View style={styles.warningBanner} testID="min-entry-points-warning">
            <Text style={styles.warningText}>
              ⚠️ Minimum 3 entry points required for proper parking system operation
            </Text>
          </View>
        )}

        {/* Entry Points List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" testID="loading-indicator" />
            <Text style={styles.loadingText}>Loading entry points...</Text>
          </View>
        ) : entryPoints.length === 0 ? (
          <View style={styles.noEntryPoints} testID="empty-state">
            <Text style={styles.noEntryPointsText}>
              No entry points found. Add your first entry point to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.entryPointsList}>
            {entryPoints.map((entryPoint) => (
              <View key={entryPoint.id} style={styles.entryPointCard} testID="entry-point-item">
                <View style={styles.identifierBadge}>
                  <Text style={styles.identifierText} testID="entry-point-identifier">{entryPoint.identifier}</Text>
                </View>
                <View style={styles.entryPointInfo}>
                  <Text style={styles.entryPointName} testID="entry-point-name">{entryPoint.name}</Text>
                  <Text style={styles.entryPointId} testID="entry-point-id">ID: {entryPoint.id}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(entryPoint)}
                    activeOpacity={0.7}
                    testID="edit-entry-point-button"
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => openDeleteModal(entryPoint)}
                    activeOpacity={0.7}
                    testID="delete-entry-point-button"
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop} testID="entry-point-modal">
          <View style={styles.modalCard}>
            <ScrollView scrollEnabled showsVerticalScrollIndicator>
              <Text style={styles.modalTitle}>
                {editingEntryPoint ? 'Edit Entry Point' : 'Add Entry Point'}
              </Text>

              <Text style={styles.label}>Identifier:</Text>
              <TextInput
                style={styles.input}
                value={formData.identifier}
                onChangeText={(text) =>
                  setFormData({ ...formData, identifier: text.toUpperCase() })
                }
                placeholder="A"
                maxLength={1}
                autoCapitalize="characters"
                editable={!editingEntryPoint}
                testID="entry-point-identifier-input"
              />

              <Text style={styles.label}>Name:</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Main Entrance"
                testID="entry-point-name-input"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal} testID="cancel-entry-point-button">
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={saving}
                testID="save-entry-point-button"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingEntryPoint ? 'Save Changes' : 'Create Entry Point'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop} testID="delete-confirmation-modal">
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              Delete Entry Point {selectedEntryPoint?.identifier} ({selectedEntryPoint?.name})?
            </Text>
            <Text style={styles.confirmText}>
              ⚠️ Deleting an entry point may affect slot distance calculations.
            </Text>
            <Text style={styles.confirmSubtext}>This action cannot be undone.</Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeDeleteModal}
                testID="cancel-delete-button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
                activeOpacity={0.7}
                disabled={saving}
                testID="confirm-delete-button"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Entry Point</Text>
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
  addButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  warningBanner: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
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
  noEntryPoints: {
    backgroundColor: '#f9f9f9',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  noEntryPointsText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  entryPointsList: {
    marginTop: 10,
  },
  entryPointCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  identifierBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  identifierText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  entryPointInfo: {
    flex: 1,
  },
  entryPointName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  entryPointId: {
    fontSize: 14,
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    color: 'white',
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
    color: '#dc2626',
    marginBottom: 5,
  },
  confirmSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EntryPointsManagement;
