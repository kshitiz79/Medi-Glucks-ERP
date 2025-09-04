const { redisClient } = require('../config/redis');
const { addLocationEvent, addBatchLocationEvents, getQueueStats } = require('./locationQueue');
const { 
    LocationHistory, 
    StopEvent, 
    RealTimeLocation, 
    LocationEvent 
} = require('./LocationModels');
const mongoose = require('mongoose');

// Removed updateLocation function - functionality moved to /api/locations/

// Batch location update
const updateLocationBatch = async (req, res) => {
    try {
        const { locations } = req.body;
        
        if (!locations || !Array.isArray(locations) || locations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing or invalid locations array'
            });
        }

        // Validate each location
        for (const location of locations) {
            if (!location.userId || !location.lat || !location.lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Each location must have userId, lat, lng'
                });
            }
        }

        // Add batch to message queue
        const jobs = await addBatchLocationEvents(locations);

        res.status(200).json({
            success: true,
            message: `${locations.length} locations queued for processing`,
            data: {
                totalLocations: locations.length,
                jobIds: jobs.map(job => job.id)
            }
        });

    } catch (error) {
        // Error updating batch locations
        res.status(500).json({
            success: false,
            message: 'Failed to update batch locations',
            error: error.message
        });
    }
};

// Get current location of a user
const getCurrentLocation = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid userId is required'
            });
        }

        // Try Redis first for real-time data
        let location = await redisClient.getUserLocation(userId);
        
        if (!location) {
            // Fallback to database
            const dbLocation = await RealTimeLocation.findOne({ userId }).populate('userId', 'name email');
            if (dbLocation) {
                location = {
                    lat: dbLocation.location.lat,
                    lng: dbLocation.location.lng,
                    speed: dbLocation.speed,
                    accuracy: dbLocation.accuracy,
                    timestamp: dbLocation.timestamp,
                    lastUpdated: dbLocation.lastUpdated,
                    isOnline: dbLocation.isOnline,
                    batteryLevel: dbLocation.batteryLevel,
                    networkType: dbLocation.networkType,
                    user: dbLocation.userId
                };
            }
        }

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'No location found for this user'
            });
        }

        res.status(200).json({
            success: true,
            data: location
        });

    } catch (error) {
        // Error getting current location
        res.status(500).json({
            success: false,
            message: 'Failed to get current location',
            error: error.message
        });
    }
};

// Get all active users' locations
const getAllActiveLocations = async (req, res) => {
    try {
        const { includeOffline = false } = req.query;
        
        // Get from Redis first
        let activeUsers = await redisClient.getAllActiveUsers();
        
        // If Redis is empty, fallback to database
        if (activeUsers.length === 0) {
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - 30); // Active in last 30 minutes
            
            const dbLocations = await RealTimeLocation.find({
                lastUpdated: { $gte: cutoffTime },
                ...(includeOffline === 'true' ? {} : { isOnline: true })
            }).populate('userId', 'name email designation');
            
            activeUsers = dbLocations.map(loc => ({
                userId: loc.userId._id,
                lat: loc.location.lat,
                lng: loc.location.lng,
                speed: loc.speed,
                accuracy: loc.accuracy,
                timestamp: loc.timestamp,
                lastUpdated: loc.lastUpdated,
                isOnline: loc.isOnline,
                batteryLevel: loc.batteryLevel,
                networkType: loc.networkType,
                user: {
                    name: loc.userId.name,
                    email: loc.userId.email,
                    designation: loc.userId.designation
                }
            }));
        }

        res.status(200).json({
            success: true,
            data: {
                totalUsers: activeUsers.length,
                users: activeUsers
            }
        });

    } catch (error) {
        // Error getting all active locations
        res.status(500).json({
            success: false,
            message: 'Failed to get active locations',
            error: error.message
        });
    }
};

