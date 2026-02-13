/**
 * Centralized Selector Constants
 * 
 * Provides a single source of truth for all selectors used in tests.
 * This makes it easier to update selectors when the UI changes.
 */

/**
 * Navigation Selectors
 */
export const NavigationSelectors = {
  dashboard: 'nav a[href="/"]',
  parkVehicle: 'nav a[href="/park"]',
  unparkVehicle: 'nav a[href="/unpark"]',
  viewSession: 'nav a[href="/session"]',
  sessions: 'nav a[href="/sessions"]',
  availableSlots: 'nav a[href="/slots"]',
  manageSlots: 'nav a[href="/manage/slots"]',
  manageEntryPoints: 'nav a[href="/manage/entry-points"]',
  configuration: 'nav a[href="/configuration"]',
  settings: 'nav a[href="/settings"]',
  navigation: 'nav, [role="navigation"]',
} as const;

/**
 * Dashboard Selectors
 */
export const DashboardSelectors = {
  pageTitle: 'h1:has-text("Dashboard"), h2:has-text("Dashboard")',
  statsCard: '[data-testid*="card"], .stat-card',
  totalSlotsCard: '[data-testid="total-slots-card"], .total-slots-card',
  availableSlotsCard: '[data-testid="available-slots-card"], .available-slots-card',
  occupiedSlotsCard: '[data-testid="occupied-slots-card"], .occupied-slots-card',
  activeSessionsCard: '[data-testid="active-sessions-card"], .active-sessions-card',
  totalRevenueCard: '[data-testid="total-revenue-card"], .total-revenue-card',
  slotGrid: '[data-testid="slot-grid"], .slot-grid',
  slotItem: '[data-testid="slot-item"], .slot, [data-slot-id]',
  availableSlot: '.slot.available, [data-status="available"]',
  occupiedSlot: '.slot.occupied, [data-status="occupied"]',
  maintenanceSlot: '.slot.maintenance, [data-status="maintenance"]',
  activityFeed: '[data-testid="activity-feed"], .activity-feed',
  activityItem: '[data-testid="activity-item"], .activity-item',
  healthBadge: '[data-testid="health-badge"], .health-badge',
  apiHealth: '[data-testid="api-health"], .api-health',
  dbHealth: '[data-testid="db-health"], .db-health',
} as const;

/**
 * Park Vehicle Selectors
 */
export const ParkVehicleSelectors = {
  pageTitle: 'h1:has-text("Park Vehicle"), h2:has-text("Park Vehicle")',
  form: '[data-testid="park-form"], .park-form',
  vehiclePlateInput: 'input[name="plateNumber"], input[placeholder*="plate"]',
  vehicleTypeSelect: 'select[name="vehicleType"], select[aria-label*="vehicle type"]',
  entryPointSelect: 'select[name="entryPoint"], select[aria-label*="entry point"]',
  parkButton: 'button[type="submit"]:has-text("Park"), button:has-text("Park Vehicle")',
  resetButton: 'button:has-text("Reset"), button:has-text("Clear")',
  successBanner: '[data-testid="success-message"], .success-banner',
  errorBanner: '[data-testid="error-message"], .error-banner',
  sessionIdDisplay: '[data-testid="session-id-display"], .session-id-display',
  sessionDetails: '[data-testid="session-details"], .session-details',
  viewSessionButton: 'a:has-text("View Session"), button:has-text("View Session")',
  availableSlotsPreview: '[data-testid="available-slots-preview"], .available-slots-preview',
} as const;

/**
 * Unpark Vehicle Selectors
 */
export const UnparkVehicleSelectors = {
  pageTitle: 'h1:has-text("Unpark Vehicle"), h2:has-text("Unpark Vehicle")',
  sessionIdInput: 'input[name="sessionId"], input[placeholder*="session"]',
  lookupButton: 'button:has-text("Lookup"), button:has-text("Find")',
  sessionDetails: '[data-testid="session-details"], .session-details',
  calculateFeeButton: 'button:has-text("Calculate Fee"), button:has-text("Calculate")',
  feeBreakdown: '[data-testid="fee-breakdown"], .fee-breakdown',
  baseFeeRow: '[data-fee-type="base"], .fee-row:has-text("Base")',
  exceedingHoursRow: '[data-fee-type="exceeding"], .fee-row:has-text("Exceeding")',
  longTermFeeRow: '[data-fee-type="long-term"], .fee-row:has-text("Long-term")',
  totalFeeRow: '[data-fee-type="total"], .fee-row.total',
  continuousParkingBadge: '[data-testid="continuous-parking-badge"], .continuous-parking-badge',
  unparkButton: 'button:has-text("Unpark"), button:has-text("Complete Exit")',
  confirmUnparkButton: 'button:has-text("Confirm"), button:has-text("Yes")',
  cancelUnparkButton: 'button:has-text("Cancel"), button:has-text("No")',
  receipt: '[data-testid="receipt"], .receipt-card',
  doneButton: 'button:has-text("Done"), button:has-text("Close")',
} as const;

