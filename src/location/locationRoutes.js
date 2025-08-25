const express = require('express');
const router = express.Router();
const Location = require('./Location');
const User = require('../user/User');
const auth = require('../middleware/authMiddleware');

// Import enhanced location controller
const {
    getUsersLocationTracker,
    getUserLocationHistory,
    getRealTimeLocations,
    getLocationAnalytics,
    getStateHeadUsersLocationTracker,
    getStateHeadCurrentLocations
} = require('./locationController');

// POST route to save location data - Backward compatible
router.post('/', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      userName,
      userId,
      deviceId,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      networkType
    } = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required."
      });
    }

    // Validate required identifiers
    if (!userId || !userName || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "userId, userName, and deviceId are required."
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude. Must be between -90 and 90."
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude. Must be between -180 and 180."
      });
    }

    // Check if user exists (only if userId is provided)
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }
    }

    // Create location data
    const locationData = {
      userId,
      userName,
      deviceId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    // Add optional enhanced fields with proper validation
    if (accuracy !== undefined && accuracy !== null && !isNaN(parseFloat(accuracy))) {
      locationData.accuracy = parseFloat(accuracy);
    }
    if (batteryLevel !== undefined && batteryLevel !== null && !isNaN(parseInt(batteryLevel))) {
      locationData.batteryLevel = parseInt(batteryLevel);
    }
    if (networkType) locationData.networkType = networkType;

    const location = new Location(locationData);
    await location.save();

    // Create response message based on what was provided
    let responseMessage = "Location saved successfully";
    if (userId && userName) {
      responseMessage += ` for user ${userName} (ID: ${userId})`;
    } else if (userName) {
      responseMessage += ` for user ${userName}`;
    } else if (deviceId) {
      responseMessage += ` for device ${deviceId}`;
    }

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        accuracy: location.accuracy || 0,
        savedData: {
          userId: location.userId || null,
          userName: location.userName || null,
          deviceId: location.deviceId || null
        }
      }
    });
  } catch (error) {
    console.error('Location save error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save location',
      error: error.message
    });
  }
});

// GET route to fetch all locations - Backward compatible
router.get('/', async (req, res) => {
  try {
    // Check if user is admin (if auth middleware is present)
    if (req.user && !['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const {
      userId,
      date,
      startDate,
      endDate,
      limit = 100,
      page = 1
    } = req.query;

    let query = {};

    // Handle both old and new data formats
    if (userId) {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false }, userName: { $exists: true } } // For old data
      ];
    }

    // Date filtering
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.timestamp = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const locations = await Location.find(query)
      .populate('userId', 'name email employeeCode role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Location.countDocuments(query);

    // For backward compatibility, return both old and new format
    const responseData = req.user ? {
      success: true,
      data: locations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    } : locations; // Old format for non-authenticated requests

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message
    });
  }
});

// GET route to fetch real-time location data for tracking
router.get('/realtime/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own data
    if (!['Admin', 'Super Admin'].includes(req.user.role) && req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const { userId } = req.params;
    const { minutes = 10 } = req.query; // Default to last 10 minutes

    const timeAgo = new Date();
    timeAgo.setMinutes(timeAgo.getMinutes() - parseInt(minutes));

    const locations = await Location.find({
      userId,
      timestamp: { $gte: timeAgo }
    })
      .sort({ timestamp: 1 })
      .populate('userId', 'name email employeeCode role');

    res.status(200).json({
      success: true,
      data: {
        userId,
        timeRange: `${minutes} minutes`,
        locations,
        count: locations.length
      }
    });
  } catch (error) {
    console.error('Get realtime location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime location data',
      error: error.message
    });
  }
});

// GET route to fetch user's location history for a specific date
router.get('/history/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own data
    if (!['Admin', 'Super Admin'].includes(req.user.role) && req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const { userId } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const locations = await Location.getUserLocationHistory(userId, date);

    // Calculate total distance traveled
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      totalDistance += locations[i].distanceFrom(locations[i - 1]);
    }

    // Get user info
    const user = await User.findById(userId).select('name email employeeCode role');

    res.status(200).json({
      success: true,
      data: {
        user,
        date,
        locations,
        summary: {
          totalPoints: locations.length,
          totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
          firstLocation: locations[0] || null,
          lastLocation: locations[locations.length - 1] || null,
          timeSpan: locations.length > 0 ? {
            start: locations[0].timestamp,
            end: locations[locations.length - 1].timestamp
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location history',
      error: error.message
    });
  }
});

// GET route to fetch user's current location
router.get('/current/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own data
    if (!['Admin', 'Super Admin'].includes(req.user.role) && req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const { userId } = req.params;
    const location = await Location.getUserCurrentLocation(userId);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this user.'
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current location',
      error: error.message
    });
  }
});

