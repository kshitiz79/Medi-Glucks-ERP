// Backend/src/attendance/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const {
    punchIn,
    punchOut,
    togglePunch,
    startBreak,
    endBreak,
    getTodayAttendance,
    getWeeklyAttendance,
    getMonthlyAttendance,
    getAttendanceStats,
    getAllAttendanceToday
} = require('./attendanceController');

// Middleware for authentication (optional, depends on your auth setup)
// const { authenticate } = require('../middleware/auth');

// Primary attendance routes (recommended)
router.post('/toggle-punch', togglePunch); // Smart punch in/out with multiple sessions

// Legacy routes (for backward compatibility)
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.post('/start-break', startBreak); // Now deprecated - breaks are auto-calculated
router.post('/end-break', endBreak);     // Now deprecated - breaks are auto-calculated

// Get attendance data
router.get('/today/:userId?', getTodayAttendance);
router.get('/weekly/:userId?', getWeeklyAttendance);
router.get('/monthly/:userId?', getMonthlyAttendance);
router.get('/stats/:userId?', getAttendanceStats);

// Admin routes
router.get('/admin/today', getAllAttendanceToday);

module.exports = router;