/**
 * View Session Selectors
 */
export const ViewSessionSelectors = {
  pageTitle: 'h1:has-text("Session Details"), h2:has-text("View Session")',
  sessionIdInput: 'input[name="sessionId"], input[placeholder*="session"]',
  viewButton: 'button:has-text("View"), button:has-text("Find")',
  sessionDetails: '[data-testid="session-details"], .session-details-card',
  sessionId: '[data-session-id], .session-id',
  slotNumber: '[data-slot-number], .slot-number',
  vehiclePlate: '[data-vehicle-plate], .vehicle-plate',
  vehicleType: '[data-vehicle-type], .vehicle-type',
  entryPoint: '[data-entry-point], .entry-point',
  entryTime: '[data-entry-time], .entry-time',
  exitTime: '[data-exit-time], .exit-time',
  duration: '[data-duration], .duration',
  status: '[data-status], .status-badge',
  fee: '[data-fee], .fee-amount',
  activeStatusBadge: '.status-badge.active, [data-status="active"]',
  completedStatusBadge: '.status-badge.completed, [data-status="completed"]',
  cancelledStatusBadge: '.status-badge.cancelled, [data-status="cancelled"]',
  unparkButton: 'button:has-text("Unpark"), button:has-text("Complete Exit")',
  calculateFeeButton: 'button:has-text("Calculate Fee"), button:has-text("Calculate")',
  notFound: '[data-testid="not-found"], .not-found-message',
} as const;

/**
 * Sessions Management Selectors
 */
export const SessionsSelectors = {
  pageTitle: 'h1:has-text("Sessions"), h2:has-text("Sessions")',
  searchInput: 'input[name="search"], input[placeholder*="search"]',
  searchButton: 'button:has-text("Search"), button[aria-label*="search"]',
  clearSearchButton: 'button:has-text("Clear"), button[aria-label*="clear"]',
  statusFilter: 'select[name="status"], select[aria-label*="status"]',
  vehicleTypeFilter: 'select[name="vehicleType"], select[aria-label*="vehicle type"]',
  dateFromInput: 'input[name="dateFrom"], input[aria-label*="from"]',
  dateToInput: 'input[name="dateTo"], input[aria-label*="to"]',
  sessionsList: '[data-testid="sessions-list"], .sessions-list',
  sessionRow: '[data-testid="session-row"], .session-row, tr[data-session-id]',
  sessionTable: 'table.sessions-table, [data-testid="sessions-table"]',
  pagination: '[data-testid="pagination"], .pagination',
  previousPageButton: 'button:has-text("Previous"), button[aria-label*="previous"]',
  nextPageButton: 'button:has-text("Next"), button[aria-label*="next"]',
  pageNumbers: '.page-number, [data-page]',
  currentPageIndicator: '.current-page, [data-current-page]',
  totalPagesIndicator: '.total-pages, [data-total-pages]',
  perPageSelect: 'select[name="perPage"], select[aria-label*="per page"]',
  totalSessionsCount: '[data-testid="total-sessions-count"], .total-sessions-count',
  activeSessionsCount: '[data-testid="active-sessions-count"], .active-sessions-count',
  completedSessionsCount: '[data-testid="completed-sessions-count"], .completed-sessions-count',
  emptyState: '[data-testid="empty-state"], .empty-state',
  refreshButton: 'button:has-text("Refresh"), button[aria-label*="refresh"]',
  exportButton: 'button:has-text("Export"), button[aria-label*="export"]',
} as const;

/**
 * Slots Management Selectors
 */
