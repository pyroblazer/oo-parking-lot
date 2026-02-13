/**
 * Unpark Vehicle Component
 * 
 * Implements FEAT-002: Unpark Vehicle with fee calculation
 * Implements FEAT-003: Fee Calculation Display with tree structure
 * 
 * @module UnparkVehicle
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { unparkVehicle } from '../api';
import type { SessionId, UnparkVehicleResult, AsyncState } from '../types';
import './UnparkVehicle.css';

/**
 * Fee Breakdown Component with tree structure
 */
function FeeBreakdown({ breakdown, isContinuous }: { breakdown: any; isContinuous?: boolean }): JSX.Element | null {
  if (!breakdown) {
    return null;
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fee-breakdown">
      <style>{`
        .fee-breakdown {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-top: 1.5rem;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fee-breakdown-header {
          text-align: center;
          padding-bottom: 1rem;
          border-bottom: 1px dashed #e2e8f0;
          margin-bottom: 1rem;
        }
        .fee-breakdown-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }
        .fee-breakdown-tree {
          font-family: monospace;
          font-size: 0.875rem;
        }
        .fee-breakdown-tree .tree-root {
          margin-bottom: 1rem;
        }
        .fee-breakdown-tree .tree-item {
          margin-left: 1.5rem;
          padding-left: 1rem;
          border-left: 2px solid #e2e8f0;
        }
        .fee-breakdown-tree .tree-item:last-child {
          border-left: none;
        }
        .fee-breakdown-tree .tree-label {
          color: #64748b;
        }
        .fee-breakdown-tree .tree-value {
          color: #1e293b;
          font-weight: 600;
        }
        .fee-breakdown-tree .tree-total {
          color: #1e40af;
          font-size: 1.125rem;
          font-weight: 700;
        }
        .fee-breakdown-tree .tree-line {
          color: #94a3b8;
        }
        .continuous-badge {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 0.375rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #92400e;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .continuous-badge-icon {
          font-size: 1.25rem;
        }
        .print-button {
          display: block;
          width: 100%;
          padding: 0.75rem;
          background: #1e40af;
          color: #ffffff;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
        }
        .print-button:hover {
          background: #1e3a8a;
          transform: translateY(-1px);
        }
        .print-button:active {
          transform: translateY(0);
        }
      `}</style>
      
      {isContinuous && (
        <div className="continuous-badge">
          <span className="continuous-badge-icon">♻️</span>
          <div>
            <strong>Continuous Parking Notice:</strong><br />
            Vehicle returned within 1 hour of previous exit.<br />
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Fee is calculated from base_start_time: {breakdown.base_start_time}
            </span>
          </div>
        </div>
      )}
      
      <div className="fee-breakdown-header">
        <div className="fee-breakdown-title">Fee Breakdown</div>
      </div>
      
      <div className="fee-breakdown-tree">
        {/* Base Fee */}
        <div className="tree-root">
          <div className="tree-item">
            <span className="tree-label">├─ Base Fee:</span>
            <span className="tree-value">{formatCurrency(breakdown.remaining.base_fee)}</span>
            <span className="tree-label" style={{ marginLeft: '0.5rem' }}>
              (first 3 hours)
            </span>
          </div>
        </div>
        
        {/* Exceeding Hours */}
        {breakdown.remaining.exceeding_hours > 0 && (
          <div className="tree-root">
            <div className="tree-item">
              <span className="tree-label">├─ Exceeding Hours:</span>
              <span className="tree-value">{breakdown.remaining.exceeding_hours}h</span>
            </div>
            <div className="tree-item">
              <span className="tree-label">│   └─ Rate:</span>
              <span className="tree-label" style={{ marginLeft: '1.5rem' }}>
                ₱{breakdown.remaining.exceeding_fee / breakdown.remaining.exceeding_hours}.00/hour
              </span>
            </div>
            <div className="tree-item">
              <span className="tree-label">│   └─ Fee:</span>
              <span className="tree-value">{formatCurrency(breakdown.remaining.exceeding_fee)}</span>
            </div>
          </div>
        )}
        
        {/* Long-term Parking */}
        {breakdown.long_term.days > 0 && (
          <div className="tree-root">
            <div className="tree-item">
              <span className="tree-label">├─ Long-term Parking:</span>
            </div>
            <div className="tree-item">
              <span className="tree-label">│   └─ {breakdown.long_term.days} day{breakdown.long_term.days !== 1 ? 's' : ''} × ₱5,000.00</span>
              <span className="tree-value" style={{ marginLeft: '1rem' }}>
                = {formatCurrency(breakdown.long_term.fee)}
              </span>
            </div>
          </div>
        )}
        
        {/* Total Fee */}
        <div className="tree-root">
          <div className="tree-item">
            <span className="tree-label">└─ Total Fee:</span>
            <span className="tree-value tree-total">{formatCurrency(breakdown.total_fee)}</span>
          </div>
        </div>
      </div>
      
      <button className="print-button" onClick={() => window.print()}>
        🧾 Print Receipt
      </button>
    </div>
  );
}