// Get location history
const getLocationHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            startDate, 
            endDate, 
            page = 1, 
            limit = 10,
            includeStops = true 
        } = req.query;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid userId is required'
            });
        }

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }

        const filter = { userId };
        if (Object.keys(dateFilter).length > 0) {
            filter.startTime = dateFilter;
        }

        // Get location history with pagination
        const skip = (page - 1) * limit;
        const [locationHistory, totalCount] = await Promise.all([
            LocationHistory.find(filter)
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'name email'),
            LocationHistory.countDocuments(filter)
        ]);

        // Get stop events if requested
        let stopEvents = [];
        if (includeStops === 'true') {
            const stopFilter = { userId };
            if (Object.keys(dateFilter).length > 0) {
                stopFilter.startTime = dateFilter;
            }
            
            stopEvents = await StopEvent.find(stopFilter)
                .sort({ startTime: -1 })
                .populate('userId', 'name email');
        }

        res.status(200).json({
            success: true,
            data: {
                locationHistory,
                stopEvents,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalRecords: totalCount,
                    hasNext: skip + locationHistory.length < totalCount,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        // Error getting location history
        res.status(500).json({
            success: false,
            message: 'Failed to get location history',
            error: error.message
        });
    }
};

// Get stop events
const getStopEvents = async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            startDate, 
            endDate, 
            page = 1, 
            limit = 20,
            isActive 
        } = req.query;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid userId is required'
            });
        }

        // Build filter
        const filter = { userId };
        
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
            filter.startTime = dateFilter;
        }
        
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Get stop events with pagination
        const skip = (page - 1) * limit;
        const [stopEvents, totalCount] = await Promise.all([
            StopEvent.find(filter)
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'name email'),
            StopEvent.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: {
                stopEvents,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalRecords: totalCount,
                    hasNext: skip + stopEvents.length < totalCount,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        // Error getting stop events
        res.status(500).json({
            success: false,
            message: 'Failed to get stop events',
            error: error.message
        });
    }
};

// Get queue statistics
const getQueueStatistics = async (req, res) => {
    try {
        const stats = await getQueueStats();
        
        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        // Error getting queue statistics
        res.status(500).json({
            success: false,
            message: 'Failed to get queue statistics',
            error: error.message
        });
    }
};

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;
        
        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        
        const matchFilter = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            matchFilter.userId = new mongoose.Types.ObjectId(userId);
        }
        if (Object.keys(dateFilter).length > 0) {
            matchFilter.startTime = dateFilter;
        }

        // Get analytics data
        const [locationStats, stopStats, activeUsers] = await Promise.all([
            LocationHistory.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: userId ? null : '$userId',
                        totalDistance: { $sum: '$distance' },
                        totalDuration: { $sum: '$duration' },
                        totalTrips: { $sum: 1 },
                        avgSpeed: { $avg: '$metadata.averageSpeed' },
                        maxSpeed: { $max: '$metadata.maxSpeed' }
                    }
                }
            ]),
            StopEvent.aggregate([
                { $match: { ...matchFilter, isActive: false } },
                {
                    $group: {
                        _id: userId ? null : '$userId',
                        totalStops: { $sum: 1 },
                        totalStopTime: { $sum: '$duration' },
                        avgStopDuration: { $avg: '$duration' }
                    }
                }
            ]),
            redisClient.getAllActiveUsers()
        ]);

        const analytics = {
            locationStats: locationStats[0] || {
                totalDistance: 0,
                totalDuration: 0,
                totalTrips: 0,
                avgSpeed: 0,
                maxSpeed: 0
            },
            stopStats: stopStats[0] || {
                totalStops: 0,
                totalStopTime: 0,
                avgStopDuration: 0
            },
            activeUsers: activeUsers.length,
            realTimeData: {
                timestamp: new Date(),
                onlineUsers: activeUsers.filter(user => user.isOnline !== false).length
            }
        };

        res.status(200).json({
            success: true,
            data: analytics
        });

    } catch (error) {
        // Error getting dashboard analytics
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard analytics',
            error: error.message
        });
    }
};
const getHighFrequencyTrack = async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            startTime,
            endTime,
            includeRaw = 'false',
            format = 'full'
        } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid userId is required'
            });
        }

        // Build query
        const query = { userId };
        if (startTime || endTime) {
            query.sessionStart = {};
            if (startTime) query.sessionStart.$gte = new Date(startTime);
            if (endTime) query.sessionStart.$lte = new Date(endTime);
        }

        // Get tracks
        const tracks = await HighFrequencyTrack.find(query)
            .sort({ sessionStart: -1 })
            .limit(10)
            .lean();

        // Process tracks based on format
        const processedTracks = tracks.map(track => {
            if (format === 'compressed') {
                return {
                    sessionStart: track.sessionStart,
                    sessionEnd: track.sessionEnd,
                    compressedPath: track.compressedPath || compressPath(track.points),
                    waypoints: track.waypoints,
                    metadata: track.metadata
                };
            }

            return {
                ...track,
                points: includeRaw === 'true' ? track.points : track.points.map(p => ({
                    lat: p.lat,
                    lng: p.lng,
                    timestamp: p.timestamp,
                    speed: p.speed
                }))
            };
        });

        res.status(200).json({
            success: true,
            data: {
                tracks: processedTracks,
                totalTracks: tracks.length
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get high-frequency track',
            error: error.message
        });
    }
};

