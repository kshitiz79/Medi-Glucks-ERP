// routes/salesTargetRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllSalesTargets,
  getSalesTargetById,
  createSalesTarget,
  updateSalesTarget,
  deleteSalesTarget,
  getTargetsByUser,
  getMyTargets,
  updateTargetAchievement,
  getDashboardData
} = require('./controller');
const auth = require('../middleware/authMiddleware');

// Dashboard data
router.get('/dashboard', auth, getDashboardData);

// Get current user's targets
router.get('/my-targets', auth, getMyTargets);

// Get all sales targets (with filtering)
router.get('/', auth, getAllSalesTargets);

// Get targets for a specific user
router.get('/user/:userId', auth, getTargetsByUser);

// Get sales target by ID
router.get('/:id', auth, getSalesTargetById);

// Create new sales target (Admin only)
router.post('/', auth, createSalesTarget);

// Update sales target (Admin only)
router.put('/:id', auth, updateSalesTarget);

// Update target achievement
router.patch('/:id/achievement', auth, updateTargetAchievement);

// Delete sales target (Super Admin only)
router.delete('/:id', auth, deleteSalesTarget);

module.exports = router;