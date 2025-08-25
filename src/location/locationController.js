// Backend/src/location/locationController.js
const Location = require('./Location');
const User = require('../user/User');

/**
 * Get all users with their current locations (Admin Dashboard)
 * GET /api/locations/admin/users-tracker
 */
exports.getUsersLocationTracker = async (req, res) => {
    try {
        // Check if user is admin
        if (!['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const {
            date,
            hours = '24',
            onlineOnly = 'false',
            hasLocation = 'false',
            search = '',
            department,
            role,
            state,
            limit = 50,
            page = 1
        } = req.query;

        // Build time range
        let timeRange = {};
        if (date) {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            if (hours === '12') {
                // Last 12 hours from now
                timeRange = {
                    $gte: new Date(Date.now() - 12 * 60 * 60 * 1000)
                };
            } else if (hours === '24') {
                // 24 hours for the selected date
                const startOfDay = new Date(targetDate);
                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                timeRange = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            } else {
                // Custom hours
                timeRange = {
                    $gte: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000)
                };
            }
        } else {
            // Default: last 24 hours
            timeRange = {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            };
        }

        // Build user filter query
        let userQuery = {};
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            userQuery.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { employeeCode: searchRegex }
            ];
        }
        if (department) userQuery.department = department;
        if (role) userQuery.role = role;
        if (state) userQuery.state = state;

        // Get all users matching criteria
        const users = await User.find(userQuery)
            .populate('department', 'name')
            .populate('state', 'name')
            .select('name email employeeCode role department state isActive')
            .sort({ name: 1 });

        // Get location data for time range
        const locations = await Location.find({
            timestamp: timeRange,
            userId: { $in: users.map(u => u._id) }
        }).sort({ timestamp: -1 });

        // Group locations by user
        const locationsByUser = {};
        locations.forEach(loc => {
            const userId = loc.userId.toString();
            if (!locationsByUser[userId]) {
                locationsByUser[userId] = [];
            }
            locationsByUser[userId].push(loc);
        });

        // Process users with their location data
        const usersWithLocationData = await Promise.all(
            users.map(async (user) => {
                const userId = user._id.toString();
                const userLocations = locationsByUser[userId] || [];
                
                // Get current location (most recent)
                const currentLocation = userLocations[0] || null;
                
                // Calculate analytics for the time period
                const analytics = calculateLocationAnalytics(userLocations);
                
                // Determine online status (last 5 minutes)
                const isOnline = currentLocation && 
                    (new Date() - new Date(currentLocation.timestamp)) < 300000;

                return {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        employeeCode: user.employeeCode,
                        role: user.role,
                        department: user.department,
                        state: user.state,
                        isActive: user.isActive
                    },
                    currentLocation,
                    locationHistory: userLocations,
                    analytics,
                    isOnline,
                    lastSeen: currentLocation ? currentLocation.timestamp : null
                };
            })
        );

        // Apply filters
        let filteredUsers = usersWithLocationData;

        if (onlineOnly === 'true') {
            filteredUsers = filteredUsers.filter(u => u.isOnline);
        }

        if (hasLocation === 'true') {
            filteredUsers = filteredUsers.filter(u => u.currentLocation);
        }

        // Pagination
        const total = filteredUsers.length;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedUsers = filteredUsers.slice(skip, skip + parseInt(limit));

        // Calculate summary statistics
        const summary = {
            totalUsers: users.length,
            usersWithLocations: usersWithLocationData.filter(u => u.currentLocation).length,
            onlineUsers: usersWithLocationData.filter(u => u.isOnline).length,
            totalLocationPoints: locations.length,
            timeRange: {
                hours: parseInt(hours),
                from: timeRange.$gte,
                to: timeRange.$lte || new Date()
            }
        };

        res.status(200).json({
            success: true,
            data: {
                users: paginatedUsers,
                summary,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    hasNext: skip + parseInt(limit) < total,
                    hasPrev: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get users location tracker error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users location data',
            error: error.message
        });
    }
};

/**
 * Get detailed location history for a specific user
 * GET /api/locations/admin/user-history/:userId
 */
