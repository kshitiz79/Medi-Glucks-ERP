# User Dashboard API

## Overview
This API provides comprehensive dashboard data for mobile applications, specifically designed for sales representatives to track their performance, visits, expenses, and targets.

## Endpoints

### GET /api/dashboard/user
Returns comprehensive dashboard data for the authenticated user.

**Authentication Required:** Yes (Bearer Token)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "role": "User Role",
      "department": "Department Name"
    },
    "period": {
      "month": 12,
      "year": 2024,
      "monthName": "December"
    },
    "visits": {
      "doctor": {
        "scheduled": 5,
        "confirmed": 3,
        "total": 8
      },
      "chemist": {
        "scheduled": 2,
        "confirmed": 1,
        "total": 3
      },
      "stockist": {
        "scheduled": 1,
        "confirmed": 1,
        "total": 2
      },
      "total": 13,
      "scheduled": 8,
      "confirmed": 5,
      "submitted": 6,
      "approved": 5,
      "rejected": 1,
      "draft": 1
    },
    "sales": {
      "totalActivities": 25,
      "totalCalls": 25,
      "avgCallsPerDay": 0.8
    },
    "expenses": {
      "total": 10,
      "approved": 6,
      "pending": 3,
      "rejected": 1,
      "totalAmount": 15000,
      "approvedAmount": 9000,
      "pendingAmount": 4500,
      "rejectedAmount": 1500
    },
    "targets": {
      "monthlyTarget": 100000,
      "achieved": 75000,
      "remaining": 25000,
      "achievementPercentage": 75.0,
      "status": "Active",
      "deadline": "2024-12-31T23:59:59.000Z"
    },
    "summary": {
      "totalActivities": 38,
      "visitCompletionRate": "38.5",
      "targetAchievement": 75.0,
      "pendingExpenses": 3,
      "totalExpenseAmount": 15000
    }
  },
  "message": "Dashboard data retrieved successfully"
}
```

### GET /api/dashboard/test
Test endpoint to verify the dashboard API is working.

**Authentication Required:** Yes (Bearer Token)

**Response Format:**
```json
{
  "success": true,
  "message": "Dashboard API is working",
  "user": {
    "id": "user_id",
    "timestamp": "2024-12-09T10:30:00.000Z"
  }
}
```

## Data Sources

### Visits
- **Source:** Visit model (`/src/visit/Visit.js`)
- **Key Fields:** representativeId, status, createdAt, doctorChemistName
- **Status Values:** draft, submitted, approved, rejected

### Sales Activities
- **Source:** SalesActivity model (`/src/sales/SalesActivity.js`)
- **Key Fields:** user, createdAt, doctorName, callNotes
- **Metrics:** Total activities, calls per day

### Expenses
- **Source:** Expense model (`/src/expencse/Expense.js`)
- **Key Fields:** user, status, amount, createdAt
- **Status Values:** pending, approved, rejected

### Sales Targets
- **Source:** SalesTarget model (`/src/salesTarget/SalesTarget.js`)
- **Key Fields:** userId, targetAmount, achievedAmount, targetMonth, targetYear
- **Status Values:** Active, Completed, Overdue, Cancelled

## Usage Examples

### Android/Mobile App Integration

```javascript
// Fetch dashboard data
const fetchDashboardData = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch('http://your-api-url/api/dashboard/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Use dashboard data
      const { visits, sales, expenses, targets, summary } = data.data;
      
      // Update UI with dashboard metrics
      updateDashboardUI(data.data);
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }
};
```

### React Native Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Implementation as shown above
  };

  if (loading) {
    return <Text>Loading dashboard...</Text>;
  }

  const { visits, sales, expenses, targets, summary } = dashboardData;

  return (
    <ScrollView>
      <View>
        <Text>Total Visits: {visits.total}</Text>
        <Text>Approved Visits: {visits.approved}</Text>
        <Text>Pending Expenses: {expenses.pending}</Text>
        <Text>Target Achievement: {targets.achievementPercentage}%</Text>
        <Text>Monthly Target: ₹{targets.monthlyTarget.toLocaleString()}</Text>
        <Text>Achieved: ₹{targets.achieved.toLocaleString()}</Text>
      </View>
    </ScrollView>
  );
};
```

## Error Handling

The API includes comprehensive error handling:

- **Authentication Errors:** Returns 401 if token is invalid
- **Database Errors:** Returns 500 with error message
- **Missing Data:** Returns default values (0) instead of errors
- **Invalid User:** Returns appropriate error message

## Performance Considerations

- Uses MongoDB aggregation for efficient data processing
- Parallel data fetching with Promise.all()
- Optimized queries with proper indexing
- Minimal data transfer with only required fields

## Security

- Requires valid JWT authentication
- User can only access their own data
- No sensitive information exposed
- Proper input validation and sanitization

## Future Enhancements

1. **Caching:** Implement Redis caching for frequently accessed data
2. **Real-time Updates:** Add WebSocket support for live dashboard updates
3. **Filtering:** Add date range and custom period filtering
4. **Export:** Add data export functionality
5. **Notifications:** Integrate with notification system for alerts