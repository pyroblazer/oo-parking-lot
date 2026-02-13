/**
 * Green Flow Test Panel Component
 * 
 * A comprehensive test panel for running all 6 Postman Green Flow test scenarios
 * to verify business rules are working correctly in the OO Parking Lot System.
 * 
 * @module GreenFlowTestPanel
 */

import React, { useState, useCallback } from 'react';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Status of a scenario execution
 */
type ScenarioStatus = 'idle' | 'running' | 'passed' | 'failed';

/**
 * Result of a scenario execution
 */
interface ScenarioResult {
  status: ScenarioStatus;
  sessionId?: string;
  actualFee?: number | undefined;
  expectedFee: number;
  actualDuration?: number;
  expectedDuration: number;
  actualContinuous?: boolean;
  expectedContinuous?: boolean | undefined;
  feeBreakdown?: parkingApi.FeeBreakdown;
  error?: string;
  timestamp?: string;
}

/**
 * Configuration for a test scenario
 */
interface ScenarioConfig {
  id: number;
  title: string;
  description: string;
  vehicleType: 'S' | 'M' | 'L';
  entryPointId: string;
  parkedAt: string;
  exitedAt: string;
  expectedFee: number;
  expectedDuration: number;
  expectedContinuous?: boolean;
  isMultiStep?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Design system colors
 */
const COLORS = {
  primary: '#1e40af',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  background: 'rgba(255, 255, 255, 0.95)',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  cardBackground: '#ffffff',
  backdrop: 'rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Philippine Peso formatter
 */
const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Default initialization configuration
 */
const DEFAULT_INIT_CONFIG: parkingApi.InitializeConfig = {
  entry_points: [
    { identifier: 'A', name: 'Entry Point A' },
    { identifier: 'B', name: 'Entry Point B' },
    { identifier: 'C', name: 'Entry Point C' },
  ],
  parking_slots: [
    { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] },
    { slot_label: 'SP-2', slot_type: 'SP', distances: [2, 3, 6] },
    { slot_label: 'SP-3', slot_type: 'SP', distances: [3, 2, 7] },
    { slot_label: 'MP-1', slot_type: 'MP', distances: [1, 5, 4] },
    { slot_label: 'MP-2', slot_type: 'MP', distances: [2, 4, 5] },
    { slot_label: 'MP-3', slot_type: 'MP', distances: [3, 3, 6] },
    { slot_label: 'LP-1', slot_type: 'LP', distances: [1, 6, 3] },
    { slot_label: 'LP-2', slot_type: 'LP', distances: [2, 5, 4] },
    { slot_label: 'LP-3', slot_type: 'LP', distances: [3, 4, 5] },
  ],
};

/**
 * Test scenario configurations
 */
const SCENARIOS: readonly ScenarioConfig[] = [
  {
    id: 1,
    title: 'Scenario 1: Small Vehicle - Flat Rate',
    description: 'Park S from A at 10:30 → Unpark at 12:30 (2h)',
    vehicleType: 'S',
    entryPointId: 'A',
    parkedAt: '2024-01-15T10:30:00Z',
    exitedAt: '2024-01-15T12:30:00Z',
    expectedFee: 40.00,
    expectedDuration: 2.0,
  },
  {
    id: 2,
    title: 'Scenario 2: Medium Vehicle - Hourly Rate',
    description: 'Park M from B at 10:30 → Unpark at 15:30 (5h)',
    vehicleType: 'M',
    entryPointId: 'B',
    parkedAt: '2024-01-15T10:30:00Z',
    exitedAt: '2024-01-15T15:30:00Z',
    expectedFee: 160.00,
    expectedDuration: 5.0,
  },
  {
    id: 3,
    title: 'Scenario 3: Large Vehicle - Hourly Rate',
    description: 'Park L from C at 10:30 → Unpark at 14:30 (4h)',
    vehicleType: 'L',
    entryPointId: 'C',
    parkedAt: '2024-01-15T10:30:00Z',
    exitedAt: '2024-01-15T14:30:00Z',
    expectedFee: 140.00,
    expectedDuration: 4.0,
  },
  {
    id: 4,
    title: 'Scenario 4: Long-term Parking (26 hours)',
    description: 'Park L from A at 10:30 Jan 15 → Unpark at 12:30 Jan 16 (26h = 1 full day + 2h)',
    vehicleType: 'L',
    entryPointId: 'A',
    parkedAt: '2024-01-15T10:30:00Z',
    exitedAt: '2024-01-16T12:30:00Z',
    expectedFee: 5040.00,
    expectedDuration: 26.0,
  },
  {
    id: 5,
    title: 'Scenario 5: Continuous Rate (re-entry < 1h)',
    description: 'Park S from A at 09:45 → Unpark at 10:15 (30min). Re-park S from A at 10:30 (within 1h of exit). Second session should show is_continuous: true',
    vehicleType: 'S',
    entryPointId: 'A',
    parkedAt: '2024-01-15T09:45:00Z',
    exitedAt: '2024-01-15T10:15:00Z',
    expectedFee: 40.00,
    expectedDuration: 0.5,
    expectedContinuous: true,
    isMultiStep: true,
  },
  {
    id: 6,
    title: 'Scenario 6: Hour Rounding (6.4h → 7h)',
    description: 'Park S from A at 10:30 → Unpark at 17:24 (6.4h)',
    vehicleType: 'S',
    entryPointId: 'A',
    parkedAt: '2024-01-15T10:30:00Z',
    exitedAt: '2024-01-15T17:24:00Z',
    expectedFee: 120.00,
    expectedDuration: 7.0,
  },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Props for GreenFlowTestPanel component
 */
interface GreenFlowTestPanelProps {
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether the panel is visible */
  isVisible?: boolean;
}

/**
 * Green Flow Test Panel Component
 * 
 * Provides a comprehensive interface for running and validating all 6
 * Postman Green Flow test scenarios with time overrides and fee breakdowns.
 * 
 * @param props - Component props
 * @returns React component
 */
export const GreenFlowTestPanel: React.FC<GreenFlowTestPanelProps> = ({
  onClose,
  isVisible = true,
}) => {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initMessage, setInitMessage] = useState('');
  const [scenarioResults, setScenarioResults] = useState<readonly ScenarioResult[]>(
    SCENARIOS.map((scenario) => {
      const result: ScenarioResult = {
        status: 'idle' as ScenarioStatus,
        expectedFee: scenario.expectedFee,
        expectedDuration: scenario.expectedDuration,
      };
      if (scenario.expectedContinuous !== undefined) {
        result.expectedContinuous = scenario.expectedContinuous;
      }
      return result;
    })
  );
  const [runningScenarioId, setRunningScenarioId] = useState<number | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize the parking system
   */
  const handleInitializeSystem = useCallback(async (): Promise<void> => {
    setIsInitializing(true);
    setInitMessage('');
    setError(null);

    try {
      const result = await parkingApi.initializeSystem(DEFAULT_INIT_CONFIG);
      setIsInitialized(true);
      setInitMessage(
        `✓ System initialized: ${result.entry_points_created} entry points, ${result.parking_slots_created} parking slots`
      );
      
      // Reset all scenario results
      setScenarioResults(
        SCENARIOS.map((scenario) => {
          const result: ScenarioResult = {
            status: 'idle' as ScenarioStatus,
            expectedFee: scenario.expectedFee,
            expectedDuration: scenario.expectedDuration,
          };
          if (scenario.expectedContinuous !== undefined) {
            result.expectedContinuous = scenario.expectedContinuous;
          }
          return result;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize system';
      setError(errorMessage);
      setInitMessage(`✗ Failed to initialize: ${errorMessage}`);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Run a single scenario
   */
  const runScenario = useCallback(async (scenario: ScenarioConfig): Promise<void> => {
    const scenarioIndex = scenario.id - 1;
    
    // Update status to running
    setScenarioResults((prev) => {
      const updated = [...prev];
      const scenarioConfig = SCENARIOS[scenarioIndex];
      if (!scenarioConfig) return prev;
      
      updated[scenarioIndex] = {
        ...updated[scenarioIndex],
        status: 'running',
        expectedFee: scenarioConfig.expectedFee,
        expectedDuration: scenarioConfig.expectedDuration,
        timestamp: new Date().toISOString(),
      };
      return updated;
    });

    setRunningScenarioId(scenario.id);
    setError(null);

    try {
      let session: parkingApi.Session;
      let result: parkingApi.Session;

      if (scenario.isMultiStep) {
        // Scenario 5: Multi-step process
        // Step 1: Park and unpark first session
        session = await parkingApi.parkVehicle(
          scenario.vehicleType,
          scenario.entryPointId,
          scenario.parkedAt
        );

        result = await parkingApi.unpackVehicle(session.session_id, scenario.exitedAt);

        // Step 2: Re-park after 15 minutes (within 1 hour)
        const reParkTime = '2024-01-15T10:30:00Z';
        const reExitTime = '2024-01-15T11:30:00Z';
        
        const secondSession = await parkingApi.parkVehicle(
          scenario.vehicleType,
          scenario.entryPointId,
          reParkTime
        );

        result = await parkingApi.unpackVehicle(secondSession.session_id, reExitTime);
      } else {
        // Single-step scenario
        session = await parkingApi.parkVehicle(
          scenario.vehicleType,
          scenario.entryPointId,
          scenario.parkedAt
        );

        result = await parkingApi.unpackVehicle(session.session_id, scenario.exitedAt);
      }

      // Determine pass/fail
      const feeMatch = Math.abs((result.total_fee || 0) - scenario.expectedFee) < 0.01;
      const durationMatch = Math.abs((result.duration_hours || 0) - scenario.expectedDuration) < 0.01;
      const continuousMatch =
        scenario.expectedContinuous === undefined ||
        (result.is_continuous === scenario.expectedContinuous);

      const passed = feeMatch && durationMatch && continuousMatch;

      // Update result
      setScenarioResults((prev) => {
        const updated = [...prev];
        const newResult: ScenarioResult = {
          status: passed ? 'passed' : 'failed',
          sessionId: result.session_id,
          expectedFee: scenario.expectedFee,
          expectedDuration: scenario.expectedDuration,
          timestamp: new Date().toISOString(),
        };
        
        // Only include properties with defined values
        if (result.total_fee !== undefined) {
          newResult.actualFee = result.total_fee;
        }
        if (result.duration_hours !== undefined) {
          newResult.actualDuration = result.duration_hours;
        }
        if (result.is_continuous !== undefined) {
          newResult.actualContinuous = result.is_continuous;
        }
        if (scenario.expectedContinuous !== undefined) {
          newResult.expectedContinuous = scenario.expectedContinuous;
        }
        const feeBreakdown = result.fee_breakdown || result.breakdown;
        if (feeBreakdown !== undefined) {
          newResult.feeBreakdown = feeBreakdown;
        }
        
        updated[scenarioIndex] = newResult;
        return updated;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      setScenarioResults((prev) => {
        const updated = [...prev];
        const result: ScenarioResult = {
          status: 'failed',
          expectedFee: scenario.expectedFee,
          expectedDuration: scenario.expectedDuration,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };
        if (scenario.expectedContinuous !== undefined) {
          result.expectedContinuous = scenario.expectedContinuous;
        }
        updated[scenarioIndex] = result;
        return updated;
      });
    } finally {
      setRunningScenarioId(null);
    }
  }, []);

  /**
   * Run all scenarios in sequence
   */
  const runAllScenarios = useCallback(async (): Promise<void> => {
    if (!isInitialized) {
      await handleInitializeSystem();
    }

    setIsRunningAll(true);
    setError(null);

    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      if (!scenario) continue;
      
      setOverallProgress(i + 1);
      await runScenario(scenario);
    }

    setIsRunningAll(false);
    setOverallProgress(SCENARIOS.length);
  }, [isInitialized, handleInitializeSystem, runScenario]);

  /**
   * Handle scenario button click
   */
  const handleScenarioClick = useCallback(
    (scenarioId: number): void => {
      const scenario = SCENARIOS.find((s) => s.id === scenarioId);
      if (scenario) {
        runScenario(scenario);
      }
    },
    [runScenario]
  );

  /**
   * Render status badge
   */
  const renderStatusBadge = (status: ScenarioStatus): React.ReactNode => {
    switch (status) {
      case 'running':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#dbeafe',
              color: COLORS.primary,
            }}
          >
            🔄 Running
          </span>
        );
      case 'passed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#dcfce7',
              color: COLORS.success,
            }}
          >
            ✅ PASS
          </span>
        );
      case 'failed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              color: COLORS.danger,
            }}
          >
            ❌ FAIL
          </span>
        );
      default:
        return null;
    }
  };

  /**
   * Render fee breakdown
   */
  const renderFeeBreakdown = (breakdown: parkingApi.FeeBreakdown): React.ReactNode => {
    return (
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          fontSize: '13px',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '8px', color: COLORS.text }}>
          Fee Breakdown:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          <div>
            <span style={{ color: COLORS.textSecondary }}>Total Fee:</span>{' '}
            <span style={{ fontWeight: 500, color: COLORS.text }}>
              {pesoFormatter.format(breakdown.total_fee)}
            </span>
          </div>
          <div>
            <span style={{ color: COLORS.textSecondary }}>Duration:</span>{' '}
            <span style={{ fontWeight: 500, color: COLORS.text }}>
              {breakdown.duration_hours.toFixed(2)}h
            </span>
          </div>
          <div>
            <span style={{ color: COLORS.textSecondary }}>Continuous:</span>{' '}
            <span style={{ fontWeight: 500, color: COLORS.text }}>
              {breakdown.is_continuous ? 'Yes' : 'No'}
            </span>
          </div>
          {breakdown.long_term.days > 0 && (
            <div>
              <span style={{ color: COLORS.textSecondary }}>Long-term:</span>{' '}
              <span style={{ fontWeight: 500, color: COLORS.text }}>
                {breakdown.long_term.days} days ({pesoFormatter.format(breakdown.long_term.fee)})
              </span>
            </div>
          )}
          <div>
            <span style={{ color: COLORS.textSecondary }}>Base Fee:</span>{' '}
            <span style={{ fontWeight: 500, color: COLORS.text }}>
              {pesoFormatter.format(breakdown.remaining.base_fee)}
            </span>
          </div>
          <div>
            <span style={{ color: COLORS.textSecondary }}>Exceeding Hours:</span>{' '}
            <span style={{ fontWeight: 500, color: COLORS.text }}>
              {breakdown.remaining.exceeding_hours}
            </span>
          </div>
          <div>
            <span style={{ color: COLORS.textSecondary }}>Exceeding Fee:</span>{' '}
            <span style={{ fontWeight: 500, color: COLORS.text }}>
              {pesoFormatter.format(breakdown.remaining.exceeding_fee)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render scenario card
   */
  const renderScenarioCard = (scenario: ScenarioConfig, index: number): React.ReactNode => {
    const result = scenarioResults[index];
    const isRunning = runningScenarioId === scenario.id || (isRunningAll && result?.status === 'running');

    return (
      <div
        key={scenario.id}
        style={{
          backgroundColor: COLORS.cardBackground,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '4px',
              }}
            >
              {scenario.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: COLORS.textSecondary,
                lineHeight: '1.4',
              }}
            >
              {scenario.description}
            </p>
          </div>
          {result?.status !== 'idle' && result?.status && renderStatusBadge(result.status)}
        </div>

        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: COLORS.textSecondary }}>Expected Fee:</span>{' '}
            <span style={{ fontWeight: 600, color: COLORS.text }}>
              {pesoFormatter.format(scenario.expectedFee)}
            </span>
          </div>
          {scenario.expectedContinuous !== undefined && (
            <div>
              <span style={{ color: COLORS.textSecondary }}>Expected Continuous:</span>{' '}
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                {scenario.expectedContinuous ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>

        {result?.status !== 'idle' && result?.status && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: result.status === 'passed' ? '#f0fdf4' : '#fef2f2',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: COLORS.textSecondary }}>Actual Fee:</span>{' '}
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                {result?.actualFee !== undefined ? pesoFormatter.format(result.actualFee) : 'N/A'}
              </span>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: COLORS.textSecondary }}>Actual Duration:</span>{' '}
              <span style={{ fontWeight: 600, color: COLORS.text }}>
                {result?.actualDuration !== undefined ? `${result.actualDuration.toFixed(2)}h` : 'N/A'}
              </span>
            </div>
            {result?.actualContinuous !== undefined && (
              <div>
                <span style={{ color: COLORS.textSecondary }}>Actual Continuous:</span>{' '}
                <span style={{ fontWeight: 600, color: COLORS.text }}>
                  {result.actualContinuous ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            {result?.error && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '4px',
                  color: COLORS.danger,
                  fontSize: '12px',
                }}
              >
                {result.error}
              </div>
            )}
          </div>
        )}

        {result?.feeBreakdown && renderFeeBreakdown(result.feeBreakdown)}

        <button
          onClick={() => handleScenarioClick(scenario.id)}
          disabled={isRunning || isRunningAll || !isInitialized}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            backgroundColor: isRunning ? COLORS.textSecondary : COLORS.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning || !isInitialized ? 0.6 : 1,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isRunning && isInitialized) {
              e.currentTarget.style.backgroundColor = '#1e3a8a';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isRunning ? COLORS.textSecondary : COLORS.primary;
          }}
        >
          {isRunning ? '🔄 Running...' : `▶ Run Scenario ${scenario.id}`}
        </button>
      </div>
    );
  };

  // Calculate summary
  const passedCount = scenarioResults.filter((r) => r.status === 'passed').length;
  const failedCount = scenarioResults.filter((r) => r.status === 'failed').length;
  const completedCount = passedCount + failedCount;

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.backdrop,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '20px',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.background,
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.border}`,
            backgroundColor: '#f9fafb',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.text,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🧪 Green Flow Test Scenarios
            </h1>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: COLORS.textSecondary,
              }}
            >
              Run these scenarios in order to verify all business rules are working correctly.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: COLORS.textSecondary,
              border: 'none',
              borderRadius: '6px',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Initialize System */}
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: isInitialized ? '#f0fdf4' : '#fef3c7',
              borderRadius: '8px',
              border: `1px solid ${isInitialized ? COLORS.success : COLORS.warning}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '4px',
                  }}
                >
                  {isInitialized ? '✓ System Initialized' : '⚠ System Not Initialized'}
                </h3>
                {initMessage && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: COLORS.textSecondary,
                    }}
                  >
                    {initMessage}
                  </p>
                )}
              </div>
              <button
                onClick={handleInitializeSystem}
                disabled={isInitializing || isRunningAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isInitializing ? COLORS.textSecondary : COLORS.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isInitializing ? 'not-allowed' : 'pointer',
                  opacity: isInitializing ? 0.6 : 1,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isInitializing) {
                    e.currentTarget.style.backgroundColor = '#1e3a8a';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isInitializing ? COLORS.textSecondary : COLORS.primary;
                }}
              >
                {isInitializing ? '🔄 Initializing...' : '🔄 Initialize System First'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                border: `1px solid ${COLORS.danger}`,
                color: COLORS.danger,
                fontSize: '13px',
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Run All Button */}
          <div
            style={{
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                Test Scenarios
              </h3>
              {completedCount > 0 && (
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: COLORS.textSecondary,
                  }}
                >
                  {passedCount}/{completedCount} passed
                  {failedCount > 0 && `, ${failedCount} failed`}
                </p>
              )}
            </div>
            <button
              onClick={runAllScenarios}
              disabled={isRunningAll || isInitializing}
              style={{
                padding: '10px 20px',
                backgroundColor: isRunningAll ? COLORS.textSecondary : COLORS.success,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isRunningAll ? 'not-allowed' : 'pointer',
                opacity: isRunningAll ? 0.6 : 1,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isRunningAll) {
                  e.currentTarget.style.backgroundColor = '#15803d';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isRunningAll ? COLORS.textSecondary : COLORS.success;
              }}
            >
              {isRunningAll
                ? `🔄 Running... (${overallProgress}/${SCENARIOS.length})`
                : '▶▶ Run All Scenarios'}
            </button>
          </div>

          {/* Scenario Cards */}
          {SCENARIOS.map((scenario, index) => renderScenarioCard(scenario, index))}
        </div>
      </div>
    </div>
  );
};

export default GreenFlowTestPanel;