export const SlotsSelectors = {
  pageTitle: 'h1:has-text("Slots"), h2:has-text("Manage Slots")',
  slotsGrid: '[data-testid="slots-grid"], .slots-grid',
  slotsTable: 'table.slots-table, [data-testid="slots-table"]',
  slotRow: '[data-testid="slot-row"], .slot-row, tr[data-slot-id]',
  typeFilter: 'select[name="type"], select[aria-label*="type"]',
  availabilityFilter: 'select[name="availability"], select[aria-label*="availability"]',
  floorFilter: 'select[name="floor"], select[aria-label*="floor"]',
  createSlotButton: 'button:has-text("Create"), button:has-text("Add Slot")',
  editSlotButton: 'button:has-text("Edit"), button[aria-label*="edit"]',
  deleteSlotButton: 'button:has-text("Delete"), button[aria-label*="delete"]',
  slotModal: '[data-testid="slot-modal"], .modal, [role="dialog"]',
  slotNumberInput: 'input[name="slotNumber"], input[placeholder*="slot number"]',
  slotTypeSelect: 'select[name="slotType"], select[aria-label*="type"]',
  floorInput: 'input[name="floor"], input[aria-label*="floor"]',
  statusSelect: 'select[name="status"], select[aria-label*="status"]',
  modalSaveButton: 'button:has-text("Save"), button[type="submit"]',
  modalCancelButton: 'button:has-text("Cancel")',
  deleteModal: '[data-testid="delete-modal"], .delete-modal',
  deleteConfirmButton: 'button:has-text("Confirm"), button:has-text("Delete")',
  totalSlotsCount: '[data-testid="total-slots-count"], .total-slots-count',
  availableSlotsCount: '[data-testid="available-slots-count"], .available-slots-count',
  occupiedSlotsCount: '[data-testid="occupied-slots-count"], .occupied-slots-count',
  emptyState: '[data-testid="empty-state"], .empty-state',
} as const;

/**
 * Entry Points Management Selectors
 */
export const EntryPointsSelectors = {
  pageTitle: 'h1:has-text("Entry Points"), h2:has-text("Manage Entry Points")',
  entryPointsList: '[data-testid="entry-points-list"], .entry-points-list',
  entryPointItem: '[data-testid="entry-point-item"], .entry-point-item, [data-entry-point-id]',
  addEntryPointButton: 'button:has-text("Add"), button:has-text("Create")',
  editEntryPointButton: 'button:has-text("Edit"), button[aria-label*="edit"]',
  deleteEntryPointButton: 'button:has-text("Delete"), button[aria-label*="delete"]',
  entryPointModal: '[data-testid="entry-point-modal"], .modal, [role="dialog"]',
  nameInput: 'input[name="name"], input[placeholder*="name"]',
  locationInput: 'input[name="location"], input[placeholder*="location"]',
  descriptionInput: 'textarea[name="description"], textarea[placeholder*="description"]',
  statusSelect: 'select[name="status"], select[aria-label*="status"]',
  modalSaveButton: 'button:has-text("Save"), button[type="submit"]',
  modalCancelButton: 'button:has-text("Cancel")',
  deleteModal: '[data-testid="delete-modal"], .delete-modal',
  deleteConfirmButton: 'button:has-text("Confirm"), button:has-text("Delete")',
  totalEntryPointsCount: '[data-testid="total-entry-points-count"], .total-entry-points-count',
  emptyState: '[data-testid="empty-state"], .empty-state',
} as const;

/**
 * Configuration Selectors
 */
export const ConfigurationSelectors = {
  pageTitle: 'h1:has-text("Configuration"), h2:has-text("System Configuration")',
  entryPointsTab: 'button:has-text("Entry Points"), [data-tab="entry-points"]',
  parkingSlotsTab: 'button:has-text("Parking Slots"), [data-tab="parking-slots"]',
  systemTab: 'button:has-text("System"), [data-tab="system"]',
  initializeForm: '[data-testid="initialize-form"], .initialize-form',
  totalSlotsInput: 'input[name="totalSlots"], input[aria-label*="total slots"]',
  smallSlotsInput: 'input[name="smallSlots"], input[aria-label*="small slots"]',
  mediumSlotsInput: 'input[name="mediumSlots"], input[aria-label*="medium slots"]',
  largeSlotsInput: 'input[name="largeSlots"], input[aria-label*="large slots"]',
  entryPointsInput: 'input[name="entryPoints"], input[aria-label*="entry points"]',
  entryPointsTagInput: 'input[placeholder*="entry point"]',
  entryPointsTagList: '.tag-list, [data-tag-list]',
  entryPointsTagItem: '.tag-item, [data-tag-item]',
  initializeButton: 'button:has-text("Initialize"), button[type="submit"]',
  resetButton: 'button:has-text("Reset"), button:has-text("Clear")',
  healthCheckCard: '[data-testid="health-check-card"], .health-check-card',
  apiHealthStatus: '[data-api-health], .api-health',
  dbHealthStatus: '[data-db-health], .db-health',
  overallHealthStatus: '[data-overall-health], .overall-health',
  healthStatusBadge: '.health-badge, [data-health-status]',
  lastHealthCheckTime: '[data-last-check], .last-check-time',
  runHealthCheckButton: 'button:has-text("Run Health Check")',
  initializationStatus: '[data-testid="initialization-status"], .initialization-status',
  initializationTime: '[data-testid="initialization-time"], .initialization-time',
  reinitializeButton: 'button:has-text("Reinitialize")',
} as const;