/**
 * UnparkVehicle component
 */
function UnparkVehicle(): JSX.Element {
  const [searchParams] = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId') || '';
  const [sessionId, setSessionId] = useState<SessionId>(sessionIdFromUrl);
  const [state, setState] = useState<AsyncState<UnparkVehicleResult>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Validation
    if (!sessionId.trim()) {
      setState(prev => ({
        ...prev,
        error: new Error('Session ID is required'),
      }));
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    try {
      const response = await unparkVehicle(sessionId);
      setState({
        data: response,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to unpark vehicle'),
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="unpark-vehicle"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <style>{`
        .unpark-vehicle {
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
        /* More specific selector to override global styles */
        .unpark-vehicle .form-group label.form-label {
          color: #1e293b !important;
        }
        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 1rem;
          color: #1e293b;
          background: #ffffff;
          transition: all 0.2s;
          font-family: monospace;
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
        .error-message {
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
        .error-message-icon {
          color: #dc2626;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .error-message-content {
          flex: 1;
        }
        .error-message-title {
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 0.25rem;
        }
        .error-message-text {
          color: #991b1b;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .error-message-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
          transition: color 0.2s;
        }
        .error-message-dismiss:hover {
          color: #b91c1c;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.875rem 1.5rem;
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
        .result-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-top: 1.5rem;
          animation: scaleIn 0.3s ease;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .result-header {
          text-align: center;
          padding-bottom: 1rem;
          border-bottom: 1px dashed #e2e8f0;
          margin-bottom: 1rem;
        }
        .result-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #16a34a;
        }
        .result-details {
          margin-bottom: 1rem;
        }
        .result-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .result-row:last-child {
          border-bottom: none;
        }
        .result-label {
          color: #1e293b;
        }
        /* More specific selector to override global styles */
        .unpark-vehicle .result-details .result-label {
          color: #1e293b !important;
        }
        .result-value {
          color: #1e293b;
          font-weight: 600;
        }
        .result-value.highlight {
          color: #1e40af;
          font-size: 1.25rem;
        }
        .duration-badge {
          display: inline-block;
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .continuous-badge {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 0.375rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #92400e;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .continuous-badge-icon {
          font-size: 1.25rem;
        }
        @media (max-width: 640px) {
          .unpark-vehicle {
            padding: 1rem 0.5rem;
          }
          .form-card {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🚗️ Unpark Vehicle</h1>
          <p className="page-subtitle">Enter session ID to calculate fee and unpark</p>
        </div>

        <div className="form-card">
          {/* Error Banner */}
          <AnimatePresence>
            {state.error && (
              <motion.div
                className="error-message"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <span className="error-message-icon">⚠️</span>
                <div className="error-message-content">
                  <div className="error-message-title">Error</div>
                  <div className="error-message-text">
                    {state.error instanceof Error ? state.error.message : String(state.error)}
                  </div>
                </div>
                <button 
                  className="error-message-dismiss" 
                  onClick={() => setState(prev => ({ ...prev, error: null }))}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Loading Spinner */}
          {state.loading && (
            <div className="loading-spinner">
              <style>{`
                .loading-spinner {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  padding: 0.5rem 0 1rem;
                }
                .spinner {
                  width: 1.5rem;
                  height: 1.5rem;
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
          )}

          {/* Form */}
          {!state.data && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="sessionId" className="form-label">
                  Session ID
                </label>
                <input
                  id="sessionId"
                  type="text"
                  className="form-input"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID"
                  disabled={state.loading}
                />
                <p className="form-helper">
                  Enter the session ID to unpark the vehicle and calculate the fee.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={state.loading}
              >
                {state.loading ? 'Calculating...' : 'Calculate Fee'}
              </button>
            </form>
          )}

          {/* Result Box */}
          <AnimatePresence>
            {state.data && (
              <motion.div
                className="result-box"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <div className="result-header">
                  <div className="result-title">✅ Vehicle Unparked Successfully</div>
                </div>
                
                <div className="result-details">
                  <div className="result-row">
                    <span className="result-label">Session ID:</span>
                    <span className="result-value">{state.data.session_id}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Vehicle Type:</span>
                    <span className="result-value">{state.data.vehicle_type}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Parking Slot:</span>
                    <span className="result-value">
                      {state.data.parking_slot.slot_label} ({state.data.parking_slot.slot_type})
                    </span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Entry Point:</span>
                    <span className="result-value">{state.data.entry_point.identifier}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Parked At:</span>
                    <span className="result-value">{new Date(state.data.parked_at).toLocaleString()}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Exited At:</span>
                    <span className="result-value">{new Date(state.data.exited_at).toLocaleString()}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Duration:</span>
                    <span className="result-value">
                      {state.data.duration_hours} hours
                    </span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Total Fee:</span>
                    <span className="result-value highlight">₱{state.data.total_fee.toFixed(2)}</span>
                  </div>
                  
                </div>
                
                <FeeBreakdown breakdown={state.data?.fee_breakdown || state.data?.breakdown} isContinuous={state.data?.is_continuous} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default UnparkVehicle;