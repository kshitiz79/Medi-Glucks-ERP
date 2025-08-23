// controllers/holidayController.js
const Holiday = require('./Holiday');

/**
 * Get all holidays
 * GET /api/holidays
 */
exports.getAllHolidays = async (req, res) => {
  try {
    const { 
      year, 
      month, 
      type, 
      startDate, 
      endDate, 
      isActive 
    } = req.query;
    
    let query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (type) {
      query.type = type;
    }
    
    // Date filtering
    if (year) {
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year), 11, 31);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    } else if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const holidays = await Holiday.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ date: 1 });
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get holiday by ID
 * GET /api/holidays/:id
 */
exports.getHolidayById = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      data: holiday
    });
  } catch (error) {
    console.error('Get holiday by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Create new holiday
 * POST /api/holidays
 */
exports.createHoliday = async (req, res) => {
  try {
    // Only Admin and Super Admin can create holidays
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can create holidays'
      });
    }
    
    const holidayData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    // Handle empty string for recurringType - convert to null
    if (holidayData.recurringType === '') {
      holidayData.recurringType = null;
    }
    
    // If not recurring, ensure recurringType is null
    if (!holidayData.isRecurring) {
      holidayData.recurringType = null;
    }
    
    const holiday = new Holiday(holidayData);
    await holiday.save();
    
    const populatedHoliday = await Holiday.findById(holiday._id)
      .populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: populatedHoliday
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Update holiday
 * PUT /api/holidays/:id
 */
exports.updateHoliday = async (req, res) => {
  try {
    // Only Admin and Super Admin can update holidays
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can update holidays'
      });
    }
    
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };
    
    // Handle empty string for recurringType - convert to null
    if (updateData.recurringType === '') {
      updateData.recurringType = null;
    }
    
    // If not recurring, ensure recurringType is null
    if (!updateData.isRecurring) {
      updateData.recurringType = null;
    }
    
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Delete holiday
 * DELETE /api/holidays/:id
 */
exports.deleteHoliday = async (req, res) => {
  try {
    // Only Super Admin can delete holidays
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can delete holidays'
      });
    }
    
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get holidays for calendar view
 * GET /api/holidays/calendar
 */
exports.getHolidaysForCalendar = async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(),
      userState,
      userRole 
    } = req.query;
    
    const startOfYear = new Date(parseInt(year), 0, 1);
    const endOfYear = new Date(parseInt(year), 11, 31);
    
    const holidays = await Holiday.getHolidaysInRange(
      startOfYear, 
      endOfYear, 
      userState, 
      userRole
    );
    
    // Format for calendar
    const calendarEvents = holidays.map(holiday => ({
      id: holiday._id,
      title: holiday.name,
      date: holiday.date,
      type: holiday.type,
      description: holiday.description,
      color: holiday.color,
      isOptional: holiday.isOptional,
      isRecurring: holiday.isRecurring
    }));
    
    res.json({
      success: true,
      data: calendarEvents
    });
  } catch (error) {
    console.error('Get holidays for calendar error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Check if date is holiday
 * GET /api/holidays/check/:date
 */
exports.checkHoliday = async (req, res) => {
  try {
    const { date } = req.params;
    const { userState, userRole } = req.query;
    
    const isHoliday = await Holiday.isHoliday(new Date(date), userState, userRole);
    
    res.json({
      success: true,
      data: {
        date,
        isHoliday
      }
    });
  } catch (error) {
    console.error('Check holiday error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};