const { locationQueue } = require('./locationQueue');
const { redisClient } = require('../config/redis');
const { 
    LocationHistory, 
    StopEvent, 
    RealTimeLocation, 
    LocationEvent,
    HighFrequencyTrack 
} = require('./LocationModels');

// Advanced Configuration for High-Frequency GPS
const CONFIG = {
    // Distance thresholds
    MIN_DISTANCE_THRESHOLD: 5, // 5 meters - much lower for second-by-second tracking
    SIGNIFICANT_DISTANCE: 20, // 20 meters for major waypoints
    
    // Movement detection
    STOP_SPEED_THRESHOLD: 0.5, // 0.5 km/h (walking speed threshold)
    MOVING_SPEED_THRESHOLD: 2, // 2 km/h
    
    // Time thresholds
    STOP_TIME_THRESHOLD: 30, // 30 seconds for stop detection
    HIGH_FREQUENCY_WINDOW: 60, // Keep last 60 seconds of raw data
    
    // Accuracy filters
    MAX_ACCURACY_THRESHOLD: 30, // 30 meters for better accuracy
    INDOOR_ACCURACY_THRESHOLD: 50, // 50 meters for indoor tracking
    
    // Smoothing parameters
    KALMAN_PROCESS_NOISE: 0.01,
    KALMAN_MEASUREMENT_NOISE: 3,
    
    // Compression
    DOUGLAS_PEUCKER_EPSILON: 0.00001, // For path simplification
    MAX_POINTS_PER_SEGMENT: 300 // Maximum points before creating new segment
};

// Kalman Filter for GPS smoothing
class KalmanFilter {
    constructor() {
        this.x = null; // State estimate
        this.P = null; // Error covariance
        this.Q = CONFIG.KALMAN_PROCESS_NOISE; // Process noise
        this.R = CONFIG.KALMAN_MEASUREMENT_NOISE; // Measurement noise
    }
    
    filter(measurement, accuracy) {
        if (this.x === null) {
            this.x = measurement;
            this.P = accuracy * accuracy;
            return measurement;
        }
        
        // Adjust measurement noise based on GPS accuracy
        const R = Math.max(accuracy * accuracy, this.R);
        
        // Prediction
        const x_pred = this.x;
        const P_pred = this.P + this.Q;
        
        // Update
        const K = P_pred / (P_pred + R);
        this.x = x_pred + K * (measurement - x_pred);
        this.P = (1 - K) * P_pred;
        
        return this.x;
    }
}

