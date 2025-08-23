// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getLeaveBalance,
  getPendingApprovals,
  approveRejectLeave,
  cancelLeave,
  getAllLeaves
} = require('./controller');
const auth = require('../middleware/authMiddleware');

// Get all leaves (Admin only)
router.get('/all', auth, getAllLeaves);

// Get user's leave balance
router.get('/balance', auth, getLeaveBalance);

// Get user's leave applications
router.get('/my-leaves', auth, getMyLeaves);

// Get pending approvals for user
router.get('/pending-approvals', auth, getPendingApprovals);

// Apply for leave
router.post('/', auth, applyLeave);

// Approve/Reject leave
router.put('/:id/approve', auth, approveRejectLeave);

// Cancel leave application
router.put('/:id/cancel', auth, cancelLeave);

module.exports = router;