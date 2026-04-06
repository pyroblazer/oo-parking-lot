/**
 * Main Application Component
 *
 * This is the root component of the OO Parking Lot application with enhanced
 * visual effects including cursor-driven spotlight, parallax, and kinetic typography.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ParkVehicle from './components/ParkVehicle';
import UnparkVehicle from './components/UnparkVehicle';
import ViewSession from './components/ViewSession';
import AvailableSlots from './components/AvailableSlots';
import SlotsManagement from './components/SlotsManagement';
import EntryPointsManagement from './components/EntryPointsManagement';
import SessionsManagement from './components/SessionsManagement';
import BillingAuditLogsManagement from './components/BillingAuditLogsManagement';
import KafkaEventsManagement from './components/KafkaEventsManagement';
import SpotlightMask from './effects/SpotlightMask';
import FluidParticleBackground from './effects/FluidParticleBackground';
import { ParkingProvider } from './context/ParkingContext';
import './App.css';

/**
 * Helper function to detect test environment
 * @returns true if running in a test environment
 */
const isTestEnvironment = (): boolean => {
  return window.location.search.includes('test=true') ||
         (window as unknown as { __SELENIUM_TEST__?: boolean }).__SELENIUM_TEST__ === true;
};

/**
 * Main App component
 */
function App(): JSX.Element {
  return (
    <ParkingProvider>
      <BrowserRouter>
        <div className="app">
          {/* Visual Effects Layer - Only render in non-test environments */}
          {!isTestEnvironment() && <FluidParticleBackground />}
          {!isTestEnvironment() && <SpotlightMask />}

          <header className="app-header">
            <h1 className="kinetic-typography">🚗️ OO Parking Lot</h1>
            <nav className="app-nav">
              <NavigationButtons />
            </nav>
          </header>

          <main className="app-main">
           <Routes>
               <Route path="/" element={<ParkVehicle />} />
               <Route path="/park" element={<ParkVehicle />} />
               <Route path="/unpark" element={<UnparkVehicle />} />
               <Route path="/session" element={<ViewSession />} />
               <Route path="/session/:id" element={<ViewSession />} />
               <Route path="/slots" element={<AvailableSlots />} />
               <Route path="/slots-management" element={<SlotsManagement />} />
               <Route path="/entry-points-management" element={<EntryPointsManagement />} />
               <Route path="/sessions-management" element={<SessionsManagement />} />
               <Route path="/billing-audit-logs" element={<BillingAuditLogsManagement />} />
               <Route path="/kafka-events" element={<KafkaEventsManagement />} />
             </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ParkingProvider>
  );
}

/**
 * NavigationButtons component with React Router navigation
 */
function NavigationButtons(): JSX.Element {
  const navigate = useNavigate();

  return (
    <>
      <MagneticButton onClick={() => navigate('/')} data-testid="nav-home">Home</MagneticButton>
      <MagneticButton onClick={() => navigate('/park')} data-testid="nav-park">Park Vehicle</MagneticButton>
      <MagneticButton onClick={() => navigate('/unpark')} data-testid="nav-unpark">Unpark Vehicle</MagneticButton>
      <MagneticButton onClick={() => navigate('/slots')} data-testid="nav-slots">Available Slots</MagneticButton>
      <MagneticButton onClick={() => navigate('/slots-management')} data-testid="nav-slots-management">Slots Management</MagneticButton>
      <MagneticButton onClick={() => navigate('/entry-points-management')} data-testid="nav-entry-points">Entry Points</MagneticButton>
      <MagneticButton onClick={() => navigate('/sessions-management')} data-testid="nav-sessions">Sessions Management</MagneticButton>
      <MagneticButton onClick={() => navigate('/billing-audit-logs')} data-testid="nav-billing">Billing Logs</MagneticButton>
      <MagneticButton onClick={() => navigate('/kafka-events')} data-testid="nav-kafka">Kafka Events</MagneticButton>
    </>
  );
}

/**
 * Magnetic button component with hover effects
 */
interface MagneticButtonProps {
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

function MagneticButton({ children, onClick, className = '', 'data-testid': dataTestId }: MagneticButtonProps): JSX.Element {
  return (
    <button 
      className={`magnetic-button ${className}`}
      onClick={onClick}
      data-testid={dataTestId}
    >
      {children}
    </button>
  );
}

export default App;
