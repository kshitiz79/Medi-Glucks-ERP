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
    getAllAttendanceToday,
    getAttendanceReport
} = require('./attendanceController');

// Authentication middleware
const auth = require('../middleware/authMiddleware');

// Primary attendance routes (recommended)
router.post('/toggle-punch', auth, togglePunch); // Smart punch in/out with multiple sessions

// Legacy routes (for backward compatibility)
router.post('/punch-in', auth, punchIn);
router.post('/punch-out', auth, punchOut);
router.post('/start-break', auth, startBreak); // Now deprecated - breaks are auto-calculated
router.post('/end-break', auth, endBreak);     // Now deprecated - breaks are auto-calculated

// Get attendance data
router.get('/today/:userId?', auth, getTodayAttendance);
router.get('/weekly/:userId?', auth, getWeeklyAttendance);
router.get('/monthly/:userId?', auth, getMonthlyAttendance);
router.get('/stats/:userId?', auth, getAttendanceStats);

// Admin routes
router.get('/admin/today', auth, getAllAttendanceToday);
router.get('/report', auth, getAttendanceReport); // Detailed attendance report with date range

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Attendance routes are working' });
});

module.exports = router;