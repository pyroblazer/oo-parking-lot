# Green Flow Guide

This guide explains how to use the complete green flow (happy path) of the parking system from the frontend applications.

## Overview

The green flow represents the complete happy path scenario where:
1. A vehicle enters the parking lot
2. The system assigns the closest available compatible slot
3. The vehicle parks for a duration
4. The vehicle exits and the system calculates the fee
5. The slot becomes available again

## Frontend Access

### React Web Frontend

The React web frontend provides full access to the green flow through the following routes:

#### 1. Park Vehicle
- **Route**: `/` or `/park`
- **Component**: [`ParkVehicle`](../react-web/src/components/ParkVehicle.tsx)
- **Purpose**: Park a vehicle at the closest available slot
- **API Function**: [`parkVehicle()`](../react-web/src/api.ts:110)

**Usage**:
1. Select vehicle type (S, M, or L)
2. Select entry point (A, B, or C)
3. Click "Park Vehicle" button
4. View assigned parking slot and session details

**Expected Result**:
- Vehicle is assigned to the closest available compatible slot
- Session ID is generated
- Slot status changes to "occupied"

#### 2. Unpark Vehicle
- **Route**: `/unpark`
- **Component**: [`UnparkVehicle`](../react-web/src/components/UnparkVehicle.tsx)
- **Purpose**: Unpark a vehicle and calculate parking fee
- **API Function**: [`unparkVehicle()`](../react-web/src/api.ts:137)

**Usage**:
1. Enter session ID (obtained from parking)
2. Click "Unpark Vehicle" button
3. View fee breakdown and total amount

**Expected Result**:
- Vehicle is unparked
- Parking fee is calculated based on duration and slot type
- Slot status changes to "available"
- Fee breakdown shows:
  - Base fee (40 pesos for first 3 hours)
  - Exceeding hours and fee
  - Long-term fees (if applicable)
  - Continuous parking status

#### 3. View Session
- **Route**: `/session/:id`
- **Component**: [`ViewSession`](../react-web/src/components/ViewSession.tsx)
- **Purpose**: View details of a specific parking session
- **API Function**: [`getSession()`](../react-web/src/api.ts:155)

**Usage**:
1. Navigate to `/session/{session_id}`
2. View complete session information including:
   - Vehicle type
   - Assigned parking slot
   - Entry point used
   - Parked and exited timestamps
   - Current status (active/completed)
   - Continuous parking flag

#### 4. Available Slots
- **Route**: `/slots`
- **Component**: [`AvailableSlots`](../react-web/src/components/AvailableSlots.tsx)
- **Purpose**: View available parking slots filtered by vehicle type and entry point
- **API Function**: [`getAvailableSlots()`](../react-web/src/api.ts:176)

**Usage**:
1. Select vehicle type (S, M, or L)
2. Select entry point (A, B, or C)
3. View list of available slots sorted by distance

**Expected Result**:
- List of available compatible slots
- Slots sorted by distance from selected entry point
- Shows slot type, label, and distance

## Green Flow Scenarios

### Scenario 1: Small Vehicle (2 hours - Flat Rate)

**Steps**:
1. Navigate to `/park`
2. Select vehicle type: **S** (Small)
3. Select entry point: **A**
4. Click "Park Vehicle"
5. Wait for session assignment (should get SP-1 at distance 1)
6. Note the session ID
7. After 2 hours, navigate to `/unpark`
8. Enter session ID and click "Unpark Vehicle"

**Expected Fee**: 40.0 pesos (flat rate for first 3 hours)

**Fee Breakdown**:
- Base fee: 40.0 pesos
- Exceeding hours: 0
- Exceeding fee: 0.0 pesos
- Long-term days: 0
- Total: 40.0 pesos

### Scenario 2: Medium Vehicle (5 hours - Hourly Rate)

**Steps**:
1. Navigate to `/park`
2. Select vehicle type: **M** (Medium)
3. Select entry point: **B**
4. Click "Park Vehicle"
5. Wait for session assignment (should get MP-1 at distance 2)
6. Note the session ID
7. After 5 hours, navigate to `/unpark`
8. Enter session ID and click "Unpark Vehicle"

**Expected Fee**: 160.0 pesos

**Fee Breakdown**:
- Base fee: 40.0 pesos
- Exceeding hours: 2
- Exceeding fee: 120.0 pesos (2 hours × 60/hour for MP)
- Long-term days: 0
- Total: 160.0 pesos

