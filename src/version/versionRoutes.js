// Backend/src/version/versionRoutes.js
const express = require('express');
const router = express.Router();
const {
    checkAppVersion,
    getVersionHistory,
    getLatestVersionCheck,
    updateVersionCheck,
    getAllVersionChecks,
    setAppConfiguration
} = require('./versionController');

// Import authentication middleware (following project pattern)
const auth = require('../middleware/authMiddleware');

// User routes
router.post('/check', auth, checkAppVersion); // Check app version
router.get('/history', auth, getVersionHistory); // Get user's version history
router.get('/latest', auth, getLatestVersionCheck); // Get latest version check
router.put('/:id', auth, updateVersionCheck); // Update version check (skip, mark as prompted, etc.)

// Admin routes
router.get('/admin/all', auth, getAllVersionChecks); // Get all version checks (Admin only)
router.post('/admin/config', auth, setAppConfiguration); // Set app configuration (Admin only)

module.exports = router;