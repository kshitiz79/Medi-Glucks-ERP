// Backend/src/payroll/payrollRoutes.js
const express = require('express');
const router = express.Router();
const {
    getPayrollSettings,
    updatePayrollSettings,
    getAttendanceReport,
    getPayrollReport,
    updatePayrollRecord
} = require('./payrollController');

// Import authentication middleware
const auth = require('../middleware/authMiddleware');



// Payroll settings routes
router.get('/settings', auth, getPayrollSettings);
router.get('/settings/:shiftId', auth, getPayrollSettings);
router.post('/settings', auth, updatePayrollSettings);
router.post('/settings/:shiftId', auth, updatePayrollSettings);
router.put('/settings', auth, updatePayrollSettings);
router.put('/settings/:shiftId', auth, updatePayrollSettings);

// Report routes
router.get('/attendance-report', auth, getAttendanceReport);
router.get('/report', auth, getPayrollReport);

// Manual payroll adjustments
router.put('/update', auth, updatePayrollRecord);

module.exports = router;