### Scenario 3: Large Vehicle (4 hours - Hourly Rate)

**Steps**:
1. Navigate to `/park`
2. Select vehicle type: **L** (Large)
3. Select entry point: **C**
4. Click "Park Vehicle"
5. Wait for session assignment (should get LP-1 at distance 2)
6. Note the session ID
7. After 4 hours, navigate to `/unpark`
8. Enter session ID and click "Unpark Vehicle"

**Expected Fee**: 140.0 pesos

**Fee Breakdown**:
- Base fee: 40.0 pesos
- Exceeding hours: 1
- Exceeding fee: 100.0 pesos (1 hour × 100/hour for LP)
- Long-term days: 0
- Total: 140.0 pesos

### Scenario 4: Long-term Parking (26 hours)

**Steps**:
1. Navigate to `/park`
2. Select vehicle type: **L** (Large)
3. Select entry point: **A**
4. Click "Park Vehicle"
5. Wait for session assignment
6. Note the session ID
7. After 26 hours, navigate to `/unpark`
8. Enter session ID and click "Unpark Vehicle"

**Expected Fee**: 5040.0 pesos

**Fee Breakdown**:
- Long-term days: 1
- Long-term fee: 5000.0 pesos (1 day × 5000)
- Remaining hours: 2
- Base fee: 40.0 pesos
- Total: 5040.0 pesos

### Scenario 5: Continuous Parking

**Steps**:
1. Park a vehicle (follow Scenario 1)
2. Unpark after 30 minutes
3. Return within 1 hour (e.g., after 45 minutes)
4. Park again with same vehicle type
5. Note that `is_continuous` flag is `true`

**Expected Behavior**:
- Second session is marked as continuous
- System treats both sessions as if vehicle never left
- Fee calculation considers total time across both sessions

### Scenario 6: Hour Rounding (6.4 hours)

**Steps**:
1. Park a vehicle
2. Unpark after 6.4 hours
3. Verify duration is rounded up to 7 hours

**Expected Fee**: 120.0 pesos

**Fee Breakdown**:
- Base fee: 40.0 pesos
- Exceeding hours: 4 (rounded up from 3.4)
- Exceeding fee: 80.0 pesos (4 hours × 20/hour for SP)
- Total: 120.0 pesos

## Vehicle-Slot Compatibility

The system enforces the following compatibility rules:

| Vehicle Type | Can Park In | Preferred Slot Type |
|-------------|--------------|-------------------|
| Small (S) | SP, MP, LP | SP (closest) |
| Medium (M) | MP, LP | MP (closest) |
| Large (L) | LP | LP (only option) |

## Fee Calculation Rules

### Base Rate
- **First 3 hours**: 40.0 pesos (flat rate)

### Hourly Rates (after first 3 hours)
| Slot Type | Hourly Rate |
|-----------|-------------|
| SP | 20 pesos/hour |
| MP | 60 pesos/hour |
| LP | 100 pesos/hour |

### Long-term Parking
- **Per 24-hour chunk**: 5,000 pesos
- **Remaining hours**: Calculated using base rate + hourly rates

### Hour Rounding
- All durations are rounded up to the nearest hour
- Example: 6.4 hours → 7 hours

## API Endpoints

### Park Vehicle
```
POST /api/v1/sessions
Content-Type: application/x-www-form-urlencoded

Parameters:
- vehicle_type: S | M | L
- entry_point_id: A | B | C

Response:
{
  "success": true,
  "data": {
    "session_id": "string",
    "vehicle_type": "S",
    "parking_slot": {
      "id": "number",
      "slot_label": "SP-1",
      "slot_type": "SP"
    },
    "entry_point": "A",
    "parked_at": "ISO8601 timestamp",
    "is_active": true
  }
}
```

### Unpark Vehicle
```
POST /api/v1/sessions/{session_id}/unpark

Response:
{
  "success": true,
  "data": {
    "session_id": "string",
    "vehicle_type": "S",
    "parking_slot": {...},
    "entry_point": "A",
    "parked_at": "ISO8601 timestamp",
    "exited_at": "ISO8601 timestamp",
    "duration_hours": 2.0,
    "total_fee": 40.0,
    "fee_breakdown": {
      "total_fee": 40.0,
      "duration_hours": 2.0,
      "is_continuous": false,
      "long_term": {
        "days": 0,
        "fee": 0.0
      },
      "remaining": {
        "total": 40.0,
        "base_fee": 40.0,
        "exceeding_hours": 0,
        "exceeding_fee": 0.0
      }
    },
    "is_continuous": false
  }
}
```

