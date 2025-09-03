// Backend/src/version/versionRoutes.js
const express = require('express');
const router = express.Router();
const {
    checkAppVersion,
    getVersionHistory,
    getLatestVersionCheck,
    updateVersionCheck,
    getAllVersionChecks,
    setAppConfiguration,
    sendUpdateNotification,
    getUserVersionStatus
} = require('./versionController');

const {
    sendVersionUpdateNotification,
    getUsersNeedingUpdate,
    notifyOutdatedUsers,
    getVersionNotificationHistory
} = require('./versionNotificationController');

// Import authentication middleware (following project pattern)
const auth = require('../middleware/authMiddleware');

// User routes
router.post('/check', auth, checkAppVersion); // Check app version
router.get('/history', auth, getVersionHistory); // Get user's version history
router.get('/latest', auth, getLatestVersionCheck); // Get latest version check
router.put('/:id', auth, updateVersionCheck); // Update version check (skip, mark as prompted, etc.)

// Admin routes
router.get('/admin/all', auth, getAllVersionChecks); // Get all version checks (Admin only) - Legacy
router.get('/admin/users', auth, getAllVersionChecks); // Get all users with version status (Admin only)
router.get('/admin/user/:userId', auth, getUserVersionStatus); // Get specific user version status
router.post('/admin/config', auth, setAppConfiguration); // Set app configuration (Admin only)

// Notification routes (Enhanced)
router.post('/admin/notify-update', auth, sendUpdateNotification); // Legacy: Send update notification to users
router.post('/admin/notifications/send', auth, sendVersionUpdateNotification); // Enhanced: Send version update notification
router.get('/admin/notifications/users-needing-update', auth, getUsersNeedingUpdate); // Get users who need updates
router.post('/admin/notifications/notify-outdated', auth, notifyOutdatedUsers); // Notify all outdated users
router.get('/admin/notifications/history', auth, getVersionNotificationHistory); // Get notification history

module.exports = router;