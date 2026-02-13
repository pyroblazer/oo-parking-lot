/**
 * Element Selectors for Detox E2E Tests
 * 
 * Provides centralized selector definitions for all UI elements.
 * Using test IDs is the recommended approach for Detox tests.
 */

import { by } from 'detox';

/**
 * Navigation Selectors
 */
export const NavigationSelectors = {
  // Bottom navigation tabs
  dashboardTab: by.id('nav-dashboard-tab'),
  parkTab: by.id('nav-park-tab'),
  sessionsTab: by.id('nav-sessions-tab'),
  configurationTab: by.id('nav-configuration-tab'),

  // Header navigation
  backButton: by.id('header-back-button'),
  menuButton: by.id('header-menu-button'),
  titleText: by.id('header-title'),

  // Navigation links
  dashboardLink: by.id('nav-dashboard-link'),
  parkLink: by.id('nav-park-link'),
  sessionsLink: by.id('nav-sessions-link'),
  configurationLink: by.id('nav-configuration-link'),
};

/**
 * Dashboard Screen Selectors
 */
export const DashboardSelectors = {
  page: by.id('dashboard-page'),
  title: by.text('Dashboard'),

  // Statistics cards
  totalSessionsCard: by.id('total-sessions-card'),
  activeSessionsCard: by.id('active-sessions-card'),
  availableSlotsCard: by.id('available-slots-card'),
  totalRevenueCard: by.id('total-revenue-card'),

  // Statistics values
  totalSessionsValue: by.id('total-sessions-value'),
  activeSessionsValue: by.id('active-sessions-value'),
  availableSlotsValue: by.id('available-slots-value'),
  totalRevenueValue: by.id('total-revenue-value'),

  // Quick actions
  parkVehicleButton: by.id('park-vehicle-button'),
  unparkVehicleButton: by.id('unpark-vehicle-button'),
  viewSessionsButton: by.id('view-sessions-button'),
  configureButton: by.id('configure-button'),

  // Recent sessions
  recentSessionsSection: by.id('recent-sessions-section'),
  recentSessionsList: by.id('recent-sessions-list'),
  recentSessionItem: by.id('recent-session-item'),

  // Refresh
  refreshButton: by.id('dashboard-refresh-button'),
};

/**
 * Park Vehicle Screen Selectors
 */
export const ParkVehicleSelectors = {
  page: by.id('park-vehicle-page'),
  title: by.text('Park Vehicle'),

  // Form inputs
  vehicleTypeLabel: by.text('Vehicle Type'),
  vehicleTypePicker: by.id('vehicle-type-picker'),
  vehicleTypeSmall: by.text('Small'),
  vehicleTypeMedium: by.text('Medium'),
  vehicleTypeLarge: by.text('Large'),

  entryPointLabel: by.text('Entry Point'),
  entryPointPicker: by.id('entry-point-picker'),

  // Vehicle plate input
  vehiclePlateLabel: by.text('Vehicle Plate'),
  vehiclePlateInput: by.id('vehicle-plate-input'),

  // Submit button
  parkButton: by.id('park-button'),
  parkButtonText: by.text('Park'),

  // Result display
  resultSection: by.id('park-result-section'),
  sessionIdLabel: by.text('Session ID'),
  sessionIdValue: by.id('session-id-value'),
  slotLabel: by.text('Parking Slot'),
  slotValue: by.id('slot-value'),
  entryTimeLabel: by.text('Entry Time'),
  entryTimeValue: by.id('entry-time-value'),

  // Actions
  viewSessionButton: by.id('view-session-button'),
  parkAnotherButton: by.id('park-another-button'),
};

/**
 * Unpark Vehicle Screen Selectors
 */
export const UnparkVehicleSelectors = {
  page: by.id('unpark-vehicle-page'),
  title: by.text('Unpark Vehicle'),

  // Session selection
  activeSessionsLabel: by.text('Active Sessions'),
  activeSessionsList: by.id('active-sessions-list'),
  sessionItem: by.id('session-item'),
  selectSessionButton: by.id('select-session-button'),

  // Session details
  sessionDetailsSection: by.id('session-details-section'),
  sessionIdLabel: by.text('Session ID'),
  sessionIdValue: by.id('session-id-value'),
  vehicleTypeLabel: by.text('Vehicle Type'),
  vehicleTypeValue: by.id('vehicle-type-value'),
  parkingSlotLabel: by.text('Parking Slot'),
  parkingSlotValue: by.id('parking-slot-value'),
  entryTimeLabel: by.text('Entry Time'),
  entryTimeValue: by.id('entry-time-value'),
  durationLabel: by.text('Duration'),
  durationValue: by.id('duration-value'),

  // Fee calculation
  feeSection: by.id('fee-section'),
  feeLabel: by.text('Fee'),
  feeValue: by.id('fee-value'),

  // Submit button
  unparkButton: by.id('unpark-button'),
  unparkButtonText: by.text('Unpark'),

  // Result display
  resultSection: by.id('unpark-result-section'),
  finalFeeLabel: by.text('Final Fee'),
  finalFeeValue: by.id('final-fee-value'),
  exitTimeLabel: by.text('Exit Time'),
  exitTimeValue: by.id('exit-time-value'),

  // Actions
  viewSessionButton: by.id('view-session-button'),
  unparkAnotherButton: by.id('unpark-another-button'),
};

