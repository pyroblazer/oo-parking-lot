/**
 * Sessions Page
 *
 * Displays all parking sessions with filtering, sorting, and unpark functionality.
 * Features include live duration counters, unpark modal with time override, and fee receipt display.
 *
 * @module Sessions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as parkingApi from '../api/parkingApi';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filter type for sessions
 */
type FilterType = 'all' | 'active' | 'completed';

/**
 * Sortable column type
 */
type SortColumn = 'session_id' | 'vehicle_type' | 'slot' | 'entry_point' | 'parked_at' | 'duration' | 'status';

/**
 * Sort direction type
 */
type SortDirection = 'asc' | 'desc';

/**
 * Unpark modal state
 */
interface UnparkModalState {
  isOpen: boolean;
  session: parkingApi.Session | null;
  overrideTime: string;
  isTestOptionsExpanded: boolean;
}

/**
 * Fee receipt modal state
 */
interface FeeReceiptModalState {
  isOpen: boolean;
  receipt: parkingApi.Session | null;
}

/**
 * Page state interface
 */
interface PageState {
  sessions: parkingApi.Session[];
  filteredSessions: parkingApi.Session[];
  filter: FilterType;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  searchQuery: string;
  currentPage: number;
  perPage: number;
  total: number;
  loading: boolean;
  error: string | null;
  lastRefreshTime: Date | null;
  unparkModal: UnparkModalState;
  feeReceiptModal: FeeReceiptModalState;
  isUnparking: boolean;
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
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

/**
 * Slot type colors
 */
const SLOT_TYPE_COLORS = {
  SP: { bg: '#dbeafe', text: '#1e40af', label: 'Small' },
  MP: { bg: '#f3e8ff', text: '#7c3aed', label: 'Medium' },
  LP: { bg: '#ffedd5', text: '#c2410c', label: 'Large' },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency in Philippine Peso
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.5); // '₱1,234.50'
 * ```
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date and time for display
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * formatDateTime('2024-01-15T10:30:00Z'); // 'Jan 15, 2024 10:30 AM'
 * ```
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Calculate duration from parked_at to now
 * 
 * @param parkedAt - ISO date string when vehicle was parked
 * @returns Duration object with hours and minutes
 */
function calculateDuration(parkedAt: string): { hours: number; minutes: number; roundedHours: number } {
  const parked = new Date(parkedAt);
  const now = new Date();
  const diffMs = now.getTime() - parked.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  const roundedHours = Math.ceil(diffMins / 60);
  
  return { hours, minutes, roundedHours };
}

/**
 * Format duration for display
 * 
 * @param hours - Number of hours
 * @param minutes - Number of minutes
 * @param roundedHours - Rounded hours (ceiling)
 * @returns Formatted duration string
 */
function formatDuration(hours: number, minutes: number, roundedHours?: number): string {
  let result = '';
  
  if (hours > 0) {
    result += `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  if (minutes > 0) {
    if (result) result += ' ';
    result += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (roundedHours !== undefined && roundedHours > 0) {
    result += ` (→ rounds to ${roundedHours}h)`;
  }
  
  return result || '0 minutes';
}

/**
 * Get vehicle type label
 * 
 * @param type - Vehicle type code
 * @returns Full vehicle type label
 */
function getVehicleTypeLabel(type: string): string {
  switch (type) {
    case 'S':
      return 'Small';
    case 'M':
      return 'Medium';
    case 'L':
      return 'Large';
    default:
      return type;
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Status Badge Component
 * Displays session status with appropriate color coding
 */
function StatusBadge({ status, isContinuous }: { status: 'active' | 'completed'; isContinuous?: boolean }): JSX.Element {
  if (isContinuous) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
        <span className="mr-1">♻️</span>
        Continuous
      </span>
    );
  }
  
  if (status === 'active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Completed
    </span>
  );
}

/**
 * Slot Type Badge Component
 * Displays slot type with appropriate color coding
 */
function SlotTypeBadge({ type }: { type: string }): JSX.Element {
  const colors = SLOT_TYPE_COLORS[type as keyof typeof SLOT_TYPE_COLORS] || {
    bg: COLORS.neutral[100],
    text: COLORS.neutral[700],
    label: type,
  };
  
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}

/**
 * Vehicle Type Badge Component
 * Displays vehicle type with appropriate styling
 */
function VehicleTypeBadge({ type }: { type: string }): JSX.Element {
  const labels: Record<string, string> = {
    S: 'S (Small)',
    M: 'M (Medium)',
    L: 'L (Large)',
  };
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
      {labels[type] || type}
    </span>
  );
}

/**
 * Live Duration Component
 * Displays live updating duration for active sessions
 */
function LiveDuration({ parkedAt, isActive }: { parkedAt: string; isActive: boolean }): JSX.Element {
  const [duration, setDuration] = useState(() => calculateDuration(parkedAt));
  
  useEffect(() => {
    if (!isActive) return;
    
    const intervalId = setInterval(() => {
      setDuration(calculateDuration(parkedAt));
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(intervalId);
  }, [parkedAt, isActive]);
  
  return (
    <span className="font-mono text-sm">
      {formatDuration(duration.hours, duration.minutes, duration.roundedHours)}
    </span>
  );
}

/**
 * Unpark Modal Component
 * Modal for confirming unpark with optional time override
 */
function UnparkModal({
  isOpen,
  session,
  overrideTime,
  isTestOptionsExpanded,
  isUnparking,
  onClose,
  onConfirm,
  onOverrideTimeChange,
  onToggleTestOptions,
}: {
  isOpen: boolean;
  session: parkingApi.Session | null;
  overrideTime: string;
  isTestOptionsExpanded: boolean;
  isUnparking: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onOverrideTimeChange: (value: string) => void;
  onToggleTestOptions: () => void;
}): JSX.Element | null {
  if (!isOpen || !session) return null;
  
  const duration = calculateDuration(session.parked_at);
  const estimatedFee = duration.roundedHours * 40; // Base rate calculation
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Unpark Vehicle
                </h3>
                <div className="mt-4 space-y-3">
                  {/* Session Details */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900">Session ID:</span>
                      <span className="font-medium">{session.session_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium">
                        {session.vehicle_type} ({getVehicleTypeLabel(session.vehicle_type)}) @ {session.parking_slot.slot_label}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Parked:</span>
                      <span className="font-medium">{formatDateTime(session.parked_at)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {formatDuration(duration.hours, duration.minutes, duration.roundedHours)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Test Options */}
                  <div className="border rounded-lg">
                    <button
                      type="button"
                      onClick={onToggleTestOptions}
                      className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <span>Test Options</span>
                      <svg
                        className={`h-5 w-5 transform transition-transform ${isTestOptionsExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isTestOptionsExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Override Exit Time
                        </label>
                        <input
                          type="datetime-local"
                          value={overrideTime}
                          onChange={(e) => onOverrideTimeChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Leave empty to use server time
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Estimated Fee */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Estimated Fee:</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(estimatedFee)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      (Based on {duration.roundedHours}h in {session.parking_slot.slot_type} slot)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isUnparking}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnparking ? 'Processing...' : 'Confirm Unpark →'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isUnparking}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fee Receipt Modal Component
 * Displays detailed fee breakdown after unparking
 */
function FeeReceiptModal({
  isOpen,
  receipt,
  onClose,
  onPrint,
}: {
  isOpen: boolean;
  receipt: parkingApi.Session | null;
  onClose: () => void;
  onPrint: () => void;
}): JSX.Element | null {
  if (!isOpen || !receipt) return null;
  
  const breakdown = receipt.fee_breakdown || receipt.breakdown;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🧾</div>
              <h3 className="text-xl font-bold text-gray-900">Parking Receipt</h3>
            </div>
            
            {/* Session Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">Session ID:</span>
                <span className="font-medium">{receipt.session_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vehicle Type:</span>
                <span className="font-medium">
                  {getVehicleTypeLabel(receipt.vehicle_type)} ({receipt.vehicle_type})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Slot:</span>
                <span className="font-medium">{receipt.parking_slot.slot_label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entry Point:</span>
                <span className="font-medium">{typeof receipt.entry_point === 'string' ? receipt.entry_point : receipt.entry_point?.identifier || ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Parked At:</span>
                <span className="font-medium">{formatDateTime(receipt.parked_at)}</span>
              </div>
              {receipt.exited_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exited At:</span>
                  <span className="font-medium">{formatDateTime(receipt.exited_at)}</span>
                </div>
              )}
              {receipt.duration_hours !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{receipt.duration_hours} hour{receipt.duration_hours !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            
            {/* Fee Breakdown */}
            {breakdown && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Fee Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Base Rate (3h):</span>
                    <span className="font-medium">{formatCurrency(breakdown.remaining.base_fee)}</span>
                  </div>
                  {breakdown.remaining.exceeding_hours > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        Exceeding ({breakdown.remaining.exceeding_hours}h × ₱{breakdown.remaining.exceeding_hours > 0 ? (breakdown.remaining.exceeding_fee / breakdown.remaining.exceeding_hours).toFixed(0) : '0'}):
                      </span>
                      <span className="font-medium">{formatCurrency(breakdown.remaining.exceeding_fee)}</span>
                    </div>
                  )}
                  {breakdown.long_term.days > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Long-term ({breakdown.long_term.days} day{breakdown.long_term.days !== 1 ? 's' : ''}):</span>
                      <span className="font-medium">{formatCurrency(breakdown.long_term.fee)}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                    <span className="text-sm font-semibold text-blue-900">TOTAL:</span>
                    <span className="text-lg font-bold text-blue-900">{formatCurrency(breakdown.total_fee)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Continuous Rate */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-sm text-gray-700">Continuous Rate:</span>
              {breakdown?.is_continuous ? (
                <span className="text-sm font-medium text-teal-600">
                  Yes <span className="ml-1">♻️</span>
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-600">No</span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onPrint}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Print Receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State Component
 * Displays when no sessions match the current filter
 */
function EmptyState({ filter, searchQuery }: { filter: FilterType; searchQuery: string }): JSX.Element {
  let message = 'No sessions found';
  let submessage = 'There are no parking sessions to display.';
  
  if (filter === 'active') {
    message = 'No Active Sessions';
    submessage = 'There are currently no active parking sessions.';
  } else if (filter === 'completed') {
    message = 'No Completed Sessions';
    submessage = 'There are no completed parking sessions yet.';
  }
  
  if (searchQuery) {
    submessage = `No sessions match "${searchQuery}". Try a different search term.`;
  }
  
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{message}</h3>
      <p className="mt-1 text-sm text-gray-500">{submessage}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Sessions Page Component
 * Main page component for displaying and managing parking sessions
 */
export default function Sessions(): JSX.Element {
  // State
  const [state, setState] = useState<PageState>({
    sessions: [],
    filteredSessions: [],
    filter: 'all',
    sortColumn: 'parked_at',
    sortDirection: 'desc',
    searchQuery: '',
    currentPage: 1,
    perPage: 20,
    total: 0,
    loading: false,
    error: null,
    lastRefreshTime: null,
    unparkModal: {
      isOpen: false,
      session: null,
      overrideTime: '',
      isTestOptionsExpanded: false,
    },
    feeReceiptModal: {
      isOpen: false,
      receipt: null,
    },
    isUnparking: false,
  });
  
  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await parkingApi.listSessions(state.currentPage, state.perPage);
      setState(prev => ({
        ...prev,
        sessions: result.sessions,
        total: result.total,
        loading: false,
        lastRefreshTime: new Date(),
      }));
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to fetch sessions';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  }, [state.currentPage, state.perPage]);
  
  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchSessions();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchSessions]);
  
  // Filter and sort sessions
  const filteredAndSortedSessions = useMemo(() => {
    let sessions = [...state.sessions];
    
    // Apply filter
    if (state.filter === 'active') {
      sessions = sessions.filter(s => !s.exited_at);
    } else if (state.filter === 'completed') {
      sessions = sessions.filter(s => !!s.exited_at);
    }
    
    // Apply search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      sessions = sessions.filter(s => 
        s.session_id.toLowerCase().includes(query) ||
        s.parking_slot.slot_label.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    sessions.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sortColumn) {
        case 'session_id':
          comparison = a.session_id.localeCompare(b.session_id);
          break;
        case 'vehicle_type':
          comparison = a.vehicle_type.localeCompare(b.vehicle_type);
          break;
        case 'slot':
          comparison = a.parking_slot.slot_label.localeCompare(b.parking_slot.slot_label);
          break;
        case 'entry_point':
          comparison = (a.entry_point?.identifier || a.entry_point?.name || '')
            .localeCompare(b.entry_point?.identifier || b.entry_point?.name || '');
          break;
        case 'parked_at':
          comparison = new Date(a.parked_at).getTime() - new Date(b.parked_at).getTime();
          break;
        case 'duration': {
          const aDuration = a.exited_at
            ? new Date(a.exited_at).getTime() - new Date(a.parked_at).getTime()
            : new Date().getTime() - new Date(a.parked_at).getTime();
          const bDuration = b.exited_at
            ? new Date(b.exited_at).getTime() - new Date(b.parked_at).getTime()
            : new Date().getTime() - new Date(b.parked_at).getTime();
          comparison = aDuration - bDuration;
          break;
        }
        case 'status':
          comparison = (a.exited_at ? 1 : 0) - (b.exited_at ? 1 : 0);
          break;
      }
      
      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sessions;
  }, [state.sessions, state.filter, state.sortColumn, state.sortDirection, state.searchQuery]);
  
  // Handle sort
  const handleSort = useCallback((column: SortColumn) => {
    setState(prev => ({
      ...prev,
      sortColumn: column,
      sortDirection: prev.sortColumn === column && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);
  
  // Handle filter change
  const handleFilterChange = useCallback((filter: FilterType) => {
    setState(prev => ({ ...prev, filter, currentPage: 1 }));
  }, []);
  
  // Handle search
  const handleSearch = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query, currentPage: 1 }));
  }, []);
  
  // Handle unpark button click
  const handleUnparkClick = useCallback((session: parkingApi.Session) => {
    setState(prev => ({
      ...prev,
      unparkModal: {
        isOpen: true,
        session,
        overrideTime: '',
        isTestOptionsExpanded: false,
      },
    }));
  }, []);
  
  // Handle unpark confirm
  const handleUnparkConfirm = useCallback(async () => {
    const { session, overrideTime } = state.unparkModal;
    if (!session) return;
    
    setState(prev => ({ ...prev, isUnparking: true }));
    
    try {
      const result = await parkingApi.unpackVehicle(
        session.session_id,
        overrideTime || undefined
      );
      
      // Close unpark modal and show fee receipt
      setState(prev => ({
        ...prev,
        unparkModal: {
          ...prev.unparkModal,
          isOpen: false,
          session: null,
        },
        feeReceiptModal: {
          isOpen: true,
          receipt: result,
        },
        isUnparking: false,
      }));
      
      // Refresh sessions
      await fetchSessions();
    } catch (error) {
      const errorMessage = error instanceof parkingApi.ApiError 
        ? error.message 
        : 'Failed to unpark vehicle';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isUnparking: false,
      }));
    }
  }, [state.unparkModal, fetchSessions]);
  
  // Handle unpark modal close
  const handleUnparkModalClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      unparkModal: {
        ...prev.unparkModal,
        isOpen: false,
        session: null,
        overrideTime: '',
      },
    }));
  }, []);
  
  // Handle override time change
  const handleOverrideTimeChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      unparkModal: {
        ...prev.unparkModal,
        overrideTime: value,
      },
    }));
  }, []);
  
  // Handle toggle test options
  const handleToggleTestOptions = useCallback(() => {
    setState(prev => ({
      ...prev,
      unparkModal: {
        ...prev.unparkModal,
        isTestOptionsExpanded: !prev.unparkModal.isTestOptionsExpanded,
      },
    }));
  }, []);
  
  // Handle fee receipt modal close
  const handleFeeReceiptModalClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      feeReceiptModal: {
        ...prev.feeReceiptModal,
        isOpen: false,
        receipt: null,
      },
    }));
  }, []);
  
  // Handle print receipt
  const handlePrintReceipt = useCallback(() => {
    window.print();
  }, []);
  
  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);
  
  // Calculate pagination
  const totalPages = Math.ceil(state.total / state.perPage);
  const startIndex = (state.currentPage - 1) * state.perPage;
  const endIndex = startIndex + state.perPage;
  const paginatedSessions = filteredAndSortedSessions.slice(startIndex, endIndex);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Parking Sessions</h1>
          <p className="mt-2 text-gray-600">
            View and manage all parking sessions
          </p>
        </div>
        
        {/* Error Alert */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{state.error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, error: null }))}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          {/* Filter Tabs */}
          <div className="flex space-x-1 mb-4">
            {(['all', 'active', 'completed'] as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  state.filter === filter
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Session ID or Slot..."
              value={state.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Refresh Info */}
          {state.lastRefreshTime && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>
                Last updated: {formatDateTime(state.lastRefreshTime.toISOString())}
              </span>
              <div className="flex items-center space-x-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>Auto-refreshing</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Sessions Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {paginatedSessions.length === 0 ? (
            <EmptyState filter={state.filter} searchQuery={state.searchQuery} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        { key: 'session_id', label: 'Session ID' },
                        { key: 'vehicle_type', label: 'Vehicle' },
                        { key: 'slot', label: 'Slot' },
                        { key: 'entry_point', label: 'Entry' },
                        { key: 'parked_at', label: 'Parked At' },
                        { key: 'duration', label: 'Duration' },
                        { key: 'status', label: 'Status' },
                        { key: 'actions', label: 'Actions', sortable: false },
                      ].map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                            column.sortable !== false && 'cursor-pointer hover:bg-gray-100'
                          }`}
                          onClick={() => column.sortable !== false && handleSort(column.key as SortColumn)}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{column.label}</span>
                            {column.sortable !== false && state.sortColumn === column.key && (
                              <svg
                                className={`h-4 w-4 ${
                                  state.sortDirection === 'asc' ? 'transform rotate-180' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSessions.map((session) => (
                      <tr key={session.session_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.session_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <VehicleTypeBadge type={session.vehicle_type} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900">{session.parking_slot.slot_label}</span>
                            <SlotTypeBadge type={session.parking_slot.slot_type} />
                          </div>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.entry_point?.identifier || session.entry_point?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(session.parked_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!session.exited_at ? (
                            <LiveDuration parkedAt={session.parked_at} isActive={!session.exited_at} />
                          ) : (
                            <span className="font-mono text-sm text-gray-600">
                              {session.duration_hours !== undefined
                                ? `${session.duration_hours}h`
                                : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge
                            status={!session.exited_at ? 'active' : 'completed'}
                            {...(session.is_continuous !== undefined && { isContinuous: session.is_continuous })}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!session.exited_at && (
                            <button
                              onClick={() => handleUnparkClick(session)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              Unpark
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      disabled={state.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      disabled={state.currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {startIndex + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(endIndex, filteredAndSortedSessions.length)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">
                          {filteredAndSortedSessions.length}
                        </span>{' '}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === state.currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Unpark Modal */}
      <UnparkModal
        isOpen={state.unparkModal.isOpen}
        session={state.unparkModal.session}
        overrideTime={state.unparkModal.overrideTime}
        isTestOptionsExpanded={state.unparkModal.isTestOptionsExpanded}
        isUnparking={state.isUnparking}
        onClose={handleUnparkModalClose}
        onConfirm={handleUnparkConfirm}
        onOverrideTimeChange={handleOverrideTimeChange}
        onToggleTestOptions={handleToggleTestOptions}
      />
      
      {/* Fee Receipt Modal */}
      <FeeReceiptModal
        isOpen={state.feeReceiptModal.isOpen}
        receipt={state.feeReceiptModal.receipt}
        onClose={handleFeeReceiptModalClose}
        onPrint={handlePrintReceipt}
      />
    </div>
  );
}
