const express = require('express');
const router = express.Router();
const { getUserDashboard } = require('./userDashboardController');
const auth = require('../middleware/authMiddleware');

/**
 * @route   GET /api/dashboard/user
 * @desc    Get comprehensive user dashboard data
 * @access  Private (Authenticated users only)
 */
router.get('/user', auth, getUserDashboard);

/**
 * @route   GET /api/dashboard/test
 * @desc    Test endpoint to verify dashboard API is working
 * @access  Private (Authenticated users only)
 */
router.get('/test', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard API is working',
    user: {
      id: req.user.id,
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;