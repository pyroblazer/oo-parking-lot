/**
 * Park Vehicle Component
 * 
 * This component allows users to park a vehicle by selecting vehicle type and entry point.
 * Includes magnetic hover effects and staggered animations.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { parkVehicle, getEntryPoints } from '../api';
import type {
  VehicleType,
  EntryPointIdentifier,
  EntryPoint,
  ParkingSession,
  AsyncStateWithSuccess,
} from '../types';
import HealthCheck from './HealthCheck';
import './ParkVehicle.css';

/**
 * ParkVehicle component
 */
function ParkVehicle(): JSX.Element {
  const navigate = useNavigate();
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [entryPointId, setEntryPointId] = useState<EntryPointIdentifier>('');
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [state, setState] = useState<AsyncStateWithSuccess<ParkingSession>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  useEffect(() => {
    void loadEntryPoints();
  }, []);

  const loadEntryPoints = async (): Promise<void> => {
    try {
      const data = await getEntryPoints();
      setEntryPoints(data);
      // Do not auto-select entry point - user must explicitly select one
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: new Error('Failed to load entry points'),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!vehicleType) {
      setState(prev => ({
        ...prev,
        error: new Error('Please select a vehicle type'),
      }));
      return;
    }
    if (!entryPointId) {
      setState(prev => ({
        ...prev,
        error: new Error('Please select an entry point'),
      }));
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
      success: false,
    });

    try {
      const response = await parkVehicle(vehicleType, entryPointId);
      setState({
        data: response,
        loading: false,
        error: null,
        success: true,
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to park vehicle'),
        success: false,
      });
    }
  };

  const handleViewSession = (): void => {
    if (state.data) {
      navigate(`/session/${state.data.session_id}`);
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
      className="park-vehicle"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      data-testid="park-vehicle"
    >
      <motion.h2 variants={itemVariants} className="kinetic-typography" data-testid="park-vehicle-title">
        🚗️ Park Vehicle
      </motion.h2>

      <HealthCheck className="health-check-header" />

      <AnimatePresence>
        {state.error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            ❌ {state.error instanceof Error ? state.error.message : String(state.error)}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.success && (
          <motion.div
            className="success-message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            ✅ Vehicle parked successfully!
            {state.data && (
              <>
                {' '}Session ID: {state.data.session_id}
                <motion.button
                  className="view-session-btn"
                  onClick={handleViewSession}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Session
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form
        onSubmit={handleSubmit}
        variants={itemVariants}
        className="park-vehicle-form"
      >
        <motion.div className="form-group" variants={itemVariants}>
          <label htmlFor="vehicleType">Vehicle Type <span className="required-indicator">*</span>:</label>
          <MagneticSelect
            id="vehicleType"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            disabled={state.loading}
            data-testid="vehicle-type-select"
          >
            <option value="">Select vehicle type</option>
            <option value="S">Small (S)</option>
            <option value="M">Medium (M)</option>
            <option value="L">Large (L)</option>
          </MagneticSelect>
        </motion.div>

        <motion.div className="form-group" variants={itemVariants}>
          <label htmlFor="entryPoint">Entry Point <span className="required-indicator">*</span>:</label>
          <MagneticSelect
            id="entryPoint"
            value={entryPointId}
            onChange={(e) => setEntryPointId(e.target.value)}
            disabled={state.loading}
            data-testid="entry-point-select"
          >
            <option value="">Select entry point</option>
            {entryPoints.map((ep) => (
              <option key={ep.id} value={ep.identifier}>
                {ep.name} ({ep.identifier})
              </option>
            ))}
          </MagneticSelect>
        </motion.div>

        <motion.div variants={itemVariants}>
          <MagneticButton
            type="submit"
            disabled={state.loading}
            className="submit-button"
            data-testid="park-vehicle-submit"
          >
            {state.loading ? 'Parking...' : 'Park Vehicle'}
          </MagneticButton>
        </motion.div>
      </motion.form>

      <motion.div className="info-box" variants={itemVariants}>
        <h3>📋 Vehicle Types</h3>
        <ul>
          <li><strong>Small (S)</strong>: Can park in SP, MP, or LP slots</li>
          <li><strong>Medium (M)</strong>: Can park in MP or LP slots</li>
          <li><strong>Large (L)</strong>: Can only park in LP slots</li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

/**
 * MagneticButton component with hover effects
 */
interface MagneticButtonProps {
  readonly children: React.ReactNode;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

function MagneticButton({
  children,
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  'data-testid': dataTestId,
}: MagneticButtonProps): JSX.Element {
  return (
    <motion.button
      type={type}
      className={`magnetic-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      data-testid={dataTestId}
    >
      {children}
    </motion.button>
  );
}

/**
 * MagneticSelect component with hover effects
 */
interface MagneticSelectProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  readonly disabled?: boolean;
  readonly children: React.ReactNode;
  readonly 'data-testid'?: string;
}

function MagneticSelect({
  id,
  value,
  onChange,
  disabled = false,
  children,
  'data-testid': dataTestId,
}: MagneticSelectProps): JSX.Element {
  return (
    <motion.select
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="magnetic-select"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      data-testid={dataTestId}
    >
      {children}
    </motion.select>
  );
}

export default ParkVehicle;