// Enhanced location processor with high-frequency support
const processLocationEvent = async (jobData) => {
    const { userId, lat, lng, speed, accuracy, timestamp, batteryLevel, networkType, altitude, heading } = jobData;
    
    try {
        console.log(`Processing high-frequency location for user ${userId}: ${lat}, ${lng}`);
        
        // Initialize Kalman filters for user if not exists
        if (!global.userKalmanFilters) {
            global.userKalmanFilters = {};
        }
        
        if (!global.userKalmanFilters[userId]) {
            global.userKalmanFilters[userId] = {
                lat: new KalmanFilter(),
                lng: new KalmanFilter()
            };
        }
        
        // Apply Kalman filtering for smooth tracking
        const smoothedLat = global.userKalmanFilters[userId].lat.filter(lat, accuracy || 10);
        const smoothedLng = global.userKalmanFilters[userId].lng.filter(lng, accuracy || 10);
        
        // Store raw high-frequency data
        const highFreqData = {
            userId,
            rawLat: lat,
            rawLng: lng,
            smoothedLat,
            smoothedLng,
            speed: speed || 0,
            accuracy: accuracy || null,
            altitude: altitude || null,
            heading: heading || null,
            timestamp: new Date(timestamp),
            batteryLevel,
            networkType
        };
        
        // Store in Redis for real-time access (with 60-second TTL)
        await redisClient.setHighFrequencyLocation(userId, highFreqData, CONFIG.HIGH_FREQUENCY_WINDOW);
        
        // Get last processed location
        let lastProcessed = await redisClient.getLastProcessedLocation(userId);
        if (!lastProcessed) {
            const dbLocation = await RealTimeLocation.findOne({ userId });
            if (dbLocation) {
                lastProcessed = {
                    lat: dbLocation.location.lat,
                    lng: dbLocation.location.lng,
                    timestamp: dbLocation.timestamp
                };
            }
        }
        
        // Calculate distance from last processed point
        let distance = 0;
        let timeDiff = 0;
        
        if (lastProcessed) {
            distance = calculateDistance(smoothedLat, smoothedLng, lastProcessed.lat, lastProcessed.lng);
            timeDiff = (new Date(timestamp) - new Date(lastProcessed.timestamp)) / 1000; // seconds
        }
        
        // Determine if this is a significant update
        const isSignificantMovement = distance >= CONFIG.MIN_DISTANCE_THRESHOLD;
        const isSignificantTime = timeDiff >= 10; // Every 10 seconds minimum
        const isMajorWaypoint = distance >= CONFIG.SIGNIFICANT_DISTANCE;
        
        // Always update real-time location for live tracking
        const realtimeData = {
            location: { lat: smoothedLat, lng: smoothedLng },
            rawLocation: { lat, lng },
            speed: speed || 0,
            accuracy: accuracy || null,
            altitude: altitude || null,
            heading: heading || null,
            timestamp: new Date(timestamp),
            lastUpdated: new Date(),
            isOnline: true,
            batteryLevel,
            networkType,
            movementStatus: getMovementStatus(speed),
            smoothingApplied: Math.abs(lat - smoothedLat) > 0.00001 || Math.abs(lng - smoothedLng) > 0.00001
        };
        
        await RealTimeLocation.findOneAndUpdate(
            { userId },
            realtimeData,
            { upsert: true, new: true }
        );
        
        // Publish real-time update
        await redisClient.publishLocationUpdate(userId, {
            ...highFreqData,
            distance: distance.toFixed(2),
            isMoving: speed > CONFIG.STOP_SPEED_THRESHOLD
        });
        
        // Process for storage if significant
        if (isSignificantMovement || isSignificantTime || !lastProcessed) {
            // Update last processed location
            await redisClient.setLastProcessedLocation(userId, {
                lat: smoothedLat,
                lng: smoothedLng,
                timestamp
            });
            
            // Handle high-frequency track storage
            await updateHighFrequencyTrack(userId, {
                lat: smoothedLat,
                lng: smoothedLng,
                rawLat: lat,
                rawLng: lng,
                timestamp,
                speed,
                accuracy,
                altitude,
                heading,
                distance,
                isMajorWaypoint
            });
            
            // Handle stop/movement detection with improved logic
            await detectMovementPatterns(userId, {
                lat: smoothedLat,
                lng: smoothedLng,
                speed,
                timestamp,
                distance
            });
        }
        
        return {
            status: 'processed',
            smoothed: true,
            distance: distance.toFixed(2),
            stored: isSignificantMovement || isSignificantTime
        };
        
    } catch (error) {
        console.error(`Error processing high-frequency location for user ${userId}:`, error);
        throw error;
    }
};

// Update high-frequency tracks with compression
async function updateHighFrequencyTrack(userId, locationData) {
    const currentTime = new Date(locationData.timestamp);
    const sessionStart = new Date(currentTime);
    sessionStart.setMinutes(sessionStart.getMinutes() - 30); // 30-minute sessions
    
    let track = await HighFrequencyTrack.findOne({
        userId,
        sessionStart: { $gte: sessionStart },
        isActive: true
    });
    
    if (!track || track.points.length >= CONFIG.MAX_POINTS_PER_SEGMENT) {
        // Create new track segment
        track = new HighFrequencyTrack({
            userId,
            sessionStart: currentTime,
            sessionEnd: currentTime,
            points: [],
            waypoints: [],
            isActive: true,
            metadata: {
                totalDistance: 0,
                averageSpeed: 0,
                maxSpeed: 0,
                totalPoints: 0
            }
        });
    }
    
    // Add point to track
    track.points.push({
        lat: locationData.lat,
        lng: locationData.lng,
        rawLat: locationData.rawLat,
        rawLng: locationData.rawLng,
        timestamp: locationData.timestamp,
        speed: locationData.speed,
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        heading: locationData.heading
    });
    
    // Add as waypoint if significant
    if (locationData.isMajorWaypoint) {
        track.waypoints.push({
            lat: locationData.lat,
            lng: locationData.lng,
            timestamp: locationData.timestamp,
            type: 'significant_movement'
        });
    }
    
    // Update metadata
    track.metadata.totalPoints = track.points.length;
    track.metadata.totalDistance += locationData.distance || 0;
    track.metadata.maxSpeed = Math.max(track.metadata.maxSpeed, locationData.speed || 0);
    track.sessionEnd = currentTime;
    
    // Apply compression if too many points
    if (track.points.length > 100) {
        track.compressedPath = compressPath(track.points);
    }
    
    await track.save();
}

