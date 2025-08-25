// Backend/src/shift/shiftRoutes.js
const express = require('express');
const router = express.Router();
const {
    createShift,
    getAllShifts,
    getShiftById,
    updateShift,
    deleteShift,
    assignUsersToShift,
    removeUsersFromShift,
    getUserShift,
    getShiftStats
} = require('./shiftController');

// Import authentication middleware
const auth = require('../middleware/authMiddleware');

// Shift CRUD operations
router.post('/', auth, createShift); // Create new shift
router.get('/', auth, getAllShifts); // Get all shifts
router.get('/stats', auth, getShiftStats); // Get shift statistics
router.get('/:id', auth, getShiftById); // Get shift by ID
router.put('/:id', auth, updateShift); // Update shift
router.delete('/:id', auth, deleteShift); // Delete (deactivate) shift

// User assignment operations
router.post('/:id/assign-users', auth, assignUsersToShift); // Assign users to shift
router.post('/:id/remove-users', auth, removeUsersFromShift); // Remove users from shift
router.get('/user/:userId?', auth, getUserShift); // Get user's assigned shift

module.exports = router;