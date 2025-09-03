# Version Management API Documentation

This API provides comprehensive version management functionality for mobile applications, including version checking, update notifications, and admin management features.

## Base URL
```
/api/version
```

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## User Endpoints

### 1. Check App Version
**POST** `/api/version/check`

Check current app version against Play Store version and determine if update is required.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentVersion": "1.2.0",
  "playStoreVersion": "1.3.0",
  "deviceInfo": {
    "platform": "Android",
    "model": "Samsung Galaxy S21",
    "osVersion": "11",
    "manufacturer": "Samsung"
  },
  "buildNumber": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "versionCheckId": "version_check_id",
    "currentVersion": "1.2.0",
    "playStoreVersion": "1.3.0",
    "updateRequired": true,
    "updateType": "recommended",
    "forceUpdate": false,
    "versionComparison": {
      "isNewer": false,
      "isEqual": false,
      "isOlder": true
    },
    "checkCount": 1,
    "lastCheckDate": "2024-01-15T10:30:00Z",
    "releaseNotes": "Bug fixes and performance improvements",
    "minimumRequiredVersion": "1.0.0",
    "downloadUrl": "https://play.google.com/store/apps/details?id=com.gluckscare.erp"
  },
  "message": "Update available: recommended"
}
```

### 2. Get Version History
**GET** `/api/version/history`

Get user's version check history with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "_id": "version_check_id",
        "userId": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "employeeCode": "EMP001"
        },
        "currentVersion": "1.2.0",
        "playStoreVersion": "1.3.0",
        "updateRequired": true,
        "updateType": "recommended",
        "deviceInfo": {
          "platform": "Android",
          "model": "Samsung Galaxy S21"
        },
        "versionCheckDate": "2024-01-15T10:30:00Z",
        "checkCount": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRecords": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3. Get Latest Version Check
**GET** `/api/version/latest`

Get user's most recent version check.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "version_check_id",
    "currentVersion": "1.2.0",
    "playStoreVersion": "1.3.0",
    "updateRequired": true,
    "updateType": "recommended",
    "forceUpdate": false,
    "deviceInfo": {
      "platform": "Android",
      "model": "Samsung Galaxy S21"
    },
    "versionCheckDate": "2024-01-15T10:30:00Z",
    "lastCheckDate": "2024-01-15T10:30:00Z"
  }
}
```

### 4. Update Version Check
**PUT** `/api/version/:id`

Update version check status (mark as skipped, update prompt date, etc.).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "updateSkipped": true,
  "lastUpdatePromptDate": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "version_check_id",
    "updateSkipped": true,
    "lastUpdatePromptDate": "2024-01-15T10:30:00Z",
    "updatedBy": "user_id"
  },
  "message": "Version check updated successfully"
}
```

## Admin Endpoints

### 1. Get All Version Checks
**GET** `/api/version/admin/all`

Get all users' version status with filtering and pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `updateRequired` (optional): Filter by update requirement (true/false)
- `updateType` (optional): Filter by update type (critical/recommended/optional/none/all)
- `platform` (optional): Filter by platform (Android/iOS/all)
- `search` (optional): Search by user name, email, or employee code
- `startDate` (optional): Filter by date range start
- `endDate` (optional): Filter by date range end

**Response:**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "_id": "version_check_id",
        "userId": "user_id",
        "user": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "employeeCode": "EMP001",
          "department": "Sales",
          "role": "Sales Representative"
        },
        "currentVersion": "1.2.0",
        "playStoreVersion": "1.3.0",
        "latestVersion": "1.3.0",
        "updateRequired": true,
        "updateType": "recommended",
        "forceUpdate": false,
        "deviceInfo": {
          "platform": "Android",
          "model": "Samsung Galaxy S21",
          "osVersion": "11"
        },
        "buildNumber": "123",
        "checkCount": 5,
        "versionCheckDate": "2024-01-15T10:30:00Z",
        "lastCheckDate": "2024-01-15T10:30:00Z",
        "releaseNotes": "Bug fixes and improvements",
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "statistics": {
      "totalUsers": 100,
      "updateRequired": 25,
      "criticalUpdates": 5,
      "recommendedUpdates": 15,
      "optionalUpdates": 5,
      "upToDate": 75
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get User Version Status
**GET** `/api/version/admin/user/:userId`

Get specific user's version status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "version_check_id",
    "userId": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "employeeCode": "EMP001",
      "department": "Sales",
      "role": "Sales Representative"
    },
    "currentVersion": "1.2.0",
    "playStoreVersion": "1.3.0",
    "updateRequired": true,
    "updateType": "recommended",
    "forceUpdate": false,
    "deviceInfo": {
      "platform": "Android",
      "model": "Samsung Galaxy S21",
      "osVersion": "11"
    },
    "buildNumber": "123",
    "checkCount": 5,
    "versionCheckDate": "2024-01-15T10:30:00Z",
    "lastCheckDate": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Set App Configuration
**POST** `/api/version/admin/config`

Set app configuration including minimum required version and release notes.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "minimumRequiredVersion": "1.2.0",
  "latestVersion": "1.3.0",
  "releaseNotes": "New features:\n- Enhanced UI\n- Bug fixes\n- Performance improvements",
  "forceUpdate": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "minimumRequiredVersion": "1.2.0",
    "latestVersion": "1.3.0",
    "releaseNotes": "New features:\n- Enhanced UI\n- Bug fixes\n- Performance improvements",
    "forceUpdate": false,
    "updatedBy": "admin_user_id",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "App configuration updated successfully"
}
```

