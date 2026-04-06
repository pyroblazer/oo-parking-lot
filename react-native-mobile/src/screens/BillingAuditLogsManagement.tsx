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
  listBillingAuditLogs,
  getBillingAuditLog,
  getBillingAuditLogsBySession,
  ApiError,
} from '../api/parkingApi';
import type { BillingAuditLog, ScreenProps } from '../types';

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

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2)}`;
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

interface BillingAuditLogsManagementProps extends ScreenProps<{}> {}

function BillingAuditLogsManagement({
  navigation: _navigation,
}: BillingAuditLogsManagementProps): React.JSX.Element {
  // State for audit logs list
  const [logs, setLogs] = useState<BillingAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const _perPage = 20;
  const [total, setTotal] = useState(0);

  // Detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<BillingAuditLog | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Filter by session state
  const [filterSessionId, setFilterSessionId] = useState<string>('');

  // Load audit logs function
  const loadAuditLogs = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      let data;
      if (filterSessionId) {
        data = await getBillingAuditLogsBySession(parseInt(filterSessionId), page, _perPage);
        setLogs(data.logs);
      } else {
        data = await listBillingAuditLogs(page, _perPage);
        setLogs(data.logs);
      }
      setTotal(data.total);
      setLoading(false);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  }, [page, filterSessionId]);

  // Load audit logs on mount and set up auto-refresh
  useEffect(() => {
    loadAuditLogs();
    const interval = setInterval(() => {
      loadAuditLogs();
    }, 60000); // Auto-refresh every 60 seconds

    return () => clearInterval(interval);
  }, [loadAuditLogs]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadAuditLogs();
    setRefreshing(false);
  };

  // Calculate totals
  const totalFees = logs.reduce((sum, log) => sum + log.total_fee, 0);
  const totalHours = logs.reduce((sum, log) => sum + log.duration_hours, 0);

  // Modal handlers
  const openDetailModal = async (log: BillingAuditLog): Promise<void> => {
    setSelectedLog(log);
    setLoadingDetail(true);
    setDetailModalVisible(true);

    try {
      const detail = await getBillingAuditLog(log.id);
      setSelectedLog(detail);
    } catch (err) {
      const errorMsg = extractErrorMessage(err);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = (): void => {
    setDetailModalVisible(false);
    setSelectedLog(null);
  };

  // Render audit log card
  const renderLogCard = (log: BillingAuditLog): React.JSX.Element => {
    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => openDetailModal(log)}
        testID="billing-log-item"
      >
        <View style={styles.logHeader}>
          <Text style={styles.logId}>Log #{log.id}</Text>
          <Text style={styles.logDate}>{formatDate(log.calculated_at)}</Text>
        </View>
        <View style={styles.logDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Session ID:</Text>
            <Text style={styles.detailValue}>{log.parking_session_id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle Type:</Text>
            <Text style={styles.detailValue}>{log.vehicle_type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Slot:</Text>
            <Text style={styles.detailValue}>{log.slot_label} ({log.slot_type})</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Entry Point:</Text>
            <Text style={styles.detailValue}>{log.entry_point}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{log.duration_hours.toFixed(2)} hour{log.duration_hours !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Total Fee:</Text>
            <Text style={styles.feeValue}>{formatCurrency(log.total_fee)}</Text>
          </View>
          {log.is_continuous && (
            <View style={styles.continuousBadge}>
              <Text style={styles.continuousText}>Continuous</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} testID="billing-audit-logs-page">
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.title} testID="billing-title">💰 Billing Audit Logs</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox} testID="error-message">
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Filter Bar */}
        <View style={styles.filterBar} testID="filter-bar">
          <Text style={styles.filterLabel}>Filter by Session ID:</Text>
          <View style={styles.filterInput}>
            <TextInput
              style={styles.input}
              value={filterSessionId}
              onChangeText={setFilterSessionId}
              placeholder="Enter session ID..."
              keyboardType="numeric"
              testID="filter-session-input"
            />
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFilterSessionId('');
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
            Total Logs: {logs.length} | Total Fees: {formatCurrency(totalFees)} | Total Hours: {totalHours.toFixed(2)}
          </Text>
        </View>

        {/* Logs List */}
        {loading ? (
          <View style={styles.loadingContainer} testID="loading-indicator">
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading audit logs...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.noLogs} testID="empty-state">
            <Text style={styles.noLogsText}>No audit logs found</Text>
          </View>
        ) : (
          <View style={styles.logsList} testID="billing-logs-list">
            {logs.map((log) => (
              <View key={log.id} style={styles.logGridItem}>
                {renderLogCard(log)}
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
          <View style={styles.modalCard} testID="billing-log-detail-modal">
            <Text style={styles.modalTitle}>Billing Audit Log Details</Text>

            {loadingDetail ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            ) : selectedLog ? (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Log ID:</Text>
                    <Text style={styles.detailValue}>{selectedLog.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Session ID:</Text>
                    <Text style={styles.detailValue}>{selectedLog.parking_session_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Calculated At:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedLog.calculated_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Billing Version:</Text>
                    <Text style={styles.detailValue}>{selectedLog.billing_version}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Vehicle & Slot</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle Type:</Text>
                    <Text style={styles.detailValue}>{selectedLog.vehicle_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Slot Label:</Text>
                    <Text style={styles.detailValue}>{selectedLog.slot_label}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Slot Type:</Text>
                    <Text style={styles.detailValue}>{selectedLog.slot_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entry Point:</Text>
                    <Text style={styles.detailValue}>{selectedLog.entry_point}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Timing</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Parked At:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedLog.parked_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exited At:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedLog.exited_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{selectedLog.duration_hours.toFixed(2)} hour{selectedLog.duration_hours !== 1 ? 's' : ''}</Text>
                  </View>
                  {selectedLog.is_continuous && (
                    <View style={styles.continuousBadge}>
                      <Text style={styles.continuousText}>Continuous Parking</Text>
                    </View>
                  )}
                  {selectedLog.base_start_time && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Base Start Time:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedLog.base_start_time)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Fee Breakdown</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Base Fee:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedLog.base_fee)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exceeding Hours:</Text>
                    <Text style={styles.detailValue}>{selectedLog.exceeding_hours}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exceeding Fee:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedLog.exceeding_fee)}</Text>
                  </View>
                  {selectedLog.long_term_days > 0 && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Long Term Days:</Text>
                        <Text style={styles.detailValue}>{selectedLog.long_term_days}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Long Term Fee:</Text>
                        <Text style={styles.detailValue}>{formatCurrency(selectedLog.long_term_fee)}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Total Fee:</Text>
                    <Text style={styles.feeValue}>{formatCurrency(selectedLog.total_fee)}</Text>
                  </View>
                </View>

                {selectedLog.fee_breakdown && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Base Fee:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(selectedLog.fee_breakdown.base_fee)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Exceeding Fee:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(selectedLog.fee_breakdown.exceeding_fee)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Long Term Fee:</Text>
                      <Text style={styles.detailValue}>{formatCurrency(selectedLog.fee_breakdown.long_term_fee)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{selectedLog.fee_breakdown.duration_hours.toFixed(2)} hour{selectedLog.fee_breakdown.duration_hours !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                )}

                {selectedLog.correlation_id && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Tracking</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Correlation ID:</Text>
                      <Text style={styles.detailValue}>{selectedLog.correlation_id}</Text>
                    </View>
                    {selectedLog.idempotency_key && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Idempotency Key:</Text>
                        <Text style={styles.detailValue}>{selectedLog.idempotency_key}</Text>
                      </View>
                    )}
                  </View>
                )}
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
  logsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  logGridItem: {
    width: '48%',
    marginBottom: 15,
  },
  logCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  logHeader: {
    backgroundColor: '#667eea',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logId: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  logDate: {
    color: 'white',
    fontSize: 12,
  },
  logDetails: {
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
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  feeValue: {
    fontSize: 18,
    color: '#16a34a',
    fontWeight: '700',
  },
  continuousBadge: {
    backgroundColor: '#fef3c7',
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  continuousText: {
    color: '#92400e',
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
  noLogs: {
    backgroundColor: '#f9f9f9',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  noLogsText: {
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

export default BillingAuditLogsManagement;