exports.getUserLocationHistory = async (req, res) => {
    try {
        // Check if user is admin or requesting their own data
        if (!['Admin', 'Super Admin'].includes(req.user.role) && req.user.id !== req.params.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied.'
            });
        }

        const { userId } = req.params;
        const {
            date,
            startDate,
            endDate,
            hours = '24',
            includeAnalytics = 'true'
        } = req.query;

        // Build time range
        let timeRange = {};
        
        if (startDate && endDate) {
            // Custom date range
            timeRange = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (date) {
            // Specific date with hours filter
            const targetDate = new Date(date);
            
            if (hours === '24') {
                // Full day
                const startOfDay = new Date(targetDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                timeRange = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            } else {
                // Last N hours from current time
                timeRange = {
                    $gte: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000)
                };
            }
        } else {
            // Default: last 24 hours
            timeRange = {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            };
        }

        // Get user info
        const user = await User.findById(userId)
            .populate('department', 'name')
            .populate('state', 'name')
            .select('name email employeeCode role department state');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get location history
        const locations = await Location.find({
            userId,
            timestamp: timeRange
        }).sort({ timestamp: 1 });

        // Calculate analytics
        let analytics = null;
        if (includeAnalytics === 'true') {
            analytics = calculateLocationAnalytics(locations);
        }

        // Group locations by hour for timeline view
        const locationsByHour = {};
        locations.forEach(loc => {
            const hour = new Date(loc.timestamp).getHours();
            if (!locationsByHour[hour]) {
                locationsByHour[hour] = [];
            }
            locationsByHour[hour].push(loc);
        });

        res.status(200).json({
            success: true,
            data: {
                user,
                locations,
                locationsByHour,
                analytics,
                summary: {
                    totalPoints: locations.length,
                    timeRange: {
                        from: timeRange.$gte,
                        to: timeRange.$lte || new Date(),
                        hours: parseInt(hours)
                    },
                    firstLocation: locations[0] || null,
                    lastLocation: locations[locations.length - 1] || null
                }
            }
        });

    } catch (error) {
        console.error('Get user location history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user location history',
            error: error.message
        });
    }
};

/**
 * Get real-time location updates for dashboard
 * GET /api/locations/admin/real-time
 */