/**
 * Settings Selectors
 */
export const SettingsSelectors = {
  pageTitle: 'h1:has-text("Settings"), h2:has-text("Application Settings")',
  apiConfigSection: '[data-testid="api-config-section"], .api-config-section',
  apiUrlInput: 'input[name="apiUrl"], input[placeholder*="http"]',
  apiTimeoutInput: 'input[name="timeout"], input[aria-label*="timeout"]',
  apiRetryCountInput: 'input[name="retryCount"], input[aria-label*="retry"]',
  testConnectionButton: 'button:has-text("Test Connection"), button:has-text("Test API")',
  connectionStatus: '[data-testid="connection-status"], .connection-status',
  connectionStatusBadge: '.status-badge, [data-status]',
  connectionMessage: '.message, [data-message]',
  connectionLatency: '.latency, [data-latency]',
  saveButton: 'button:has-text("Save"), button[type="submit"]',
  resetButton: 'button:has-text("Reset"), button:has-text("Reset to Default")',
  discardButton: 'button:has-text("Discard"), button:has-text("Cancel")',
  themeSection: '[data-testid="theme-section"], .theme-section',
  themeSelect: 'select[name="theme"], select[aria-label*="theme"]',
  languageSection: '[data-testid="language-section"], .language-section',
  languageSelect: 'select[name="language"], select[aria-label*="language"]',
  notificationsSection: '[data-testid="notifications-section"], .notifications-section',
  enableNotificationsToggle: 'input[name="enableNotifications"], [role="switch"][aria-label*="notifications"]',
  soundEnabledToggle: 'input[name="soundEnabled"], [role="switch"][aria-label*="sound"]',
  advancedSettingsSection: '[data-testid="advanced-settings-section"], .advanced-settings-section',
  debugModeToggle: 'input[name="debugMode"], [role="switch"][aria-label*="debug"]',
  enableLogsToggle: 'input[name="enableLogs"], [role="switch"][aria-label*="logs"]',
  clearCacheButton: 'button:has-text("Clear Cache")',
  clearDataButton: 'button:has-text("Clear Data")',
  dangerZoneSection: '[data-testid="danger-zone-section"], .danger-zone-section',
  factoryResetButton: 'button:has-text("Factory Reset"), button.danger',
  confirmationModal: '[data-testid="confirmation-modal"], .modal, [role="dialog"]',
  modalConfirmButton: 'button:has-text("Confirm"), button.danger',
  modalCancelButton: 'button:has-text("Cancel")',
} as const;

/**
 * Common Selectors
 */
export const CommonSelectors = {
  loadingSpinner: '[data-testid="loading-spinner"], .loading-spinner, [role="progressbar"]',
  loadingIndicator: '[data-testid="loading"], .loading-indicator',
  successBanner: '[data-testid="success-message"], .success-banner, .alert-success',
  errorBanner: '[data-testid="error-message"], .error-banner, .alert-error',
  warningBanner: '[data-testid="warning-message"], .warning-banner, .alert-warning',
  infoBanner: '[data-testid="info-message"], .info-banner, .alert-info',
  toast: '[role="alert"], .toast',
  modal: '.modal, [role="dialog"]',
  modalOverlay: '.modal-overlay, .backdrop',
  modalTitle: '.modal-title, h2, h3',
  modalCloseButton: 'button:has-text("Close"), button[aria-label="close"]',
  modalSaveButton: 'button:has-text("Save"), button[type="submit"]',
  modalCancelButton: 'button:has-text("Cancel")',
  button: 'button',
  input: 'input',
  select: 'select',
  textarea: 'textarea',
  link: 'a',
  heading: 'h1, h2, h3, h4, h5, h6',
  table: 'table',
  tableRow: 'tr',
  tableCell: 'td, th',
  list: 'ul, ol',
  listItem: 'li',
  card: '.card, [data-card]',
  badge: '.badge, [data-badge]',
  icon: '.icon, [data-icon]',
  label: 'label',
  form: 'form',
  fieldset: 'fieldset',
  legend: 'legend',
} as const;

