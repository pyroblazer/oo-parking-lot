/**
 * Vehicles Management Component
 *
 * Implements full CRUD operations for vehicles
 */

import React, { useState, useEffect } from 'react';
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from '../api';
import type { Vehicle } from '../types';

export default function VehiclesManagement(): JSX.Element {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    license_plate: '',
    vehicle_type: 'S' as 'S' | 'M' | 'L',
    color: '',
    brand: '',
    model: '',
    year: undefined as number | undefined,
    metadata: {} as Record<string, unknown>,
  });

  useEffect(() => {
    loadVehicles();
  }, [currentPage, perPage]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listVehicles(currentPage, perPage);
      setVehicles(data.vehicles);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await createVehicle(
        formData.license_plate,
        formData.vehicle_type,
        formData.color || undefined,
        formData.brand || undefined,
        formData.model || undefined,
        formData.year,
        formData.metadata
      );
      setShowCreateModal(false);
      setFormData({
        license_plate: '',
        vehicle_type: 'S',
        color: '',
        brand: '',
        model: '',
        year: undefined,
        metadata: {},
      });
      setSuccess(`Vehicle "${formData.license_plate}" created successfully`);
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      setLoading(true);
      setError(null);
      await updateVehicle(
        selectedVehicle.id,
        formData.license_plate || undefined,
        formData.vehicle_type || undefined,
        formData.color || undefined,
        formData.brand || undefined,
        formData.model || undefined,
        formData.year,
        formData.metadata
      );
      setShowEditModal(false);
      setSelectedVehicle(null);
      setSuccess('Vehicle updated successfully');
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;

    try {
      setLoading(true);
      setError(null);
      await deleteVehicle(selectedVehicle.id);
      setShowDeleteDialog(false);
      setSelectedVehicle(null);
      setSuccess(`Vehicle "${selectedVehicle.license_plate}" deleted successfully`);
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vehicle');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      license_plate: vehicle.license_plate,
      vehicle_type: vehicle.vehicle_type,
      color: vehicle.color || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year,
      metadata: vehicle.metadata || {},
    });
    setShowEditModal(true);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="vehicles-management">
      <style>{`
        .vehicles-management {
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
        .vehicles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .vehicle-card {
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
        .vehicle-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }
        .vehicle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .vehicle-license {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }
        .vehicle-type {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .vehicle-type.s {
          background: #dcfce7;
          color: #16a34a;
        }
        .vehicle-type.m {
          background: #dbeafe;
          color: #1e40af;
        }
        .vehicle-type.l {
          background: #ede9fe;
          color: #7c3aed;
        }
        .vehicle-info {
          margin-bottom: 1rem;
        }
        .vehicle-info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .vehicle-info-row:last-child {
          border-bottom: none;
        }
        .vehicle-info-label {
          color: #64748b;
          font-size: 0.875rem;
        }
        .vehicle-info-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .vehicle-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .vehicle-actions button {
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
        .frequent-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
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
        @media (max-width: 640px) {
          .vehicles-management {
            padding: 1rem 0.5rem;
          }
          .vehicles-grid {
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
          <h1 className="page-title">Vehicles Management</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Vehicle
          </button>
        </div>

        {/* Summary Bar */}
        <div className="summary-bar">
          <span className="summary-text">
            <strong>Total:</strong> {total} vehicles | 
            <strong>Frequent:</strong> {vehicles.filter(v => v.is_frequent).length}
          </span>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <span className="filter-label">Filter by Type:</span>
          <select
            className="filter-select"
            onChange={(e) => {
              console.log('Filter by type:', e.target.value);
            }}
          >
            <option value="all">All Types</option>
            <option value="S">Small (S)</option>
            <option value="M">Medium (M)</option>
            <option value="L">Large (L)</option>
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

        {/* Vehicles Grid */}
        {!loading && (
          <div className="vehicles-grid">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="vehicle-card">
                <div className="vehicle-header">
                  <span className="vehicle-license">{vehicle.license_plate}</span>
                  {vehicle.is_frequent && (
                    <span className="frequent-badge">⭐ Frequent</span>
                  )}
                </div>
                <div className="vehicle-info">
                  <div className="vehicle-info-row">
                    <span className="vehicle-info-label">Type:</span>
                    <span className={`vehicle-type ${vehicle.vehicle_type.toLowerCase()}`}>
                      {vehicle.vehicle_type}
                    </span>
                  </div>
                  <div className="vehicle-info-row">
                    <span className="vehicle-info-label">Brand/Model:</span>
                    <span className="vehicle-info-value">
                      {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : 'N/A'}
                    </span>
                  </div>
                  <div className="vehicle-info-row">
                    <span className="vehicle-info-label">Color:</span>
                    <span className="vehicle-info-value">{vehicle.color || 'N/A'}</span>
                  </div>
                  <div className="vehicle-info-row">
                    <span className="vehicle-info-label">Year:</span>
                    <span className="vehicle-info-value">{vehicle.year || 'N/A'}</span>
                  </div>
                  <div className="vehicle-info-row">
                    <span className="vehicle-info-label">Sessions:</span>
                    <span className="vehicle-info-value">{vehicle.total_sessions}</span>
                  </div>
                  <div className="vehicle-info-row">
                    <span className="vehicle-info-label">Total Spent:</span>
                    <span className="vehicle-info-value">₱{vehicle.total_spent.toFixed(2)}</span>
                  </div>
                </div>
                <div className="vehicle-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEditModal(vehicle)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Vehicle</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label htmlFor="license_plate" className="form-label">
                  License Plate *
                </label>
                <input
                  id="license_plate"
                  type="text"
                  className="form-input"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g., ABC-1234"
                />
              </div>
              <div className="form-group">
                <label htmlFor="vehicle_type" className="form-label">
                  Vehicle Type *
                </label>
                <select
                  id="vehicle_type"
                  className="form-select"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as 'S' | 'M' | 'L' })}
                  required
                >
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="color" className="form-label">
                  Color
                </label>
                <input
                  id="color"
                  type="text"
                  className="form-input"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., Red"
                />
              </div>
              <div className="form-group">
                <label htmlFor="brand" className="form-label">
                  Brand
                </label>
                <input
                  id="brand"
                  type="text"
                  className="form-input"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g., Toyota"
                />
              </div>
              <div className="form-group">
                <label htmlFor="model" className="form-label">
                  Model
                </label>
                <input
                  id="model"
                  type="text"
                  className="form-input"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Vios"
                />
              </div>
              <div className="form-group">
                <label htmlFor="year" className="form-label">
                  Year
                </label>
                <input
                  id="year"
                  type="number"
                  className="form-input"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  placeholder="e.g., 2020"
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
      {showEditModal && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Vehicle {selectedVehicle.license_plate}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body">
              <div className="form-group">
                <label htmlFor="edit_license_plate" className="form-label">
                  License Plate
                </label>
                <input
                  id="edit_license_plate"
                  type="text"
                  className="form-input"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit_vehicle_type" className="form-label">
                  Vehicle Type
                </label>
                <select
                  id="edit_vehicle_type"
                  className="form-select"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as 'S' | 'M' | 'L' })}
                  required
                >
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit_color" className="form-label">
                  Color
                </label>
                <input
                  id="edit_color"
                  type="text"
                  className="form-input"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit_brand" className="form-label">
                  Brand
                </label>
                <input
                  id="edit_brand"
                  type="text"
                  className="form-input"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit_model" className="form-label">
                  Model
                </label>
                <input
                  id="edit_model"
                  type="text"
                  className="form-input"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit_year" className="form-label">
                  Year
                </label>
                <input
                  id="edit_year"
                  type="number"
                  className="form-input"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                  min="1900"
                  max={new Date().getFullYear() + 1}
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
      {showDeleteDialog && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Vehicle?</h3>
              <button className="modal-close" onClick={() => setShowDeleteDialog(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>
                Are you sure you want to delete vehicle <strong>{selectedVehicle.license_plate}</strong>?
                This action cannot be undone.
              </p>
              {selectedVehicle.total_sessions > 0 && (
                <p style={{ fontSize: '0.875rem', color: '#d97706', marginBottom: '1rem' }}>
                  ⚠️ This vehicle has {selectedVehicle.total_sessions} parking session(s). Deleting it will remove this history.
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
                {loading ? 'Deleting...' : 'Delete Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