### Get Session Details
```
GET /api/v1/sessions/{session_id}

Response:
{
  "success": true,
  "data": {
    "session_id": "string",
    "vehicle_type": "S",
    "parking_slot": {...},
    "entry_point": "A",
    "parked_at": "ISO8601 timestamp",
    "exited_at": "ISO8601 timestamp | null",
    "is_active": true | false,
    "is_continuous": true | false
  }
}
```

### Get Available Slots
```
GET /api/v1/slots/available?vehicle_type=S&entry_point_id=A

Response:
{
  "success": true,
  "data": {
    "available_slots": [
      {
        "id": "number",
        "slot_label": "SP-1",
        "slot_type": "SP",
        "distances": [1, 4, 5],
        "available": true
      }
    ],
    "total_available": 3
  }
}
```

## Testing the Green Flow

### Using Postman Collection

The Postman collection includes a "Green Flow" folder with the following test sequences:

1. **Initialize System** - Creates entry points and parking slots
2. **Green Flow - Small Vehicle** - Parks and unparks a small vehicle
3. **Unpark Small Vehicle (2 hours)** - Verifies flat rate fee
4. **Green Flow - Medium Vehicle** - Parks and unparks a medium vehicle
5. **Unpark Medium Vehicle (5 hours)** - Verifies hourly rate fee
6. **Green Flow - Large Vehicle** - Parks and unparks a large vehicle
7. **Unpark Large Vehicle (4 hours)** - Verifies hourly rate fee
8. **Green Flow - Long-term Parking** - Tests 26-hour parking
9. **Unpark Long-term Vehicle** - Verifies long-term fee calculation
10. **Green Flow - Continuous Parking** - Tests continuous parking detection
11. **Green Flow - Hour Rounding** - Tests hour rounding (6.4h → 7h)
12. **Unpark Rounding Test** - Verifies rounded fee calculation

### Using RSpec (Rails Backend)

Run the green flow integration tests:

```bash
cd rails-backend
bundle exec rspec spec/integration/green_flow_spec.rb
```

This will test:
- System initialization with entry points and slots
- Complete park/unpark flows for all vehicle types
- Fee calculation accuracy
- Continuous parking detection
- Hour rounding
- Long-term parking
- Vehicle-slot compatibility
- Closest slot allocation

### Using React Web Frontend

1. Start the frontend:
   ```bash
   cd react-web
   npm run dev
   ```

2. Open browser to: `http://localhost:3002`

3. Follow the green flow scenarios described above

### Using React Native Mobile Frontend

The React Native mobile app provides the same functionality through mobile-optimized screens:

- [`ParkVehicle`](../react-native-mobile/src/screens/ParkVehicle.tsx)
- [`UnparkVehicle`](../react-native-mobile/src/screens/UnparkVehicle.tsx)
- [`ViewSession`](../react-native-mobile/src/screens/ViewSession.tsx)
- [`AvailableSlots`](../react-native-mobile/src/screens/AvailableSlots.tsx)

## Troubleshooting

### Common Issues

1. **No Available Slots**
   - **Cause**: All compatible slots are occupied
   - **Solution**: Wait for a vehicle to unpark or add more slots

2. **Invalid Session ID**
   - **Cause**: Session ID doesn't exist or was already unparked
   - **Solution**: Verify session ID is correct and active

3. **Incorrect Fee Calculation**
   - **Cause**: Time synchronization issues or rounding errors
   - **Solution**: Verify server time and check fee breakdown

4. **Continuous Parking Not Detected**
   - **Cause**: Return time exceeds 1-hour threshold
   - **Solution**: Ensure return is within 1 hour of exit

## Summary

The green flow is fully accessible from both web and mobile frontends through:

1. **Park Vehicle** - Entry point for parking vehicles
2. **Unpark Vehicle** - Exit point with fee calculation
3. **View Session** - Session details and status
4. **Available Slots** - Real-time slot availability

All green flow scenarios from the specification are supported and can be tested using:
- Postman collection (automated tests)
- RSpec integration tests (backend validation)
- React web frontend (manual testing)
- React Native mobile frontend (mobile testing)

For more information, see:
- [Architecture Documentation](ARCHITECTURE.md)
- [Testing Documentation](../TESTING.md)
- [API Postman Collection](../Parking%20Lot%20API.postman_collection.json)