/**
 * Data Test ID Selectors
 * These are the most reliable selectors for testing
 */
export const DataTestIdSelectors = {
  // Common
  pageTitle: '[data-testid="page-title"]',
  loading: '[data-testid="loading"]',
  successMessage: '[data-testid="success-message"]',
  errorMessage: '[data-testid="error-message"]',
  
  // Dashboard
  totalSlotsCard: '[data-testid="total-slots-card"]',
  availableSlotsCard: '[data-testid="available-slots-card"]',
  occupiedSlotsCard: '[data-testid="occupied-slots-card"]',
  activeSessionsCard: '[data-testid="active-sessions-card"]',
  totalRevenueCard: '[data-testid="total-revenue-card"]',
  slotGrid: '[data-testid="slot-grid"]',
  activityFeed: '[data-testid="activity-feed"]',
  healthBadge: '[data-testid="health-badge"]',
  
  // Park Vehicle
  vehiclePlateInput: '[data-testid="vehicle-plate-input"]',
  vehicleTypeSelect: '[data-testid="vehicle-type-select"]',
  entryPointSelect: '[data-testid="entry-point-select"]',
  parkButton: '[data-testid="park-button"]',
  sessionIdDisplay: '[data-testid="session-id-display"]',
  
  // Unpark Vehicle
  sessionIdInput: '[data-testid="session-id-input"]',
  lookupButton: '[data-testid="lookup-button"]',
  calculateFeeButton: '[data-testid="calculate-fee-button"]',
  feeBreakdown: '[data-testid="fee-breakdown"]',
  unparkButton: '[data-testid="unpark-button"]',
  receipt: '[data-testid="receipt"]',
  
  // View Session
  viewButton: '[data-testid="view-button"]',
  sessionDetails: '[data-testid="session-details"]',
  
  // Sessions
  sessionsList: '[data-testid="sessions-list"]',
  sessionRow: '[data-testid="session-row"]',
  pagination: '[data-testid="pagination"]',
  perPageSelect: '[data-testid="per-page-select"]',
  
  // Slots
  slotsGrid: '[data-testid="slots-grid"]',
  slotRow: '[data-testid="slot-row"]',
  createSlotButton: '[data-testid="create-slot-button"]',
  slotModal: '[data-testid="slot-modal"]',
  
  // Entry Points
  entryPointsList: '[data-testid="entry-points-list"]',
  entryPointItem: '[data-testid="entry-point-item"]',
  addEntryPointButton: '[data-testid="add-entry-point-button"]',
  entryPointModal: '[data-testid="entry-point-modal"]',
  
  // Configuration
  initializeForm: '[data-testid="initialize-form"]',
  initializeButton: '[data-testid="initialize-button"]',
  healthCheckCard: '[data-testid="health-check-card"]',
  
  // Settings
  apiConfigSection: '[data-testid="api-config-section"]',
  apiUrlInput: '[data-testid="api-url-input"]',
  testConnectionButton: '[data-testid="test-connection-button"]',
  saveButton: '[data-testid="save-button"]',
} as const;

/**
 * Role-based Selectors
 * These are accessible selectors based on ARIA roles
 */
export const RoleSelectors = {
  button: '[role="button"]',
  link: '[role="link"]',
  navigation: '[role="navigation"]',
  main: '[role="main"]',
  header: '[role="banner"]',
  footer: '[role="contentinfo"]',
  dialog: '[role="dialog"]',
  alert: '[role="alert"]',
  status: '[role="status"]',
  tab: '[role="tab"]',
  tablist: '[role="tablist"]',
  tabpanel: '[role="tabpanel"]',
  combobox: '[role="combobox"]',
  listbox: '[role="listbox"]',
  option: '[role="option"]',
  checkbox: '[role="checkbox"]',
  radio: '[role="radio"]',
  switch: '[role="switch"]',
  textbox: '[role="textbox"]',
  searchbox: '[role="searchbox"]',
  spinbutton: '[role="spinbutton"]',
  slider: '[role="slider"]',
  progressbar: '[role="progressbar"]',
  tooltip: '[role="tooltip"]',
  menu: '[role="menu"]',
  menuitem: '[role="menuitem"]',
  menubar: '[role="menubar"]',
} as const;