exports.getRealTimeLocations = async (req, res) => {
    try {
        // Check if user is admin
        if (!['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { minutes = 5 } = req.query;
        
        // Get locations from last N minutes
        const timeAgo = new Date(Date.now() - parseInt(minutes) * 60 * 1000);
        
        const recentLocations = await Location.find({
            timestamp: { $gte: timeAgo }
        })
        .populate('userId', 'name email employeeCode role')
        .sort({ timestamp: -1 });

        // Group by user to get latest location per user
        const latestByUser = {};
        recentLocations.forEach(loc => {
            const userId = loc.userId._id.toString();
            if (!latestByUser[userId] || 
                new Date(loc.timestamp) > new Date(latestByUser[userId].timestamp)) {
                latestByUser[userId] = loc;
            }
        });

        const activeUsers = Object.values(latestByUser);

        res.status(200).json({
            success: true,
            data: {
                activeUsers,
                timeRange: `${minutes} minutes`,
                totalActiveUsers: activeUsers.length,
                lastUpdate: new Date()
            }
        });

    } catch (error) {
        console.error('Get real-time locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch real-time locations',
            error: error.message
        });
    }
};

/**
 * Get users location data for State Head (by state)
 * GET /api/locations/state-head/users-tracker
 */
exports.getStateHeadUsersLocationTracker = async (req, res) => {
    try {
        // Check if user is State Head or Admin
        if (!['State Head', 'Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. State Head privileges required.'
            });
        }

        const {
            date,
            hours = '24',
            onlineOnly = 'false',
            hasLocation = 'false',
            search = '',
            department,
            role,
            limit = 50,
            page = 1
        } = req.query;

        // Get State Head's state information
        let stateId = req.user.state;
        
        // For Admin/Super Admin, allow state parameter
        if (['Admin', 'Super Admin'].includes(req.user.role) && req.query.state) {
            stateId = req.query.state;
        }

        if (!stateId) {
            return res.status(400).json({
                success: false,
                message: 'State information not found for user'
            });
        }

        // Build time range
        let timeRange = {};
        if (date) {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            if (hours === '12') {
                // Last 12 hours from now
                timeRange = {
                    $gte: new Date(Date.now() - 12 * 60 * 60 * 1000)
                };
            } else if (hours === '24') {
                // 24 hours for the selected date
                const startOfDay = new Date(targetDate);
                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                timeRange = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            } else {
                // Custom hours
                timeRange = {
                    $gte: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000)
                };
            }
        } else {
            // Default: last 24 hours
            timeRange = {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            };
        }

        // Build user filter query for users in the State Head's state
        let userQuery = { state: stateId };
        
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            userQuery.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { employeeCode: searchRegex }
            ];
        }
        if (department) userQuery.department = department;
        if (role) userQuery.role = role;

        // Get all users in the state
        const users = await User.find(userQuery)
            .populate('department', 'name')
            .populate('state', 'name')
            .populate('headOffice', 'name')
            .select('name email employeeCode role department state headOffice isActive')
            .sort({ name: 1 });

        // Get location data for time range
        const locations = await Location.find({
            timestamp: timeRange,
            userId: { $in: users.map(u => u._id) }
        }).sort({ timestamp: -1 });

        // Group locations by user
        const locationsByUser = {};
        locations.forEach(loc => {
            const userId = loc.userId.toString();
            if (!locationsByUser[userId]) {
                locationsByUser[userId] = [];
            }
            locationsByUser[userId].push(loc);
        });

        // Process users with their location data
        const usersWithLocationData = await Promise.all(
            users.map(async (user) => {
                const userId = user._id.toString();
                const userLocations = locationsByUser[userId] || [];
                
                // Get current location (most recent)
                const currentLocation = userLocations[0] || null;
                
                // Calculate analytics for the time period
                const analytics = calculateLocationAnalytics(userLocations);
                
                // Determine online status (last 5 minutes)
                const isOnline = currentLocation && 
                    (new Date() - new Date(currentLocation.timestamp)) < 300000;

                return {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        employeeCode: user.employeeCode,
                        role: user.role,
                        department: user.department,
                        state: user.state,
                        headOffice: user.headOffice,
                        isActive: user.isActive
                    },
                    currentLocation,
                    locationHistory: userLocations,
                    analytics,
                    isOnline,
                    lastSeen: currentLocation ? currentLocation.timestamp : null
                };
            })
        );

        // Apply filters
        let filteredUsers = usersWithLocationData;

        if (onlineOnly === 'true') {
            filteredUsers = filteredUsers.filter(u => u.isOnline);
        }

        if (hasLocation === 'true') {
            filteredUsers = filteredUsers.filter(u => u.currentLocation);
        }

        // Pagination
        const total = filteredUsers.length;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedUsers = filteredUsers.slice(skip, skip + parseInt(limit));

        // Calculate summary statistics
        const summary = {
            totalUsers: users.length,
            usersWithLocations: usersWithLocationData.filter(u => u.currentLocation).length,
            onlineUsers: usersWithLocationData.filter(u => u.isOnline).length,
            totalLocationPoints: locations.length,
            stateInfo: users.length > 0 ? users[0].state : null,
            timeRange: {
                hours: parseInt(hours),
                from: timeRange.$gte,
                to: timeRange.$lte || new Date()
            }
        };

        res.status(200).json({
            success: true,
            data: {
                users: paginatedUsers,
                summary,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    hasNext: skip + parseInt(limit) < total,
                    hasPrev: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get state head users location tracker error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch state users location data',
            error: error.message
        });
    }
};

/**
 * Get current locations of all users in State Head's state (Last fetch location)
 * GET /api/locations/state-head/current-locations
 */
