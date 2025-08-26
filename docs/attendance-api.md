# Enhanced Attendance API Documentation

## Overview
The enhanced attendance system supports multiple punch in/out sessions per day with automatic break time calculation. This ensures consistency between web and mobile applications.

## Key Features
- Multiple punch sessions per day
- Automatic break time calculation between sessions
- Real-time updates via Socket.IO
- Backward compatibility with legacy systems
- No manual break buttons needed

## API Endpoints

### 1. Toggle Punch (Recommended)
**POST** `/api/attendance/toggle-punch`

Smart endpoint that automatically determines whether to punch in or punch out based on current status.

**Request Body:**
```json
{
  "userId": "user_id_here",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York, NY"
  },
  "shiftId": "shift_id_here" // Optional, for first punch in
}
```

**Response:**
```json
{
  "success": true,
  "message": "Punched in successfully (Session 2)",
  "action": "punch-in", // or "punch-out"
  "data": {
    "date": "2025-01-26T00:00:00.000Z",
    "status": "punched_in", // or "punched_out"
    "punchSessions": [
      {
        "punchIn": "2025-01-26T09:00:00.000Z",
        "punchOut": "2025-01-26T12:00:00.000Z",
        "punchInLocation": {...},
        "punchOutLocation": {...}
      },
      {
        "punchIn": "2025-01-26T13:00:00.000Z",
        "punchOut": null,
        "punchInLocation": {...}
      }
    ],
    "currentSession": 1, // Index of active session, -1 if none
    "activeSession": {
      "punchIn": "2025-01-26T13:00:00.000Z",
      "punchOut": null,
      "punchInLocation": {...}
    },
    "firstPunchIn": "2025-01-26T09:00:00.000Z",
    "lastPunchOut": "2025-01-26T12:00:00.000Z",
    "workingHours": "3h 0m",
    "totalWorkingMinutes": 180,
    "totalBreakMinutes": 60,
    "autoBreaks": [
      {
        "breakStart": "2025-01-26T12:00:00.000Z",
        "breakEnd": "2025-01-26T13:00:00.000Z",
        "duration": 60,
        "isAutoCalculated": true
      }
    ],
    "isLate": false,
    "lateByMinutes": 0,
    "overtimeMinutes": 0
  }
}
```

### 2. Get Today's Attendance
**GET** `/api/attendance/today/:userId`

**Response:**
```json
{
  "success": true,
  "data": {
    // Same structure as toggle-punch response
  }
}
```

### 3. Legacy Endpoints (Backward Compatibility)
- **POST** `/api/attendance/punch-in` - Creates new punch session
- **POST** `/api/attendance/punch-out` - Ends current session
- **POST** `/api/attendance/start-break` - Deprecated (returns success message)
- **POST** `/api/attendance/end-break` - Deprecated (returns success message)

## Status Values
- `not_started` - No attendance record for today
- `punched_in` - Currently working (active session)
- `punched_out` - On break (between sessions)
- `present` - Day completed with full hours
- `half_day` - Day completed with partial hours

## Socket.IO Events

### Client to Server
```javascript
socket.emit('join-user-room', userId);
```

### Server to Client
```javascript
socket.on('attendance-update', (data) => {
  console.log('Type:', data.type); // 'punch-in' or 'punch-out'
  console.log('Data:', data.data); // Full attendance object
});
```

## Mobile Implementation Example

```javascript
// React Native / Mobile App
const toggleAttendance = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/attendance/toggle-punch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        userId: currentUser.id,
        location: await getCurrentLocation() // Get GPS coordinates
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI based on result.action and result.data
      updateAttendanceUI(result.data);
    }
  } catch (error) {
    console.error('Attendance error:', error);
  }
};
```

## Key Benefits

1. **Automatic Break Calculation**: No need for manual break buttons
2. **Multiple Sessions**: Users can punch in/out multiple times per day
3. **Real-time Updates**: Socket.IO ensures immediate UI updates
4. **Consistent Data**: Same API works for web and mobile
5. **Backward Compatible**: Existing integrations continue to work

## Migration Notes

- Existing attendance records are compatible
- Legacy break functionality is deprecated but won't break
- New `punchSessions` array replaces single `punchIn`/`punchOut` fields
- `autoBreaks` array contains calculated break periods
- Status values expanded to include `punched_in` and `punched_out`