// Backend/src/version/README.md
# Version Checking API

This API provides comprehensive version management functionality for the Glcuks Care ERP mobile application.

## API Endpoints

### User Endpoints

#### 1. Check App Version
```
POST /api/version/check
```

**Request Body:**
```json
{
    "currentVersion": "1.2.3",
    "playStoreVersion": "1.3.0",
    "deviceInfo": {
        "deviceId": "device_12345",
        "platform": "android",
        "osVersion": "11.0"
    }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "versionCheckId": "64f5a8b2c9e4f123456789ab",
        "currentVersion": "1.2.3",
        "playStoreVersion": "1.3.0",
        "updateRequired": true,
        "updateType": "recommended",
        "forceUpdate": false,
        "versionComparison": -1,
        "releaseNotes": "Bug fixes and performance improvements",
        "minimumRequiredVersion": "1.0.0",
        "downloadUrl": "https://play.google.com/store/apps/details?id=com.gluckscare.erp"
    },
    "message": "Update available: recommended"
}
```

#### 2. Get Version History
```
GET /api/version/history?page=1&limit=10
```

#### 3. Get Latest Version Check
```
GET /api/version/latest
```

#### 4. Update Version Check Status
```
PUT /api/version/:id
```

**Request Body:**
```json
{
    "updateSkipped": true,
    "lastUpdatePromptDate": "2024-01-15T10:30:00Z"
}
```

### Admin Endpoints

#### 1. Get All Version Checks
```
GET /api/version/admin/all?page=1&limit=20&updateRequired=true&updateType=critical
```

#### 2. Set App Configuration
```
POST /api/version/admin/config
```

**Request Body:**
```json
{
    "minimumRequiredVersion": "1.0.0",
    "latestVersion": "1.3.0",
    "releaseNotes": "New features and bug fixes",
    "forceUpdate": false
}
```

## Update Types

- **none**: App is up to date
- **optional**: Minor patch update available
- **recommended**: Minor version update available
- **critical**: Major version update available

## Integration Example

### Frontend Integration

```javascript
// Check version when app starts
const checkAppVersion = async () => {
    try {
        const response = await fetch('/api/version/check', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentVersion: '1.2.3', // Get from app info
                playStoreVersion: '1.3.0', // Get from Play Store API
                deviceInfo: {
                    deviceId: 'unique_device_id',
                    platform: 'android',
                    osVersion: '11.0'
                }
            })
        });

        const data = await response.json();
        
        if (data.success && data.data.updateRequired) {
            handleUpdateRequired(data.data);
        }
    } catch (error) {
        console.error('Version check failed:', error);
    }
};

// Handle update notifications
const handleUpdateRequired = (versionData) => {
    const { updateType, releaseNotes, forceUpdate } = versionData;
    
    if (forceUpdate) {
        // Show blocking update dialog
        showForceUpdateDialog(releaseNotes);
    } else {
        // Show optional update notification
        showUpdateNotification(updateType, releaseNotes);
    }
};
```

### Mobile App Integration (React Native)

```javascript
import DeviceInfo from 'react-native-device-info';

const getAppVersion = () => {
    return DeviceInfo.getVersion(); // e.g., "1.2.3"
};

const checkVersion = async () => {
    const currentVersion = getAppVersion();
    const deviceId = DeviceInfo.getUniqueId();
    const systemVersion = DeviceInfo.getSystemVersion();
    
    // Call your API to get Play Store version
    const playStoreVersion = await getPlayStoreVersion();
    
    const response = await fetch('/api/version/check', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentVersion,
            playStoreVersion,
            deviceInfo: {
                deviceId,
                platform: Platform.OS, // 'android' or 'ios'
                osVersion: systemVersion
            }
        })
    });
    
    return response.json();
};
```

## Database Schema

The Version model stores:
- User version check history
- Device information
- Update requirements and types
- Version comparison results
- Audit trail

## Features

1. **Automatic Version Comparison**: Semantic version comparison (major.minor.patch)
2. **Update Type Detection**: Automatic classification of update urgency
3. **Force Update Support**: Critical updates that block app usage
4. **Device Tracking**: Track versions across different devices
5. **Admin Analytics**: Comprehensive version adoption analytics
6. **Audit Trail**: Complete history of version checks per user

## Security

- All endpoints require authentication
- Admin endpoints require proper role-based access
- Input validation for version formats
- Audit trail for all operations