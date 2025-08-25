# State Head Users API Documentation

## Overview
This API allows State Head users to fetch all users assigned to head offices related to their state. This enables state-level user management and oversight.

## Endpoint
```
GET /api/users/by-state
```

## Authentication
- **Required**: Yes
- **Authorization**: Bearer Token (JWT)
- **Role Required**: State Head

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | String | No | - | Search by name, employee code, or email |
| `department` | String | No | - | Filter by department ID |
| `role` | String | No | - | Filter by user role |
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 50 | Number of records per page |

## Request Example

```bash
curl -X GET "http://localhost:5050/api/users/by-state?page=1&limit=25&search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Response Format

### Success Response (200 OK)

```json
{
    "success": true,
    "data": {
        "users": [
            {
                "id": "64f5a8b2c9e4f123456789ab",
                "employeeCode": "EMP001",
                "name": "John Doe",
                "email": "john.doe@gluckscare.com",
                "role": "Manager",
                "department": "Sales",
                "headOffice": "Mumbai Office",
                "headOffices": "Mumbai Office, Pune Office",
                "state": "Maharashtra", 
                "branch": "Central Branch",
                "employmentType": "Full-time",
                "mobileNumber": "+91-9876543210",
                "dateOfJoining": "2024-01-15T00:00:00.000Z",
                "salaryAmount": 50000,
                "isActive": true,
                "createdAt": "2024-01-15T10:30:00.000Z"
            }
        ],
        "pagination": {
            "currentPage": 1,
            "totalPages": 3,
            "totalCount": 125,
            "limit": 50,
            "hasNext": true,
            "hasPrev": false
        },
        "state": {
            "id": "64f5a8b2c9e4f123456789ac",
            "name": "Maharashtra"
        },
        "headOfficesCount": 8
    },
    "message": "Found 50 users in Maharashtra state"
}
```

### Error Responses

#### 403 Forbidden - Access Denied
```json
{
    "success": false,
    "message": "Access denied. Only State Heads can access this endpoint."
}
```

#### 400 Bad Request - State Not Assigned
```json
{
    "success": false,
    "message": "State Head must be assigned to a state to view users."
}
```

#### 500 Internal Server Error
```json
{
    "success": false,
    "message": "Server error"
}
```

## Business Logic

### Access Control
1. **Role Verification**: Only users with `State Head` role can access this endpoint
2. **State Assignment**: The State Head must be assigned to a state in their user profile
3. **JWT Authentication**: Valid JWT token required in Authorization header

### Data Filtering
1. **Head Office Relationship**: 
   - Finds all head offices assigned to the State Head's state
   - Returns users assigned to those head offices (either primary `headOffice` or multiple `headOffices`)

2. **Search Functionality**:
   - Searches across name, employee code, and email fields
   - Case-insensitive partial matching

3. **Additional Filters**:
   - Department-based filtering
   - Role-based filtering
   - Active users only

### Pagination
- Default limit: 50 users per page
- Maximum recommended limit: 100 users per page
- Provides complete pagination metadata

## Integration Examples

### Frontend Integration (React/React Native)

```javascript
const fetchUsersByState = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams({
            page: filters.page || 1,
            limit: filters.limit || 50,
            ...(filters.search && { search: filters.search }),
            ...(filters.department && { department: filters.department }),
            ...(filters.role && { role: filters.role })
        });

        const response = await fetch(`/api/users/by-state?${queryParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error fetching users by state:', error);
        throw error;
    }
};

// Usage example
const loadUsers = async () => {
    try {
        setLoading(true);
        const result = await fetchUsersByState({
            page: 1,
            limit: 25,
            search: 'john',
            role: 'Manager'
        });
        
        setUsers(result.users);
        setPagination(result.pagination);
        setState(result.state);
    } catch (error) {
        setError(error.message);
    } finally {
        setLoading(false);
    }
};
```

### State Management Integration

```javascript
// Redux Slice Example
const stateUsersSlice = createSlice({
    name: 'stateUsers',
    initialState: {
        users: [],
        pagination: {},
        state: {},
        loading: false,
        error: null
    },
    reducers: {
        fetchUsersStart: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchUsersSuccess: (state, action) => {
            state.loading = false;
            state.users = action.payload.users;
            state.pagination = action.payload.pagination;
            state.state = action.payload.state;
        },
        fetchUsersFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        }
    }
});
```

## Security Considerations

1. **Role-Based Access**: Strict enforcement of State Head role requirement
2. **Data Isolation**: Users can only see users from their assigned state
3. **Sensitive Data Filtering**: Passwords and legal documents are excluded from responses
4. **Input Validation**: All query parameters are properly validated
5. **SQL Injection Prevention**: MongoDB query sanitization

## Performance Considerations

1. **Database Indexing**: 
   - Indexes on `state`, `headOffice`, `headOffices`, `isActive`
   - Compound indexes for common query patterns

2. **Pagination**: 
   - Prevents large data transfers
   - Efficient skip/limit implementation

3. **Parallel Queries**: 
   - User data and count queries run in parallel
   - Reduces response time

4. **Population Optimization**: 
   - Only populates necessary fields
   - Selective field inclusion

## Related Endpoints

- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/role/:role` - Get users by role
- `GET /api/users/for-shift-assignment` - Get users for shift assignment
- `GET /api/headoffices` - Get head offices by state

## Error Handling Best Practices

Following the project's **API Error Handling Specification** and **JSON Response Validation** requirements:

```javascript
const handleApiCall = async () => {
    try {
        const response = await fetch('/api/users/by-state', options);
        
        // Validate response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format: Expected JSON');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            // Handle business logic errors
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        // Handle different error types
        if (error.name === 'SyntaxError') {
            console.error('JSON parsing error:', error);
            throw new Error('Invalid server response');
        } else if (error.message.includes('404')) {
            throw new Error('API endpoint not found');
        } else if (error.message.includes('403')) {
            throw new Error('Access denied: Insufficient permissions');
        }
        
        throw error;
    }
};
```

This API provides comprehensive state-level user management capabilities while maintaining security, performance, and following the project's established patterns and specifications.