/**
 * Text Content Selectors
 * These are useful when data-test-id is not available
 */
export const TextSelectors = {
  // Buttons
  parkButton: 'button:has-text("Park"), button:has-text("Park Vehicle")',
  unparkButton: 'button:has-text("Unpark"), button:has-text("Complete Exit")',
  saveButton: 'button:has-text("Save")',
  cancelButton: 'button:has-text("Cancel")',
  deleteButton: 'button:has-text("Delete")',
  editButton: 'button:has-text("Edit")',
  createButton: 'button:has-text("Create"), button:has-text("Add")',
  refreshButton: 'button:has-text("Refresh")',
  searchButton: 'button:has-text("Search")',
  viewButton: 'button:has-text("View")',
  closeButton: 'button:has-text("Close")',
  confirmButton: 'button:has-text("Confirm")',
  initializeButton: 'button:has-text("Initialize")',
  resetButton: 'button:has-text("Reset")',
  
  // Headings
  dashboardHeading: 'h1:has-text("Dashboard"), h2:has-text("Dashboard")',
  parkVehicleHeading: 'h1:has-text("Park Vehicle"), h2:has-text("Park Vehicle")',
  unparkVehicleHeading: 'h1:has-text("Unpark Vehicle"), h2:has-text("Unpark Vehicle")',
  sessionsHeading: 'h1:has-text("Sessions"), h2:has-text("Sessions")',
  slotsHeading: 'h1:has-text("Slots"), h2:has-text("Manage Slots")',
  entryPointsHeading: 'h1:has-text("Entry Points"), h2:has-text("Manage Entry Points")',
  configurationHeading: 'h1:has-text("Configuration"), h2:has-text("System Configuration")',
  settingsHeading: 'h1:has-text("Settings"), h2:has-text("Application Settings")',
  
  // Messages
  successMessage: '.success-banner:has-text("success"), .alert-success:has-text("success")',
  errorMessage: '.error-banner:has-text("error"), .alert-error:has-text("error")',
  warningMessage: '.warning-banner:has-text("warning"), .alert-warning:has-text("warning")',
  infoMessage: '.info-banner:has-text("info"), .alert-info:has-text("info")',
} as const;

/**
 * Attribute Selectors
 * These are useful for selecting elements by their attributes
 */
export const AttributeSelectors = {
  byDataTestId: (value: string) => `[data-testid="${value}"]`,
  byDataId: (value: string) => `[data-id="${value}"]`,
  byDataValue: (value: string) => `[data-value="${value}"]`,
  byDataStatus: (value: string) => `[data-status="${value}"]`,
  byDataType: (value: string) => `[data-type="${value}"]`,
  byDataSlotId: (value: string) => `[data-slot-id="${value}"]`,
  byDataSessionId: (value: string) => `[data-session-id="${value}"]`,
  byDataEntryPointId: (value: string) => `[data-entry-point-id="${value}"]`,
  byAriaLabel: (value: string) => `[aria-label="${value}"]`,
  byId: (value: string) => `#${value}`,
  byClass: (value: string) => `.${value}`,
  byName: (value: string) => `[name="${value}"]`,
  byPlaceholder: (value: string) => `[placeholder*="${value}"]`,
  byTitle: (value: string) => `[title="${value}"]`,
} as const;

/**
 * Combined Selectors Object
 * Provides all selector groups in a single object
 */
export const Selectors = {
  navigation: NavigationSelectors,
  dashboard: DashboardSelectors,
  parkVehicle: ParkVehicleSelectors,
  unparkVehicle: UnparkVehicleSelectors,
  viewSession: ViewSessionSelectors,
  sessions: SessionsSelectors,
  slots: SlotsSelectors,
  entryPoints: EntryPointsSelectors,
  configuration: ConfigurationSelectors,
  settings: SettingsSelectors,
  common: CommonSelectors,
  dataTestId: DataTestIdSelectors,
  role: RoleSelectors,
  text: TextSelectors,
  attribute: AttributeSelectors,
} as const;
