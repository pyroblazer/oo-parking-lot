# Frontend Requirements Document
## OO Parking Lot System

**Document Version:** 1.0
**Date:** 2025-03-08
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Roles and Personas](#2-user-roles-and-personas)
3. [Functional Requirements](#3-functional-requirements)
4. [UI/UX Requirements](#4-uiux-requirements)
5. [Technical Requirements](#5-technical-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Data Display Requirements](#7-data-display-requirements)
8. [Edge Cases and Constraints](#8-edge-cases-and-constraints)
9. [Testing Requirements](#9-testing-requirements)

---

## 1. Introduction

### 1.1 Purpose

This document defines comprehensive requirements for the frontend applications of the OO Parking Lot System. The frontend must support both web and mobile platforms (React Web and React Native) and provide a complete user interface for parking lot operations, fee calculation, and system management.

### 1.2 Scope

The frontend applications must:

- Provide interfaces for vehicle parking and unparking operations
- Display real-time parking slot availability and status
- Calculate and display parking fees with detailed breakdowns
- Manage parking sessions with pagination
- Configure and manage entry points and parking slots
- Support both Go and Rails backend implementations with identical API surfaces
- Operate without authentication or WebSocket capabilities

### 1.3 System Overview

The OO Parking Lot System is an object-oriented parking management system that:

- Supports three vehicle types: Small (S), Medium (M), and Large (L)
- Manages parking slots of three types: Small Parking (SP), Medium Parking (MP), and Large Parking (LP)
- Implements intelligent slot allocation based on proximity to entry points
- Calculates fees based on duration and slot type
- Detects continuous parking for returning vehicles
- Provides RESTful API with 16 endpoints

---

## 2. User Roles and Personas

### 2.1 Primary Users

#### 2.1.1 Parking Attendant

**Description:** Front-line staff responsible for daily parking operations

**Goals:**
- Quickly park vehicles entering the lot
- Efficiently process vehicle exits and fee collection
- Monitor slot availability in real-time
- Handle peak traffic periods with minimal delays

**Needs:**
- Fast, intuitive parking/unparking workflows
- Clear fee breakdowns for customer communication
- Immediate feedback on slot availability
- Mobile-friendly interface for on-the-go operations

**Pain Points:**
- Confusing slot allocation logic
- Slow response times during peak hours
- Inability to explain fee calculations to customers

**Key Scenarios:**
1. Vehicle arrives at entry point A
2. Attendant selects vehicle type and entry point
3. System assigns closest available slot
4. Attendant provides ticket to driver
5. Driver returns, attendant processes exit
6. System calculates fee, attendant collects payment

#### 2.1.2 System Administrator

**Description:** Technical staff responsible for system configuration and maintenance

**Goals:**
- Configure entry points and parking slots
- Monitor system health and performance
- Troubleshoot issues and manage errors
- Analyze parking usage patterns

**Needs:**
- Comprehensive configuration interface
- Detailed session history and analytics
- System health monitoring
- Ability to add/remove entry points and slots

**Pain Points:**
- Difficult to understand slot-distance relationships
- Limited visibility into system state
- Complex configuration processes

**Key Scenarios:**
1. Initial system setup with 3 entry points and multiple slots
2. Adding new entry point during expansion
3. Modifying slot types or distances
4. Reviewing session logs for auditing
5. Troubleshooting parking allocation issues

#### 2.1.3 Customer (Indirect)

**Description:** Vehicle owners who use the parking lot

**Goals:**
- Understand parking fees clearly
- Receive accurate receipts
- Experience quick entry and exit processes

**Needs:**
- Transparent fee calculation
- Clear session information
- Accurate time tracking

**Pain Points:**
- Unexpected fees or surcharges
- Long wait times at entry/exit
- Confusing fee structures

---

## 3. Functional Requirements

### 3.1 Core Parking Operations

#### FR-001: Park Vehicle

**Description:** Allow users to park a vehicle by selecting vehicle type and entry point

**Priority:** Critical

**Acceptance Criteria:**
- User must select vehicle type (S, M, or L)
- User must select entry point (A, B, C, etc.)
- System must validate vehicle type against available slot types
- System must find the closest available slot compatible with vehicle type
- System must create a parking session with unique ID
- System must display assigned slot information (label, type, distance)
- System must display session ID for tracking
- System must indicate if parking is continuous (vehicle returned within 1 hour)
- Error handling for no available slots must be clear and actionable
- Response time must be under 2 seconds for successful parking

**Input:**
- Vehicle Type: S | M | L
- Entry Point ID: String (e.g., "A", "B", "C")
- Parked At (optional for testing): ISO8601 timestamp

**Output:**
- Session ID
- Vehicle Type
- Parking Slot (ID, Label, Type, Distances)
- Entry Point
- Parked At timestamp
- Is Active flag
- Is Continuous flag

**API Endpoint:** POST `/api/v1/sessions` (form-urlencoded)

**Special Considerations:**
- Vehicle type compatibility:
 - Small (S): Can park in SP, MP, or LP
 - Medium (M): Can park in MP or LP
 - Large (L): Can only park in LP
- Slot selection algorithm: Choose closest available slot to entry point
- Continuous parking detection: Check previous sessions for same vehicle type within 1 hour

#### FR-002: Unpark Vehicle

**Description:** Allow users to unpark a vehicle and calculate parking fee

**Priority:** Critical

**Acceptance Criteria:**
- User must provide session ID
- System must calculate fee based on duration and slot type
- System must provide detailed fee breakdown
- System must mark session as inactive
- System must display total fee in Philippine Pesos (PHP)
- System must show duration in hours (rounded up)
- System must indicate if this was continuous parking
- Error handling for invalid session IDs must be clear
- Error handling for already unparked sessions must be clear

**Input:**
- Session ID: String
- Exited At (optional for testing): ISO8601 timestamp

**Output:**
- Session ID
- Vehicle Type
- Parking Slot information
- Entry Point
- Parked At timestamp
- Exited At timestamp
- Duration Hours (integer, rounded up)
- Total Fee (float)
- Is Continuous flag
- Fee Breakdown (see FR-003)

**API Endpoint:** POST `/api/v1/sessions/{id}/unpark`

**Special Considerations:**
- Fee calculation rules (see FR-003)
- Duration always rounded up (ceiling)
- Continuous parking affects base start time for fee calculation

#### FR-003: Fee Calculation and Display

**Description:** Calculate and display parking fees with detailed breakdowns

**Priority:** Critical

**Acceptance Criteria:**
- System must display flat rate (40 PHP) for first 3 hours
- System must display hourly rates after 3 hours:
 - Small Parking (SP): 20 PHP/hour
 - Medium Parking (MP): 60 PHP/hour
 - Large Parking (LP): 100 PHP/hour
- System must display long-term rate (5,000 PHP per 24 hours)
- System must show fee breakdown components:
 - Base fee (40 PHP)
 - Exceeding hours count
 - Exceeding fee calculation
 - Long-term days count
 - Long-term fee calculation
- System must always round up duration hours (ceiling)
- System must handle continuous parking correctly
- System must display total fee clearly

**Fee Structure:**

| Duration | Fee Calculation |
|-----------|----------------|
| ≤ 3 hours | 40 PHP (flat rate) |
| > 3 hours | 40 PHP + (hours - 3) × hourly_rate |
| ≥ 24 hours | (full_days × 5000) + remaining_hours_fee |

**Hourly Rates by Slot Type:**
- SP (Small Parking): 20 PHP/hour
- MP (Medium Parking): 60 PHP/hour
- LP (Large Parking): 100 PHP/hour

**Continuous Parking:**
- If vehicle exits and returns within 1 hour, treat as continuous
- Fee calculation starts from original park time (base_start_time)
- Display base start time in fee breakdown

**Examples:**

| Vehicle Type | Duration | Slot Type | Fee Calculation | Total Fee |
|--------------|------------|------------|-----------------|------------|
| Small | 2 hours | SP | 40 (flat rate) | 40 PHP |
| Small | 5 hours | SP | 40 + (2 × 20) | 80 PHP |
| Medium | 5 hours | MP | 40 + (2 × 60) | 160 PHP |
| Large | 4 hours | LP | 40 + (1 × 100) | 140 PHP |
| Small | 26 hours | SP | 5000 + (2 × 20) | 5040 PHP |
| Small | 50 hours | SP | (2 × 5000) + (2 × 20) | 10040 PHP |

**Display Requirements:**
- Show fee breakdown in expandable/collapsible format
- Highlight total fee prominently
- Use currency formatting (e.g., "₱40.00")
- Show duration in hours (e.g., "5 hours")
- Display continuous parking indicator with explanation

#### FR-004: View Session Details

**Description:** Allow users to view detailed information about a specific parking session

**Priority:** High

**Acceptance Criteria:**
- User must be able to view session by ID
- System must display all session information
- System must show current status (active/completed)
- System must display parking slot details
- System must display entry point information
- System must show timestamps (parked_at, exited_at)
- System must indicate continuous parking status
- Error handling for non-existent sessions must be clear

**Input:**
- Session ID: String

**Output:**
- Session ID
- Vehicle Type
- Parking Slot (ID, Label, Type, Distances)
- Entry Point (ID, Identifier, Name)
- Parked At timestamp
- Exited At timestamp (if completed)
- Is Active flag
- Is Continuous flag

**API Endpoint:** GET `/api/v1/sessions/{id}`

#### FR-005: List Sessions

**Description:** Allow users to view all parking sessions with pagination

**Priority:** High

**Acceptance Criteria:**
- System must display paginated list of sessions
- Default page size: 20 sessions
- Maximum page size: 100 sessions
- System must show total session count
- System must provide pagination controls (previous, next, page numbers)
- System must display key information for each session:
 - Session ID
 - Vehicle Type
 - Slot Label
 - Entry Point
 - Parked At
 - Status (Active/Completed)
- System must allow filtering by status (optional enhancement)
- System must allow sorting by date (optional enhancement)

**Input:**
- Page: Integer (default: 1)
- Per Page: Integer (default: 20, max: 100)

**Output:**
- Sessions array
- Total count

**API Endpoint:** GET `/api/v1/sessions?page={page}&per_page={per_page}`

### 3.2 Slot Management

#### FR-006: List All Slots

**Description:** Display all parking slots with their current status

**Priority:** High

**Acceptance Criteria:**
- System must display all parking slots
- System must show slot status (available/occupied)
- System must display slot type (SP/MP/LP)
- System must show slot label
- System must display distances to entry points
- System must allow filtering by slot type (optional)
- System must allow filtering by availability (optional)
- System must support visual representation (grid/list view)

**Output:**
- Slots array with:
 - ID
 - Slot Label
 - Slot Type
 - Distances (array of 3 integers)
 - Available flag

**API Endpoint:** GET `/api/v1/slots`

#### FR-007: Get Available Slots

**Description:** Show available slots for a specific vehicle type and entry point

**Priority:** High

**Acceptance Criteria:**
- User must select vehicle type
- User must select entry point
- System must display only available slots compatible with vehicle type
- System must sort slots by distance to entry point (closest first)
- System must show total available count
- System must display slot details (label, type, distance)
- Error handling for no available slots must be clear

**Input:**
- Vehicle Type: S | M | L
- Entry Point ID: String

**Output:**
- Available Slots array
- Total Available count

**API Endpoint:** GET `/api/v1/slots/available?vehicle_type={type}&entry_point_id={id}`

**Slot Compatibility:**
- Small (S): SP, MP, LP
- Medium (M): MP, LP
- Large (L): LP only

#### FR-008: Create Slot

**Description:** Allow administrators to create new parking slots

**Priority:** Medium

**Acceptance Criteria:**
- User must provide slot label
- User must select slot type (SP/MP/LP)
- User must provide distances to all entry points (exactly 3 values)
- System must validate distances array length
- System must validate slot type
- System must create slot and return confirmation
- Error handling for duplicate labels must be clear

**Input:**
- Slot Label: String
- Slot Type: SP | MP | LP
- Distances: Array of 3 integers

**Output:**
- Created slot details

**API Endpoint:** POST `/api/v1/slots`

#### FR-009: Update Slot

**Description:** Allow administrators to update existing parking slots

**Priority:** Medium

**Acceptance Criteria:**
- User must select slot to update
- User must be able to update slot label (optional)
- User must be able to update slot type (optional)
- User must be able to update distances (optional)
- System must validate updated values
- System must update slot and return confirmation
- Error handling for invalid slot ID must be clear

**Input:**
- Slot ID: String
- Slot Label (optional): String
- Slot Type (optional): SP | MP | LP
- Distances (optional): Array of 3 integers

**Output:**
- Updated slot details

**API Endpoint:** PUT `/api/v1/slots/{id}`

#### FR-010: Delete Slot

**Description:** Allow administrators to delete parking slots

**Priority:** Low

**Acceptance Criteria:**
- User must select slot to delete
- System must confirm deletion action
- System must delete slot
- System must return success confirmation
- Error handling for slots with active sessions must be handled

**Input:**
- Slot ID: String

**Output:**
- 204 No Content on success

**API Endpoint:** DELETE `/api/v1/slots/{id}`

### 3.3 Entry Point Management

#### FR-011: List Entry Points

**Description:** Display all entry points in the system

**Priority:** High

**Acceptance Criteria:**
- System must display all entry points
- System must show entry point identifier (A, B, C, etc.)
- System must display entry point name
- System must show entry point ID
- System must support visual representation

**Output:**
- Entry Points array with:
 - ID
 - Identifier
 - Name

**API Endpoint:** GET `/api/v1/entry_points`

#### FR-012: Create Entry Point

**Description:** Allow administrators to create new entry points

**Priority:** Medium

**Acceptance Criteria:**
- User must provide identifier (single character)
- User must provide entry point name
- System must validate identifier length (1 character)
- System must create entry point and return confirmation
- Error handling for duplicate identifiers must be clear

**Input:**
- Identifier: String (1 character)
- Name: String

**Output:**
- Created entry point details

**API Endpoint:** POST `/api/v1/entry_points`

#### FR-013: Update Entry Point

**Description:** Allow administrators to update existing entry points

**Priority:** Medium

**Acceptance Criteria:**
- User must select entry point to update
- User must be able to update identifier (optional)
- User must be able to update name (optional)
- System must validate updated values
- System must update entry point and return confirmation
- Error handling for invalid entry point ID must be clear

**Input:**
- Entry Point ID: String
- Identifier (optional): String
- Name (optional): String

**Output:**
- Updated entry point details

**API Endpoint:** PUT `/api/v1/entry_points/{id}`

#### FR-014: Delete Entry Point

**Description:** Allow administrators to delete entry points

**Priority:** Low

**Acceptance Criteria:**
- User must select entry point to delete
- System must confirm deletion action
- System must delete entry point
- System must return success confirmation
- Error handling for entry points with active sessions must be handled

**Input:**
- Entry Point ID: String

**Output:**
- 204 No Content on success

**API Endpoint:** DELETE `/api/v1/entry_points/{id}`

### 3.4 System Initialization

#### FR-015: Initialize System

**Description:** Allow administrators to initialize the parking system with entry points and slots

**Priority:** High

**Acceptance Criteria:**
- User must provide entry points configuration
- User must provide parking slots configuration
- System must create all entry points
- System must create all parking slots
- System must return counts of created items
- System must handle partial failures gracefully
- System must be idempotent (can be called multiple times safely)

**Input:**
- Entry Points: Array of {identifier, name}
- Parking Slots: Array of {slot_label, slot_type, distances}

**Output:**
- Entry Points Created count
- Parking Slots Created count
- Message

**API Endpoint:** POST `/api/v1/initialize`

**Use Case:**
- Initial system setup
- System reset for testing
- Bulk configuration updates

### 3.5 System Health

#### FR-016: Check System Health

**Description:** Allow users and administrators to check if the parking system is operational

**Priority:** Medium

**Acceptance Criteria:**
- System must display health status (ok/error)
- System must show service name
- System must display version information
- System must show database status
- System must display timestamp
- System must provide clear error messages if unhealthy

**Output:**
- Status: ok | error
- Service: String
- Version: String
- Timestamp: String
- Checks: {database: {status: healthy | unhealthy}}

**API Endpoint:** GET `/health`

---

## 4. UI/UX Requirements

### 4.1 Screen/Page Requirements

#### 4.1.1 Web Application

**Home/Dashboard Page**
- Display system overview with key metrics
- Show quick actions (Park, Unpark, View Slots)
- Display active session count
- Show available slots count by type
- System health indicator

**Park Vehicle Page**
- Vehicle type selector (S, M, L) with visual icons
- Entry point selector (A, B, C, etc.)
- Park button with loading state
- Success message with session ID and slot assignment
- Error message display
- Continuous parking indicator

**Unpark Vehicle Page**
- Session ID input field
- Calculate button with loading state
- Fee breakdown display
- Total fee prominent display
- Receipt-like format
- Error message display

**View Session Page**
- Session details display
- Status indicator (Active/Completed)
- Slot information card
- Entry point information
- Timestamps display
- Continuous parking indicator

**Available Slots Page**
- Vehicle type and entry point filters
- Available slots list/grid
- Slot details (label, type, distance)
- Total available count
- Empty state message

**Sessions Management Page**
- Paginated sessions list
- Search/filter options
- Session details cards
- Pagination controls
- Status indicators
- Sort options

**Slots Management Page**
- All slots list/grid
- Slot status indicators
- Create slot modal/form
- Edit slot modal/form
- Delete slot confirmation
- Filter by type/availability

**Entry Points Management Page**
- Entry points list
- Create entry point modal/form
- Edit entry point modal/form
- Delete entry point confirmation
- Visual representation of entry points

**Configuration Page**
- System initialization form
- Entry points bulk input
- Parking slots bulk input
- JSON/CSV import options
- Preview of configuration

#### 4.1.2 Mobile Application

**Park Vehicle Screen**
- Vehicle type selector (large touch targets)
- Entry point selector
- Park button
- Success confirmation with slot info
- Error display

**Unpark Vehicle Screen**
- Session ID input (with keyboard)
- Scan session ID (QR code - optional enhancement)
- Calculate button
- Fee breakdown
- Receipt view

**View Session Screen**
- Session details
- Status indicator
- Slot and entry point info
- Timestamps

**Available Slots Screen**
- Vehicle type and entry point filters
- Available slots list
- Slot details tap to expand

**Dashboard Screen**
- Quick action buttons
- Active sessions summary
- Available slots summary

### 4.2 Navigation Structure

#### 4.2.1 Web Navigation

```
Home
├── Park Vehicle
├── Unpark Vehicle
├── View Session
├── Available Slots
├── Sessions Management
├── Slots Management
├── Entry Points Management
└── Configuration
```

**Requirements:**
- Persistent navigation bar
- Active route highlighting
- Breadcrumb navigation for deep links
- Back button support
- Keyboard shortcuts for common actions

#### 4.2.2 Mobile Navigation

```
Tab Navigation:
- Home
- Park
- Unpark
- Sessions
- Settings
```

**Requirements:**
- Bottom tab navigation
- Stack navigation for sub-screens
- Gesture support (swipe back)
- Touch-friendly controls
- Offline mode indication

### 4.3 User Flows

#### 4.3.1 Park Vehicle Flow

```mermaid
flowchart TD
- A[Start] --> B[Select Vehicle Type]
- B --> C[Select Entry Point]
- C --> D{Click Park Button}
- D --> E[API Call: POST /sessions]
- E --> F{Success?}
- F -->|Yes| G[Display Success]
- F -->|No| H[Display Error]
- G --> I[Show Session ID & Slot]
- H --> B
- I --> J[End]
```

**Requirements:**
- Clear form validation
- Loading indicators during API calls
- Success animation/feedback
- Error messages with retry option
- Session ID copy to clipboard

#### 4.3.2 Unpark Vehicle Flow

```mermaid
flowchart TD
- A[Start] --> B[Enter Session ID]
- B --> C{Click Calculate Button}
- C --> D[API Call: POST /sessions/id/unpark]
- D --> E{Success?}
- E -->|Yes| F[Display Fee Breakdown]
- E -->|No| G[Display Error]
- F --> H[Show Total Fee]
- H --> I[Generate Receipt]
- G --> B
- I --> J[End]
```

**Requirements:**
- Session ID validation
- Loading indicators
- Detailed fee breakdown
- Receipt generation/print
- Payment confirmation

#### 4.3.3 View Session Flow

```mermaid
flowchart TD
- A[Start] --> B[Enter Session ID]
- B --> C{Click View Button}
- C --> D[API Call: GET /sessions/id]
- D --> E{Found?}
- E -->|Yes| F[Display Session Details]
- E -->|No| G[Display Not Found]
- F --> H[Show Status & Info]
- G --> B
- H --> I[End]
```

**Requirements:**
- Session ID validation
- Loading indicators
- Clear status display
- Action buttons based on status

### 4.4 Error Handling and Feedback

#### 4.4.1 Error Messages

**Network Errors:**
- "Cannot connect to parking system. Check if the API server is running."
- "Network timeout. Please try again."
- "Service temporarily unavailable. Please try again later."

**Validation Errors:**
- "Vehicle type and entry point are required."
- "Invalid vehicle type. Please select S, M, or L."
- "Session ID is required."

**Business Logic Errors:**
- "No available small parking slot. All small slots are occupied."
- "Session not found. It may have already been completed."
- "Entry point not found."

**Server Errors:**
- "Server error occurred. Please try again later."
- "Parking system database is unavailable. Contact system administrator."

#### 4.4.2 Feedback Mechanisms

**Success Feedback:**
- Toast notifications
- Success banners
- Checkmark animations
- Sound effects (optional)

**Loading States:**
- Spinner indicators
- Skeleton screens
- Progress bars
- Disabled buttons with loading text

**Error Feedback:**
- Error banners with dismiss buttons
- Inline error messages
- Shake animations for invalid input
- Color-coded severity levels

### 4.5 Accessibility Considerations

#### 4.5.1 Web Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators
- ARIA labels for interactive elements
- Alt text for images
- Skip navigation links

#### 4.5.2 Mobile Accessibility

- Touch target minimum 44x44 pixels
- Voice control support
- Dynamic text sizing
- Color blind friendly colors
- Haptic feedback for actions
- Screen reader support

---

## 5. Technical Requirements

### 5.1 API Integration Requirements

#### 5.1.1 API Base URL Configuration

**Requirements:**
- Configurable API base URL
- Support for both Go (port 8082) and Rails (port 3000) backends
- Runtime URL switching without app restart
- URL persistence (localStorage for web, AsyncStorage for mobile)
- Default URL: http://localhost:8082

**Implementation:**
- Environment variable support (VITE_API_BASE_URL for web)
- Settings page for runtime configuration
- URL validation before saving
- Connection test on URL change

#### 5.1.2 API Client

**Requirements:**
- Axios HTTP client
- Request/response interceptors
- Automatic error handling
- Timeout configuration (30 seconds)
- Retry logic for network failures
- Request cancellation support

**Special Considerations:**
- Park Vehicle endpoint uses `application/x-www-form-urlencoded`
- Unpark Vehicle exited_at parameter as query string
- All other endpoints use `application/json`

#### 5.1.3 API Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|---------|-----------|-----------|---------------|
| GET | `/health` | Check system health | No |
| POST | `/api/v1/initialize` | Initialize system | No |
| GET | `/api/v1/entry_points` | List entry points | No |
| POST | `/api/v1/entry_points` | Create entry point | No |
| PUT | `/api/v1/entry_points/{id}` | Update entry point | No |
| DELETE | `/api/v1/entry_points/{id}` | Delete entry point | No |
| GET | `/api/v1/slots` | List all slots | No |
| GET | `/api/v1/slots/available` | Get available slots | No |
| POST | `/api/v1/slots` | Create slot | No |
| PUT | `/api/v1/slots/{id}` | Update slot | No |
| DELETE | `/api/v1/slots/{id}` | Delete slot | No |
| POST | `/api/v1/sessions` | Park vehicle | No |
| GET | `/api/v1/sessions` | List sessions | No |
| GET | `/api/v1/sessions/{id}` | Get session | No |
| POST | `/api/v1/sessions/{id}/unpark` | Unpark vehicle | No |
| DELETE | `/api/v1/sessions/{id}` | Delete session | No |

### 5.2 State Management Needs

#### 5.2.1 Global State

**Required State:**
- API base URL
- System health status
- Current user session (if authentication added later)
- Theme preference
- Language preference

#### 5.2.2 Page-Level State

**Park Vehicle Page:**
- Selected vehicle type
- Selected entry point
- Loading state
- Error state
- Success state with session data

**Unpark Vehicle Page:**
- Session ID input
- Loading state
- Error state
- Fee breakdown data

**Sessions Management:**
- Sessions list
- Pagination state (page, perPage, total)
- Loading state
- Error state
- Filter state

**Slots Management:**
- Slots list
- Loading state
- Error state
- Filter state (type, availability)
- Create/edit modal state

**Entry Points Management:**
- Entry points list
- Loading state
- Error state
- Create/edit modal state

#### 5.2.3 State Management Approach

**Recommended:**
- React Context API for global state
- useState/useReducer for component state
- Custom hooks for API calls
- Optimistic updates for better UX

**Example Custom Hooks:**
- `useParkVehicle()` - Handle parking operations
- `useUnparkVehicle()` - Handle unparking operations
- `useSessions()` - Fetch and manage sessions
- `useSlots()` - Fetch and manage slots
- `useEntryPoints()` - Fetch and manage entry points

### 5.3 Data Synchronization Strategies

#### 5.3.1 Polling Strategy

**Requirements:**
- No WebSocket support available
- Must implement polling for real-time updates
- Configurable poll intervals
- Intelligent polling based on user activity

**Polling Intervals:**
- Active sessions: Every 30 seconds
- Slot availability: Every 60 seconds
- System health: Every 120 seconds
- Background: Every 300 seconds (5 minutes)

**Implementation:**
```javascript
// Example polling implementation
useEffect(() => {
 const interval = setInterval(() => {
 fetchSessions();
 }, 30000); // 30 seconds

 return () => clearInterval(interval);
}, [page, perPage]);
```

**Optimizations:**
- Pause polling when tab is inactive (Page Visibility API)
- Resume polling when tab becomes active
- Reduce polling frequency on mobile to save battery
- Debounce rapid user actions

#### 5.3.2 Cache Strategy

**Requirements:**
- Cache API responses to reduce calls
- Invalidate cache on mutations
- Respect cache headers from backend
- Implement stale-while-revalidate pattern

**Cache Configuration:**
- Entry points: 5 minutes
- Slots: 2 minutes
- Sessions: 30 seconds
- Health check: 1 minute

**Implementation:**
```javascript
// Example cache implementation
const cache = new Map();

async function fetchWithCache(key, fetcher, ttl) {
 const cached = cache.get(key);
 if (cached && Date.now() - cached.timestamp < ttl) {
 return cached.data;
 }

 const data = await fetcher();
 cache.set(key, { data, timestamp: Date.now() });
 return data;
}
```

### 5.4 Performance Requirements

#### 5.4.1 Response Time Targets

| Operation | Target | Maximum |
|-----------|---------|----------|
| Park vehicle | < 1 second | 2 seconds |
| Unpark vehicle | < 1 second | 2 seconds |
| List sessions | < 500ms | 1 second |
| List slots | < 500ms | 1 second |
| Get available slots | < 500ms | 1 second |
| Page load | < 2 seconds | 3 seconds |

#### 5.4.2 Performance Optimizations

**Code Splitting:**
- Lazy load routes
- Dynamic imports for heavy components
- Separate vendor bundles

**Asset Optimization:**
- Image compression
- Font subsetting
- CSS minification
- JavaScript minification

**Rendering Optimization:**
- Virtual scrolling for long lists
- Memoization of expensive calculations
- Debounce user input
- Throttle scroll events

### 5.5 Responsive Design Requirements

#### 5.5.1 Breakpoints

| Device | Width | Layout |
|---------|--------|--------|
| Mobile | < 640px | Single column, stacked |
| Tablet | 640px - 1024px | Two columns |
| Desktop | > 1024px | Multi-column, dashboard |

#### 5.5.2 Responsive Behaviors

**Navigation:**
- Mobile: Hamburger menu or bottom tabs
- Tablet: Side navigation
- Desktop: Top navigation bar

**Forms:**
- Mobile: Full-width inputs, stacked labels
- Tablet: Two-column grid
- Desktop: Inline labels, optimized spacing

**Lists:**
- Mobile: Card view, single column
- Tablet: List view, two columns
- Desktop: Table view with sorting

**Modals:**
- Mobile: Full-screen bottom sheet
- Tablet: Centered modal
- Desktop: Centered modal with backdrop

---

## 6. Non-Functional Requirements

### 6.1 Performance Targets

#### 6.1.1 Load Performance

- First Contentful Paint (FCP): < 1.5 seconds
- Largest Contentful Paint (LCP): < 2.5 seconds
- Time to Interactive (TTI): < 3.5 seconds
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

#### 6.1.2 Runtime Performance

- Frame rate: 60 FPS for animations
- API response time: < 2 seconds for 95th percentile
- Page transition: < 300ms
- State updates: < 100ms

### 6.2 Reliability Requirements

#### 6.2.1 Uptime

- Application uptime: 99.5% (excluding planned maintenance)
- API connectivity: 99% success rate
- Error recovery: Automatic retry with exponential backoff

#### 6.2.2 Error Handling

- Graceful degradation when API is unavailable
- Offline mode with queued operations
- Clear error messages for all failure scenarios
- Automatic retry for transient failures

#### 6.2.3 Data Integrity

- No data loss during operations
- Consistent state across components
- Atomic operations for critical actions
- Validation before submission

### 6.3 Scalability Considerations

#### 6.3.1 User Capacity

- Support up to 100 concurrent users
- Handle 1000+ parking sessions
- Display 100+ slots without performance degradation

#### 6.3.2 Data Volume

- Paginate lists to handle large datasets
- Virtual scrolling for 1000+ items
- Lazy loading for images and assets
- Efficient state updates

### 6.4 Security Considerations

#### 6.4.1 Input Validation

- Validate all user inputs
- Sanitize data before API calls
- Prevent XSS attacks
- Escape user-generated content

#### 6.4.2 Data Protection

- No sensitive data in localStorage
- Secure API base URL storage
- Clear sensitive data on logout
- HTTPS in production

#### 6.4.3 Authentication (Future)

- Prepare for future authentication
- Secure token storage
- Token refresh mechanism
- Session timeout handling

---

## 7. Data Display Requirements

### 7.1 Information Display

#### 7.1.1 Session Information

**Required Fields:**
- Session ID (prominent, copyable)
- Vehicle Type (icon + label)
- Parking Slot (label, type, distance)
- Entry Point (identifier, name)
- Parked At (formatted date/time)
- Exited At (formatted date/time, if completed)
- Duration (hours, rounded up)
- Status (Active/Completed badge)
- Continuous Parking indicator (if applicable)

**Display Format:**
```
Session: #12345
Vehicle: Small (S)
Slot: SP-1 (Small Parking)
Entry Point: A
Parked: Jan 15, 2024 at 10:30 AM
Duration: 5 hours
Status: Active
```

#### 7.1.2 Fee Breakdown Display

**Required Components:**
- Base fee (40 PHP)
- Exceeding hours count
- Exceeding fee calculation
- Hourly rate display
- Long-term days count (if applicable)
- Long-term fee (if applicable)
- Total fee (prominent, large)
- Continuous parking note (if applicable)

**Display Format:**
```
Fee Breakdown
├─ Base Fee: ₱40.00 (first 3 hours)
├─ Exceeding Hours: 2 hours
├─ Hourly Rate: ₱20.00/hour (Small Parking)
├─ Exceeding Fee: ₱40.00 (2 × ₱20.00)
└─ Total Fee: ₱80.00

Continuous Parking: Yes
Base Start Time: Jan 15, 2024 at 8:00 AM
```

#### 7.1.3 Slot Availability Display

**Required Information:**
- Slot label (e.g., SP-1, MP-2, LP-3)
- Slot type (SP/MP/LP with color coding)
- Distance from selected entry point
- Availability status (available/occupied)

**Visual Representation:**
- Grid layout for slots
- Color coding by type:
 - SP: Green
 - MP: Blue
 - LP: Purple
- Availability indicators:
 - Available: Solid color
 - Occupied: Grayed out
- Distance badge on each slot

**Display Format:**
```
Available Slots: 5

[ SP-1 ] [ MP-1 ] [ LP-1 ]
 10m 15m 20m
Available Available Available
```

#### 7.1.4 Continuous Parking Status

**Display Requirements:**
- Clear indicator when parking is continuous
- Show base start time
- Explain continuous parking benefit
- Visual distinction from regular parking

**Display Format:**
```
- Continuous Parking Detected

This vehicle returned within 1 hour of previous exit.
Fee calculation starts from original park time.

Original Park Time: Jan 15, 2024 at 8:00 AM
Current Park Time: Jan 15, 2024 at 9:30 AM
```

### 7.2 Vehicle Type Compatibility Display

#### 7.2.1 Compatibility Matrix

**Visual Representation:**

| Vehicle Type | SP | MP | LP |
|--------------|-----|-----|-----|
| Small (S) | | | |
| Medium (M) | | | |
| Large (L) | | | |

**Display in UI:**
- Show compatible slot types when selecting vehicle type
- Disable incompatible slot types
- Provide tooltip explaining compatibility rules

#### 7.2.2 Slot Type Information

**Required Information:**
- Slot type label (SP/MP/LP)
- Full name (Small/Medium/Large Parking)
- Compatible vehicle types
- Hourly rate

**Display Format:**
```
Slot Type: Small Parking (SP)
Compatible Vehicles: Small (S)
Hourly Rate: ₱20.00/hour
```

---

## 8. Edge Cases and Constraints

### 8.1 No Available Slots

**Scenario:** User tries to park a vehicle but no compatible slots are available

**Requirements:**
- Display clear error message: "No available [vehicle type] parking slot. All [vehicle type] slots are occupied."
- Show alternative options:
 - Try different entry point
 - Wait for slot to become available
 - Contact administrator
- Display current slot availability by type
- Provide estimated wait time (if available)

**UI Flow:**
1. User selects vehicle type and entry point
2. System returns 409 Conflict
3. Display error with slot availability overview
4. Offer retry or alternative actions

### 8.2 Network Failures

**Scenario:** API server is unreachable or network is down

**Requirements:**
- Display clear error message
- Show retry button
- Implement offline mode (optional)
- Queue operations for when connection is restored
- Display last known data with "last updated" timestamp

**Offline Mode (Optional Enhancement):**
- Cache recent data
- Allow viewing cached sessions and slots
- Queue park/unpark operations
- Sync when connection is restored

### 8.3 Long-Term Parking Fees

**Scenario:** Vehicle parks for 24+ hours

**Requirements:**
- Calculate long-term fee correctly (5000 PHP per 24 hours)
- Show breakdown of long-term vs. remaining hours
- Display total fee prominently
- Explain long-term rate structure

**Display Example:**
```
Duration: 50 hours

Fee Breakdown
├─ Long-Term: 2 days × ₱5,000.00 = ₱10,000.00
├─ Remaining: 2 hours
│ ├─ Base Fee: ₱40.00
│ └─ Exceeding Fee: 2 × ₱20.00 = ₱40.00
└─ Total Fee: ₱10,040.00
```

### 8.4 Session Not Found

**Scenario:** User tries to view or unpark a non-existent session

**Requirements:**
- Display clear error: "Session not found. It may have already been completed."
- Provide option to search for session
- Show recent sessions for quick access
- Suggest contacting administrator if needed

### 8.5 Already Unparked Vehicle

**Scenario:** User tries to unpark a vehicle that's already been unparked

**Requirements:**
- Display error: "Session not found. It may have already been completed."
- Show session details if available
- Provide option to view session history
- Prevent duplicate unparking

### 8.6 Invalid Session ID

**Scenario:** User enters an invalid or malformed session ID

**Requirements:**
- Validate session ID format before API call
- Display inline validation error
- Show example of valid session ID
- Provide auto-complete or search functionality

### 8.7 Concurrent Operations

**Scenario:** Multiple users try to park vehicles simultaneously

**Requirements:**
- Handle race conditions gracefully
- Display error if slot becomes unavailable during operation
- Offer retry option
- Show real-time slot updates via polling

### 8.8 Time Zone Handling

**Scenario:** System operates across multiple time zones

**Requirements:**
- Display all timestamps in user's local time
- Store and send timestamps in UTC (ISO8601)
- Show time zone indicator
- Handle daylight saving time transitions

### 8.9 Large Data Sets

**Scenario:** System has 1000+ sessions or slots

**Requirements:**
- Implement pagination for sessions
- Use virtual scrolling for long lists
- Provide search and filter options
- Lazy load data as needed
- Show loading indicators

### 8.10 Browser Compatibility

**Scenario:** Users access application on various browsers

**Requirements:**
- Support modern browsers (Chrome, Firefox, Safari, Edge)
- Graceful degradation for older browsers
- Progressive enhancement
- Feature detection with polyfills

---

## 9. Testing Requirements

### 9.1 Unit Testing

#### 9.1.1 Component Testing

**Requirements:**
- Test all UI components
- Test user interactions
- Test form validation
- Test error states
- Test loading states

**Tools:**
- Jest (React Web)
- React Native Testing Library (React Native)
- React Testing Library (React Web)

**Coverage Target:**
- 80% for components
- 90% for utility functions
- 70% for integration tests

#### 9.1.2 Hook Testing

**Requirements:**
- Test custom hooks
- Test state management
- Test API calls (mocked)
- Test error handling
- Test retry logic

**Example Test:**
```javascript
describe('useParkVehicle', () => {
 it('should park vehicle successfully', async () => {
 const { result } = renderHook(() => useParkVehicle());
 await act(async () => {
 await result.current.park('S', 'A');
 });
 expect(result.current.data).toBeDefined();
 expect(result.current.loading).toBe(false);
 });

 it('should handle no available slots', async () => {
 const { result } = renderHook(() => useParkVehicle());
 await act(async () => {
 await result.current.park('S', 'A');
 });
 expect(result.current.error).toBeDefined();
 expect(result.current.error.message).toContain('No available');
 });
});
```

### 9.2 Integration Testing

#### 9.2.1 API Integration Testing

**Requirements:**
- Test all API endpoints
- Test error responses
- Test request/response formats
- Test authentication (when added)
- Test timeout handling

**Tools:**
- MSW (Mock Service Worker) for web
- Axios interceptors for mocking
- Backend test server

#### 9.2.2 End-to-End Testing

**Requirements:**
- Test complete user flows
- Test navigation
- Test form submissions
- Test error recovery
- Test responsive design

**Tools:**
- Cypress (React Web)
- Detox (React Native)
- Playwright (React Web)

**Test Scenarios:**
1. Park vehicle flow
2. Unpark vehicle flow
3. View session flow
4. List sessions with pagination
5. Create/update/delete slots
6. Create/update/delete entry points
7. System initialization
8. Error handling flows
9. Offline mode (if implemented)

### 9.3 Performance Testing

#### 9.3.1 Load Testing

**Requirements:**
- Test with 100 concurrent users
- Test with 1000+ sessions
- Test with 100+ slots
- Measure API response times
- Monitor memory usage

**Tools:**
- Lighthouse (web)
- React Profiler
- Chrome DevTools Performance

#### 9.3.2 Mobile Performance Testing

**Requirements:**
- Test on various devices
- Measure battery impact
- Test network throttling
- Test slow connections

**Tools:**
- Android Studio Profiler
- Xcode Instruments
- Chrome DevTools Device Mode

### 9.4 Accessibility Testing

#### 9.4.1 Screen Reader Testing

**Requirements:**
- Test with NVDA (Windows)
- Test with VoiceOver (iOS)
- Test with TalkBack (Android)
- Verify ARIA labels
- Test keyboard navigation

#### 9.4.2 Color Contrast Testing

**Requirements:**
- Test with color blindness simulators
- Verify WCAG AA compliance
- Test high contrast mode
- Test dark mode

**Tools:**
- axe DevTools
- WAVE
- Colour Contrast Analyser

### 9.5 Backend Testing Support

#### 9.5.1 Time Manipulation Support

**Purpose:** Support backend testing capabilities for time-based scenarios

**Requirements:**
- Frontend must support optional `parked_at` parameter in park vehicle API call
- Frontend must support optional `exited_at` parameter in unpark vehicle API call
- These parameters should be hidden from normal users
- Expose in debug/test mode only

**Implementation:**
```javascript
// Debug mode only
const isDebugMode = import.meta.env.VITE_DEBUG_MODE === 'true';

if (isDebugMode) {
 // Show time input fields for testing
 return (
 <ParkVehicleForm>
 <VehicleTypeSelector />
 <EntryPointSelector />
 {isDebugMode && <ParkedAtInput />}
 <ParkButton />
 </ParkVehicleForm>
 );
}
```

**Use Cases:**
- Test fee calculation for specific durations
- Test continuous parking detection
- Test long-term parking fees
- Test rounding behavior
- Test time zone handling

#### 9.5.2 Test Data Management

**Requirements:**
- Support system initialization with test data
- Support clearing test data
- Support resetting system state
- Provide test data fixtures

**Test Scenarios:**
1. Initialize system with 3 entry points and 10 slots
2. Park 5 vehicles of different types
3. Unpark vehicles with various durations
4. Verify fee calculations
5. Test continuous parking scenarios
6. Test edge cases (no slots, invalid IDs)

---

## Appendix A: API Reference

### A.1 Response Formats

#### Success Response
```json
{
 "success": true,
 "data": {
 // Response data
 }
}
```

#### Error Response
```json
{
 "success": false,
 "error": "Error message"
}
```

### A.2 Fee Breakdown Response
```json
{
 "fee_breakdown": {
 "total_fee": 80.0,
 "duration_hours": 5,
 "is_continuous": false,
 "long_term": {
 "days": 0,
 "fee": 0.0
 },
 "remaining": {
 "total": 80.0,
 "base_fee": 40.0,
 "exceeding_hours": 2,
 "exceeding_fee": 40.0,
 "hourly_rate": 20.0
 }
 }
}
```

---

## Appendix B: Glossary

| Term | Definition |
|-------|------------|
| Entry Point | Physical location where vehicles enter the parking lot (A, B, C, etc.) |
| Parking Slot | Designated space where vehicles park (SP, MP, LP) |
| Session | Record of a vehicle's parking activity from entry to exit |
| Continuous Parking | When a vehicle returns within 1 hour of previous exit |
| Vehicle Type | Size classification: Small (S), Medium (M), Large (L) |
| Slot Type | Size classification: Small Parking (SP), Medium Parking (MP), Large Parking (LP) |
| Base Rate | Flat fee of 40 PHP for first 3 hours |
| Hourly Rate | Variable rate after 3 hours based on slot type |
| Long-Term Rate | Flat fee of 5000 PHP per 24 hours |

---

## Appendix C: Change Log

| Version | Date | Author | Changes |
|---------|--------|---------|----------|
| 1.0 | 2025-03-08 | Initial requirements document |

---

**Document Status:** Draft - Ready for Review
**Next Steps:** User review and approval, then proceed to user journey flows and feature specifications
