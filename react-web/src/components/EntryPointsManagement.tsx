/**
 * Entry Points Management Component
 *
 * Implements FEAT-011: List Entry Points
 * Implements FEAT-012: Create Entry Point
 * Implements FEAT-013: Update Entry Point
 * Implements FEAT-014: Delete Entry Point with confirmation
 *
 * @module EntryPointsManagement
 */

import React, { useState, useEffect } from 'react';
import { getEntryPoints, createEntryPoint, updateEntryPoint, deleteEntryPoint } from '../api';
import type { EntryPoint } from '../types';

export default function EntryPointsManagement(): JSX.Element {
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<EntryPoint | null>(null);
  const [formData, setFormData] = useState<{ identifier: string; name: string }>({
    identifier: '',
    name: ''
  });

  useEffect(() => {
    loadEntryPoints();
  }, []);

  const loadEntryPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEntryPoints();
      setEntryPoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entry points');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
       console.log('=== HANDLE CREATE ===');
       console.log('formData:', formData);
       console.log('Sending: identifier:', formData.identifier, 'name:', formData.name);
       await createEntryPoint({ identifier: formData.identifier, name: formData.name });
       setShowCreateModal(false);
       setFormData({
         identifier: '', name: ''
       });
      setSuccess(`Entry point "${formData.identifier}" created successfully`);
      await loadEntryPoints();
    } catch (err) {
      console.error('Error in handleCreate:', err);
      setError(err instanceof Error ? err.message : 'Failed to create entry point');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;

    try {
      setLoading(true);
      setError(null);
      await updateEntryPoint(String(selectedPoint.id), { name: formData.name });
      setShowEditModal(false);
      setSelectedPoint(null);
      setSuccess('Entry point updated successfully');
      await loadEntryPoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry point');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPoint) return;

    try {
      setLoading(true);
      setError(null);
      await deleteEntryPoint(String(selectedPoint.id));
      setShowDeleteDialog(false);
      setSelectedPoint(null);
      setSuccess('Entry point deleted successfully');
      await loadEntryPoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry point');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (point: EntryPoint) => {
    setSelectedPoint(point);
    setFormData({
      identifier: point.identifier,
      name: point.name
    });
    setShowEditModal(true);
  };

  return (
    <div className="entry-points-management">
      <style>{`
        .entry-points-management {
          min-height: 100vh;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 2rem 1rem;
        }
        .container {
          max-width: 1200px;
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
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          gap: 0.5rem;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #1e40af;
          color: #ffffff;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1e3a8a;
          transform: translateY(-1px);
        }
        .btn-danger {
          background: #dc2626;
          color: #ffffff;
        }
        .btn-danger:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
          transform: translateY(-1px);
        }
        .btn-outline {
          background: transparent;
          border: 2px solid #e2e8f0;
          color: #1e293b;
        }
        .btn-outline:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
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
        .alert-success {
          background: #f0fdf4;
          border: 2px solid #bbf7d0;
          border-left: 4px solid #16a34a;
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
        .entry-points-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .entry-point-card {
          background: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          transition: all 0.2s;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .entry-point-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }
        .entry-point-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .entry-point-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: #1e40af;
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .entry-point-info {
          flex: 1;
        }
        .entry-point-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }
        .entry-point-id {
          font-size: 0.875rem;
          color: #1e293b;
          margin-top: 0.25rem;
        }
        .entry-point-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .entry-point-actions button {
          flex: 1;
        }
        .summary-bar {
          background: #ffffff;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .summary-text {
          font-size: 0.875rem;
          color: #1e293b;
        }
        .summary-text strong {
          color: #1e293b;
        }
        .warning-bar {
          background: #fef3c7;
          border: 2px solid #fcd34d;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .warning-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .warning-content {
          flex: 1;
        }
        .warning-title {
          font-weight: 700;
          color: #92400e;
          margin-bottom: 0.5rem;
        }
        .warning-text {
          color: #92400e;
          font-size: 0.875rem;
          line-height: 1.5;
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
          max-width: 500px;
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
        .form-group {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 1rem;
          color: #1e293b;
          background: #ffffff;
          transition: all 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        .form-input:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .form-helper {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
        }
        @media (max-width: 640px) {
          .entry-points-management {
            padding: 1rem 0.5rem;
          }
          .entry-points-grid {
            grid-template-columns: 1fr;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Entry Points Management</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Entry Point
          </button>
        </div>

        {/* Summary Bar */}
        <div className="summary-bar">
          <span className="summary-text">
            <strong>Total:</strong> {entryPoints.length} entry points
          </span>
        </div>

        {/* Warning Bar - Minimum 3 entry points */}
        {entryPoints.length < 3 && (
          <div className="warning-bar">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <div className="warning-title">Minimum 3 Entry Points Required</div>
              <div className="warning-text">
                The parking system requires at least 3 entry points for proper slot distance calculations.
                Currently have {entryPoints.length} entry point{entryPoints.length !== 1 ? 's' : ''}.
                Please create at least 2 more entry points to continue.
              </div>
            </div>
          </div>
        )}

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

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success">
            <div className="alert-content">
              <div className="alert-title" style={{ color: '#16a34a' }}>Success</div>
              <div className="alert-message" style={{ color: '#166534' }}>{success}</div>
            </div>
            <button className="alert-dismiss" onClick={() => setSuccess(null)} style={{ color: '#16a34a' }}>
              ×
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="loading" role="status" aria-label="Loading">
            <div className="spinner"></div>
          </div>
        )}

        {/* Entry Points Grid */}
        {!loading && (
          <div className="entry-points-grid">
            {entryPoints.map((point) => (
              <div key={point.id} className="entry-point-card">
                <div className="entry-point-header">
                  <div className="entry-point-badge">
                    {point.identifier}
                  </div>
                  <div className="entry-point-info">
                    <div className="entry-point-name">{point.name}</div>
                    <div className="entry-point-id">ID: {point.id}</div>
                  </div>
                </div>
                <div className="entry-point-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEditModal(point)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setSelectedPoint(point);
                      setShowDeleteDialog(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Entry Point</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                 <label htmlFor="identifier" className="form-label">
                   Entry Point Identifier
                 </label>
                 <input
                   id="identifier"
                   type="text"
                   className="form-input"
                   value={formData.identifier}
                   onChange={(e) => setFormData({ ...formData, identifier: e.target.value.toUpperCase() })}
                   required
                   maxLength={1}
                   pattern="[A-Z]"
                   title="Single letter (A, B, C, etc.)"
                   placeholder="A"
                 />
               </div>
               <div className="form-group">
                 <label htmlFor="name" className="form-label">
                   Entry Point Name
                 </label>
                 <input
                   id="name"
                   type="text"
                   className="form-input"
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   required
                   placeholder="e.g., Main Entrance"
                 />
               </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPoint && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Entry Point {selectedPoint.identifier}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body">
               <div className="form-group">
                 <label htmlFor="edit_name" className="form-label">
                   Entry Point Name
                 </label>
                 <input
                   id="edit_name"
                   type="text"
                   className="form-input"
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   required
                 />
               </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedPoint && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Entry Point?</h3>
              <button className="modal-close" onClick={() => setShowDeleteDialog(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>
                Are you sure you want to delete entry point <strong>{selectedPoint.identifier}</strong> ({selectedPoint.name})?
                This action cannot be undone.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#d97706', marginBottom: '1rem' }}>
                ⚠️ Deleting an entry point may affect slot distance calculations. Please ensure you have at least 3 entry points remaining.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Entry Point'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