### 4. Send Update Notification (Legacy)
**POST** `/api/version/admin/notify-update`

Send update notification to specific users (legacy endpoint).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userIds": ["user_id_1", "user_id_2"],
  "message": "A new version of the app is available. Please update to get the latest features and bug fixes.",
  "title": "App Update Available",
  "updateType": "recommended"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification_id",
    "notificationsSent": 2,
    "title": "App Update Available - Recommended",
    "message": "A new version of the app is available...",
    "updateType": "recommended",
    "sentAt": "2024-01-15T10:30:00Z"
  },
  "message": "Update notification sent to 2 users"
}
```

## Enhanced Notification Endpoints

### 5. Send Version Update Notification (Enhanced)
**POST** `/api/version/admin/notifications/send`

Send enhanced version update notification with full integration to notification system.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userIds": ["user_id_1", "user_id_2"],
  "message": "A new version (v1.3.0) is available with exciting new features and important bug fixes. Update now to get the best experience!",
  "title": "Critical App Update Available",
  "updateType": "critical",
  "isBroadcast": false,
  "forceUpdate": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification_id",
    "notificationsSent": 2,
    "title": "Critical App Update Available",
    "message": "A new version (v1.3.0) is available...",
    "updateType": "critical",
    "isBroadcast": false,
    "forceUpdate": true,
    "sentAt": "2024-01-15T10:30:00Z"
  },
  "message": "Update notification sent to 2 users"
}
```

### 6. Get Users Needing Update
**GET** `/api/version/admin/notifications/users-needing-update`

Get list of users who need app updates.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `updateType` (optional): Filter by update type (critical/recommended/optional/all)
- `platform` (optional): Filter by platform (Android/iOS/all)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "version_check_id",
        "userId": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com",
          "employeeCode": "EMP001",
          "department": "Sales",
          "role": "Sales Representative"
        },
        "currentVersion": "1.2.0",
        "playStoreVersion": "1.3.0",
        "updateRequired": true,
        "updateType": "critical",
        "deviceInfo": {
          "platform": "Android"
        }
      }
    ],
    "statistics": {
      "total": 25,
      "critical": 5,
      "recommended": 15,
      "optional": 5
    }
  }
}
```

### 7. Notify All Outdated Users
**POST** `/api/version/admin/notifications/notify-outdated`

Send notification to all users with outdated app versions.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Your app version is outdated. Please update to the latest version for the best experience and latest features.",
  "title": "App Update Required",
  "updateType": "recommended"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification_id",
    "notificationsSent": 25,
    "title": "App Update Required",
    "message": "Your app version is outdated...",
    "updateType": "recommended",
    "isBroadcast": false,
    "forceUpdate": false,
    "sentAt": "2024-01-15T10:30:00Z"
  },
  "message": "Update notification sent to 25 users"
}
```

### 8. Get Version Notification History
**GET** `/api/version/admin/notifications/history`

Get history of version-related notifications sent.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notification_id",
        "title": "App Update Available - Critical",
        "body": "A new version is available...",
        "sender": {
          "_id": "admin_id",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "recipients": [
          {
            "user": "user_id_1",
            "isRead": true,
            "readAt": "2024-01-15T11:00:00Z"
          }
        ],
        "isBroadcast": false,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRecords": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `500` - Internal Server Error

## Version Format

All version numbers must follow semantic versioning format: `X.Y.Z` (e.g., `1.2.3`)

## Update Types

- `critical` - Security fixes, critical bugs (force update recommended)
- `recommended` - New features, important improvements
- `optional` - Minor improvements, non-critical fixes
- `none` - App is up to date

## Real-time Notifications

The API integrates with Socket.IO for real-time notifications. When version update notifications are sent, users receive real-time updates via WebSocket connections.

## Integration with Existing Notification System

Version notifications are fully integrated with the existing notification system, allowing users to:
- View notifications in the notification center
- Mark notifications as read
- Permanently dismiss notifications
- Delete notifications
- Receive real-time updates via Socket.IO