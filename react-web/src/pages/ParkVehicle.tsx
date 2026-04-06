/**
 * Park Vehicle Page
 *
 * Implements FEAT-001: Park Vehicle with simple form (no 3-step wizard)
 * - Vehicle Type dropdown (S/M/L)
 * - Entry Point dropdown (populated from API)
 * - Park button with loading state
 * - Success banner with Session ID copy
 * - Error handling for 409 (no available slots)
 * - Continuous parking notice
 *
 * @module ParkVehicle
 */

import React, { useState } from 'react';
import * as parkingApi from '../api/parkingApi';
import { useParking } from '../context/ParkingContext';

// ============================================================================
// TYPES
// ============================================================================

type VehicleType = 'S' | 'M' | 'L';

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
};

const SLOT_TYPE_LABELS: Record<string, string> = {
  SP: 'Small Parking',
  MP: 'Medium Parking',
  LP: 'Large Parking',
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Loading Spinner Component
 */
function LoadingSpinner(): JSX.Element {
  return (
    <div className="loading-spinner">
      <style>{`
        .loading-spinner {
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
      `}</style>
      <div className="spinner"></div>
    </div>
  );
}

/**
 * Success Banner Component
 */
function SuccessBanner({
  session,
  onCopySessionId,
  onViewSession,
}: {
  session: parkingApi.Session;
  onCopySessionId: () => void;
  onViewSession: () => void;
}): JSX.Element {
  return (
    <div className="success-banner">
      <style>{`
        .success-banner {
          background: #dcfce7;
          border: 2px solid #bbf7d0;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: scaleIn 0.3s ease;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .success-banner-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .success-banner-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #16a34a;
          margin-bottom: 1rem;
        }
        .success-banner-content {
          background: #ffffff;
          border: 1px solid #bbf7d0;
          border-radius: 0.375rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .session-id-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .session-id-label {
          font-size: 0.875rem;
          color: #64748b;
        }
        .session-id-value {
          font-family: monospace;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e40af;
        }
        .copy-button {
          background: #1e40af;
          color: #ffffff;
          border: none;
          padding: 0.375rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-button:hover {
          background: #1e3a8a;
          transform: scale(1.05);
        }
        .copy-button:active {
          transform: scale(0.95);
        }
        .slot-info {
          font-size: 0.875rem;
          color: #64748b;
        }
        .slot-info strong {
          color: #1e293b;
        }
        .continuous-notice {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 0.375rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #92400e;
        }
        .continuous-notice-icon {
          margin-right: 0.5rem;
        }
        .action-buttons {
          display: flex;
          gap: 0.75rem;
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
        .btn-outline {
          background: transparent;
          border: 2px solid #1e40af;
          color: #1e40af;
        }
        .btn-outline:hover:not(:disabled) {
          background: #f1f5f9;
        }
        .info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-top: 1.5rem;
        }
        .info-box-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }
        .info-box-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .info-box-table th,
        .info-box-table td {
          text-align: left;
          padding: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .info-box-table th {
          font-weight: 600;
          color: #64748b;
        }
        .info-box-table td {
          color: #1e293b;
        }
      `}</style>
      <div className="success-banner-icon">✅</div>
      <div className="success-banner-title">Vehicle Parked Successfully!</div>
      
      <div className="success-banner-content">
        <div className="session-id-row">
          <span className="session-id-label">Session ID:</span>
          <span className="session-id-value">{session.session_id}</span>
          <button 
            className="copy-button"
            onClick={onCopySessionId}
            aria-label="Copy session ID"
          >
            Copy
          </button>
        </div>
        <div className="slot-info">
          <strong>Slot:</strong> {session.parking_slot.slot_label} ({SLOT_TYPE_LABELS[session.parking_slot.slot_type]})
        </div>
        <div className="slot-info">
          <strong>Entry Point:</strong> {typeof session.entry_point === 'string' ? session.entry_point : session.entry_point?.identifier || ''}
        </div>
        <div className="slot-info">
          <strong>Vehicle Type:</strong> {VEHICLE_TYPE_LABELS[session.vehicle_type]} ({session.vehicle_type})
        </div>
        <div className="slot-info">
          <strong>Parked At:</strong> {new Date(session.parked_at).toLocaleString()}
        </div>
      </div>
      
      {session.is_continuous && (
        <div className="continuous-notice">
          <span className="continuous-notice-icon">♻️</span>
          <strong>Continuous Parking Notice:</strong> Vehicle returned within 1 hour of previous exit. Fee will be calculated from base_start_time.
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className="btn btn-outline"
          onClick={onViewSession}
        >
          View Session
        </button>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.href = '/sessions'}
        >
          Park Another Vehicle
        </button>
      </div>
      
      <div className="info-box">
        <div className="info-box-title">Vehicle Type Compatibility</div>
        <table className="info-box-table">
          <thead>
            <tr>
              <th>Vehicle Type</th>
              <th>Compatible Slots</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Small (S)</td>
              <td>Small (SP), Medium (MP), Large (LP)</td>
            </tr>
            <tr>
              <td>Medium (M)</td>
              <td>Medium (MP), Large (LP)</td>
            </tr>
            <tr>
              <td>Large (L)</td>
              <td>Large (LP)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Error Banner Component
 */
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }): JSX.Element {
  return (
    <div className="error-banner">
      <style>{`
        .error-banner {
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-left: 4px solid #dc2626;
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
        .error-banner-icon {
          color: #dc2626;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .error-banner-content {
          flex: 1;
        }
        .error-banner-title {
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 0.25rem;
        }
        .error-banner-message {
          color: #991b1b;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .error-banner-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
          transition: color 0.2s;
        }
        .error-banner-dismiss:hover {
          color: #b91c1c;
        }
      `}</style>
      <span className="error-banner-icon">⚠️</span>
      <div className="error-banner-content">
        <div className="error-banner-title">Error</div>
        <div className="error-banner-message">{message}</div>
      </div>
      <button className="error-banner-dismiss" onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Park Vehicle Page Component
 * Implements FEAT-001: Simple form with Vehicle Type and Entry Point dropdowns
 */
export function ParkVehicle(): JSX.Element {
  const { state: parkingState } = useParking();
  
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [entryPointId, setEntryPointId] = useState<string>('');
  const [parkingResult, setParkingResult] = useState<parkingApi.Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  /**
   * Copy session ID to clipboard
   */
  const copySessionId = async (): Promise<void> => {
    if (parkingResult?.session_id) {
      try {
        await navigator.clipboard.writeText(parkingResult.session_id);
        alert('Session ID copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy session ID:', err);
      }
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validation
    if (!vehicleType) {
      setError('Please select a vehicle type');
      return;
    }
    if (!entryPointId) {
      setError('Please select an entry point');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await parkingApi.parkVehicle(vehicleType, entryPointId);
      setParkingResult(session);
    } catch (err) {
      const errorMessage = err instanceof parkingApi.ApiError 
        ? err.message 
        : 'Failed to park vehicle. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="park-vehicle-page">
      <style>{`
        .park-vehicle-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 2rem 1rem;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        .page-subtitle {
          font-size: 1.125rem;
          color: #64748b;
        }
        .form-card {
          background: #ffffff;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 2rem;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        .required-indicator {
          color: #dc2626;
          margin-left: 2px;
        }
        .form-select,
        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 1rem;
          color: #1e293b;
          background: #ffffff;
          transition: all 0.2s;
        }
        .form-select:focus,
        .form-input:focus {
          outline: none;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
        .form-select:disabled,
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
          width: 100%;
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
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-loading {
          opacity: 0.8;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .park-vehicle-page {
            padding: 1rem 0.5rem;
          }
          .form-card {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🚗 Park Vehicle</h1>
          <p className="page-subtitle">Select vehicle type and entry point to park</p>
        </div>

        <div className="form-card">
          {/* Error Banner */}
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          
          {/* Loading Spinner */}
          {loading && <LoadingSpinner />}
          
          {/* Form */}
          {!loading && !parkingResult && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="vehicleType" className="form-label">
                  Vehicle Type <span className="required-indicator">*</span>
                </label>
                <select
                  id="vehicleType"
                  className="form-select"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}
                  disabled={loading}
                  required
                >
                  <option value="">Select vehicle type</option>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                </select>
                {vehicleType && (
                  <p className="form-helper">
                    Compatible slots: {['SP', 'MP', 'LP'].map(type => SLOT_TYPE_LABELS[type]).join(', ')}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="entryPoint" className="form-label">
                  Entry Point <span className="required-indicator">*</span>
                </label>
                <select
                  id="entryPoint"
                  className="form-select"
                  value={entryPointId}
                  onChange={(e) => setEntryPointId(e.target.value)}
                  disabled={loading || parkingState.loading}
                  required
                >
                  <option value="">Select entry point</option>
                  {parkingState.entryPoints.map((ep) => (
                    <option key={ep.id} value={ep.identifier}>
                      {ep.identifier} - {ep.name}
                    </option>
                  ))}
                </select>
                {parkingState.entryPoints.length === 0 && (
                  <p className="form-helper" style={{ color: '#d97706' }}>
                    No entry points available. Please initialize the system first.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!vehicleType || !entryPointId || loading}
              >
                {loading ? 'Parking...' : 'Park Vehicle'}
              </button>
            </form>
          )}

          {/* Success Banner */}
          {parkingResult && (
            <SuccessBanner
              session={parkingResult}
              onCopySessionId={copySessionId}
              onViewSession={() => window.location.href = `/session/${parkingResult.session_id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ParkVehicle;
