/**
 * Available Slots Component
 *
 * This component displays available parking slots based on vehicle type and entry point.
 * Includes scroll-triggered animations and staggered reveals.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableSlots, getEntryPoints } from '../api';
import type {
  VehicleType,
  EntryPointIdentifier,
  EntryPoint,
  ParkingSlot,
  AsyncState,
} from '../types';
import './AvailableSlots.css';

/**
 * AvailableSlots component
 */
function AvailableSlots(): JSX.Element {
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [entryPointId, setEntryPointId] = useState<EntryPointIdentifier>('');
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [state, setState] = useState<AsyncState<unknown>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    void loadEntryPoints();
  }, []);

  const loadEntryPoints = async (): Promise<void> => {
    try {
      const data = await getEntryPoints();
      setEntryPoints(data);
      if (data.length > 0) {
        const firstEntryPoint = data[0];
        if (firstEntryPoint) {
          setEntryPointId(firstEntryPoint.identifier);
        }
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: new Error('Failed to load entry points'),
      }));
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!vehicleType || !entryPointId) {
      setState(prev => ({
        ...prev,
        error: new Error('Please select vehicle type and entry point'),
      }));
      return;
    }

    setState({
      data: null,
      loading: true,
      error: null,
    });

    setHasSearched(true);

    try {
      const response = await getAvailableSlots(vehicleType, entryPointId);
      setSlots([...response.available_slots]);
      setState({
        data: response,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to load available slots'),
      });
    }
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

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="available-slots"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 variants={itemVariants} className="kinetic-typography">
        🅿️ Available Parking Slots
      </motion.h2>

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

      <motion.div className="search-form" variants={itemVariants}>
        <motion.div className="form-group" variants={itemVariants}>
          <label htmlFor="vehicleType">Vehicle Type:</label>
          <MagneticSelect
            id="vehicleType"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
          >
            <option value="">Select vehicle type</option>
            <option value="S">Small (S)</option>
            <option value="M">Medium (M)</option>
            <option value="L">Large (L)</option>
          </MagneticSelect>
        </motion.div>

        <motion.div className="form-group" variants={itemVariants}>
          <label htmlFor="entryPoint">Entry Point:</label>
          <MagneticSelect
            id="entryPoint"
            value={entryPointId}
            onChange={(e) => setEntryPointId(e.target.value)}
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
            onClick={handleSearch}
            disabled={state.loading}
            className="search-button"
          >
            {state.loading ? 'Searching...' : 'Search Available Slots'}
          </MagneticButton>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {slots.length > 0 ? (
          <>
            <motion.div
              className="results-header"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <h3>Available Slots: {slots.length}</h3>
            </motion.div>
            <motion.div
              className="slots-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
                {slots.map((slot, index) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    index={index}
                    entryPointId={entryPointId}
                    entryPoints={entryPoints}
                  />
                ))}
            </motion.div>
          </>
        ) : hasSearched && !state.loading ? (
          <motion.div
            className="no-slots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>
              No compatible slots found for{' '}
              <strong>{vehicleType}</strong> from{' '}
              <strong>{entryPoints.find(ep => ep.identifier === entryPointId)?.name || entryPointId}</strong>
            </p>
            <MagneticButton
              onClick={handleSearch}
              className="retry-button"
            >
              Try Again
            </MagneticButton>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CompatibilityInfo />
    </motion.div>
  );
}

/**
 * SlotCard component for displaying individual parking slots
 */
interface SlotCardProps {
  readonly slot: ParkingSlot;
  readonly index: number;
  readonly entryPointId: EntryPointIdentifier;
  readonly entryPoints: EntryPoint[];
}

function SlotCard({ slot, index, entryPointId, entryPoints }: SlotCardProps): JSX.Element {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const entryPoint = entryPoints.find(ep => ep.identifier === entryPointId);
  const distance = slot.distances?.[0] ?? 0;

  return (
    <motion.div
      className="slot-card"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="slot-header">
        <span className={`slot-type ${slot.slot_type}`}>
          {slot.slot_type}
        </span>
        <span className="slot-label">{slot.slot_label}</span>
      </div>
      <div className="slot-details">
        <p>
          <strong>Distance:</strong> {distance} units from{' '}
          {entryPoint?.name || entryPointId}
        </p>
        <p className="available">✅ Available</p>
      </div>
    </motion.div>
  );
}

/**
 * MagneticSelect component with hover effects
 */
interface MagneticSelectProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  readonly children: React.ReactNode;
}

function MagneticSelect({
  id,
  value,
  onChange,
  children,
}: MagneticSelectProps): JSX.Element {
  return (
    <motion.select
      id={id}
      value={value}
      onChange={onChange}
      className="magnetic-select"
      whileHover={{ scale: 1.02 }}
      whileFocus={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {children}
    </motion.select>
  );
}

/**
 * MagneticButton component with hover effects
 */
interface MagneticButtonProps {
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

function MagneticButton({
  children,
  onClick,
  disabled = false,
  className = '',
}: MagneticButtonProps): JSX.Element {
  return (
    <motion.button
      className={`magnetic-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.button>
  );
}

/**
 * Compatibility info section
 */
function CompatibilityInfo(): JSX.Element {
  return (
    <div className="compatibility-info">
      <h4>Vehicle Type Compatibility</h4>
      <table className="compatibility-table">
        <tbody>
          <tr>
            <td>Small (S)</td>
            <td>Compatible with SP, MP, LP</td>
          </tr>
          <tr>
            <td>Medium (M)</td>
            <td>Compatible with MP, LP</td>
          </tr>
          <tr>
            <td>Large (L)</td>
            <td>Compatible with LP only</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default AvailableSlots;