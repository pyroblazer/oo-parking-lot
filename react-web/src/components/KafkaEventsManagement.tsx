/**
 * Kafka Events Management Component
 *
 * Implements read-only operations for Kafka events
 */

import React, { useState, useEffect } from 'react';
import { listKafkaEvents, getKafkaEvent, getKafkaEventsByStatus, getKafkaEventsByType } from '../api';
import type { KafkaEvent } from '../types';

export default function KafkaEventsManagement(): JSX.Element {
  const [events, setEvents] = useState<KafkaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<KafkaEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'published' | 'failed' | 'retrying'>('all');
  const [filterEventType, setFilterEventType] = useState('');

  useEffect(() => {
    loadEvents();
  }, [currentPage, perPage, filterStatus, filterEventType]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      if (filterStatus !== 'all') {
        data = await getKafkaEventsByStatus(filterStatus, currentPage, perPage);
      } else if (filterEventType) {
        data = await getKafkaEventsByType(filterEventType, currentPage, perPage);
      } else {
        data = await listKafkaEvents(currentPage, perPage);
      }
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Kafka events');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (event: KafkaEvent) => {
    try {
      setLoading(true);
      setError(null);
      const details = await getKafkaEvent(event.id);
      setSelectedEvent(details);
      setShowDetailModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="kafka-events-management">
      <style>{`
        .kafka-events-management {
          min-height: 100vh;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 2rem 1rem;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
        }
        .alert {
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-left: 4px solid #dc2626;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          animation: slideIn 0.3s ease;
          position: relative;
          z-index: 100;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .alert-content {
          flex: 1;
        }
        .alert-title {
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 0.25rem;
        }
        .alert-message {
          color: #991b1b;
          font-size: 0.875rem;
        }
        .alert-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
          transition: color 0.2s;
        }
        .alert-dismiss:hover {
          color: #b91c1c;
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }
        .spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 3px solid #e5e7eb;
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .filter-bar {
          background: #ffffff;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .filter-label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }
        .filter-select {
          flex: 1;
          padding: 0.5rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          color: #1e293b;
          background: #ffffff;
        }
        .filter-select:focus {
          outline: none;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        .filter-input {
          flex: 1;
          padding: 0.5rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          color: #1e293b;
          background: #ffffff;
        }
        .filter-input:focus {
          outline: none;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        .filter-button {
          padding: 0.5rem 1rem;
          background: #1e40af;
          color: #ffffff;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .filter-button:hover {
          background: #1e3a8a;
        }
        .events-table-container {
          overflow-x: auto;
          background: #ffffff;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .events-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .events-table thead {
          background: #f1f5f9;
        }
        .events-table th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .events-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .events-table tbody tr:hover {
          background: #f8fafc;
        }
        .events-table td {
          padding: 0.75rem 1rem;
          color: #1e293b;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status-published {
          background: #dcfce7;
          color: #16a34a;
        }
        .status-failed {
          background: #fee2e2;
          color: #991b1b;
        }
        .status-retrying {
          background: #fde68a;
          color: #9a3412;
        }
        .pagination-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }
        .page-numbers {
          display: flex;
          gap: 0.25rem;
        }
        .page-number {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .page-number:hover {
          background: #f1f5f9;
        }
        .page-number.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal {
          background: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          animation: scaleIn 0.3s ease;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }
        .modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 1.5rem;
          line-height: 1;
          padding: 0;
          transition: color 0.2s;
        }
        .modal-close:hover {
          color: #dc2626;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-footer {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .detail-item {
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 0.375rem;
        }
        .detail-label {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
        .detail-value {
          font-size: 1rem;
          color: #1e293b;
          font-weight: 600;
        }
        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }
        .btn-secondary:hover {
          background: #e2e8f0;
        }
        @media (max-width: 640px) {
          .kafka-events-management {
            padding: 1rem 0.5rem;
          }
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Kafka Events</h1>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <span className="filter-label">Filter by Status:</span>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as 'all' | 'pending' | 'published' | 'failed' | 'retrying');
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>
          <span className="filter-label">Filter by Event Type:</span>
          <input
            type="text"
            className="filter-input"
            value={filterEventType}
            onChange={(e) => {
              setFilterEventType(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Enter event type..."
          />
          {filterEventType && (
            <button
              className="filter-button"
              onClick={() => {
                setFilterEventType('');
                setCurrentPage(1);
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert">
            <div className="alert-content">
              <div className="alert-title">Error</div>
              <div className="alert-message">{error}</div>
            </div>
            <button className="alert-dismiss" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        )}

        {/* Events Table */}
        {!loading && events.length > 0 && (
          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Event Type</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Partition</th>
                  <th>Offset</th>
                  <th>Occurred At</th>
                  <th>Published At</th>
                  <th>Retry Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr 
                    key={event.id} 
                    className="event-row"
                    onClick={() => viewDetails(event)}
                  >
                    <td>{event.id}</td>
                    <td>{event.event_type}</td>
                    <td>{event.topic}</td>
                    <td>
                      <span className={`status-badge status-${event.status}`}>
                        {event.status}
                      </span>
                    </td>
                    <td>{event.partition}</td>
                    <td>{event.offset || 'N/A'}</td>
                    <td>{new Date(event.occurred_at).toLocaleString()}</td>
                    <td>{event.published_at ? new Date(event.published_at).toLocaleString() : 'N/A'}</td>
                    <td>{event.retry_count}</td>
                    <td>
                      <button className="btn btn-secondary">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#f8fafc', borderRadius: '0.5rem' }}>
            No Kafka events found
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`page-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Per Page Selector */}
        <div className="filter-bar">
          <span className="filter-label">Per page:</span>
          <select
            className="filter-select"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Kafka Event #{selectedEvent.id}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Event ID</div>
                  <div className="detail-value">{selectedEvent.id}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Event Type</div>
                  <div className="detail-value">{selectedEvent.event_type}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Topic</div>
                  <div className="detail-value">{selectedEvent.topic}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Partition</div>
                  <div className="detail-value">{selectedEvent.partition}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Offset</div>
                  <div className="detail-value">{selectedEvent.offset || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    <span className={`status-badge status-${selectedEvent.status}`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Retry Count</div>
                  <div className="detail-value">{selectedEvent.retry_count}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Occurred At</div>
                  <div className="detail-value">{new Date(selectedEvent.occurred_at).toLocaleString()}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Published At</div>
                  <div className="detail-value">{selectedEvent.published_at ? new Date(selectedEvent.published_at).toLocaleString() : 'N/A'}</div>
                </div>
                {selectedEvent.error_message && (
                  <div className="detail-item">
                    <div className="detail-label">Error Message</div>
                    <div className="detail-value" style={{ color: '#dc2626' }}>
                      {selectedEvent.error_message}
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <div className="detail-label">Event Key</div>
                  <div className="detail-value">{selectedEvent.event_key || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Correlation ID</div>
                  <div className="detail-value">{selectedEvent.correlation_id || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Causation ID</div>
                  <div className="detail-value">{selectedEvent.causation_id || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Idempotency Key</div>
                  <div className="detail-value">{selectedEvent.idempotency_key || 'N/A'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
