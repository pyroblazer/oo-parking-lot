/**
 * Sessions Management Component
 * 
 * Displays parking sessions in a table format with pagination and filtering
 */

import { useState, useEffect } from 'react';
import { getAllSessions, deleteSession } from '../api';
import type { ParkingSession } from '../types';

export default function SessionsManagement(): JSX.Element {
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSessions();
      console.log('DEBUG: SessionsManagement - Raw sessions data:', data);
      console.log('DEBUG: SessionsManagement - First session entry_point:', data[0]?.entry_point);
      console.log('DEBUG: SessionsManagement - First session entry_point_id:', data[0]?.entry_point_id);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await deleteSession(sessionId);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'active') return session.is_active;
    if (filter === 'completed') return !session.is_active;
    return true;
  });

  const totalPages = Math.ceil(filteredSessions.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="sessions-management" data-testid="sessions-management">
      <div className="sessions-header">
        <h2 data-testid="sessions-title">Parking Sessions Management</h2>
        <div className="filter-buttons" data-testid="filter-buttons">
          <button
            className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('all')}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            className={filter === 'active' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('active')}
            data-testid="filter-active"
          >
            Active
          </button>
          <button
            className={filter === 'completed' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('completed')}
            data-testid="filter-completed"
          >
            Completed
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" data-testid="error-message">
          {error}
          <button className="close" onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      <div className="sessions-info-bar" data-testid="sessions-info-bar">
        <span data-testid="total-sessions">Showing {startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} of {filteredSessions.length} sessions</span>
        <div className="per-page-selector" data-testid="per-page-selector">
          <label htmlFor="per-page">Per page:</label>
          <select
            id="per-page"
            value={perPage}
            onChange={handlePerPageChange}
            data-testid="per-page-select"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading" data-testid="loading-indicator">Loading...</div>
      ) : paginatedSessions.length === 0 ? (
        <div className="empty-state" data-testid="empty-state">
          No sessions found
        </div>
      ) : (
        <div className="sessions-table-container">
          <table className="sessions-table" data-testid="sessions-table">
            <thead>
              <tr>
                <th data-testid="header-session-id">Session ID</th>
                <th data-testid="header-vehicle-type">Vehicle Type</th>
                <th data-testid="header-slot">Slot</th>
                <th data-testid="header-entry-point">Entry Point</th>
                <th data-testid="header-parked-at">Parked At</th>
                <th data-testid="header-exited-at">Exited At</th>
                <th data-testid="header-status">Status</th>
                <th data-testid="header-duration">Duration</th>
                <th data-testid="header-fee">Fee</th>
                <th data-testid="header-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSessions.map((session) => (
                <tr 
                  key={session.session_id} 
                  className="session-row"
                  data-testid={`session-row-${session.session_id}`}
                  onClick={() => window.location.href = `/session/${session.session_id}`}
                >
                  <td data-testid={`session-id-${session.session_id}`}>
                    {session.session_id}
                  </td>
                  <td data-testid={`vehicle-type-${session.session_id}`}>
                    <span className={`vehicle-type-badge vehicle-type-${session.vehicle_type.toLowerCase()}`} data-testid={`vehicle-badge-${session.session_id}`}>
                      {session.vehicle_type}
                    </span>
                  </td>
                  <td data-testid={`slot-${session.session_id}`}>
                    {session.parking_slot?.slot_label || 'N/A'}
                  </td>
                  <td data-testid={`entry-point-${session.session_id}`}>
                    {session.entry_point?.identifier || session.entry_point_id?.toString() || 'N/A'}
                  </td>
                  <td data-testid={`parked-at-${session.session_id}`}>
                    {new Date(session.parked_at).toLocaleString()}
                  </td>
                  <td data-testid={`exited-at-${session.session_id}`}>
                    {session.exited_at ? new Date(session.exited_at).toLocaleString() : 'N/A'}
                  </td>
                  <td data-testid={`status-${session.session_id}`}>
                    <span className={`status-badge status-${session.is_active ? 'active' : 'completed'}`} data-testid={`status-badge-${session.session_id}`}>
                      {session.is_active ? 'Active' : 'Completed'}
                    </span>
                  </td>
                  <td data-testid={`duration-${session.session_id}`}>
                    {session.duration_hours ? `${session.duration_hours} hours` : 'N/A'}
                  </td>
                  <td data-testid={`fee-${session.session_id}`}>
                    {session.total_fee ? `₱${session.total_fee.toFixed(2)}` : 'N/A'}
                  </td>
                  <td data-testid={`actions-${session.session_id}`}>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/session/${session.session_id}`;
                      }}
                      data-testid={`view-button-${session.session_id}`}
                    >
                      View
                    </button>
                    {!session.is_active && (
                      <button
                        className="btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.session_id);
                        }}
                        data-testid={`delete-button-${session.session_id}`}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls" data-testid="pagination-controls">
          <button
            className="btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            data-testid="pagination-previous"
          >
            Previous
          </button>
          <div className="page-numbers" data-testid="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-number ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
                data-testid={`page-${page}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            className="btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            data-testid="pagination-next"
          >
            Next
          </button>
        </div>
      )}

      <div className="auto-refresh-indicator" data-testid="auto-refresh-indicator">
        Auto-refresh: <span>30s</span>
      </div>

      <style>{`
        .sessions-management {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .sessions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .sessions-header h2 {
          margin: 0;
          color: #1e293b;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .sessions-info-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .per-page-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .per-page-selector label {
          font-weight: 500;
        }

        .per-page-selector select {
          padding: 0.375rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          background: white;
          cursor: pointer;
        }

        .sessions-table-container {
          overflow-x: auto;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .sessions-table thead {
          background: #f1f5f9;
        }

        .sessions-table th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .sessions-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .sessions-table tbody tr:hover {
          background: #f8fafc;
        }

        .sessions-table td {
          padding: 0.75rem 1rem;
          color: #1e293b;
        }

        .vehicle-type-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .vehicle-type-s {
          background: #dbeafe;
          color: #1e40af;
        }

        .vehicle-type-m {
          background: #fef3c7;
          color: #92400e;
        }

        .vehicle-type-l {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-completed {
          background: #f1f5f9;
          color: #64748b;
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          margin-right: 0.5rem;
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

        .auto-refresh-indicator {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #f8fafc;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
          text-align: right;
        }

        .auto-refresh-indicator span {
          font-weight: 600;
          color: #1e40af;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #64748b;
          font-size: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #64748b;
          font-size: 1rem;
          background: #f8fafc;
          border-radius: 0.5rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-danger {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .close {
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          color: inherit;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
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

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled,
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .sessions-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .sessions-info-bar {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }

          .pagination-controls {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
