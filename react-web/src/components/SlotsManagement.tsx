/**
 * Slots Management Component
 * 
 * Implements FEAT-006: List All Slots
 * Implements FEAT-008: Create Slot
 * Implements FEAT-009: Update Slot
 * Implements FEAT-010: Delete Slot with confirmation dialog
 * 
 * @module SlotsManagement
 */

import React, { useState, useEffect } from 'react';
import { getAllSlots, createSlot, updateSlot, deleteSlot, getEntryPoints } from '../api';
import type { ParkingSlot, CreateParkingSlotRequest, UpdateParkingSlotRequest, EntryPoint } from '../types';

export default function SlotsManagement(): JSX.Element {
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [formData, setFormData] = useState<CreateParkingSlotRequest>({
    slot_label: '',
    slot_type: 'SP',
    distances: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEntryPoints();
    loadSlots();
  }, []);

  const loadEntryPoints = async () => {
    try {
      const data = await getEntryPoints();
      setEntryPoints(data);
    } catch (err) {
      console.error('Failed to load entry points:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entry points');
    }
  };

  const loadSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSlots();
      setSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm(formData)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await createSlot(formData);
      setShowCreateModal(false);
      setFormData({ slot_label: '', slot_type: 'SP', distances: Array(entryPoints.length).fill(0) });
      setFormErrors({});
      setSuccess(`Slot "${formData.slot_label}" created successfully`);
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    // Validate form before submitting
    if (!validateForm(formData)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updateData: UpdateParkingSlotRequest = {
        slot_label: formData.slot_label,
        slot_type: formData.slot_type,
        distances: formData.distances,
      };
      await updateSlot(selectedSlot.id, updateData);
      setShowEditModal(false);
      setSelectedSlot(null);
      setFormErrors({});
      setSuccess(`Slot "${selectedSlot.slot_label}" updated successfully`);
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlot) return;

    try {
      console.log('=== HANDLE DELETE CLICKED ===');
      console.log('Selected slot:', selectedSlot);
      console.log('Slot ID:', selectedSlot.id);
      console.log('Slot ID type:', typeof selectedSlot.id);
      console.log('Slot label:', selectedSlot.slot_label);
      console.log('Slot available:', selectedSlot.available);
      
      setLoading(true);
      setError(null);
      
      await deleteSlot(selectedSlot.id);
      
      console.log('Delete successful, closing dialog');
      setShowDeleteDialog(false);
      setSelectedSlot(null);
      setSuccess(`Slot "${selectedSlot.slot_label}" deleted successfully`);
      await loadSlots();
    } catch (err) {
      console.error('=== HANDLE DELETE ERROR ===');
      console.error('Error:', err);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      setError(err instanceof Error ? err.message : 'Failed to delete slot');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (slot: ParkingSlot) => {
    setSelectedSlot(slot);
    setFormErrors({});
    // Ensure distances array matches current number of entry points
    const distances = [...slot.distances];
    while (distances.length < entryPoints.length) {
      distances.push(0);
    }
    distances.length = entryPoints.length;
    setFormData({
      slot_label: slot.slot_label,
      slot_type: slot.slot_type,
      distances,
    });
    setShowEditModal(true);
  };

  const validateForm = (data: CreateParkingSlotRequest): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate slot label
    if (!data.slot_label.trim()) {
      errors['slot_label'] = 'Slot label is required';
    }
    
    // Validate distances - must be at least 0 (allow 0 for distances)
    data.distances.forEach((distance, index) => {
      if (distance < 0) {
        errors[`distance_${index}`] = `Distance to entry point ${index + 1} must be at least 0`;
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to format distances for display
  const formatDistances = (slot: ParkingSlot): string => {
    // If distances_map is available, use it for key-value format display
    if (slot.distances_map && Object.keys(slot.distances_map).length > 0) {
      const entries = Object.entries(slot.distances_map)
        .map(([key, value]) => `${key}: ${value}m`)
        .join(', ');
      return entries;
    }
    // Fallback to array format if distances_map is not available
    return slot.distances.map(d => `${d}m`).join(', ');
  };

  return (
    <div className="slots-management">
      <style>{`
        .slots-management {
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
          border-color: #bbf7d0;
          border-left-color: #16a34a;
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
        .slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .slot-card {
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
        .slot-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }
        .slot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .slot-label {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }
        .slot-type {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .slot-type.sp {
          background: #dcfce7;
          color: #16a34a;
        }
        .slot-type.mp {
          background: #dbeafe;
          color: #1e40af;
        }
        .slot-type.lp {
          background: #ede9fe;
          color: #7c3aed;
        }
        .slot-info {
          margin-bottom: 1rem;
        }
        .slot-info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .slot-info-row:last-child {
          border-bottom: none;
        }
        .slot-info-label {
          color: #1e293b;
          font-size: 0.875rem;
        }
        .slot-info-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .slot-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .slot-actions button {
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
        .form-input,
        .form-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 1rem;
          color: #1e293b;
          background: #ffffff;
          transition: all 0.2s;
        }
        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        .form-input:disabled,
        .form-select:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .form-helper {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
        }
        .form-error {
          font-size: 0.75rem;
          color: #dc2626;
          margin-top: 0.25rem;
          animation: slideIn 0.2s ease;
        }
        .form-input-error {
          border-color: #dc2626 !important;
        }
        .form-input-error:focus {
          border-color: #dc2626 !important;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
        }
        @media (max-width: 640px) {
          .slots-management {
            padding: 1rem 0.5rem;
          }
          .slots-grid {
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
          <h1 className="page-title">Parking Slots Management</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormErrors({});
              setShowCreateModal(true);
            }}
          >
            + Create Slot
          </button>
        </div>

        {/* Summary Bar */}
        <div className="summary-bar">
          <span className="summary-text">
            <strong>SP:</strong> {slots.filter(s => s.slot_type === 'SP').length}/{slots.length} | 
            <strong>MP:</strong> {slots.filter(s => s.slot_type === 'MP').length}/{slots.length} | 
            <strong>LP:</strong> {slots.filter(s => s.slot_type === 'LP').length}/{slots.length}
          </span>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <span className="filter-label">Filter by Type:</span>
          <select
            className="filter-select"
            onChange={(e) => {
              // Implement filter logic here
              console.log('Filter by type:', e.target.value);
            }}
          >
            <option value="all">All Types</option>
            <option value="SP">Small Parking (SP)</option>
            <option value="MP">Medium Parking (MP)</option>
            <option value="LP">Large Parking (LP)</option>
          </select>
          <span className="filter-label">Filter by Availability:</span>
          <select
            className="filter-select"
            onChange={(e) => {
              // Implement filter logic here
              console.log('Filter by availability:', e.target.value);
            }}
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
          </select>
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
          <div className="loading">
            <div className="spinner"></div>
          </div>
        )}

        {/* Slots Grid */}
        {!loading && (
          <div className="slots-grid">
            {slots.map((slot) => (
              <div key={slot.id} className="slot-card">
                <div className="slot-header">
                  <span className="slot-label">{slot.slot_label}</span>
                  <span className={`slot-type ${slot.slot_type}`}>
                    {slot.slot_type}
                  </span>
                </div>
                <div className="slot-info">
                  <div className="slot-info-row">
                    <span className="slot-info-label">Status:</span>
                    <span className="slot-info-value" style={{ color: slot.available ? '#16a34a' : '#dc2626' }}>
                      {slot.available ? '✅ Available' : '🔴 Occupied'}
                    </span>
                  </div>
                  <div className="slot-info-row">
                    <span className="slot-info-label">Distances:</span>
                    <span className="slot-info-value">
                      {formatDistances(slot)}
                    </span>
                  </div>
                </div>
                <div className="slot-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEditModal(slot)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setSelectedSlot(slot);
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
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setFormErrors({});
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Parking Slot</h3>
              <button className="modal-close" onClick={() => {
                setShowCreateModal(false);
                setFormErrors({});
              }}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label htmlFor="slot_label" className="form-label">
                  Slot Label
                </label>
                <input
                  id="slot_label"
                  type="text"
                  className="form-input"
                  value={formData.slot_label}
                  onChange={(e) => setFormData({ ...formData, slot_label: e.target.value })}
                  required
                  placeholder="e.g., SP-5"
                />
              </div>
              <div className="form-group">
                <label htmlFor="slot_type" className="form-label">
                  Slot Type
                </label>
                <select
                  id="slot_type"
                  className="form-select"
                  value={formData.slot_type}
                  onChange={(e) => setFormData({ ...formData, slot_type: e.target.value as 'SP' | 'MP' | 'LP' })}
                  required
                >
                  <option value="SP">Small Parking (SP)</option>
                  <option value="MP">Medium Parking (MP)</option>
                  <option value="LP">Large Parking (LP)</option>
                </select>
              </div>
              {entryPoints.map((entryPoint, index) => (
                <div key={entryPoint.id} className="form-group">
                  <label htmlFor={`distance_${index}`} className="form-label">
                    Distance to Entry Point {entryPoint.identifier}
                  </label>
                  <input
                    id={`distance_${index}`}
                    type="number"
                    className={`form-input ${formErrors[`distance_${index}`] ? 'form-input-error' : ''}`}
                    value={formData.distances[index] || 0}
                    onChange={(e) => {
                      const newDistances = [...formData.distances];
                      newDistances[index] = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, distances: newDistances });
                      // Clear error for this field when user starts typing
                      if (formErrors[`distance_${index}`]) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors[`distance_${index}`];
                          return newErrors;
                        });
                      }
                    }}
                    required
                    min="0"
                    placeholder="0"
                  />
                  {formErrors[`distance_${index}`] && (
                    <div className="form-error">{formErrors[`distance_${index}`]}</div>
                  )}
                </div>
              ))}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormErrors({});
                  }}
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
      {showEditModal && selectedSlot && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false);
          setFormErrors({});
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Parking Slot #{selectedSlot.id}</h3>
              <button className="modal-close" onClick={() => {
                setShowEditModal(false);
                setFormErrors({});
              }}>
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body">
              <div className="form-group">
                <label htmlFor="edit_slot_label" className="form-label">
                  Slot Label
                </label>
                <input
                  id="edit_slot_label"
                  type="text"
                  className="form-input"
                  value={formData.slot_label}
                  onChange={(e) => setFormData({ ...formData, slot_label: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit_slot_type" className="form-label">
                  Slot Type
                </label>
                <select
                  id="edit_slot_type"
                  className="form-select"
                  value={formData.slot_type}
                  onChange={(e) => setFormData({ ...formData, slot_type: e.target.value as 'SP' | 'MP' | 'LP' })}
                  required
                >
                  <option value="SP">Small Parking (SP)</option>
                  <option value="MP">Medium Parking (MP)</option>
                  <option value="LP">Large Parking (LP)</option>
                </select>
              </div>
               {entryPoints.map((entryPoint, index) => (
                <div key={entryPoint.id} className="form-group">
                  <label htmlFor={`edit_distance_${index}`} className="form-label">
                    Distance to Entry Point {entryPoint.identifier}
                  </label>
                  <input
                    id={`edit_distance_${index}`}
                    type="number"
                    className={`form-input ${formErrors[`distance_${index}`] ? 'form-input-error' : ''}`}
                    value={formData.distances[index] || 0}
                    onChange={(e) => {
                      const newDistances = [...formData.distances];
                      newDistances[index] = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, distances: newDistances });
                      // Clear error for this field when user starts typing
                      if (formErrors[`distance_${index}`]) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors[`distance_${index}`];
                          return newErrors;
                        });
                      }
                    }}
                    required
                    min="0"
                  />
                  {formErrors[`distance_${index}`] && (
                    <div className="form-error">{formErrors[`distance_${index}`]}</div>
                  )}
                </div>
              ))}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setFormErrors({});
                  }}
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
      {showDeleteDialog && selectedSlot && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Parking Slot?</h3>
              <button className="modal-close" onClick={() => setShowDeleteDialog(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>
                Are you sure you want to delete slot <strong>{selectedSlot.slot_label}</strong>?
                This action cannot be undone.
              </p>
              {selectedSlot.available && (
                <p style={{ fontSize: '0.875rem', color: '#dc2626', marginBottom: '1rem' }}>
                  ⚠️ This slot is currently available. Deleting it will make it unavailable.
                </p>
              )}
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
                {loading ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