// Debug endpoint
router.get('/debug/users', auth, async (req, res) => {
  try {
    const allUsers = await User.find({});
    const targetUser = await User.findById('68160fe5f633c8436ed1c587');

    res.json({
      totalUsers: allUsers.length,
      targetUserExists: !!targetUser,
      targetUserData: targetUser ? {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      } : null,
      allUserIds: allUsers.map(u => u._id.toString())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to fetch all users with their current locations (Admin only)
router.get('/users/current', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Get all users
    let users = await User.find({}).select('name email employeeCode role');

    // Debug: Check if target user exists
    const targetUserId = '68160fe5f633c8436ed1c587';
    const targetUser = users.find(u => u._id.toString() === targetUserId);

    // If target user not found, try to get it specifically
    if (!targetUser) {
      try {
        const specificUser = await User.findById(targetUserId).select('name email employeeCode role');
        if (specificUser) {
          users.push(specificUser);
        }
      } catch (err) {
        console.log('Error finding specific user:', err);
      }
    }

    // Get current location for each user (handles both old and new data)
    const usersWithLocations = await Promise.all(
      users.map(async (user) => {
        // Use the static method to get current location
        const location = await Location.getUserCurrentLocation(user._id);

        // Debug for target user
        if (user._id.toString() === targetUserId) {
          console.log('Target user location lookup:', {
            userId: user._id.toString(),
            userName: user.name,
            locationFound: !!location,
            locationId: location ? location._id : null
          });
        }

        return {
          user,
          currentLocation: location,
          isOnline: location && (new Date() - new Date(location.timestamp)) < 300000 // 5 minutes
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithLocations
    });
  } catch (error) {
    console.error('Get users current locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users current locations',
      error: error.message
    });
  }
});

// DELETE route to clear old location data (Admin only)
router.delete('/cleanup', auth, async (req, res) => {
  try {
    // Check if user is Super Admin
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin privileges required.'
      });
    }

    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Location.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Cleaned up location data older than ${days} days`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Location cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup location data',
      error: error.message
    });
  }
});

// GET route to migrate old location data (Super Admin only)
router.post('/migrate', auth, async (req, res) => {
  try {
    // Check if user is Super Admin
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin privileges required.'
      });
    }

    // Find locations without userId but with userName
    const locationsToMigrate = await Location.find({
      userId: { $exists: false },
      userName: { $exists: true, $ne: null }
    });

    let migratedCount = 0;
    let errors = [];

    for (const location of locationsToMigrate) {
      try {
        // Try to find user by name
        const user = await User.findOne({ name: location.userName });
        if (user) {
          await Location.updateOne(
            { _id: location._id },
            {
              $set: {
                userId: user._id,
                isActive: true // Set default for old records
              }
            }
          );
          migratedCount++;
        }
      } catch (error) {
        errors.push(`Failed to migrate location ${location._id}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Migration completed. ${migratedCount} locations migrated.`,
      migratedCount,
      totalFound: locationsToMigrate.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Location migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate location data',
      error: error.message
    });
  }
});

// ========== Enhanced Admin Location Tracking Routes ==========

// GET route for admin dashboard user tracker with date/24h filtering
router.get('/admin/users-tracker', auth, getUsersLocationTracker);

// GET route for detailed user location history with analytics
router.get('/admin/user-history/:userId', auth, getUserLocationHistory);

// GET route for real-time location updates
router.get('/admin/real-time', auth, getRealTimeLocations);

// GET route for location analytics summary
router.get('/admin/analytics', auth, getLocationAnalytics);

// ========== State Head Location Tracking Routes ==========

// GET route for State Head to view users location tracker in their state (date-wise 24h)
router.get('/state-head/users-tracker', auth, getStateHeadUsersLocationTracker);

// GET route for State Head to view current locations of users in their state (Last fetch)
router.get('/state-head/current-locations', auth, getStateHeadCurrentLocations);

module.exports = router;
