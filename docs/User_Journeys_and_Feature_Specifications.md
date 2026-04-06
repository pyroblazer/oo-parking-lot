# User Journeys and Feature Specifications
## OO Parking Lot System — Frontend Complete Reference

**Document Version:** 2.0
**Status:** Authoritative
**Audience:** Frontend Developers, QA Engineers, UX Designer

---

## Table of Contents

1. [User Journey Flows with Mermaid Diagrams](#1-user-journey-flows-with-mermaid-diagrams)
 - 1.1 [Park Vehicle Flows](#11-park-vehicle-flows)
 - 1.2 [Unpark Vehicle Flows](#12-unpark-vehicle-flows)
 - 1.3 [View Session Details Flow](#13-view-session-details-flow)
 - 1.4 [Manage Parking Slots Flow](#14-manage-parking-slots-flow)
 - 1.5 [Manage Entry Points Flow](#15-manage-entry-points-flow)
 - 1.6 [System Initialization Flow](#16-system-initialization-flow)
 - 1.7 [Continuous Parking Scenarios](#17-continuous-parking-scenarios)
 - 1.8 [Long-term Parking Scenarios](#18-long-term-parking-scenarios)
2. [Feature Specifications](#2-feature-specifications)
3. [Screen-by-Screen Specifications](#3-screen-by-screen-specifications)
4. [Interaction Design Specifications](#4-interaction-design-specifications)
5. [Data Flow Specifications](#5-data-flow-specifications)
6. [Feature Prioritization](#6-feature-prioritization)
7. [Testing Scenarios](#7-testing-scenarios)

---

## 1. User Journey Flows with Mermaid Diagrams

This section defines every user flow the frontend must support, including happy paths, all edge cases, system responses, API calls, and error handling. These diagrams are the authoritative source of truth for how each feature behaves.

---

### 1.1 Park Vehicle Flows

#### 1.1.1 Happy Path — Vehicle Parks Successfully

The standard path: parking attendant arrives at the Park Vehicle screen, fills in vehicle type and entry point, submits, and receives a successful session with slot assignment.

```mermaid
flowchart TD
- A([User navigates to Park Vehicle page]) --> B[Page loads - fetch entry points via GET /api/v1/entry_points]
- B --> C{Entry points loaded?}
- C -->|Success| D[Render Vehicle Type dropdown and Entry Point dropdown]
- C -->|Failure| E[Show error banner: Failed to load entry points]
- E --> F[Show Retry button]
- F --> B
- D --> G[User selects Vehicle Type: S or M or L]
- G --> H[User selects Entry Point from dropdown]
- H --> I[Park Vehicle button becomes active]
- I --> J[User clicks Park Vehicle button]
- J --> K[Button enters loading state: text changes to Parking...]
- K --> L[API call: POST /api/v1/sessions with form-urlencoded vehicle_type and entry_point_id]
- L --> M{HTTP 201 Created?}
- M -->|Yes| N[Parse session response: session_id, parking_slot, entry_point, parked_at, is_continuous]
- N --> O[Show animated success banner with green checkmark]
- O --> P[Display Session ID - copyable to clipboard]
- P --> Q[Display assigned slot label and type]
- Q --> R[Display View Session button]
- R --> S{Is Continuous?}
- S -->|Yes| T[Show continuous parking notice with base_start_time]
- S -->|No| U[Show standard success state]
- T --> V([User can click View Session or park another vehicle])
- U --> V
```

#### 1.1.2 Edge Case — No Available Slots

```mermaid
flowchart TD
- A([User submits Park Vehicle form]) --> B[API call: POST /api/v1/sessions]
- B --> C{HTTP 409 Conflict?}
- C -->|Yes| D[Extract vehicle_type from request data]
- D --> E[Construct message: No available X parking slot. All X slots are occupied.]
- E --> F[Display error banner with red background and X icon]
- F --> G[Show current slot availability summary by type]
- G --> H{User action?}
- H -->|Change vehicle type| I[User selects different vehicle type]
- H -->|Change entry point| J[User selects different entry point]
- H -->|Retry same| K[User clicks Park Vehicle again]
- I --> L[Re-enable Park Vehicle button]
- J --> L
- K --> L
- L --> B
```

#### 1.1.3 Edge Case — Network Failure

```mermaid
flowchart TD
- A([User submits Park Vehicle form]) --> B[API call: POST /api/v1/sessions]
- B --> C{Network error - no response received?}
- C -->|Yes| D[Show error: Cannot connect to parking system. Check if the API server is running.]
- D --> E[Display Retry button below error]
- E --> F[Show API URL in error context so user can verify configuration]
- F --> G{User action?}
- G -->|Click Retry| B
- G -->|Go to Settings| H[Navigate to Settings page to update API base URL]
- H --> I[User updates URL and saves]
- I --> J[Navigate back to Park Vehicle]
- J --> B
```

#### 1.1.4 Edge Case — Invalid / Missing Fields

```mermaid
flowchart TD
- A([User clicks Park Vehicle without filling fields]) --> B{vehicleType empty?}
- B -->|Yes| C[Highlight Vehicle Type dropdown with red border]
- C --> D[Show inline error: Please select a vehicle type]
- B -->|No| E{entryPointId empty?}
- E -->|Yes| F[Highlight Entry Point dropdown with red border]
- F --> G[Show inline error: Please select an entry point]
- E -->|No| H[Proceed with API call]
- D --> I([User corrects field and re-submits])
- G --> I
- I --> H
```

#### 1.1.5 Edge Case — Concurrent Parking Attempt

```mermaid
flowchart TD
- A([Two users submit simultaneously for last available slot]) --> B[User A API call goes first]
- B --> C[User A receives HTTP 201 - slot assigned]
- C --> D[User A sees success with slot assignment]
- D --> E[User B API call arrives - slot now occupied]
- E --> F[User B receives HTTP 409 Conflict]
- F --> G[User B sees error: No available X parking slot]
- G --> H[User B can try different entry point or vehicle type]
```

---

### 1.2 Unpark Vehicle Flows

#### 1.2.1 Happy Path — Vehicle Unparks Successfully with Fee Calculation

```mermaid
flowchart TD
- A([User navigates to Unpark Vehicle page]) --> B[Render Session ID text input field]
- B --> C[User types session ID into input]
- C --> D[User clicks Calculate Fee button]
- D --> E[Button enters loading state: text changes to Calculating...]
- E --> F[API call: POST /api/v1/sessions/SESSION_ID/unpark]
- F --> G{HTTP 200 OK?}
- G -->|Yes| H[Parse response: session_id, vehicle_type, parking_slot, entry_point, parked_at, exited_at, duration_hours, total_fee, is_continuous, fee_breakdown]
- H --> I[Animate fee breakdown section into view]
- I --> J[Show Base Fee section: 40 PHP for first 3 hours]
- J --> K{duration_hours greater than 3?}
- K -->|Yes| L[Show Exceeding Hours section with hourly rate by slot type]
- K -->|No| M[Show flat rate only section]
- L --> N{Has long_term days greater than 0?}
- N -->|Yes| O[Show Long-Term section: X days x 5000 PHP]
- N -->|No| P[Skip long-term section]
- O --> Q[Show Total Fee prominently in large bold text with PHP currency symbol]
- M --> Q
- P --> Q
- Q --> R[Show duration in hours - rounded up]
- R --> S{is_continuous is true?}
- S -->|Yes| T[Show continuous parking notice with base_start_time explanation]
- S -->|No| U[Show standard receipt view]
- T --> V[Show Print Receipt button]
- U --> V
- V --> W([User collects payment - flow complete])
```

#### 1.2.2 Edge Case — Session Not Found

```mermaid
flowchart TD
- A([User submits session ID]) --> B[API call: POST /api/v1/sessions/ID/unpark]
- B --> C{HTTP 404 Not Found?}
- C -->|Yes| D[Show error: Session not found. It may have already been completed.]
- D --> E[Clear session ID input field]
- E --> F[Suggest: Check the session ID and try again]
- F --> G{User action?}
- G -->|Enter new ID| H[User types different session ID]
- G -->|View sessions list| I[Navigate to Sessions Management page]
- H --> B
```

#### 1.2.3 Edge Case — Already Unparked Vehicle

```mermaid
flowchart TD
- A([User submits session ID for completed session]) --> B[API call: POST /api/v1/sessions/ID/unpark]
- B --> C{HTTP 404 returned?}
- C -->|Yes| D[Show error: Session not found. It may have already been completed.]
- D --> E[Offer option to View Session Details]
- E --> F{User clicks View Session?}
- F -->|Yes| G[Navigate to View Session page with session ID prefilled]
- F -->|No| H([User enters a different session ID])
```

#### 1.2.4 Edge Case — Invalid Session ID Format

```mermaid
flowchart TD
- A([User leaves session ID empty and clicks Calculate]) --> B{sessionId is empty?}
- B -->|Yes| C[Show inline validation error: Session ID is required]
- C --> D[Highlight input field with red border and shake animation]
- D --> E[Disable API call - do not proceed]
- E --> F([User enters session ID and resubmits])
- B -->|No| G[Proceed to API call]
```

#### 1.2.5 Continuous Parking Receipt Display

```mermaid
flowchart TD
- A([Unpark response received with is_continuous true]) --> B[Show yellow info banner at top of receipt]
- B --> C[Display: This vehicle returned within 1 hour of previous exit]
- C --> D[Show base_start_time - original park time]
- D --> E[Show current_park_time - second park time]
- E --> F[Show that fee is calculated from base_start_time]
- F --> G[Render full fee breakdown starting from base_start_time]
- G --> H[Highlight continuous parking discount or notice]
- H --> I([Receipt complete])
```

---

### 1.3 View Session Details Flow

#### 1.3.1 Happy Path

```mermaid
flowchart TD
- A([User navigates to View Session page]) --> B[Render Session ID input field]
- B --> C{Session ID prefilled from navigation?}
- C -->|Yes| D[Auto-populate input with session ID from route params]
- C -->|No| E[Input is empty - user must type session ID]
- D --> F[Auto-trigger GET request]
- E --> G[User types session ID]
- G --> H[User clicks View Session button]
- F --> I[API call: GET /api/v1/sessions/SESSION_ID]
- H --> I
- I --> J{HTTP 200 OK?}
- J -->|Yes| K[Parse response: session_id, vehicle_type, parking_slot, entry_point, parked_at, exited_at, is_active, is_continuous]
- K --> L{is_active is true?}
- L -->|Yes| M[Show green Active badge]
- L -->|No| N[Show gray Completed badge]
- M --> O[Display slot label and type - slot distances]
- N --> O
- O --> P[Display entry point identifier and name]
- P --> Q[Display parked_at timestamp - formatted]
- Q --> R{exited_at present?}
- R -->|Yes| S[Display exited_at and duration_hours and total_fee]
- R -->|No| T[Show Currently Parked status]
- S --> U{is_active?}
- T --> V([Session display complete])
- U -->|Yes| W[Show Unpark button - links to Unpark with session ID prefilled]
- U -->|No| V
- W --> V
```

#### 1.3.2 Session Not Found

```mermaid
flowchart TD
- A([User submits session ID for view]) --> B[API call: GET /api/v1/sessions/ID]
- B --> C{HTTP 404?}
- C -->|Yes| D[Show error card: Session ID not found]
- D --> E[Show suggestion to check the ID or browse Sessions list]
- E --> F{User action?}
- F -->|Try new ID| G([User clears field and enters new ID])
- F -->|Browse sessions| H[Navigate to Sessions Management page]
```

---

### 1.4 Manage Parking Slots Flow

#### 1.4.1 List All Slots

```mermaid
flowchart TD
- A([User navigates to Slots Management page]) --> B[API call: GET /api/v1/slots]
- B --> C{Success?}
- C -->|Yes| D[Render slots grid or list]
- D --> E[Show each slot: label - type badge - available/occupied indicator - distances array]
- E --> F[Show filter controls: filter by type SP/MP/LP and availability]
- F --> G[Show Create New Slot button at top right]
- G --> H([User can browse and take action])
- C -->|No| I[Show error banner with Retry]
- I --> B
```

#### 1.4.2 Create Slot

```mermaid
flowchart TD
- A([User clicks Create New Slot button]) --> B[Open Create Slot modal or drawer]
- B --> C[Render form: slot_label text input - slot_type selector SP/MP/LP - distances 3 numeric inputs]
- C --> D[User fills in all fields]
- D --> E[User clicks Save button]
- E --> F{Form validation passes?}
- F -->|No| G[Show inline validation errors on failing fields]
- G --> D
- F -->|Yes| H[API call: POST /api/v1/slots with slot_label - slot_type - distances array]
- H --> I{HTTP 201 Created?}
- I -->|Yes| J[Close modal]
- J --> K[Show toast: Slot created successfully]
- K --> L[Refresh slots list]
- L --> M([New slot appears in list])
- I -->|No| N[Show error in modal]
- N --> D
```

#### 1.4.3 Update Slot

```mermaid
flowchart TD
- A([User clicks Edit on a slot row]) --> B[Open Edit Slot modal prefilled with existing values]
- B --> C[User modifies desired fields: label - type - distances]
- C --> D[User clicks Save Changes button]
- D --> E{Validation passes?}
- E -->|No| F[Show inline errors]
- F --> C
- E -->|Yes| G[API call: PUT /api/v1/slots/SLOT_ID]
- G --> H{HTTP 200 OK?}
- H -->|Yes| I[Close modal - show success toast - refresh list]
- H -->|No| J[Show error message in modal]
- J --> C
```

#### 1.4.4 Delete Slot

```mermaid
flowchart TD
- A([User clicks Delete on a slot row]) --> B[Show confirmation dialog: Are you sure you want to delete slot LABEL?]
- B --> C{User confirms?}
- C -->|Cancel| D([Modal closes - no action taken])
- C -->|Confirm| E[Button enters loading state]
- E --> F[API call: DELETE /api/v1/slots/SLOT_ID]
- F --> G{HTTP 204 No Content?}
- G -->|Yes| H[Show success toast: Slot deleted]
- H --> I[Remove slot from list with fade-out animation]
- G -->|No| J[Show error: Cannot delete slot - check for active sessions]
- J --> D
```

---

### 1.5 Manage Entry Points Flow

#### 1.5.1 List Entry Points

```mermaid
flowchart TD
- A([User navigates to Entry Points Management]) --> B[API call: GET /api/v1/entry_points]
- B --> C{Success?}
- C -->|Yes| D[Render entry points list: identifier badge - name - ID - action buttons]
- D --> E[Show Add Entry Point button at top]
- E --> F([User can view - edit - or delete entry points])
- C -->|No| G[Show error banner with Retry]
- G --> B
```

#### 1.5.2 Create Entry Point

```mermaid
flowchart TD
- A([User clicks Add Entry Point]) --> B[Open Create Entry Point modal]
- B --> C[Render form: identifier single-char input - name text input]
- C --> D[User fills fields]
- D --> E[User clicks Create button]
- E --> F{identifier is 1 character?}
- F -->|No| G[Show: Identifier must be a single character]
- G --> D
- F -->|Yes| H{name is not empty?}
- H -->|No| I[Show: Name is required]
- I --> D
- H -->|Yes| J[API call: POST /api/v1/entry_points with identifier and name]
- J --> K{HTTP 201?}
- K -->|Yes| L[Close modal - show success toast - refresh list]
- K -->|Duplicate| M[Show: Entry point with this identifier already exists]
- M --> D
```

#### 1.5.3 Update Entry Point

```mermaid
flowchart TD
- A([User clicks Edit on entry point row]) --> B[Open Edit modal prefilled with identifier and name]
- B --> C[User updates name field]
- C --> D[User clicks Save Changes]
- D --> E[API call: PUT /api/v1/entry_points/ID with updated name]
- E --> F{HTTP 200?}
- F -->|Yes| G[Close modal - toast success - refresh list]
- F -->|No| H[Show error in modal]
- H --> C
```

#### 1.5.4 Delete Entry Point

```mermaid
flowchart TD
- A([User clicks Delete on entry point]) --> B[Show confirmation: Delete entry point IDENTIFIER?]
- B --> C{User confirms?}
- C -->|No| D([Close dialog])
- C -->|Yes| E[API call: DELETE /api/v1/entry_points/ID]
- E --> F{HTTP 204?}
- F -->|Yes| G[Success toast - remove from list with animation]
- F -->|No| H[Show error: Cannot delete - may have associated sessions]
- H --> D
```

---

### 1.6 System Initialization Flow

```mermaid
flowchart TD
- A([User navigates to Configuration page]) --> B[Page shows 3 tabs: Entry Points - Parking Slots - System]
- B --> C[User clicks System tab]
- C --> D[Show Initialize System section with JSON editor or form]
- D --> E[Default config pre-populated: 3 entry points A-B-C and sample slots]
- E --> F[User reviews or edits configuration]
- F --> G[User clicks Initialize System button]
- G --> H[Show confirmation dialog: This will create entry points and slots. Proceed?]
- H --> I{User confirms?}
- I -->|No| J([Dialog closes])
- I -->|Yes| K[Button shows Initializing... loading state]
- K --> L[API call: POST /api/v1/initialize with entry_points and parking_slots arrays]
- L --> M{HTTP 200 or 201?}
- M -->|Yes| N[Parse response: entry_points_created - parking_slots_created - message]
- N --> O[Show success result card]
- O --> P[Display counts: X entry points created - Y parking slots created]
- P --> Q[Offer Navigate to Dashboard button]
- M -->|Partial failure| R[Show partial success with counts and any errors]
- M -->|Error| S[Show error details with option to retry]
- S --> F
```

---

### 1.7 Continuous Parking Scenarios

#### 1.7.1 Vehicle Returns Within 1 Hour

```mermaid
flowchart TD
- A([Vehicle exits - session A ends with exited_at timestamp]) --> B[Time passes - less than 60 minutes]
- B --> C[Same vehicle type arrives at same or different entry point]
- C --> D[Attendant uses Park Vehicle form]
- D --> E[API call: POST /api/v1/sessions]
- E --> F[Backend detects previous session within 1 hour window]
- F --> G[Backend creates new session with is_continuous = true]
- G --> H[Backend sets base_start_time to original session parked_at]
- H --> I[Frontend receives session with is_continuous = true]
- I --> J[Show special continuous parking banner in success state]
- J --> K[Display: Vehicle returned within 1 hour - continuous rate applied]
- K --> L[Show base_start_time to attendant for transparency]
- L --> M([Attendant provides ticket with continuous notice])
- M --> N[When vehicle unparks - fee calculated from base_start_time]
- N --> O[Unpark receipt shows continuous parking explanation]
```

#### 1.7.2 Fee Calculation from Base Start Time

```mermaid
flowchart TD
- A([Vehicle first parked at 8:00 AM]) --> B[Vehicle exits at 9:30 AM - 1.5 hours]
- B --> C{Returned at 10:00 AM - within 1 hour?}
- C -->|Yes - 30 min gap| D[New session marked is_continuous = true]
- D --> E[base_start_time = 8:00 AM]
- E --> F[Vehicle exits second session at 2:00 PM]
- F --> G[Total duration = from 8:00 AM to 2:00 PM = 6 hours]
- G --> H[Fee = 40 base + 3 exceeding hours x slot_rate]
- H --> I[Receipt shows: base_start_time = 8:00 AM - duration = 6 hours]
- C -->|No - more than 1 hour| J[New session is NOT continuous]
- J --> K[base_start_time = current park time]
- K --> L[Standard fee calculation applies]
```

---

### 1.8 Long-term Parking Scenarios

#### 1.8.1 24+ Hour Parking Fee Calculation Display

```mermaid
flowchart TD
- A([Vehicle unparked after 26 hours in SP slot]) --> B[Backend calculates: 1 full 24h chunk and 2 remaining hours]
- B --> C[Fee = 5000 for 24h + 40 base for remaining + 0 exceeding under 3h]
- C --> D[Frontend receives fee_breakdown with long_term.days = 1 and long_term.fee = 5000]
- D --> E[Render Long-Term Parking section in receipt]
- E --> F[Show: 1 day x 5000 = 5000 PHP]
- F --> G[Show: Remaining 2 hours - flat rate 40 PHP]
- G --> H[Show total: 5040 PHP]
- H --> I([Receipt highlights long-term rate applied])
```

#### 1.8.2 48+ Hour Parking

```mermaid
flowchart TD
- A([Vehicle parked 50 hours in SP slot]) --> B[Backend: 2 full 24h chunks = 48h - remaining 2 hours]
- B --> C[Fee = 10000 for 2 days + 40 base + 0 exceeding]
- C --> D[Frontend receipt shows: 2 days x 5000 = 10000]
- D --> E[Show: Remaining 2 hours - base fee 40 PHP]
- E --> F[Total: 10040 PHP]
- F --> G([Large total fee displayed prominently in receipt])
```

---

## 2. Feature Specifications

Each feature follows a consistent specification template covering user story, acceptance criteria, UI requirements, API integration, edge cases, success metrics, and dependencies.

---

### FEAT-001: Park Vehicle

**User Story:** As a parking attendant, I want to quickly park a vehicle by selecting its type and the entry point it arrived at, so that the system auto-assigns the closest available compatible slot and creates a session record.

**Acceptance Criteria:**
1. The Vehicle Type dropdown shows exactly three options: Small (S), Medium (M), Large (L) with descriptive labels
2. The Entry Point dropdown is populated from the live API (GET /api/v1/entry_points) on page load
3. Both fields must be selected before the Park button activates
4. The Park button shows a loading spinner and disabled state during the API call
5. On success (HTTP 201), a success banner appears with Session ID, assigned slot label, slot type, and a View Session button
6. On HTTP 409 error, the error message clearly states which vehicle type has no available slots
7. On HTTP 409, the current availability summary by slot type is shown alongside the error
8. The Session ID in the success banner can be copied to clipboard with a single click
9. If is_continuous is true in the response, a prominent notice displays: Vehicle returned within 1 hour - continuous rate applies

**User Flow:** See Section 1.1

**UI Requirements:**
- Page title: Park Vehicle with car emoji icon
- Vehicle Type selector: large card-style selectors or prominent dropdown, icons for each vehicle size (small car, medium car, large truck/van)
- Entry Point selector: dropdown populated dynamically; shows identifier and name (e.g., "Main Entrance (A)")
- Park Vehicle button: full-width or prominent CTA, primary blue color, with loading spinner animation
- Success state: green animated banner, monospace font for session ID, copy-to-clipboard icon button
- Error state: red banner with error icon, dismissible, retry affordance
- Info box below form: shows vehicle type compatibility table (S can park in SP/MP/LP, M in MP/LP, L in LP only)
- Framer Motion animations: container fades in with staggered child reveals (itemVariants), error/success use AnimatePresence for smooth enter/exit
- MagneticButton component: spring animation on hover (scale 1.05) and tap (scale 0.95), stiffness 400, damping 25
- MagneticSelect component: subtle scale on hover (1.02), stiffness 300, damping 25

**API Requirements:**
- On mount: GET /api/v1/entry_points — populates Entry Point dropdown
- On submit: POST /api/v1/sessions — Content-Type: application/x-www-form-urlencoded — body: vehicle_type={S|M|L}&entry_point_id={identifier}
- Response fields used: session_id, parking_slot.slot_label, parking_slot.slot_type, entry_point, parked_at, is_continuous
- Debug mode only: optional parked_at field in form (ISO8601) — controlled by VITE_DEBUG_MODE env variable

**Edge Cases:**
- No entry points in system: show empty state in dropdown with message to initialize system first
- Entry points fail to load: show retry option, do not block entire page
- Slot full (409): show specific vehicle type in error message, display slot availability summary
- Network down: show cannot connect error with API URL reference
- Concurrent submission: handle race condition gracefully with 409 response

**Success Metrics:**
- Form submission to success feedback in under 2 seconds
- Zero ambiguous error messages — all errors are actionable
- Session ID visible and copyable within 1 second of success

**Dependencies:** FEAT-011 (List Entry Points must work for dropdown to populate)

---

### FEAT-002: Unpark Vehicle

**User Story:** As a parking attendant, I want to unpark a vehicle by entering its session ID, so that the system calculates the fee and marks the session complete.

**Acceptance Criteria:**
1. Session ID input accepts any string and is required before submission
2. Empty submission shows inline validation: Session ID is required
3. Calculate Fee button shows loading state during API call
4. On HTTP 200 success, fee breakdown animates into view below the form
5. Total fee is displayed in large, bold Philippine Peso format (₱XXX.XX)
6. Duration in hours (rounded up) is clearly shown
7. On HTTP 404, message states: Session not found. It may have already been completed.
8. Fee breakdown shows individual components: base fee, exceeding hours, long-term days (if applicable)
9. Continuous parking is flagged prominently with base_start_time shown

**User Flow:** See Section 1.2

**UI Requirements:**
- Page title: Unpark Vehicle with departure icon
- Session ID input: large text input, monospace font suggestion for ID display, placeholder: Enter Session ID
- Calculate Fee button: primary CTA with loading state
- Fee breakdown section: receipt-style card with tree-structured breakdown (├─ Base Fee, ├─ Exceeding Hours, └─ Total Fee)
- Total fee: large bold display, ₱ currency symbol, distinct visual hierarchy
- Continuous parking badge: yellow/amber warning banner when is_continuous is true
- Print Receipt button: secondary action below fee display
- Framer Motion: fee breakdown section animates in from bottom on success
- Error state: red error banner with icon, auto-dismisses after 8 seconds or on user dismiss

**API Requirements:**
- POST /api/v1/sessions/{sessionId}/unpark — Content-Type: application/json — no request body
- Debug mode: exited_at sent as URL query param: /api/v1/sessions/{id}/unpark?exited_at={ISO8601}
- Response fields used: session_id, vehicle_type, parking_slot.slot_label, parking_slot.slot_type, parked_at, exited_at, duration_hours, total_fee, is_continuous, fee_breakdown.long_term.days, fee_breakdown.long_term.fee, fee_breakdown.remaining.base_fee, fee_breakdown.remaining.exceeding_hours, fee_breakdown.remaining.exceeding_fee

**Fee Breakdown Display Spec:**
```
Fee Breakdown
├─ Base Fee: ₱40.00 (first 3 hours)
├─ Exceeding Hours: N hours
│ └─ Rate: ₱XX.00/hour (slot type)
├─ Exceeding Fee: ₱XX.00
[If long-term:]
├─ Long-Term: N days × ₱5,000.00 = ₱X,XXX.00
└─ Total Fee: ₱XXX.00
```

**Edge Cases:**
- Session not found (404): clear input, show error, offer link to Sessions list
- Already unparked: same 404 handling — direct user to View Session for reference
- Network failure: retry button, do not clear input
- Extremely large fee (50+ hours): ensure currency formatting handles large numbers

**Success Metrics:**
- Fee displayed in under 2 seconds
- All fee components clearly understandable without additional explanation

**Dependencies:** Active session must exist (FEAT-001 must have been used)

---

### FEAT-003: Fee Calculation and Display

**User Story:** As a parking attendant, I want a clear and accurate fee breakdown displayed on the unpark receipt, so that I can explain the charges transparently to the vehicle owner.

**Acceptance Criteria:**
1. Flat rate of ₱40.00 is always shown for the first 3 hours
2. Exceeding hours are correctly displayed with the applicable rate (SP=₱20, MP=₱60, LP=₱100)
3. Long-term rate of ₱5,000/day shown when parking exceeds 24 hours
4. Duration hours displayed as ceiling-rounded integer (e.g., 5.4 hours → 6 hours)
5. Total fee is the last and most prominent element in the breakdown
6. Continuous parking note appears when is_continuous is true with base_start_time
7. All currency values formatted as ₱X,XXX.XX using Philippine Peso format

**User Flow:** See Section 1.2 (integrated into Unpark flow)

**UI Requirements:**
- Fee breakdown uses card container with subtle border
- Each line item: left-aligned label, right-aligned currency value
- Separator line before total
- Total row: bold, larger font size, accent color
- Continuous parking section: amber/yellow background badge at top of receipt
- Long-term section only rendered when fee_breakdown.long_term.days > 0
- Exceeding section only rendered when fee_breakdown.remaining.exceeding_hours > 0

**Hourly Rate Reference Table (displayed as tooltip or info section):**
| Slot Type | Hourly Rate |
|-----------|------------|
| SP — Small Parking | ₱20.00/hour |
| MP — Medium Parking | ₱60.00/hour |
| LP — Large Parking | ₱100.00/hour |

**Example Fee Calculations the UI Must Correctly Display:**
| Duration | Slot | Fee |
|----------|------|-----|
| 2 hours | SP | ₱40.00 |
| 5 hours | SP | ₱80.00 |
| 5 hours | MP | ₱160.00 |
| 26 hours | SP | ₱5,040.00 |
| 50 hours | SP | ₱10,040.00 |

**Dependencies:** FEAT-002 (rendered as part of Unpark flow)

---

### FEAT-004: View Session Details

**User Story:** As a parking attendant, I want to look up any session by its ID to see its full status and details, so that I can answer customer inquiries quickly.

**Acceptance Criteria:**
1. Session ID input is required; empty submission shows inline validation error
2. Session details display all fields: ID, vehicle type, slot label, slot type, entry point, parked_at, exited_at (if completed), duration, total_fee (if completed), status badge, is_continuous indicator
3. Active sessions show a green Active badge and an Unpark This Vehicle action button
4. Completed sessions show a gray Completed badge, exited_at time, duration, and total_fee
5. Session not found shows: Session ID not found — It may have been deleted or never existed
6. Navigating from Park Vehicle success (View Session button) pre-populates the session ID and auto-triggers the lookup

**User Flow:** See Section 1.3

**UI Requirements:**
- Page title: View Session with search icon
- Session ID input: large text field with View button inline or below
- Session detail card: structured layout with icon-labeled rows
- Status badge: green pill for Active, gray pill for Completed
- Vehicle type shown with corresponding icon or badge
- Slot info section: label, type badge (SP/MP/LP with color coding), distances array (if needed)
- Entry point: identifier badge (letter in circle) + full name
- Timestamps: human-readable format (e.g., Jan 15, 2024 at 10:30 AM)
- Continuous indicator: yellow badge if is_continuous is true
- Unpark button: only shown for active sessions, deep-links to Unpark page with session ID prefilled

**API Requirements:**
- GET /api/v1/sessions/{sessionId}
- Response fields all displayed as described above

**Dependencies:** None (standalone lookup), but pairs naturally with FEAT-001 and FEAT-002

---

### FEAT-005: List Sessions

**User Story:** As a system administrator, I want to view all parking sessions with pagination, so that I can audit activity and review the system's usage history.

**Acceptance Criteria:**
1. Sessions list loads on page mount with default pagination: page 1, 20 per page
2. Each session row shows: Session ID, Vehicle Type badge, Slot Label, Entry Point, Parked At, Status (Active/Completed)
3. Pagination controls render: Previous, page numbers, Next
4. Page size selector allows 10, 20, 50, or 100 per page
5. Total session count displayed (e.g., "Showing 1-20 of 150 sessions")
6. Auto-polls every 30 seconds to reflect new sessions
7. Loading skeleton shown during data fetch
8. Empty state shown when no sessions exist

**User Flow:** Direct navigation to Sessions Management page

**UI Requirements:**
- Page title: Sessions Management
- Table (desktop) or card list (mobile)
- Desktop table columns: Session ID (monospace, truncated with tooltip), Vehicle Type (badge), Slot (badge), Entry Point (badge), Parked At (formatted), Status (pill badge)
- Status color coding: Active = green, Completed = gray
- Pagination: bottom-aligned row with page count display
- Per-page selector: dropdown on right side of pagination bar
- Auto-refresh indicator: subtle pulsing dot with "Auto-refresh: 30s" label
- Skeleton loading: rows of gray shimmer blocks during initial load
- Click on a session row: navigates to View Session page for that session

**API Requirements:**
- GET /api/v1/sessions?page={page}&per_page={perPage}
- Total count from X-Total-Count or X-Total-Count response header, fallback to data.length
- Polling: setInterval every 30000ms, cleared on unmount, paused when tab is not visible

**Dependencies:** FEAT-004 (clicking a session navigates to View Session)

---

### FEAT-006: List All Slots

**User Story:** As a system administrator, I want to see all parking slots with their current status, so that I can monitor occupancy at a glance.

**Acceptance Criteria:**
1. All slots display immediately on page load
2. Each slot shows: label, type (SP/MP/LP), availability status, distance array
3. Color-coded status: green card/badge for available, red for occupied
4. Filter controls allow filtering by slot type and/or availability
5. Slot count summary: "X available / Y total" shown at top
6. Grid view is default on desktop, list view option available

**UI Requirements:**
- Slot grid: responsive, auto-fill columns (minmax 100px)
- Each slot cell: slot label (bold), type badge (color-coded), status indicator dot and text
- Slot type colors: SP = green, MP = blue, LP = purple
- Hover tooltip: shows distance array for that slot
- Available = solid color fill; Occupied = muted/gray wash
- Filter bar: row of toggle buttons for slot type, and availability toggle switch
- Summary bar at top: "SP: X/Y | MP: X/Y | LP: X/Y"

**API Requirements:**
- GET /api/v1/slots
- Polls every 60 seconds for slot availability updates

**Dependencies:** None

---

### FEAT-007: Get Available Slots

**User Story:** As a parking attendant, I want to check which slots are available for a specific vehicle type from a specific entry point, so that I can advise customers on wait times if the lot appears full.

**Acceptance Criteria:**
1. Vehicle Type and Entry Point both required before search
2. Results show only available, compatible slots sorted by distance to the selected entry point
3. Each result shows: slot label, slot type, distance from selected entry point
4. Total available count displayed
5. Empty state: "No slots available for [vehicle type] from [entry point]" with clear CTA
6. Results update automatically when filters change

**User Flow:** Filter form → API call → Results display

**UI Requirements:**
- Page: Available Slots
- Two filter dropdowns: Vehicle Type and Entry Point (both populated dynamically)
- Search / Check Availability button
- Results: card grid or list, each card shows slot label, type badge, distance badge
- Distance badge: "X units from [Entry Point]"
- Available count: bold number at top of results section
- Empty state: icon + message + suggestion to try a different vehicle type or entry point
- Auto-search when both filters are selected (optional enhancement)

**API Requirements:**
- GET /api/v1/slots/available?vehicle_type={S|M|L}&entry_point_id={identifier}
- Response: data.available_slots array
- On mount: GET /api/v1/entry_points to populate Entry Point dropdown

**Compatibility Rules Displayed in UI:**
- Small (S): Compatible with SP, MP, LP
- Medium (M): Compatible with MP, LP
- Large (L): Compatible with LP only

**Dependencies:** FEAT-011 (entry points must exist for dropdown)

---

### FEAT-008: Create Slot

**User Story:** As a system administrator, I want to add new parking slots to the lot, so that the system can accommodate lot expansions.

**Acceptance Criteria:**
1. Form requires: slot_label (non-empty string), slot_type (SP/MP/LP), distances (exactly 3 integer values, one per entry point)
2. Slot label validation: non-empty, no special characters beyond hyphen
3. Distances: each must be a positive integer
4. On success (HTTP 201): modal closes, success toast, list refreshes
5. On duplicate label: error message "A slot with this label already exists"

**User Flow:** See Section 1.4.2

**UI Requirements:**
- Triggered from Create New Slot button on Slots Management page
- Modal dialog (centered on desktop, bottom sheet on mobile)
- Form fields: Slot Label (text input), Slot Type (radio or select with visual badges), Distances to Entry Points (3 labeled number inputs: "Distance from A", "Distance from B", "Distance from C")
- Save button: primary CTA in modal footer
- Cancel button: secondary in modal footer
- Real-time validation on blur for each field

**API Requirements:**
- POST /api/v1/slots — Content-Type: application/json
- Body: { slot: { slot_label, slot_type, distances: [n, n, n] } }
- Response: created slot object

**Dependencies:** FEAT-011 (to know how many distance inputs to show — matches entry point count)

---

### FEAT-009: Update Slot

**User Story:** As a system administrator, I want to update an existing slot's label, type, or distances, so that I can correct configuration errors.

**Acceptance Criteria:**
1. Edit modal pre-fills current slot values
2. Any subset of fields can be updated (all optional on update)
3. Same validation rules as Create Slot apply to any changed fields
4. On success: modal closes, success toast, list refreshes with updated values
5. On error: message shown inside modal

**User Flow:** See Section 1.4.3

**UI Requirements:**
- Same modal design as Create (FEAT-008) but pre-populated
- Modal title: "Edit Slot: [slot_label]"
- All three fields editable
- Save Changes CTA button

**API Requirements:**
- PUT /api/v1/slots/{id} — Content-Type: application/json
- Body: { slot: { slot_label?, slot_type?, distances? } }

**Dependencies:** FEAT-006 (slots list must be displayed first)

---

### FEAT-010: Delete Slot

**User Story:** As a system administrator, I want to delete a parking slot that is no longer in use, so that the system reflects the actual lot configuration.

**Acceptance Criteria:**
1. Delete button triggers a confirmation dialog before any API call
2. Dialog shows slot label in the confirmation message
3. On confirm: API call, then success toast and slot removed from list
4. On API error (e.g., slot has active session): error toast shown, slot remains in list

**User Flow:** See Section 1.4.4

**UI Requirements:**
- Delete button: red/danger color in slot's action menu
- Confirmation modal: "Are you sure you want to delete slot [LABEL]? This action cannot be undone."
- Two buttons in dialog: Cancel (secondary) and Delete Slot (red danger button)
- Fade-out animation when slot is removed from list

**API Requirements:**
- DELETE /api/v1/slots/{id}
- 204 No Content on success

**Dependencies:** FEAT-006

---

### FEAT-011: List Entry Points

**User Story:** As a system administrator, I want to view all entry points configured in the system, so that I can verify the lot's access configuration.

**Acceptance Criteria:**
1. Entry points load on page mount
2. Each entry point displays: ID, Identifier badge (large letter), Name
3. Edit and Delete action buttons for each entry point
4. Add Entry Point button at top of list
5. Empty state with message to add first entry point

**User Flow:** See Section 1.5.1

**UI Requirements:**
- List view: each entry point as a card or table row
- Identifier: displayed in a large circle badge with background color
- Minimum 3 entry points required (warn user if fewer than 3 exist per parking system rules)
- Empty state: information about minimum entry point requirement

**API Requirements:**
- GET /api/v1/entry_points
- Used as data source for Entry Point dropdowns across Park Vehicle and Available Slots pages

**Dependencies:** None

---

### FEAT-012: Create Entry Point

**User Story:** As a system administrator, I want to add a new entry point when the mall expands its parking entrance, so that vehicles can be assigned slots relative to the new entry.

**Acceptance Criteria:**
1. Form requires: identifier (exactly 1 alphabetical character), name (non-empty string)
2. Identifier validated to be single character, uppercase preferred
3. Duplicate identifier shows: "Entry point with identifier X already exists"
4. On success: modal closes, list refreshes, new entry point visible

**User Flow:** See Section 1.5.2

**UI Requirements:**
- Modal with two inputs: Identifier (small text input, max 1 char) and Name (full-width text input)
- Auto-uppercase the identifier input
- Create Entry Point CTA button

**API Requirements:**
- POST /api/v1/entry_points — Content-Type: application/json
- Body: { entry_point: { identifier, name } }

**Dependencies:** None

---

### FEAT-013: Update Entry Point

**User Story:** As a system administrator, I want to rename an entry point, so that signage changes can be reflected in the system.

**Acceptance Criteria:**
1. Edit modal opens with current name pre-filled
2. Name is required; empty name shows validation error
3. On success: modal closes, success toast, list refreshes

**User Flow:** See Section 1.5.3

**UI Requirements:**
- Same modal pattern as Create, pre-populated
- Title: "Edit Entry Point: [IDENTIFIER]"

**API Requirements:**
- PUT /api/v1/entry_points/{id} — Body: { entry_point: { name } }

**Dependencies:** FEAT-011

---

### FEAT-014: Delete Entry Point

**User Story:** As a system administrator, I want to remove an entry point that is no longer active, so that the system stays accurate.

**Acceptance Criteria:**
1. Confirmation dialog shows entry point identifier in message
2. On confirm and 204 response: success toast, entry point removed from list
3. On error: appropriate error toast, entry point remains

**User Flow:** See Section 1.5.4

**UI Requirements:**
- Confirmation dialog: "Delete entry point [IDENTIFIER] ([NAME])? This cannot be undone."
- Warning note: "Deleting an entry point may affect slot distance calculations."

**API Requirements:**
- DELETE /api/v1/entry_points/{id}

**Dependencies:** FEAT-011

---

### FEAT-015: Initialize System

**User Story:** As a system administrator, I want to bulk-initialize the parking system with entry points and slots in one operation, so that the system is ready for use quickly.

**Acceptance Criteria:**
1. Form accepts configuration for entry_points array and parking_slots array
2. Default configuration pre-populated: 3 entry points (A, B, C) and a representative set of slots
3. JSON editor or structured form both supported
4. Confirmation dialog before execution
5. Response shows count of created entry points and parking slots
6. System is idempotent: calling again does not fail, shows how many new items were created
7. Navigate to Dashboard button shown on success

**User Flow:** See Section 1.6

**UI Requirements:**
- Located in Configuration page under the System tab
- Pre-filled JSON textarea or structured multi-entry form
- Preview section shows what will be created before confirmation
- Progress indicator during initialization
- Result card with created counts and a success icon

**API Requirements:**
- POST /api/v1/initialize — Content-Type: application/json
- Body: { entry_points: [...], parking_slots: [...] }
- Response: { entry_points_created, parking_slots_created, message }

**Dependencies:** None (this creates the foundation for all other features)

---

### FEAT-016: Check System Health

**User Story:** As a system administrator, I want to quickly see if the parking system backend is online and the database is healthy, so that I can diagnose connection issues.

**Acceptance Criteria:**
1. Health status (ok/error) is displayed in the Dashboard header at all times
2. Health dot pulses green when online, red when offline, amber when checking
3. Database status shown as healthy/unhealthy
4. Service name and version displayed
5. Health auto-polls every 120 seconds
6. If health returns error: system-wide warning banner shown

**User Flow:** Passive — displayed on Dashboard and in nav; also accessible in Configuration > System tab

**UI Requirements:**
- Health badge: pill with colored dot + text (Online/Offline/Checking)
- Dashboard header: health badge top-right
- Nav bar: small health indicator dot
- Configuration > System tab: full health card with all fields (status, service, version, timestamp, database.status)
- Auto-refresh indicator shows "Auto-refresh: 120s"

**API Requirements:**
- GET /health (no /api/v1 prefix)
- Response: { status, service, version, timestamp, checks.database.status }
- Poll every 120000ms (2 minutes)
- On network error: set health to "offline"

**Dependencies:** None

---

## 3. Screen-by-Screen Specifications

This section defines every screen in both the React Web and React Native apps, including layout, components, data, navigation, and platform-specific notes.

---

### SCREEN-001: Dashboard / Home

**Purpose:** Real-time monitoring hub showing live parking lot status, statistics, and recent activity.

**Key Components and Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Title + Subtitle | Health Badge | Refresh │
├─────────────────────────────────────────────────────┤
│ STATS GRID (5 cards, auto-fit columns) │
│ [Total] [Available] [Occupied] [Active] [Revenue] │
├─────────────────────────────────────────────────────┤
│ MAIN CONTENT (2-col: slot grid | sidebar) │
│ LEFT: Slot Occupancy Grid │
│ RIGHT: Activity Feed + Entry Points Panel │
├─────────────────────────────────────────────────────┤
│ FOOTER: Last updated timestamp │
└─────────────────────────────────────────────────────┘
```

**User Interactions:**
- Hover over slot cell: tooltip shows distance to closest entry point
- Click slot cell: (optional) navigate to slot detail
- Activity feed items: clickable, navigate to View Session
- Entry point items: hover shows translated slide-right effect

**Data Displayed:**
- totalSlots, availableSlots, occupiedSlots, activeSessions, totalRevenueToday (from calculateStats)
- Slot grid: all slots from GET /api/v1/slots with available/occupied color coding
- Activity feed: last 10 sessions sorted by parked_at descending
- Entry points list: all entry points with vehicle count per entry point
- System health badge (polling every 120s)

**Navigation Paths:**
- Stats cards: no navigation (display only)
- Activity session rows: → View Session page
- Slot cells: → Slots Management (optional)
- Header health badge: → Configuration > System tab

**Responsive Behavior:**
- Desktop (>1024px): 2-column layout (slot grid left, sidebar right)
- Tablet (640-1024px): single column, sidebar stacks below grid
- Mobile (<640px): 2-col stats grid (instead of 5-col), all sections stacked vertically
- Header wraps on small screens with flex-wrap

**Visual Effects:**
- Stat cards: lift/shadow on hover (translateY -2px)
- Slot cells: scale(1.05) on hover, tooltip appears
- Entry point items: translateX(4px) on hover
- Health dot: CSS pulse animation (2s infinite)
- Loading spinner: CSS spin animation

**Platform-Specific Notes (Mobile App):**
- Bottom tab navigation replaces top nav
- Dashboard tab is home tab
- Stats shown in 2x2 grid
- Activity feed limited to last 5 sessions on mobile for performance

---

### SCREEN-002: Park Vehicle (3-Step Wizard on Web)

**Purpose:** Primary operational screen for parking attendants to register an incoming vehicle.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Park Vehicle │
├─────────────────────────────────────────────────────┤
│ ERROR BANNER (AnimatePresence - only when error) │
│ SUCCESS BANNER (AnimatePresence - only on success)│
├─────────────────────────────────────────────────────┤
│ FORM: │
│ [Vehicle Type Dropdown ▼] │
│ [Entry Point Dropdown ▼] │
│ [ Park Vehicle Button ] │
├─────────────────────────────────────────────────────┤
│ INFO BOX: Vehicle Type Compatibility Table │
└─────────────────────────────────────────────────────┘
```

**User Interactions:**
- Select Vehicle Type (S / M / L) — dropdown with descriptive options
- Select Entry Point — dropdown populated from API on mount
- Click Park Vehicle — submits form, shows loading state
- Click View Session (on success) — navigates to View Session page
- Click Copy icon next to Session ID — copies to clipboard

**Components:**
- MagneticSelect: motion.select with spring hover effect (scale 1.02)
- MagneticButton: motion.button with spring hover (scale 1.05) and tap (scale 0.95)
- Error message: motion.div with slide-in from left (x: -20) via AnimatePresence
- Success message: motion.div with scale-in (scale: 0.9 → 1.0) via AnimatePresence
- Container: motion.div with staggerChildren: 0.1 and y: 20 → 0 fade-in
- Info box: static section, no animation required

**Data Displayed:**
- Entry points loaded from API — identifier and name shown in dropdown
- On success: session_id, parking_slot.slot_label, parking_slot.slot_type, is_continuous flag

**Navigation:**
- Success → View Session button → /session/:id

**Responsive Behavior:**
- Form is single-column at all breakpoints
- Dropdowns are full-width
- Button is full-width
- Info box uses unordered list layout, responsive to content

**Debug Mode (VITE_DEBUG_MODE=true):**
- Additional "Parked At (testing)" datetime input appears below Entry Point
- Sends parked_at as form field
- Only visible in development/test environments

**Platform-Specific Notes (Mobile):**
- Large touch targets (minimum 44px height)
- Vehicle type shown as large tappable card buttons (not dropdown)
- Entry point shown as horizontal scrollable pill selector
- No MagneticButton — use TouchableOpacity with press feedback

---

### SCREEN-003: Unpark Vehicle

**Purpose:** Process vehicle exits and display fee information to the attendant.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Unpark Vehicle │
├─────────────────────────────────────────────────────┤
│ ERROR BANNER (AnimatePresence) │
├─────────────────────────────────────────────────────┤
│ FORM: │
│ [Session ID ________________] │
│ [ Calculate Fee Button ] │
├─────────────────────────────────────────────────────┤
│ FEE BREAKDOWN CARD (animates in on success) │
│ ┌──────────────────────────────────────────────┐ │
│ │ CONTINUOUS BADGE (if applicable) │ │
│ │ Base Fee: ₱40.00 │ │
│ │ Exceeding N hours × ₱XX.00 = ₱XX.00 │ │
│ │ [Long-term: N days × ₱5,000 if applicable] │ │
│ │ ─────────────────────────────────────────── │ │
│ │ TOTAL FEE: ₱XXX.00 (large bold) │ │
│ └──────────────────────────────────────────────┘ │
│ [Print Receipt] │
└─────────────────────────────────────────────────────┘
```

**Components:**
- SessionID input: standard text input with validation
- Fee breakdown card: receipt-style with tree structure lines
- Total fee: 2rem+ font, bold, primary/accent color
- Continuous banner: amber background, warning icon, explanation text
- Print Receipt: secondary button, triggers window.print() or formatted view

**Data Displayed:** See FEAT-002 and FEAT-003

**Platform-Specific Notes (Mobile):**
- Session ID input has numeric keyboard suggestion but allows alphanumeric
- QR code scanner button (optional enhancement) for session ID input
- Receipt displayed as scrollable view

---

### SCREEN-004: View Session

**Purpose:** Lookup and display complete details of any parking session by ID.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: View Session Details │
├─────────────────────────────────────────────────────┤
│ SEARCH FORM: │
│ [Session ID _____________] [View Button] │
├─────────────────────────────────────────────────────┤
│ SESSION DETAIL CARD (only shown after lookup) │
│ ┌──────────────────────────────────────────────┐ │
│ │ Session: #SESSION_ID [ACTIVE/DONE] │ │
│ │ Vehicle: [S/M/L badge] │ │
│ │ Slot: SP-1 [SP badge] │ │
│ │ Entry Point: [A] Main Entrance │ │
│ │ Parked At: Jan 15, 2024 10:30 AM │ │
│ │ Exited At: (if completed) │ │
│ │ Duration: X hours (if completed) │ │
│ │ Total Fee: ₱XX.00 (if completed) │ │
│ │ Continuous: YES/NO badge │ │
│ └──────────────────────────────────────────────┘ │
│ [Unpark This Vehicle] (only if active) │
└─────────────────────────────────────────────────────┘
```

**Navigation:**
- Session ID can be pre-filled via route params (/session/:id)
- Unpark button deep-links to Unpark page with session ID pre-filled

---

### SCREEN-005: Available Slots

**Purpose:** Check slot availability for a specific vehicle type from a specific entry point.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Available Slots │
├─────────────────────────────────────────────────────┤
│ FILTER ROW: │
│ [Vehicle Type ▼] [Entry Point ▼] [Check Button] │
├─────────────────────────────────────────────────────┤
│ RESULTS HEADER: X available slots for S from A │
├─────────────────────────────────────────────────────┤
│ SLOTS GRID: │
│ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │ SP-1 │ │ SP-3 │ │ MP-1 │ │
│ │ [SP] │ │ [SP] │ │ [MP] │ │
│ │ 5 mi │ │ 7 mi │ │ 10 mi │ │
│ └────────┘ └────────┘ └────────┘ │
│ │
│ [Empty state: No compatible slots found] │
└─────────────────────────────────────────────────────┘
```

**Slot Card Design:**
- Slot label: large bold text at top
- Slot type badge: colored pill (SP=green, MP=blue, LP=purple)
- Distance: bottom of card with distance unit
- Card background: light color tint matching slot type

---

### SCREEN-006: Sessions Management

**Purpose:** Administrative view of all parking sessions with pagination and status tracking.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Sessions Management │
│ [Total count] [Per page selector ▼] [Auto-refresh]│
├─────────────────────────────────────────────────────┤
│ SESSIONS TABLE (desktop): │
│ Session ID | Vehicle | Slot | Entry | Parked At │
│ ──────────────────────────────────────────────── │
│ [row 1] │
│ [row 2] ... │
├─────────────────────────────────────────────────────┤
│ PAGINATION: [<] [1] [2] [3] ... [N] [>] │
│ Showing 1-20 of 150 │
└─────────────────────────────────────────────────────┘
```

**Mobile Layout:** Card list instead of table; each card shows session ID, vehicle type badge, slot, status badge, parked time

**Data:** Paginated from GET /api/v1/sessions?page=X&per_page=Y

---

### SCREEN-007: Slots Management

**Purpose:** Full CRUD management of all parking slots in the system.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Slots Management │
│ [Filter: All/SP/MP/LP] [Filter: All/Available] │
│ [+ Create New Slot] │
├─────────────────────────────────────────────────────┤
│ SUMMARY: SP: X/Y | MP: X/Y | LP: X/Y │
├─────────────────────────────────────────────────────┤
│ SLOTS GRID/TABLE: │
│ [Slot Cell] [Slot Cell] [Slot Cell] ... │
│ Each cell: label, type, status, edit/delete icons │
├─────────────────────────────────────────────────────┤
│ CREATE/EDIT MODAL (overlays when active) │
│ DELETE CONFIRM MODAL (overlays when active) │
└─────────────────────────────────────────────────────┘
```

**Create/Edit Modal Fields:**
- Slot Label: text input (e.g., "SP-5")
- Slot Type: segmented control or radio buttons (SP / MP / LP)
- Distance from A: number input
- Distance from B: number input
- Distance from C: number input

---

### SCREEN-008: Entry Points Management

**Purpose:** Configure and manage all parking lot entry points.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Entry Points Management │
│ [+ Add Entry Point] │
├─────────────────────────────────────────────────────┤
│ ENTRY POINTS LIST: │
│ ┌──────────────────────────────────────────────┐ │
│ │ [A] Main Entrance [Edit] [Delete] │ │
│ │ [B] Side Entrance [Edit] [Delete] │ │
│ │ [C] North Parking Gate [Edit] [Delete] │ │
│ └──────────────────────────────────────────────┘ │
│ Minimum 3 required (system rule indicator) │
└─────────────────────────────────────────────────────┘
```

**Entry Point Row:** Identifier badge (letter in filled circle, blue), name text, ID in small muted text, Edit and Delete action buttons.

---

### SCREEN-009: Configuration (System Initialization)

**Purpose:** System setup hub with 3 sub-tabs for entry points, parking slots, and system controls.

**Tab Structure:**
- Tab 1: Entry Points — same content as SCREEN-008 embedded here
- Tab 2: Parking Slots — same content as SCREEN-007 embedded here
- Tab 3: System — initialization form + health status card

**System Tab Layout:**

```
┌─────────────────────────────────────────────────────┐
│ SYSTEM HEALTH CARD: │
│ Status: Online ● | Service: parking-system │
│ Version: X.X.X | DB: Healthy │
│ Last checked: HH:MM:SS │
├─────────────────────────────────────────────────────┤
│ INITIALIZE SYSTEM SECTION: │
│ [JSON Editor or Structured Form] │
│ Entry Points: (collapsible list) │
│ Parking Slots: (collapsible list) │
│ [Preview Configuration] │
│ [Initialize System Button] │
├─────────────────────────────────────────────────────┤
│ RESULT CARD (after init): │
│ X Entry Points Created │
│ Y Parking Slots Created │
│ [Go to Dashboard] │
└─────────────────────────────────────────────────────┘
```

---

### SCREEN-010: Settings / API Configuration

**Purpose:** Allow users to configure the API base URL for switching between Go and Rails backends.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ HEADER: Settings │
├─────────────────────────────────────────────────────┤
│ API Configuration: │
│ API Base URL: │
│ [http://localhost:8082 ________________] [Save] │
│ │
│ Quick Select: │
│ [Go Backend :8082] [Rails Backend :3000] │
│ │
│ [Test Connection] → shows health check result │
├─────────────────────────────────────────────────────┤
│ Connection Status: │
│ Connected to parking-system v1.0.0 │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- URL saved to localStorage (web) or AsyncStorage (mobile)
- Test Connection calls GET /health and shows result inline
- Quick select buttons set predefined URLs
- On URL change, apiClient baseURL is updated for subsequent requests

---

## 4. Interaction Design Specifications

### 4.1 Form Input Validation

**Real-Time Validation Rules:**
- Validation fires on field blur (when user leaves a field)
- Re-validates on change after first failed attempt
- Error state: red border on input, red inline error text below field
- Success state: no border change (avoid overwhelming green everywhere)

**Validation Messages:**
| Field | Condition | Message |
|-------|-----------|---------|
| Vehicle Type | Empty | "Please select a vehicle type" |
| Entry Point | Empty | "Please select an entry point" |
| Session ID | Empty | "Session ID is required" |
| Slot Label | Empty | "Slot label is required" |
| Distances | Non-positive | "Distance must be a positive number" |
| Entry Point Identifier | Not 1 char | "Identifier must be a single character" |
| Entry Point Name | Empty | "Name is required" |

**Shake Animation on Invalid Submit:**
- Invalid field input shakes horizontally (x: [0, -10, 10, -5, 5, 0]) with 300ms duration
- Helps draw attention without being jarring

### 4.2 Button States and Behaviors

**Default State:** Full opacity, cursor pointer, hover darkens slightly
**Loading State:** Spinner icon replaces or prepends text; text changes to verb+ing form (Parking..., Calculating..., Saving...); pointer-events: none; opacity 0.8
**Disabled State:** opacity 0.5, cursor not-allowed, no hover effect
**Success Pulse (after action):** brief scale pulse (1.0 → 1.05 → 1.0) over 300ms
**Danger Button (Delete/Destructive):** red background, white text, darker red on hover

**Button Size Standards:**
- Primary CTA: min-height 48px, min-width 120px, padding 12px 24px
- Secondary: min-height 40px
- Icon button: 36px × 36px minimum
- Mobile: all buttons minimum 44px height (iOS HIG touch target)

### 4.3 Loading States

**Spinner:** Circular CSS animation (border-top colored, rest transparent), 24px size for inline, 40px for full-page
**Skeleton Screens:** Gray shimmer blocks (CSS gradient animation) for sessions list, slots grid during initial load
**Progress Bar:** Horizontal progress indicator at top of page for longer operations (initialization)
**Button Loading:** Inline spinner replaces or leads text content

**Loading Timing Guidelines:**
- Under 200ms: no loading indicator needed
- 200ms–1000ms: show spinner
- Over 1000ms: show progress with estimated completion if possible

### 4.4 Error Message Display

**Error Hierarchy:**
1. Inline field errors: directly below the problematic input, small text (0.75rem), red color
2. Form-level error banner: below form header, above fields, dismissible, shows overall error
3. Page-level error banner: at top of page content, icon + message + dismiss button
4. Toast notifications: bottom-right corner, auto-dismiss after 5 seconds, manual dismiss X

**Error Banner Design:**
- Background: #fef2f2 (red-50), Border: #fecaca (red-200), Text: #991b1b (red-800)
- Icon: or depending on severity
- Dismiss button: X on right side

**Specific Error Messages by HTTP Status:**
- 404 (session): "Session not found. It may have already been completed."
- 409: "No available [type] parking slot. All [type] slots are occupied."
- 503: "Service temporarily unavailable. Please try again later."
- Network: "Cannot connect to parking system. Check if the API server is running at [URL]."
- 500: "Server error occurred. Please try again later."

### 4.5 Success Feedback

**Success Banner:** Background: #dcfce7 (green-100), Icon: , border: #bbf7d0
**Toast Notification:** Green background, white text, checkmark icon, auto-dismisses in 4 seconds
**Checkmark Animation:** Scale from 0 to 1 with bounce easing (easeOutBack)
**Success State Duration:** Success banners stay visible until user dismisses or performs new action

### 4.6 Confirmation Dialogs

Used for: Delete Slot, Delete Entry Point, System Initialization, Unpark (optional)

**Dialog Structure:**
- Backdrop: semi-transparent dark overlay (rgba(0,0,0,0.5))
- Modal card: white, rounded corners, shadow, centered
- Title: bold, action-specific (e.g., "Delete Slot SP-1?")
- Body: brief explanation of consequences
- Actions: Cancel (left/secondary) + Confirm (right/primary or danger)

**Dialog Animation:**
- Backdrop fades in (opacity 0 → 0.5)
- Modal scales in (scale 0.9 → 1.0) with spring easing
- On close: reverse animation

### 4.7 Keyboard Navigation

- All interactive elements reachable via Tab key in logical order
- Enter activates focused button or submits focused form
- Escape closes modals and dialogs
- Arrow keys navigate dropdown options
- Focus trap inside modal when open (prevent background interaction)
- Visible focus outline on all focusable elements (outline: 2px solid primary color)

### 4.8 Touch Interactions (Mobile)

- Minimum touch target: 44×44px for all interactive elements
- Tap produces immediate visual feedback (opacity change or background flash)
- Swipe gestures: swipe down on bottom sheet modals to dismiss
- Pull-to-refresh on Sessions and Slots lists
- Long-press on session ID to copy to clipboard

---

## 5. Data Flow Specifications

### 5.1 User Input → API Call → Response → Display

**Park Vehicle Data Flow:**
```
User fills form
 → vehicleType: 'S' | 'M' | 'L'
 → entryPointId: 'A' | 'B' | 'C' | ...
 → Form validation (client-side)
 → setState({ loading: true, error: null })
 → parkVehicle(vehicleType, entryPointId) [URLSearchParams POST]
 → API responds 201 or 409
 → 201: setState({ data: session, loading: false, success: true })
 → 409: setState({ error: ApiError, loading: false })
 → Render success banner OR error banner
```

**Unpark Vehicle Data Flow:**
```
User enters sessionId
 → Validation (non-empty)
 → setState({ loading: true })
 → unpackVehicle(sessionId) [POST /sessions/:id/unpark]
 → API responds 200 or 404
 → 200: setState({ data: session, loading: false })
 → Render fee breakdown card with animation
 → 404: setState({ error: ApiError, loading: false })
 → Render error banner
```

### 5.2 State Management Patterns

**Global State (ParkingContext — Context + useReducer):**
```typescript
ParkingState {
 slots: ParkingSlot[] // From GET /api/v1/slots
 entryPoints: EntryPoint[] // From GET /api/v1/entry_points
 activeSessions: Session[] // From GET /api/v1/sessions
 systemHealth: 'online' | 'offline' | 'checking'
 isInitialized: boolean
 loading: boolean
 error: string | null
}
```

**Actions dispatched:**
- SET_SLOTS, SET_ENTRY_POINTS, SET_ACTIVE_SESSIONS
- SET_SYSTEM_HEALTH, SET_LOADING, SET_ERROR, CLEAR_ERROR

**Component-Level State (useState/useReducer):**
Each page manages its own form state, submission state, and result state independently. Example for Park Vehicle:
```typescript
{
 vehicleType: VehicleType | ''
 entryPointId: EntryPointIdentifier
 state: AsyncStateWithSuccess<ParkingSession> {
 data: ParkingSession | null
 loading: boolean
 error: Error | null
 success: boolean
 }
}
```

### 5.3 Data Synchronization — Polling Strategy

| Data Type | Interval | Page Visibility Behavior |
|-----------|----------|--------------------------|
| Active sessions | 30 seconds | Paused when tab inactive |
| Slot availability | 60 seconds | Paused when tab inactive |
| System health | 120 seconds | Continues in background |
| All data (background) | 300 seconds | Continues in background |

**Implementation Pattern:**
```typescript
useEffect(() => {
 const interval = setInterval(() => {
 fetchSessions();
 }, 30000);

 // Pause polling when tab is hidden
 const handleVisibilityChange = () => {
 if (document.hidden) {
 clearInterval(interval);
 }
 };
 document.addEventListener('visibilitychange', handleVisibilityChange);

 return () => {
 clearInterval(interval);
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 };
}, [page, perPage]);
```

### 5.4 Cache Strategy

| Resource | TTL | Invalidated When |
|----------|-----|-----------------|
| Entry Points | 5 minutes | After create/update/delete entry point |
| Slots | 2 minutes | After create/update/delete slot, after park/unpark |
| Sessions | 30 seconds | After park/unpark |
| Health Check | 1 minute | Never cached — always fresh |

**Cache Implementation:**
```typescript
const cache = new Map<string, { data: unknown; timestamp: number }>();

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
 const cached = cache.get(key);
 if (cached && Date.now() - cached.timestamp < ttl) {
 return cached.data as T;
 }
 const data = await fetcher();
 cache.set(key, { data, timestamp: Date.now() });
 return data;
}
```

**Cache Invalidation on Mutations:**
- After parkVehicle success → invalidate sessions cache and slots cache
- After unpackVehicle success → invalidate sessions cache and slots cache
- After createSlot/updateSlot/deleteSlot → invalidate slots cache
- After createEntryPoint/updateEntryPoint/deleteEntryPoint → invalidate entry points cache

### 5.5 API Client Configuration

**Base URL Priority Order:**
1. VITE_API_BASE_URL environment variable
2. localStorage item 'api_base_url' (web) or AsyncStorage (mobile)
3. Default: http://localhost:8082

**Axios Instance Configuration:**
- baseURL: from getApiBaseUrl()
- timeout: 30000ms (30 seconds)
- Default Content-Type: application/json

**Special Content-Type Overrides:**
- Park Vehicle (POST /api/v1/sessions): application/x-www-form-urlencoded — uses URLSearchParams
- Unpark Vehicle (POST /api/v1/sessions/:id/unpark): exited_at as URL query param, not body

**Request Interceptors:**
- Attaches Authorization header if authToken present in localStorage (future-ready)

**Response Interceptors:**
- Converts all Axios errors to ApiError instances with user-friendly messages
- Logs errors to console for debugging

---

## 6. Feature Prioritization

### 6.1 MVP — Minimum Viable Product

Features required for the system to function at its most basic level. These must be complete before any other work.

**MVP Features:**
- FEAT-001: Park Vehicle (critical — core operation)
- FEAT-002: Unpark Vehicle (critical — core operation)
- FEAT-003: Fee Calculation and Display (critical — integrated in unpark)
- FEAT-015: Initialize System (critical — required to populate data)
- FEAT-016: Check System Health (important — dependency verification)
- FEAT-011: List Entry Points (critical — used by Park Vehicle dropdown)

**Rationale:** Without the ability to park and unpark vehicles with fee calculation, the system has no core value. Initialize System is required to set up data. Health check confirms connectivity.

**MVP Screen Requirements:**
- Park Vehicle page (functional form)
- Unpark Vehicle page (functional form + fee display)
- Settings page (API URL configuration)
- Minimal navigation between above three screens

### 6.2 v1.0 — First Full Release

All core features implemented with complete management capabilities and polished UX.

**v1.0 Features (adds to MVP):**
- FEAT-004: View Session Details
- FEAT-005: List Sessions (with pagination)
- FEAT-006: List All Slots
- FEAT-007: Get Available Slots
- FEAT-008: Create Slot
- FEAT-009: Update Slot
- FEAT-010: Delete Slot
- FEAT-012: Create Entry Point
- FEAT-013: Update Entry Point
- FEAT-014: Delete Entry Point

**v1.0 Screen Requirements:**
- All 10 screens implemented
- Full navigation structure
- Responsive design for mobile and desktop
- All Framer Motion animations
- Dashboard with stats and activity feed
- 3D Parking Lot visualization component (ParkingLot3D)
- Fluid Particle Background effect
- Spotlight Mask cursor effect
- Polling for real-time updates

### 6.3 Future Features — v1.1+

Enhancements that add value beyond the core system but are not essential for launch.

**v1.1 Features:**
- QR code scanning for session ID entry (mobile)
- Export sessions to CSV/PDF
- Advanced filtering and search on Sessions list
- Analytics dashboard (occupancy over time, revenue charts)
- Push notifications for long-parked vehicles
- Offline mode with operation queueing
- Multi-language support (Filipino/English)
- Dark mode toggle
- Automated slot suggestions based on historical patterns
- Batch slot creation from CSV import

**Prioritization Criteria:**
- Business Value: How directly does it generate revenue or prevent loss?
- User Impact: Does it make core operations faster or less error-prone?
- Technical Complexity: How much development effort is required?
- Dependencies: Are prerequisite features already complete?

---

## 7. Testing Scenarios

### 7.1 FEAT-001: Park Vehicle Testing

**Unit Test Scenarios:**
- ParkVehicle component renders with title, vehicle type dropdown, entry point dropdown, and submit button
- Vehicle type dropdown shows S, M, L options
- Entry points populate from mocked API on mount
- Submit with empty fields shows validation errors
- Submit with valid fields calls parkVehicle API function
- Loading state displayed during submission
- Success banner shown with session ID after successful API response
- Error banner shown when API returns 409
- Continuous parking badge shown when response has is_continuous: true
- View Session button navigates to /session/:id

**Integration Test Scenarios:**
- Full form flow: select vehicle, select entry point, submit → success response rendered
- Error flow: mock API 409 → error message displayed correctly
- Network error: mock network failure → cannot connect error displayed
- Entry points fail to load: error banner shown with retry

**End-to-End Scenarios:**
- Scenario A: Park small vehicle at entry A → success → copy session ID → navigate to View Session → confirm session shows as active
- Scenario B: Park vehicle when no SP slots available → confirm 409 error message specific to vehicle type
- Scenario C: Park vehicle, exit, return within 1 hour and park again → confirm is_continuous flag shown

**Performance Test Scenarios:**
- Park vehicle API response under 2 seconds
- Entry points load within 500ms on page mount
- Form render time under 100ms

**Accessibility Test Scenarios:**
- All form elements have labels
- Error messages announced by screen reader
- Tab order: Vehicle Type → Entry Point → Park Button
- Keyboard-only navigation completes the full flow
- Color contrast on error/success banners meets WCAG AA

---

### 7.2 FEAT-002 and FEAT-003: Unpark Vehicle and Fee Calculation Testing

**Unit Test Scenarios:**
- UnparkVehicle renders session ID input and Calculate Fee button
- Empty submission shows "Session ID is required" validation
- Loading state during API call
- Fee breakdown renders with all components after success
- Base fee (40 PHP) always shown for first 3 hours
- Exceeding fee only shown when duration > 3 hours
- Long-term section only shown when long_term.days > 0
- Continuous parking banner shown when is_continuous: true
- Total fee formatted with ₱ currency symbol and two decimal places
- Session not found (404) shows appropriate error message

**Fee Calculation Test Cases:**
| Input | Expected Output |
|-------|----------------|
| 2 hours, SP | ₱40.00 (flat rate only) |
| 5 hours, SP | ₱80.00 (40 + 2×20) |
| 5 hours, MP | ₱160.00 (40 + 2×60) |
| 4 hours, LP | ₱140.00 (40 + 1×100) |
| 26 hours, SP | ₱5,040.00 (5000 + 40) |
| 50 hours, SP | ₱10,040.00 (10000 + 40) |
| 3 hours exactly | ₱40.00 (boundary case) |
| 3.1 hours → 4 hours | ₱60.00 (ceiling + MP: 40 + 1×60 if MP) |

**Integration Test Scenarios:**
- Full flow: enter valid session ID → submit → fee breakdown renders
- 404 error → error message without fee breakdown
- Debug mode: exited_at query param included when VITE_DEBUG_MODE=true

---

### 7.3 FEAT-004: View Session Testing

**Unit Tests:**
- Renders session ID input and View button
- Empty ID shows validation error
- Session card renders with all expected fields
- Active badge shown for is_active: true sessions
- Completed badge shown for is_active: false sessions
- Unpark button shown only for active sessions
- Timestamps formatted in human-readable format
- Session not found shows error message

**Integration Tests:**
- Pre-populated session ID via route param triggers auto-lookup
- Unpark button deep-links with session ID

---

### 7.4 FEAT-005: List Sessions Testing

**Unit Tests:**
- Sessions list renders with table/card layout
- Each session shows required fields (ID, vehicle, slot, entry, time, status)
- Pagination controls render correctly
- Per-page selector renders with correct options
- Total count displayed accurately
- Clicking session row navigates to View Session
- Empty state renders when no sessions

**Performance Tests:**
- Renders 100 sessions without visible lag
- Pagination navigation response under 500ms

---

### 7.5 FEAT-006 through FEAT-010: Slot Management Testing

**FEAT-006 Unit Tests:**
- Slots grid renders all slots from API
- Color coding: available = green, occupied = red
- Filter by slot type correctly filters results
- Filter by availability correctly filters
- Empty state shown when no slots

**FEAT-008 Create Slot Tests:**
- Modal opens on Create button click
- Form has slot label, slot type, and 3 distance inputs
- Empty label shows validation error
- Non-positive distance shows validation error
- Successful creation closes modal and refreshes list
- Duplicate label shows specific error

**FEAT-010 Delete Slot Tests:**
- Delete button opens confirmation dialog
- Cancel closes dialog without API call
- Confirm triggers DELETE API call
- Successful deletion removes slot from list
- API error shows toast and keeps slot in list

---

### 7.6 FEAT-011 through FEAT-014: Entry Point Management Testing

**FEAT-011 Unit Tests:**
- Entry points list renders identifier badge, name, and action buttons
- Add Entry Point button opens create modal

**FEAT-012 Create Entry Point Tests:**
- Identifier field enforced to single character
- Auto-uppercases identifier input
- Duplicate identifier shows specific error
- Success creates and refreshes list

**FEAT-014 Delete Entry Point Tests:**
- Confirmation dialog shows entry point identifier and name
- Warns about impact on slot distances

---

### 7.7 FEAT-015: System Initialization Testing

**Unit Tests:**
- Default configuration pre-populated in form
- Confirmation dialog appears before API call
- Success result shows counts of created items
- Navigate to Dashboard button shown on success

**Integration Tests:**
- Full initialization flow with mocked API
- Partial failure handling (some items created)

**Idempotency Test:**
- Call initialize twice with same data — second call shows 0 new items created, no error

---

### 7.8 FEAT-016: Health Check Testing

**Unit Tests:**
- Health badge shows Online (green), Offline (red), Checking (amber)
- Health badge visible in Dashboard header
- Auto-polls every 30 seconds (or use events instead)
- Network failure sets status to offline

**Integration Tests:**
- Health check on app load
- Dashboard health badge updates when status changes

---

### 7.9 Cross-Feature Continuous Parking Tests

**Scenario: Vehicle Returns Within 1 Hour**
1. Park vehicle S at entry A at 10:00 AM → get session_1
2. Unpark session_1 at 10:30 AM → fee = ₱40.00 (0.5 hours rounded to 1 → flat rate)
3. Park same vehicle type S at any entry at 11:00 AM → response should have is_continuous: true
4. Verify continuous notice shown in success banner
5. Unpark at 1:00 PM → duration from 10:00 AM (base_start_time) = 3 hours → fee = ₱40.00

**Scenario: Vehicle Returns After 1 Hour**
1. Park vehicle S at entry A at 10:00 AM → session_2
2. Unpark at 10:30 AM
3. Park same vehicle type at 12:00 PM (90 min later) → is_continuous: false
4. Verify NO continuous notice shown
5. Normal fee calculation from 12:00 PM

---

### 7.10 User Acceptance Testing (UAT) Scenarios

**UAT-001: Complete Parking Session End-to-End**
- Pre-condition: System initialized with 3 entry points and at least 5 slots
- Steps: Park vehicle S at A → record session ID → verify slot assigned → wait 2 minutes → unpark → verify fee = ₱40.00
- Pass criteria: All steps complete, fee matches calculation, session shows as completed

**UAT-002: Slot Unavailability Handling**
- Pre-condition: All LP slots occupied
- Steps: Try to park Large vehicle → verify 409 error → verify error message mentions Large
- Pass criteria: Clear error message, no crash, retry option available

**UAT-003: Fee Calculation Accuracy (Long-term)**
- Pre-condition: Debug mode enabled, system initialized
- Steps: Park vehicle at time T → unpark at T+26h using exited_at param → verify fee = ₱5,040 for SP
- Pass criteria: Fee breakdown shows 1 long-term day + 2 remaining hours + correct total

**UAT-004: Continuous Parking Detection**
- Pre-condition: System initialized
- Steps: Park S → unpark (within 1h) → park S again → verify is_continuous shown → unpark → verify fee from original time
- Pass criteria: Continuous notice shown, fee calculated from first park time

**UAT-005: System Initialization**
- Pre-condition: Empty system
- Steps: Navigate to Configuration > System → click Initialize System → confirm → verify 3 entry points and N slots created
- Pass criteria: Success result card shows correct counts, dashboard shows new slots and entry points

**UAT-006: API URL Switching**
- Steps: Navigate to Settings → change API URL to Rails backend (:3000) → test connection → park a vehicle
- Pass criteria: Connection test succeeds, vehicle parks successfully through Rails backend

---

## Appendix A: Component Animation Reference

All Framer Motion animation configurations used in the web app:

**Container variants (page-level):**
```javascript
containerVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: {
 opacity: 1, y: 0,
 transition: { duration: 0.6, staggerChildren: 0.1 }
 }
}
```

**Item variants (child elements):**
```javascript
itemVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: { opacity: 1, y: 0 }
}
```

**Error message (AnimatePresence):**
```javascript
initial: { opacity: 0, x: -20 }
animate: { opacity: 1, x: 0 }
exit: { opacity: 0, x: 20 }
transition: { duration: 0.3 }
```

**Success message (AnimatePresence):**
```javascript
initial: { opacity: 0, scale: 0.9 }
animate: { opacity: 1, scale: 1.0 }
exit: { opacity: 0, scale: 0.9 }
transition: { duration: 0.3 }
```

**MagneticButton:**
```javascript
whileHover: { scale: 1.05 }
whileTap: { scale: 0.95 }
transition: { type: 'spring', stiffness: 400, damping: 25 }
```

**MagneticSelect:**
```javascript
whileHover: { scale: 1.02 }
transition: { type: 'spring', stiffness: 300, damping: 25 }
```

---

## Appendix B: Color System Reference

**Dashboard / Management Pages (Professional Palette):**
| Token | Value | Usage |
|-------|-------|-------|
| primary | #1e40af | Links, accents, entry point badges |
| success | #16a34a | Available slots, active status, health online |
| warning | #d97706 | Amber warnings, continuous parking notices |
| danger | #dc2626 | Occupied slots, error states, delete buttons |
| background | #f1f5f9 | Page background |
| card | #ffffff | Card backgrounds |
| text.primary | #1e293b | Main text |
| text.secondary | #64748b | Labels, metadata |
| border | #e2e8f0 | Card borders, dividers |

**Slot Type Colors:**
| Slot Type | Background | Border | Text |
|-----------|-----------|--------|------|
| SP — Small | #dcfce7 | #16a34a | #16a34a |
| MP — Medium | #dbeafe | #1e40af | #1e40af |
| LP — Large | #ede9fe | #7c3aed | #7c3aed |

**Slot Availability Colors:**
| Status | Background | Border | Text |
|--------|-----------|--------|------|
| Available | #dcfce7 | #16a34a | #16a34a |
| Occupied | #fee2e2 | #dc2626 | #dc2626 |

---

## Appendix C: Navigation Structure Reference

**React Web (React Router):**
```
/ (root)
├── / → Dashboard
├── /park → Park Vehicle page
├── /unpark → Unpark Vehicle page
├── /session/:id → View Session page
├── /slots → Available Slots page (quick check)
├── /sessions → Sessions Management page
├── /manage/slots → Slots Management page
├── /manage/entry-points → Entry Points Management page
├── /configuration → Configuration page (tabs: entry-points, parking-slots, system)
└── /settings → Settings / API Configuration page
```

**React Native (React Navigation — Stack + Bottom Tabs):**
```
Bottom Tabs:
 ├── Home Tab → Dashboard screen
 ├── Park Tab → ParkVehicle screen
 ├── Unpark Tab → UnparkVehicle screen
 ├── Sessions Tab → Sessions list screen
 └── Settings Tab → Settings screen

Stack Navigation (from any tab):
 ├── ViewSession screen (params: id)
 └── AvailableSlots screen
```

---

## Appendix D: API Endpoint Quick Reference

| Method | Endpoint | Feature | Content-Type |
|--------|----------|---------|--------------|
| GET | /health | FEAT-016 | — |
| POST | /api/v1/initialize | FEAT-015 | application/json |
| GET | /api/v1/entry_points | FEAT-011 | — |
| POST | /api/v1/entry_points | FEAT-012 | application/json |
| PUT | /api/v1/entry_points/:id | FEAT-013 | application/json |
| DELETE | /api/v1/entry_points/:id | FEAT-014 | — |
| GET | /api/v1/slots | FEAT-006 | — |
| GET | /api/v1/slots/available | FEAT-007 | — |
| POST | /api/v1/slots | FEAT-008 | application/json |
| PUT | /api/v1/slots/:id | FEAT-009 | application/json |
| DELETE | /api/v1/slots/:id | FEAT-010 | — |
| POST | /api/v1/sessions | FEAT-001 |**application/x-www-form-urlencoded** |
| GET | /api/v1/sessions | FEAT-005 | — |
| GET | /api/v1/sessions/:id | FEAT-004 | — |
| POST | /api/v1/sessions/:id/unpark | FEAT-002 | application/json |
| DELETE | /api/v1/sessions/:id | — | — |

**Critical Notes:**
- Park Vehicle uses `application/x-www-form-urlencoded` NOT JSON — uses URLSearchParams
- Unpark Vehicle sends `exited_at` as URL query parameter, NOT in request body
- All other POST/PUT endpoints use `application/json`