// Improved movement pattern detection
async function detectMovementPatterns(userId, locationData) {
    const { lat, lng, speed, timestamp, distance } = locationData;
    
    // Get recent movement history
    const recentHistory = await redisClient.getRecentMovementHistory(userId, 300); // Last 5 minutes
    
    // Calculate movement statistics
    const stats = calculateMovementStats(recentHistory);
    
    // Detect stop events with better logic
    const activeStop = await StopEvent.findOne({ 
        userId, 
        isActive: true, 
        endTime: null 
    });
    
    const isStationary = speed < CONFIG.STOP_SPEED_THRESHOLD && 
                        stats.averageSpeed < CONFIG.STOP_SPEED_THRESHOLD &&
                        stats.totalDistance < 10; // Less than 10 meters in 5 minutes
    
    if (isStationary && !activeStop && stats.duration > CONFIG.STOP_TIME_THRESHOLD) {
        // Start stop event
        const stopEvent = new StopEvent({
            userId,
            location: { lat, lng },
            startTime: new Date(timestamp - (stats.duration * 1000)),
            stopType: detectStopType(lat, lng, timestamp),
            isActive: true,
            metadata: {
                accuracy: locationData.accuracy,
                confidence: calculateStopConfidence(stats),
                detectionMethod: 'high_frequency_analysis'
            }
        });
        await stopEvent.save();
        
    } else if (!isStationary && activeStop) {
        // End stop event if moving consistently
        const movingDuration = timestamp - activeStop.startTime;
        
        if (movingDuration > 10000) { // Moving for more than 10 seconds
            await StopEvent.findByIdAndUpdate(activeStop._id, {
                endTime: new Date(timestamp),
                duration: Math.round(movingDuration / 60000),
                isActive: false
            });
        }
    }
    
    // Store movement statistics
    await redisClient.setMovementStats(userId, stats);
}

// Helper functions
function calculateMovementStats(history) {
    if (!history || history.length < 2) {
        return { averageSpeed: 0, totalDistance: 0, duration: 0 };
    }
    
    let totalDistance = 0;
    let speeds = [];
    
    for (let i = 1; i < history.length; i++) {
        const dist = calculateDistance(
            history[i].lat, history[i].lng,
            history[i-1].lat, history[i-1].lng
        );
        totalDistance += dist;
        speeds.push(history[i].speed || 0);
    }
    
    const duration = (history[history.length - 1].timestamp - history[0].timestamp) / 1000;
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    
    return { averageSpeed, totalDistance, duration };
}

function getMovementStatus(speed) {
    if (speed < CONFIG.STOP_SPEED_THRESHOLD) return 'stationary';
    if (speed < CONFIG.MOVING_SPEED_THRESHOLD) return 'walking';
    if (speed < 15) return 'running';
    if (speed < 50) return 'driving_slow';
    if (speed < 80) return 'driving_normal';
    return 'driving_fast';
}

function detectStopType(lat, lng, timestamp) {
    const hour = new Date(timestamp).getHours();
    
    if (hour >= 12 && hour <= 13) return 'lunch';
    if (hour >= 9 && hour <= 11) return 'meeting';
    if (hour >= 14 && hour <= 17) return 'visit';
    
    return 'other';
}

function calculateStopConfidence(stats) {
    if (stats.totalDistance < 5 && stats.averageSpeed < 0.5) return 0.95;
    if (stats.totalDistance < 10 && stats.averageSpeed < 1) return 0.85;
    if (stats.totalDistance < 20 && stats.averageSpeed < 2) return 0.75;
    return 0.6;
}

// Douglas-Peucker path compression
function compressPath(points, epsilon = CONFIG.DOUGLAS_PEUCKER_EPSILON) {
    if (points.length <= 2) return points;
    
    // Find the point with maximum distance from line
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistance(points[i], start, end);
        if (distance > maxDistance) {
            maxDistance = distance;
            maxIndex = i;
        }
    }
    
    // If max distance is greater than epsilon, recursively simplify
    if (maxDistance > epsilon) {
        const left = compressPath(points.slice(0, maxIndex + 1), epsilon);
        const right = compressPath(points.slice(maxIndex), epsilon);
        
        return left.slice(0, -1).concat(right);
    } else {
        return [start, end];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    const A = point.lng - lineStart.lng;
    const B = lineStart.lat - lineEnd.lat;
    const C = lineStart.lng - lineEnd.lng;
    const D = point.lat - lineStart.lat;
    
    const dot = A * C + B * D;
    const lenSq = C * C + B * B;
    
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
        xx = lineStart.lng;
        yy = lineStart.lat;
    } else if (param > 1) {
        xx = lineEnd.lng;
        yy = lineEnd.lat;
    } else {
        xx = lineStart.lng + param * C;
        yy = lineStart.lat + param * B;
    }
    
    const dx = point.lng - xx;
    const dy = point.lat - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
}

// Export enhanced processor
module.exports = {
    processLocationEvent,
    CONFIG
};