// Get real-time streaming data for live tracking
const streamLiveLocation = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // Subscribe to Redis updates
        const subscription = await redisClient.subscribeToUserLocation(userId, (locationData) => {
            res.write(`data: ${JSON.stringify({
                type: 'location_update',
                data: locationData,
                timestamp: new Date()
            })}\n\n`);
        });

        // Send initial data
        const currentLocation = await redisClient.getUserLocation(userId);
        if (currentLocation) {
            res.write(`data: ${JSON.stringify({
                type: 'initial_location',
                data: currentLocation,
                timestamp: new Date()
            })}\n\n`);
        }

        // Keep connection alive
        const keepAlive = setInterval(() => {
            res.write(`data: ${JSON.stringify({
                type: 'ping',
                timestamp: new Date()
            })}\n\n`);
        }, 30000);

        // Clean up on client disconnect
        req.on('close', () => {
            clearInterval(keepAlive);
            subscription.unsubscribe();
            res.end();
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stream live location',
            error: error.message
        });
    }
};

// Export location data for analysis
const exportLocationData = async (req, res) => {
    try {
        const { userId } = req.params;
        const { format = 'gpx', startDate, endDate } = req.query;

        // Get location data
        const tracks = await HighFrequencyTrack.find({
            userId,
            sessionStart: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).lean();

        if (format === 'gpx') {
            const gpx = generateGPX(tracks);
            res.setHeader('Content-Type', 'application/gpx+xml');
            res.setHeader('Content-Disposition', `attachment; filename="track-${userId}-${Date.now()}.gpx"`);
            res.send(gpx);
        } else if (format === 'json') {
            res.json({
                success: true,
                data: tracks
            });
        } else if (format === 'csv') {
            const csv = generateCSV(tracks);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="track-${userId}-${Date.now()}.csv"`);
            res.send(csv);
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to export location data',
            error: error.message
        });
    }
};

// Helper functions for export
function generateGPX(tracks) {
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="GPS Tracker">\n';
    
    tracks.forEach((track, index) => {
        gpx += `  <trk>\n`;
        gpx += `    <name>Track ${index + 1}</name>\n`;
        gpx += `    <trkseg>\n`;
        
        track.points.forEach(point => {
            gpx += `      <trkpt lat="${point.lat}" lon="${point.lng}">\n`;
            gpx += `        <time>${new Date(point.timestamp).toISOString()}</time>\n`;
            if (point.altitude) gpx += `        <ele>${point.altitude}</ele>\n`;
            if (point.speed) gpx += `        <speed>${point.speed}</speed>\n`;
            gpx += `      </trkpt>\n`;
        });
        
        gpx += `    </trkseg>\n`;
        gpx += `  </trk>\n`;
    });
    
    gpx += '</gpx>';
    return gpx;
}


function generateCSV(tracks) {
    let csv = 'Track,Timestamp,Latitude,Longitude,Speed,Accuracy,Altitude,Heading\n';
    
    tracks.forEach((track, trackIndex) => {
        track.points.forEach(point => {
            csv += `${trackIndex + 1},${point.timestamp},${point.lat},${point.lng},`;
            csv += `${point.speed || ''},${point.accuracy || ''},${point.altitude || ''},${point.heading || ''}\n`;
        });
    });
    
    return csv;
}

module.exports = {
    updateLocationBatch,
    getCurrentLocation,
    getAllActiveLocations,
    getLocationHistory,
    getStopEvents,
    getQueueStatistics,
    getDashboardAnalytics,
 getHighFrequencyTrack,
    streamLiveLocation,
    exportLocationData
};