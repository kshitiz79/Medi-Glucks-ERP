// controllers/leaveTypeController.js
const LeaveType = require('./LeaveType');

/**
 * Get all leave types
 * GET /api/leave-types
 */
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const leaveTypes = await LeaveType.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: leaveTypes
    });
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get leave type by ID
 * GET /api/leave-types/:id
 */
exports.getLeaveTypeById = async (req, res) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }
    
    res.json({
      success: true,
      data: leaveType
    });
  } catch (error) {
    console.error('Get leave type by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Create new leave type
 * POST /api/leave-types
 */
exports.createLeaveType = async (req, res) => {
  try {
    // Only Admin and Super Admin can create leave types
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can create leave types'
      });
    }
    
    const leaveTypeData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const leaveType = new LeaveType(leaveTypeData);
    await leaveType.save();
    
    const populatedLeaveType = await LeaveType.findById(leaveType._id)
      .populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: populatedLeaveType
    });
  } catch (error) {
    console.error('Create leave type error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Leave type with this ${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Update leave type
 * PUT /api/leave-types/:id
 */
exports.updateLeaveType = async (req, res) => {
  try {
    // Only Admin and Super Admin can update leave types
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can update leave types'
      });
    }
    
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };
    
    const leaveType = await LeaveType.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
    
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Leave type updated successfully',
      data: leaveType
    });
  } catch (error) {
    console.error('Update leave type error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Leave type with this ${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Delete leave type
 * DELETE /api/leave-types/:id
 */
exports.deleteLeaveType = async (req, res) => {
  try {
    // Only Super Admin can delete leave types
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Super Admin can delete leave types'
      });
    }
    
    const leaveType = await LeaveType.findByIdAndDelete(req.params.id);
    
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Leave type deleted successfully'
    });
  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Toggle leave type status
 * PATCH /api/leave-types/:id/toggle-status
 */
exports.toggleLeaveTypeStatus = async (req, res) => {
  try {
    // Only Admin and Super Admin can toggle status
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can toggle leave type status'
      });
    }
    
    const leaveType = await LeaveType.findById(req.params.id);
    
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }
    
    leaveType.isActive = !leaveType.isActive;
    leaveType.updatedBy = req.user.id;
    await leaveType.save();
    
    res.json({
      success: true,
      message: `Leave type ${leaveType.isActive ? 'activated' : 'deactivated'} successfully`,
      data: leaveType
    });
  } catch (error) {
    console.error('Toggle leave type status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};