// controllers/salesTargetController.js
const SalesTarget = require('./SalesTarget');
const User = require('../user/User');

/**
 * Get all sales targets with filtering
 * GET /api/sales-targets
 */
exports.getAllSalesTargets = async (req, res) => {
  try {
    const { 
      userId, 
      targetMonth, 
      targetYear, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    let query = {};
    
    // Build query filters
    if (userId) query.userId = userId;
    if (targetMonth) query.targetMonth = parseInt(targetMonth);
    if (targetYear) query.targetYear = parseInt(targetYear);
    if (status) query.status = status;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const targets = await SalesTarget.find(query)
      .populate('userId', 'name email employeeCode role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await SalesTarget.countDocuments(query);
    
    res.json({
      success: true,
      data: targets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get all sales targets error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get sales target by ID
 * GET /api/sales-targets/:id
 */
exports.getSalesTargetById = async (req, res) => {
  try {
    const target = await SalesTarget.findById(req.params.id)
      .populate('userId', 'name email employeeCode role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Sales target not found'
      });
    }
    
    res.json({
      success: true,
      data: target
    });
  } catch (error) {
    console.error('Get sales target by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Create new sales target
 * POST /api/sales-targets
 */
exports.createSalesTarget = async (req, res) => {
  try {
    // Only Admin and Super Admin can create targets
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can assign targets'
      });
    }
    
    const { userId, targetAmount, targetMonth, targetYear, completionDeadline, notes } = req.body;
    
    // Validate required fields
    if (!userId || !targetAmount || !targetMonth || !targetYear || !completionDeadline) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if target already exists for this user and period
    const existingTarget = await SalesTarget.findOne({
      userId,
      targetMonth: parseInt(targetMonth),
      targetYear: parseInt(targetYear)
    });
    
    if (existingTarget) {
      return res.status(400).json({
        success: false,
        message: `Target already exists for ${user.name} for ${targetMonth}/${targetYear}`
      });
    }
    
    // Create new target
    const newTarget = new SalesTarget({
      userId,
      targetAmount: parseFloat(targetAmount),
      targetMonth: parseInt(targetMonth),
      targetYear: parseInt(targetYear),
      completionDeadline: new Date(completionDeadline),
      notes,
      createdBy: req.user.id
    });
    
    const savedTarget = await newTarget.save();
    
    // Populate the response
    const populatedTarget = await SalesTarget.findById(savedTarget._id)
      .populate('userId', 'name email employeeCode role')
      .populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Sales target created successfully',
      data: populatedTarget
    });
  } catch (error) {
    console.error('Create sales target error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Target already exists for this user and period'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Update sales target
 * PUT /api/sales-targets/:id
 */
exports.updateSalesTarget = async (req, res) => {
  try {
    // Only Admin and Super Admin can update targets
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can update targets'
      });
    }
    
    const { targetAmount, completionDeadline, notes, achievedAmount } = req.body;
    
    const updateData = {
      updatedBy: req.user.id
    };
    
    if (targetAmount !== undefined) updateData.targetAmount = parseFloat(targetAmount);
    if (completionDeadline) updateData.completionDeadline = new Date(completionDeadline);
    if (notes !== undefined) updateData.notes = notes;
    if (achievedAmount !== undefined) updateData.achievedAmount = parseFloat(achievedAmount);
    
    const updatedTarget = await SalesTarget.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('userId', 'name email employeeCode role')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
    
    if (!updatedTarget) {
      return res.status(404).json({
        success: false,
        message: 'Sales target not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Sales target updated successfully',
      data: updatedTarget
    });
  } catch (error) {
    console.error('Update sales target error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Delete sales target
 * DELETE /api/sales-targets/:id
 */
exports.deleteSalesTarget = async (req, res) => {
  try {
    // Only Super Admin can delete targets
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can delete targets'
      });
    }
    
    const deletedTarget = await SalesTarget.findByIdAndDelete(req.params.id);
    
    if (!deletedTarget) {
      return res.status(404).json({
        success: false,
        message: 'Sales target not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Sales target deleted successfully'
    });
  } catch (error) {
    console.error('Delete sales target error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get targets for a specific user
 * GET /api/sales-targets/user/:userId
 */
exports.getTargetsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, status } = req.query;
    
    let query = { userId };
    
    if (year) query.targetYear = parseInt(year);
    if (status) query.status = status;
    
    const targets = await SalesTarget.find(query)
      .populate('userId', 'name email employeeCode role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ targetYear: -1, targetMonth: -1 });
    
    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Get targets by user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get current user's targets
 * GET /api/sales-targets/my-targets
 */
exports.getMyTargets = async (req, res) => {
  try {
    const { year, status } = req.query;
    
    let query = { userId: req.user.id };
    
    if (year) query.targetYear = parseInt(year);
    if (status) query.status = status;
    
    const targets = await SalesTarget.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ targetYear: -1, targetMonth: -1 });
    
    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Get my targets error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Update target achievement
 * PATCH /api/sales-targets/:id/achievement
 */
exports.updateTargetAchievement = async (req, res) => {
  try {
    const { achievedAmount } = req.body;
    
    if (achievedAmount === undefined || achievedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid achieved amount is required'
      });
    }
    
    const target = await SalesTarget.findById(req.params.id);
    
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Sales target not found'
      });
    }
    
    // Check if user can update this target (own target or admin)
    if (target.userId.toString() !== req.user.id && 
        !['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedTarget = await target.updateAchievement(parseFloat(achievedAmount));
    
    const populatedTarget = await SalesTarget.findById(updatedTarget._id)
      .populate('userId', 'name email employeeCode role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.json({
      success: true,
      message: 'Target achievement updated successfully',
      data: populatedTarget
    });
  } catch (error) {
    console.error('Update target achievement error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get sales targets dashboard data
 * GET /api/sales-targets/dashboard
 */
exports.getDashboardData = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Get current month targets
    const currentMonthTargets = await SalesTarget.find({
      targetMonth: currentMonth,
      targetYear: currentYear
    }).populate('userId', 'name email employeeCode role');
    
    // Calculate summary statistics
    const totalTargets = currentMonthTargets.length;
    const completedTargets = currentMonthTargets.filter(t => t.status === 'Completed').length;
    const overdueTargets = currentMonthTargets.filter(t => t.status === 'Overdue').length;
    const activeTargets = currentMonthTargets.filter(t => t.status === 'Active').length;
    
    const totalTargetAmount = currentMonthTargets.reduce((sum, t) => sum + t.targetAmount, 0);
    const totalAchievedAmount = currentMonthTargets.reduce((sum, t) => sum + t.achievedAmount, 0);
    const overallAchievementPercentage = totalTargetAmount > 0 ? 
      Math.round((totalAchievedAmount / totalTargetAmount) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalTargets,
          completedTargets,
          overdueTargets,
          activeTargets,
          totalTargetAmount,
          totalAchievedAmount,
          overallAchievementPercentage
        },
        currentMonthTargets
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};