/**
 * View Session Screen Selectors
 */
export const ViewSessionSelectors = {
  page: by.id('view-session-page'),
  title: by.text('View Session'),

  // Session details
  sessionIdLabel: by.text('Session ID'),
  sessionIdValue: by.id('session-id-value'),
  copySessionIdButton: by.id('copy-session-id-button'),

  vehicleTypeLabel: by.text('Vehicle Type'),
  vehicleTypeValue: by.id('vehicle-type-value'),

  vehiclePlateLabel: by.text('Vehicle Plate'),
  vehiclePlateValue: by.id('vehicle-plate-value'),

  parkingSlotLabel: by.text('Parking Slot'),
  parkingSlotValue: by.id('parking-slot-value'),

  entryPointLabel: by.text('Entry Point'),
  entryPointValue: by.id('entry-point-value'),

  entryTimeLabel: by.text('Entry Time'),
  entryTimeValue: by.id('entry-time-value'),

  exitTimeLabel: by.text('Exit Time'),
  exitTimeValue: by.id('exit-time-value'),

  durationLabel: by.text('Duration'),
  durationValue: by.id('duration-value'),

  statusLabel: by.text('Status'),
  statusValue: by.id('status-value'),

  feeLabel: by.text('Fee'),
  feeValue: by.id('fee-value'),

  // Actions
  parkVehicleButton: by.id('park-vehicle-button'),
  unparkVehicleButton: by.id('unpark-vehicle-button'),
  sessionsListButton: by.id('sessions-list-button'),
};

/**
 * Sessions Screen Selectors
 */
export const SessionsSelectors = {
  page: by.id('sessions-page'),
  title: by.text('Sessions'),

  // Search
  searchInput: by.id('sessions-search-input'),
  clearSearchButton: by.id('clear-search-button'),

  // Filters
  filterButton: by.id('filter-button'),
  filterActive: by.text('Active'),
  filterCompleted: by.text('Completed'),
  filterAll: by.text('All'),

  // Sessions list
  sessionsList: by.id('sessions-list'),
  sessionItem: by.id('session-item'),
  sessionId: by.id('session-id'),
  vehicleType: by.id('vehicle-type'),
  vehiclePlate: by.id('vehicle-plate'),
  parkingSlot: by.id('parking-slot'),
  entryTime: by.id('entry-time'),
  status: by.id('status'),

  // Pull to refresh
  refreshControl: by.id('refresh-control'),
};

/**
 * Configuration Screen Selectors
 */
export const ConfigurationSelectors = {
  page: by.id('configuration-page'),
  title: by.text('Configuration'),

  // Tabs
  initializationTab: by.id('initialization-tab'),
  apiSettingsTab: by.id('api-settings-tab'),
  systemSettingsTab: by.id('system-settings-tab'),

  // Initialization form
  totalSlotsLabel: by.text('Total Slots'),
  totalSlotsInput: by.id('total-slots-input'),
  smallSlotsLabel: by.text('Small Slots'),
  smallSlotsInput: by.id('small-slots-input'),
  mediumSlotsLabel: by.text('Medium Slots'),
  mediumSlotsInput: by.id('medium-slots-input'),
  largeSlotsLabel: by.text('Large Slots'),
  largeSlotsInput: by.id('large-slots-input'),
  entryPointsLabel: by.text('Entry Points'),
  entryPointsInput: by.id('entry-points-input'),
  initializeButton: by.id('initialize-button'),
  initializeButtonText: by.text('Initialize'),

  // API settings
  apiUrlLabel: by.text('API URL'),
  apiUrlInput: by.id('api-url-input'),
  saveApiButton: by.id('save-api-button'),
  saveApiButtonText: by.text('Save'),

  // System settings
  themeLabel: by.text('Theme'),
  themePicker: by.id('theme-picker'),
  languageLabel: by.text('Language'),
  languagePicker: by.id('language-picker'),
};

/**
 * Entry Points Management Screen Selectors
 */
