const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
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
} = require('./gpsTrackingController');

// Real-time location tracking routes
router.post('/update-batch', authMiddleware, updateLocationBatch);

// Location retrieval routes
router.get('/current/:userId', authMiddleware, getCurrentLocation);
router.get('/active', authMiddleware, getAllActiveLocations);
router.get('/history/:userId', authMiddleware, getLocationHistory);
router.get('/stops/:userId', authMiddleware, getStopEvents);

// High-frequency tracking routes
router.get('/high-frequency/:userId', authMiddleware, getHighFrequencyTrack);
router.get('/stream/:userId', authMiddleware, streamLiveLocation);
router.get('/export/:userId', authMiddleware, exportLocationData);

// Analytics and admin routes
router.get('/analytics', authMiddleware, getDashboardAnalytics);
router.get('/queue-stats', authMiddleware, getQueueStatistics);

module.exports = router;