exports.getStateHeadCurrentLocations = async (req, res) => {
    try {
        // Check if user is State Head or Admin
        if (!['State Head', 'Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. State Head privileges required.'
            });
        }

        const {
            onlineOnly = 'false',
            search = '',
            department,
            role,
            limit = 100,
            page = 1
        } = req.query;

        // Get State Head's state information
        let stateId = req.user.state;
        
        // For Admin/Super Admin, allow state parameter
        if (['Admin', 'Super Admin'].includes(req.user.role) && req.query.state) {
            stateId = req.query.state;
        }

        if (!stateId) {
            return res.status(400).json({
                success: false,
                message: 'State information not found for user'
            });
        }

        // Build user filter query for users in the State Head's state
        let userQuery = { state: stateId, isActive: true };
        
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            userQuery.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { employeeCode: searchRegex }
            ];
        }
        if (department) userQuery.department = department;
        if (role) userQuery.role = role;

        // Get all users in the state
        const users = await User.find(userQuery)
            .populate('department', 'name')
            .populate('state', 'name')
            .populate('headOffice', 'name')
            .select('name email employeeCode role department state headOffice isActive')
            .sort({ name: 1 });

        // Get current location for each user (most recent location)
        const usersWithCurrentLocations = await Promise.all(
            users.map(async (user) => {
                // Get the most recent location for this user
                const currentLocation = await Location.findOne({ userId: user._id })
                    .sort({ timestamp: -1 })
                    .limit(1);

                // Determine online status (last 5 minutes)
                const isOnline = currentLocation && 
                    (new Date() - new Date(currentLocation.timestamp)) < 300000;

                // Calculate time since last seen
                const lastSeenMinutes = currentLocation ? 
                    Math.floor((new Date() - new Date(currentLocation.timestamp)) / (1000 * 60)) : null;

                return {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        employeeCode: user.employeeCode,
                        role: user.role,
                        department: user.department,
                        state: user.state,
                        headOffice: user.headOffice,
                        isActive: user.isActive
                    },
                    currentLocation: currentLocation ? {
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        timestamp: currentLocation.timestamp,
                        accuracy: currentLocation.accuracy,
                        batteryLevel: currentLocation.batteryLevel,
                        networkType: currentLocation.networkType
                    } : null,
                    isOnline,
                    lastSeen: currentLocation ? currentLocation.timestamp : null,
                    lastSeenMinutes,
                    locationStatus: currentLocation ? 
                        (isOnline ? 'online' : `${lastSeenMinutes}m ago`) : 'no data'
                };
            })
        );

        // Apply online filter if requested
        let filteredUsers = usersWithCurrentLocations;
        if (onlineOnly === 'true') {
            filteredUsers = filteredUsers.filter(u => u.isOnline);
        }

        // Sort by online status first, then by last seen
        filteredUsers.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            if (a.lastSeen && b.lastSeen) {
                return new Date(b.lastSeen) - new Date(a.lastSeen);
            }
            return 0;
        });

        // Pagination
        const total = filteredUsers.length;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedUsers = filteredUsers.slice(skip, skip + parseInt(limit));

        // Calculate summary statistics
        const summary = {
            totalUsers: users.length,
            usersWithLocations: usersWithCurrentLocations.filter(u => u.currentLocation).length,
            onlineUsers: usersWithCurrentLocations.filter(u => u.isOnline).length,
            offlineUsers: usersWithCurrentLocations.filter(u => u.currentLocation && !u.isOnline).length,
            noLocationData: usersWithCurrentLocations.filter(u => !u.currentLocation).length,
            stateInfo: users.length > 0 ? users[0].state : null,
            lastUpdate: new Date()
        };

        res.status(200).json({
            success: true,
            data: {
                users: paginatedUsers,
                summary,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    hasNext: skip + parseInt(limit) < total,
                    hasPrev: parseInt(page) > 1
                }
            },
            message: `Found ${filteredUsers.length} users in state ${summary.stateInfo?.name || 'Unknown'}`
        });

    } catch (error) {
        console.error('Get state head current locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch current locations for state users',
            error: error.message
        });
    }
};

/**
 * Get location analytics summary for dashboard
 * GET /api/locations/admin/analytics
 */
