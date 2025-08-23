// routes/holidayRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getHolidaysForCalendar,
  checkHoliday
} = require('./controller');
const auth = require('../middleware/authMiddleware');

// Get holidays for calendar view
router.get('/calendar', auth, getHolidaysForCalendar);

// Check if date is holiday
router.get('/check/:date', auth, checkHoliday);

// Get all holidays
router.get('/', auth, getAllHolidays);

// Get holiday by ID
router.get('/:id', auth, getHolidayById);

// Create new holiday (Admin only)
router.post('/', auth, createHoliday);

// Update holiday (Admin only)
router.put('/:id', auth, updateHoliday);

// Delete holiday (Super Admin only)
router.delete('/:id', auth, deleteHoliday);

module.exports = router;