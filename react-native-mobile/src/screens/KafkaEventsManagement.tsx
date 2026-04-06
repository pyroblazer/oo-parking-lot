import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  listKafkaEvents,
  getKafkaEvent,
  getKafkaEventsByStatus,
  getKafkaEventsByType,
  ApiError,
} from '../api/parkingApi';
import type { KafkaEvent, ScreenProps } from '../types';

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

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Helper function to get status color
function getStatusColor(status: string): { backgroundColor: string; textColor: string } {
  switch (status) {
    case 'published':
      return { backgroundColor: '#dcfce7', textColor: '#16a34a' };
    case 'failed':
      return { backgroundColor: '#fee2e2', textColor: '#dc2626' };
    case 'retrying':
      return { backgroundColor: '#fef3c7', textColor: '#92400e' };
    case 'pending':
    default:
      return { backgroundColor: '#dbeafe', textColor: '#1e40af' };
  }
}

// Helper function to get status label
function getStatusLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Published';
    case 'failed':
      return 'Failed';
    case 'retrying':
      return 'Retrying';
    case 'pending':
    default:
      return 'Pending';
  }
}

interface KafkaEventsManagementProps extends ScreenProps<{}> {}

function KafkaEventsManagement({
  navigation: _navigation,
}: KafkaEventsManagementProps): React.JSX.Element {
  // State for events list
  const [events, setEvents] = useState<KafkaEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const _perPage = 20;
  const [total, setTotal] = useState(0);

  // Detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<KafkaEvent | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'pending' | 'published' | 'failed' | 'retrying'>('ALL');
  const [filterEventType, setFilterEventType] = useState<string>('');

  // Load events function
  const loadEvents = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      let data;
      if (filterStatus !== 'ALL') {
        data = await getKafkaEventsByStatus(filterStatus as 'pending' | 'published' | 'failed' | 'retrying', page, _perPage);
        setEvents(data.events);
      } else if (filterEventType) {
        data = await getKafkaEventsByType(filterEventType, page, _perPage);
        setEvents(data.events);
      } else {
        data = await listKafkaEvents(page, _perPage);
        setEvents(data.events);
      }
      setTotal(data.total);
      setLoading(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  }, [page, filterStatus, filterEventType]);

  // Load events on mount and set up auto-refresh
  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => {
      loadEvents();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, [loadEvents]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  // Calculate counts
  const statusCounts = {
    pending: events.filter((e) => e.status === 'pending').length,
    published: events.filter((e) => e.status === 'published').length,
    failed: events.filter((e) => e.status === 'failed').length,
    retrying: events.filter((e) => e.status === 'retrying').length,
  };

  // Modal handlers
  const openDetailModal = async (event: KafkaEvent): Promise<void> => {
    setSelectedEvent(event);
    setLoadingDetail(true);
    setDetailModalVisible(true);

    try {
      const detail = await getKafkaEvent(event.id);
      setSelectedEvent(detail);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = (): void => {
    setDetailModalVisible(false);
    setSelectedEvent(null);
  };

  // Render event card
  const renderEventCard = (event: KafkaEvent): React.JSX.Element => {
    const statusColors = getStatusColor(event.status);
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => openDetailModal(event)}
        testID="kafka-event-item"
      >
        <View style={styles.eventHeader}>
          <Text style={styles.eventType}>{event.event_type}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusColors.textColor }]}>
              {getStatusLabel(event.status)}
            </Text>
          </View>
        </View>
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event ID:</Text>
            <Text style={styles.detailValue}>{event.event_id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Topic:</Text>
            <Text style={styles.detailValue}>{event.topic}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Partition:</Text>
            <Text style={styles.detailValue}>{event.partition}</Text>
          </View>
          {event.offset !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Offset:</Text>
              <Text style={styles.detailValue}>{event.offset}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Occurred At:</Text>
            <Text style={styles.detailValue}>{formatDate(event.occurred_at)}</Text>
          </View>
          {event.retry_count > 0 && (
            <View style={styles.retryBadge}>
              <Text style={styles.retryText}>Retries: {event.retry_count}</Text>
            </View>
          )}
          {event.error_message && (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>⚠️ Error</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} testID="kafka-events-page">
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.title} testID="kafka-title">📨 Kafka Events</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox} testID="error-message">
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Filter Bar */}
        <View style={styles.filterBar} testID="filter-bar">
          <Text style={styles.filterLabel}>Filter by Status:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'ALL' && styles.activeFilter,
              ]}
              onPress={() => setFilterStatus('ALL')}
              testID="filter-all"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === 'ALL' && styles.activeFilterText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'pending' && styles.activeFilter,
              ]}
              onPress={() => setFilterStatus('pending')}
              testID="filter-pending"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === 'pending' && styles.activeFilterText,
                ]}
              >
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'published' && styles.activeFilter,
              ]}
              onPress={() => setFilterStatus('published')}
              testID="filter-published"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === 'published' && styles.activeFilterText,
                ]}
              >
                Published
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'failed' && styles.activeFilter,
              ]}
              onPress={() => setFilterStatus('failed')}
              testID="filter-failed"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === 'failed' && styles.activeFilterText,
                ]}
              >
                Failed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'retrying' && styles.activeFilter,
              ]}
              onPress={() => setFilterStatus('retrying')}
              testID="filter-retrying"
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === 'retrying' && styles.activeFilterText,
                ]}
              >
                Retrying
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Filter by Event Type:</Text>
          <View style={styles.filterInput}>
            <TextInput
              style={styles.input}
              value={filterEventType}
              onChangeText={setFilterEventType}
              placeholder="e.g., vehicle_parked"
              autoCapitalize="none"
              testID="event-type-filter-input"
            />
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFilterEventType('');
                setPage(1);
              }}
              testID="clear-filter-button"
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Bar */}
        <View style={styles.summaryBar} testID="summary-bar">
          <Text style={styles.summaryText}>
            Pending: {statusCounts.pending} | Published: {statusCounts.published} | Failed: {statusCounts.failed} | Retrying: {statusCounts.retrying} | Total: {total}
          </Text>
        </View>

        {/* Events List */}
        {loading ? (
          <View style={styles.loadingContainer} testID="loading-indicator">
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.noEvents} testID="empty-state">
            <Text style={styles.noEventsText}>No events found</Text>
          </View>
        ) : (
          <View style={styles.eventsList} testID="kafka-events-list">
            {events.map((event) => (
              <View key={event.id} style={styles.eventGridItem}>
                {renderEventCard(event)}
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

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="kafka-event-detail-modal">
            <Text style={styles.modalTitle}>Kafka Event Details</Text>

            {loadingDetail ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            ) : selectedEvent ? (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Event ID:</Text>
                    <Text style={styles.detailValue}>{selectedEvent.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Event Type:</Text>
                    <Text style={styles.detailValue}>{selectedEvent.event_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Topic:</Text>
                    <Text style={styles.detailValue}>{selectedEvent.topic}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedEvent.status).backgroundColor }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedEvent.status).textColor }]}>
                        {getStatusLabel(selectedEvent.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Retry Count:</Text>
                    <Text style={styles.detailValue}>{selectedEvent.retry_count}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Partition Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Partition:</Text>
                    <Text style={styles.detailValue}>{selectedEvent.partition}</Text>
                  </View>
                  {selectedEvent.offset !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Offset:</Text>
                      <Text style={styles.detailValue}>{selectedEvent.offset}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Timing</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Occurred At:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEvent.occurred_at)}</Text>
                  </View>
                  {selectedEvent.published_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Published At:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedEvent.published_at)}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created At:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEvent.created_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Updated At:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEvent.updated_at)}</Text>
                  </View>
                </View>

                {selectedEvent.error_message && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Error Information</Text>
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{selectedEvent.error_message}</Text>
                    </View>
                  </View>
                )}

                {selectedEvent.idempotency_key && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Tracking</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Idempotency Key:</Text>
                      <Text style={styles.detailValue}>{selectedEvent.idempotency_key}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Payload</Text>
                  <View style={styles.payloadBox}>
                    <Text style={styles.payloadText}>
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.closeButton} onPress={closeDetailModal} testID="close-modal-button">
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import { TextInput } from 'react-native';

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
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  clearButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 5,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  eventsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventGridItem: {
    width: '48%',
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  eventHeader: {
    backgroundColor: '#667eea',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventType: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  retryBadge: {
    backgroundColor: '#fef3c7',
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBadge: {
    backgroundColor: '#fee2e2',
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  errorBadgeText: {
    color: '#dc2626',
    fontSize: 12,
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
  noEvents: {
    backgroundColor: '#f9f9f9',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  noEventsText: {
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalContent: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 10,
  },
  payloadBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  payloadText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  closeButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

import { Platform } from 'react-native';

export default KafkaEventsManagement;
