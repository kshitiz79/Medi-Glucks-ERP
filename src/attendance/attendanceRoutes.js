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

// User attendance routes
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.post('/toggle-punch', togglePunch);
router.post('/start-break', startBreak);
router.post('/end-break', endBreak);

// Get attendance data
router.get('/today/:userId?', getTodayAttendance);
router.get('/weekly/:userId?', getWeeklyAttendance);
router.get('/monthly/:userId?', getMonthlyAttendance);
router.get('/stats/:userId?', getAttendanceStats);

// Admin routes
router.get('/admin/today', getAllAttendanceToday);

module.exports = router;