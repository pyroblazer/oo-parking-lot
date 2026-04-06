/**
 * View Session Component
 * 
 * Implements FEAT-004: View Session Details
 * - Session ID input with validation
 * - Session detail card with all fields
 * - Active badge for active sessions
 * - Unpark button for active sessions
 * - Completed badge for completed sessions
 * 
 * @module ViewSession
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession } from '../api';
import type { ParkingSession, AsyncState } from '../types';
import './ViewSession.css';

/**
 * ViewSession component
 */
function ViewSession(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [manualSessionId, setManualSessionId] = useState('');
  const [state, setState] = useState<AsyncState<ParkingSession>>({
    data: null,
    loading: false,
    error: null,
  });

  // Check if session ID is provided via URL parameter or query param
  const sessionIdFromUrl = id || searchParams.get('sessionId') || '';
  const isManualMode = !sessionIdFromUrl;

  useEffect(() => {
    if (sessionIdFromUrl) {
      void loadSession(sessionIdFromUrl);
    } else {
      setState({
        data: null,
        loading: false,
        error: null,
      });
    }
  }, [sessionIdFromUrl]);

  const loadSession = async (sessionId: string): Promise<void> => {
    if (!sessionId) {
      setState({
        data: null,
        loading: false,
        error: new Error('Invalid session ID'),
      });
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    try {
      const response = await getSession(sessionId);
      setState({
        data: response,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to load session'),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!manualSessionId.trim()) {
      setState(prev => ({
        ...prev,
        error: new Error('Session ID is required'),
      }));
      return;
    }

    await loadSession(manualSessionId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  if (state.loading) {
    return (
      <motion.div
        className="view-session loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <style>{`
          .view-session.loading {
            min-height: 100vh;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 2rem 1rem;
          }
          .loading-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .loading-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          .loading-title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.5rem;
          }
          .loading-subtitle {
            font-size: 1.125rem;
            color: #1e293b;
          }
          .spinner-wrap {
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
        <div className="loading-container">
          <div className="loading-header">
            <h1 className="loading-title">🚗 Parking Session Details</h1>
            <p className="loading-subtitle">Session ID: {id || ''}</p>
          </div>
          <div className="spinner-wrap">
            <div className="spinner"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (state.error) {
    return (
      <motion.div
        className="view-session"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <style>{`
          .view-session {
            min-height: 100vh;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 2rem 1rem;
          }
          .error-message {
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-left: 4px solid #dc2626;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 2rem;
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
        `}</style>
        <div className="error-message">
          <span className="error-message-icon">⚠️</span>
          <div className="error-message-content">
            <div className="error-message-title">Error</div>
            <div className="error-message-text">
              {state.error instanceof Error ? state.error.message : String(state.error)}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!state.data) {
    return (
      <motion.div
        className="view-session"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <style>{`
          .view-session {
            min-height: 100vh;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 2rem 1rem;
          }
          .error-message {
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-left: 4px solid #dc2626;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 2rem;
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
        `}</style>
        <div className="error-message">
          <span className="error-message-icon">⚠️</span>
          <div className="error-message-content">
            <div className="error-message-title">Session Not Found</div>
            <div className="error-message-text">
              Session ID not found. It may have been deleted or never existed.
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleUnpark = (): void => {
    if (state.data) {
      navigate(`/unpark?sessionId=${state.data.session_id}`);
    }
  };

  return (
    <motion.div
      className="view-session"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <style>{`
        .view-session {
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
        .session-card {
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
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .session-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .status-badge.active {
          background: #dcfce7;
          color: #16a34a;
        }
        .status-badge.completed {
          background: #f3f4f6;
          color: #6b7280;
        }
        .session-details {
          margin-bottom: 2rem;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #1e293b;
          font-size: 0.875rem;
        }
        .detail-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .detail-value.highlight {
          color: #1e40af;
          font-size: 1rem;
        }
        .continuous-badge {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 0.375rem;
          padding: 1rem;
          margin-bottom: 2rem;
          font-size: 0.875rem;
          color: #92400e;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .continuous-badge-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .continuous-badge-content {
          flex: 1;
        }
        .continuous-badge-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .continuous-badge-text {
          color: #92400e;
          font-size: 0.875rem;
        }
        .unpark-button {
          display: block;
          width: 100%;
          padding: 1rem;
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
        .unpark-button:hover {
          background: #1e3a8a;
          transform: translateY(-1px);
        }
        .unpark-button:active {
          transform: translateY(0);
        }
        @media (max-width: 640px) {
          .view-session {
            padding: 1rem 0.5rem;
          }
          .session-card {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🚗 Parking Session Details</h1>
          <p className="page-subtitle">View parking session information</p>
        </div>

        {/* Manual Session ID Entry Form */}
        {isManualMode && (
          <div className="form-card">
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

            {!state.data && !state.loading && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="sessionId" className="form-label">
                    Session ID
                  </label>
                  <input
                    id="sessionId"
                    type="text"
                    className="form-input"
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    placeholder="Enter session ID"
                    disabled={state.loading}
                  />
                  <p className="form-helper">
                    Enter the session ID to view parking session details.
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={state.loading}
                >
                  {state.loading ? 'Loading...' : 'View Session'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Session Details Card */}
        {state.data && (
          <div className="session-card">
            <div className="session-header">
              <h2 className="session-title">Session Details</h2>
              <motion.span
                className={`status-badge ${state.data.is_active ? 'active' : 'completed'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {state.data.is_active ? '🚗 Active' : '✅ Completed'}
              </motion.span>
            </div>

            <div className="session-details">
              <div className="detail-row">
                <span className="detail-label">Session ID:</span>
                <span className="detail-value">{state.data.session_id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Vehicle Type:</span>
                <span className="detail-value">{state.data.vehicle_type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Parking Slot:</span>
                <span className="detail-value">
                  {state.data.parking_slot?.slot_label || 'N/A'} ({state.data.parking_slot?.slot_type || 'N/A'})
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Entry Point:</span>
                <span className="detail-value">
                  {state.data.entry_point?.identifier || 'N/A'} - {state.data.entry_point?.name || 'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Parked At:</span>
                <span className="detail-value">
                  {new Date(state.data.parked_at).toLocaleString()}
                </span>
              </div>
              
              {state.data.exited_at && (
                <div className="detail-row">
                  <span className="detail-label">Exited At:</span>
                  <span className="detail-value">
                    {new Date(state.data.exited_at).toLocaleString()}
                  </span>
                </div>
              )}
              
              {state.data.duration_hours !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">
                    {state.data.duration_hours} hour{state.data.duration_hours !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {state.data.total_fee !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Total Fee:</span>
                  <span className="detail-value highlight">
                    ₱{state.data.total_fee.toFixed(2)}
                  </span>
                </div>
              )}
              
              {state.data.is_continuous && (
                <div className="continuous-badge">
                  <span className="continuous-badge-icon">♻️</span>
                  <div className="continuous-badge-content">
                    <div className="continuous-badge-title">Continuous Parking</div>
                    <div className="continuous-badge-text">
                      This vehicle returned within 1 hour of previous exit.
                      Fee is calculated from base_start_time.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {state.data.is_active && (
              <button 
                className="unpark-button"
                onClick={handleUnpark}
              >
                🚗 Unpark This Vehicle
              </button>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}

export default ViewSession;