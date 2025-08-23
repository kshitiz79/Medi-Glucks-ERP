// routes/leaveTypeRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllLeaveTypes,
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  toggleLeaveTypeStatus
} = require('./controller');
const auth = require('../middleware/authMiddleware');

// Get all leave types
router.get('/', auth, getAllLeaveTypes);

// Get leave type by ID
router.get('/:id', auth, getLeaveTypeById);

// Create new leave type (Admin only)
router.post('/', auth, createLeaveType);

// Update leave type (Admin only)
router.put('/:id', auth, updateLeaveType);

// Toggle leave type status (Admin only)
router.patch('/:id/toggle-status', auth, toggleLeaveTypeStatus);

// Delete leave type (Super Admin only)
router.delete('/:id', auth, deleteLeaveType);

module.exports = router;