export const EntryPointsManagementSelectors = {
  page: by.id('entry-points-management-page'),
  title: by.text('Entry Points'),

  // Entry points list
  entryPointsList: by.id('entry-points-list'),
  entryPointItem: by.id('entry-point-item'),
  entryPointId: by.id('entry-point-id'),
  entryPointName: by.id('entry-point-name'),
  entryPointLocation: by.id('entry-point-location'),

  // Add entry point
  addEntryPointButton: by.id('add-entry-point-button'),
  addEntryPointButtonText: by.text('Add Entry Point'),

  // Edit entry point
  editEntryPointButton: by.id('edit-entry-point-button'),
  deleteEntryPointButton: by.id('delete-entry-point-button'),

  // Modal
  entryPointModal: by.id('entry-point-modal'),
  entryPointNameInput: by.id('entry-point-name-input'),
  entryPointLocationInput: by.id('entry-point-location-input'),
  saveEntryPointButton: by.id('save-entry-point-button'),
  cancelEntryPointButton: by.id('cancel-entry-point-button'),

  // Refresh
  refreshButton: by.id('refresh-button'),
};

/**
 * Slots Management Screen Selectors
 */
export const SlotsManagementSelectors = {
  page: by.id('slots-management-page'),
  title: by.text('Slots Management'),

  // Slots list
  slotsList: by.id('slots-list'),
  slotItem: by.id('slot-item'),
  slotId: by.id('slot-id'),
  slotNumber: by.id('slot-number'),
  slotType: by.id('slot-type'),
  slotStatus: by.id('slot-status'),
  slotFloor: by.id('slot-floor'),

  // Filters
  filterButton: by.id('filter-button'),
  filterAvailable: by.text('Available'),
  filterOccupied: by.text('Occupied'),
  filterMaintenance: by.text('Maintenance'),
  filterAll: by.text('All'),

  // Add slot
  addSlotButton: by.id('add-slot-button'),
  addSlotButtonText: by.text('Add Slot'),

  // Edit slot
  editSlotButton: by.id('edit-slot-button'),
  deleteSlotButton: by.id('delete-slot-button'),

  // Modal
  slotModal: by.id('slot-modal'),
  slotNumberInput: by.id('slot-number-input'),
  slotTypePicker: by.id('slot-type-picker'),
  slotFloorInput: by.id('slot-floor-input'),
  saveSlotButton: by.id('save-slot-button'),
  cancelSlotButton: by.id('cancel-slot-button'),

  // Refresh
  refreshButton: by.id('refresh-button'),
};

/**
 * Available Slots Screen Selectors
 */
export const AvailableSlotsSelectors = {
  page: by.id('available-slots-page'),
  title: by.text('Available Slots'),

  // Slots list
  slotsList: by.id('available-slots-list'),
  slotItem: by.id('slot-item'),
  slotNumber: by.id('slot-number'),
  slotType: by.id('slot-type'),
  slotDistance: by.id('slot-distance'),

  // Filters
  filterButton: by.id('filter-button'),
  filterSmall: by.text('Small'),
  filterMedium: by.text('Medium'),
  filterLarge: by.text('Large'),
  filterAll: by.text('All'),

  // Refresh
  refreshButton: by.id('refresh-button'),
};

/**
 * Common Selectors
 */
export const CommonSelectors = {
  // Loading
  loadingIndicator: by.id('loading-indicator'),
  loadingText: by.text('Loading...'),

  // Messages
  errorMessage: by.id('error-message'),
  successMessage: by.id('success-message'),
  warningMessage: by.id('warning-message'),
  infoMessage: by.id('info-message'),

  // Buttons
  okButton: by.text('OK'),
  cancelButton: by.text('Cancel'),
  yesButton: by.text('Yes'),
  noButton: by.text('No'),
  retryButton: by.text('Retry'),
  closeButton: by.text('Close'),

  // Modal
  modal: by.id('modal'),
  modalTitle: by.id('modal-title'),
  modalMessage: by.id('modal-message'),

  // Empty state
  emptyState: by.id('empty-state'),
  emptyStateText: by.text('No items found'),
  emptyStateIcon: by.id('empty-state-icon'),

  // Scroll
  scrollView: by.id('scroll-view'),
  flatList: by.id('flat-list'),
};

/**
 * Export all selector groups
 */
export const Selectors = {
  navigation: NavigationSelectors,
  dashboard: DashboardSelectors,
  parkVehicle: ParkVehicleSelectors,
  unparkVehicle: UnparkVehicleSelectors,
  viewSession: ViewSessionSelectors,
  sessions: SessionsSelectors,
  configuration: ConfigurationSelectors,
  entryPointsManagement: EntryPointsManagementSelectors,
  slotsManagement: SlotsManagementSelectors,
  availableSlots: AvailableSlotsSelectors,
  common: CommonSelectors,
} as const;