exports.getLocationAnalytics = async (req, res) => {
    try {
        // Check if user is admin
        if (!['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { date, period = 'today' } = req.query;
        
        let timeRange = {};
        
        switch (period) {
            case 'today':
                const today = date ? new Date(date) : new Date();
                today.setHours(0, 0, 0, 0);
                const endToday = new Date(today);
                endToday.setHours(23, 59, 59, 999);
                timeRange = { $gte: today, $lte: endToday };
                break;
                
            case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                const endYesterday = new Date(yesterday);
                endYesterday.setHours(23, 59, 59, 999);
                timeRange = { $gte: yesterday, $lte: endYesterday };
                break;
                
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                timeRange = { $gte: weekAgo };
                break;
                
            case 'month':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                timeRange = { $gte: monthAgo };
                break;
        }

        // Get location statistics
        const totalLocations = await Location.countDocuments({ timestamp: timeRange });
        const uniqueUsers = await Location.distinct('userId', { timestamp: timeRange });
        
        // Get hourly distribution
        const hourlyStats = await Location.aggregate([
            { $match: { timestamp: timeRange } },
            {
                $group: {
                    _id: { $hour: '$timestamp' },
                    count: { $sum: 1 },
                    users: { $addToSet: '$userId' }
                }
            },
            {
                $project: {
                    hour: '$_id',
                    locationCount: '$count',
                    userCount: { $size: '$users' }
                }
            },
            { $sort: { hour: 1 } }
        ]);

        // Get most active users
        const mostActiveUsers = await Location.aggregate([
            { $match: { timestamp: timeRange } },
            {
                $group: {
                    _id: '$userId',
                    locationCount: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' }
                }
            },
            { $sort: { locationCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    user: {
                        _id: '$user._id',
                        name: '$user.name',
                        employeeCode: '$user.employeeCode'
                    },
                    locationCount: 1,
                    firstSeen: 1,
                    lastSeen: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalLocations,
                    uniqueUsers: uniqueUsers.length,
                    period,
                    timeRange
                },
                hourlyStats,
                mostActiveUsers
            }
        });

    } catch (error) {
        console.error('Get location analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch location analytics',
            error: error.message
        });
    }
};

/**
 * Helper function to calculate location analytics
 */
function calculateLocationAnalytics(locations) {
    if (!locations || locations.length === 0) {
        return {
            totalPoints: 0,
            totalDistance: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            timeActive: 0,
            stationaryTime: 0,
            locationClusters: []
        };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let totalTime = 0;
    let stationaryTime = 0;
    const speeds = [];

    // Calculate distance and speed between consecutive points
    for (let i = 1; i < locations.length; i++) {
        const prevLoc = locations[i - 1];
        const currentLoc = locations[i];
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
            prevLoc.latitude, prevLoc.longitude,
            currentLoc.latitude, currentLoc.longitude
        );
        
        totalDistance += distance;
        
        // Calculate time difference in hours
        const timeDiff = (new Date(currentLoc.timestamp) - new Date(prevLoc.timestamp)) / (1000 * 60 * 60);
        totalTime += timeDiff;
        
        // Calculate speed (km/h)
        if (timeDiff > 0) {
            const speed = distance / timeDiff;
            speeds.push(speed);
            maxSpeed = Math.max(maxSpeed, speed);
            
            // Consider stationary if speed < 1 km/h
            if (speed < 1) {
                stationaryTime += timeDiff;
            }
        }
    }

    const averageSpeed = speeds.length > 0 ? 
        speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0;

    return {
        totalPoints: locations.length,
        totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
        averageSpeed: Math.round(averageSpeed * 100) / 100,
        maxSpeed: Math.round(maxSpeed * 100) / 100,
        timeActive: Math.round((totalTime - stationaryTime) * 100) / 100,
        stationaryTime: Math.round(stationaryTime * 100) / 100,
        timeSpan: {
            start: locations[0]?.timestamp,
            end: locations[locations.length - 1]?.timestamp,
            duration: totalTime
        }
    };
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

module.exports = {
    getUsersLocationTracker: exports.getUsersLocationTracker,
    getUserLocationHistory: exports.getUserLocationHistory,
    getRealTimeLocations: exports.getRealTimeLocations,
    getLocationAnalytics: exports.getLocationAnalytics,
    getStateHeadUsersLocationTracker: exports.getStateHeadUsersLocationTracker,
    getStateHeadCurrentLocations: exports.getStateHeadCurrentLocations
};