// controllers/leaveController.js
const Leave = require('./Leave');
const LeaveType = require('../leaveType/LeaveType');
const User = require('../user/User');
const Holiday = require('../holiday/Holiday');

/**
 * Apply for leave
 * POST /api/leaves
 */
exports.applyLeave = async (req, res) => {
  try {
    const {
      leaveTypeId,
      startDate,
      endDate,
      reason,
      isHalfDay,
      halfDayType,
      emergencyContact,
      handoverNotes
    } = req.body;

    // Validate leave type
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive leave type'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    // Calculate requested days
    const requestedDays = isHalfDay ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Check leave balance
    const balance = await Leave.getLeaveBalance(req.user.id, leaveTypeId);
    
    if (balance.balance < requestedDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${balance.balance} days, Requested: ${requestedDays} days`
      });
    }

    // Get user's reporting hierarchy for approval flow
    const user = await User.findById(req.user.id).populate('manager');
    const approvalFlow = await buildApprovalFlow(user);
    
    console.log('User:', user.name, 'Approval flow:', approvalFlow);

    const leaveData = {
      employeeId: req.user.id,
      leaveTypeId,
      startDate: start,
      endDate: end,
      totalDays: requestedDays,
      reason,
      isHalfDay: isHalfDay || false,
      halfDayType: isHalfDay ? halfDayType : null,
      emergencyContact,
      handoverNotes,
      approvalFlow,
      createdBy: req.user.id
    };

    console.log('Creating leave with data:', leaveData);

    const leave = new Leave(leaveData);
    await leave.save();

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employeeId', 'name email employeeCode')
      .populate('leaveTypeId', 'name code color')
      .populate('approvalFlow.approverId', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: populatedLeave
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get user's leave applications
 * GET /api/leaves/my-leaves
 */
exports.getMyLeaves = async (req, res) => {
  try {
    const { 
      status, 
      year = new Date().getFullYear(),
      page = 1,
      limit = 10
    } = req.query;

    let query = { employeeId: req.user.id };
    
    if (status) {
      query.status = status;
    }

    // Filter by year
    const startOfYear = new Date(parseInt(year), 0, 1);
    const endOfYear = new Date(parseInt(year), 11, 31);
    query.startDate = { $gte: startOfYear, $lte: endOfYear };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leaves = await Leave.find(query)
      .populate('leaveTypeId', 'name code color')
      .populate('approvalFlow.approverId', 'name email role')
      .sort({ appliedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      data: leaves,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get leave balance for user
 * GET /api/leaves/balance
 */
exports.getLeaveBalance = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const leaveTypes = await LeaveType.find({ isActive: true });
    const balances = await Promise.all(
      leaveTypes.map(async (leaveType) => {
        const balance = await Leave.getLeaveBalance(req.user.id, leaveType._id, parseInt(year));
        return {
          leaveType: {
            id: leaveType._id,
            name: leaveType.name,
            code: leaveType.code,
            color: leaveType.color
          },
          ...balance
        };
      })
    );

    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get pending approvals for user
 * GET /api/leaves/pending-approvals
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const pendingLeaves = await Leave.getPendingApprovals(req.user.id);

    res.json({
      success: true,
      data: pendingLeaves
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Approve/Reject leave
 * PUT /api/leaves/:id/approve
 */
exports.approveRejectLeave = async (req, res) => {
  try {
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject'
      });
    }

    const leave = await Leave.findById(req.params.id)
      .populate('employeeId', 'name email')
      .populate('leaveTypeId', 'name code');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // Check if user is authorized to approve this leave
    const currentApproval = leave.approvalFlow.find(
      approval => approval.approverId.toString() === req.user.id && 
                 approval.approverLevel === leave.currentApprovalLevel &&
                 approval.status === 'Pending'
    );

    if (!currentApproval) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to approve this leave at this stage'
      });
    }

    // Update approval flow
    currentApproval.status = action === 'approve' ? 'Approved' : 'Rejected';
    currentApproval.actionDate = new Date();
    currentApproval.comments = comments;

    if (action === 'reject') {
      leave.status = 'Rejected';
      leave.rejectionReason = comments;
    } else {
      // Check if this is the final approval
      const nextApproval = leave.approvalFlow.find(
        approval => approval.approverLevel > leave.currentApprovalLevel
      );

      if (nextApproval) {
        leave.currentApprovalLevel += 1;
      } else {
        leave.status = 'Approved';
        leave.finalApprovalDate = new Date();
      }
    }

    leave.updatedBy = req.user.id;
    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('employeeId', 'name email employeeCode')
      .populate('leaveTypeId', 'name code color')
      .populate('approvalFlow.approverId', 'name email role');

    res.json({
      success: true,
      message: `Leave ${action}d successfully`,
      data: updatedLeave
    });
  } catch (error) {
    console.error('Approve/Reject leave error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Cancel leave application
 * PUT /api/leaves/:id/cancel
 */
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // Only employee can cancel their own leave
    if (leave.employeeId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave applications'
      });
    }

    // Can only cancel pending or approved leaves
    if (!['Pending', 'Approved'].includes(leave.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel leave in current status'
      });
    }

    leave.status = 'Cancelled';
    leave.updatedBy = req.user.id;
    await leave.save();

    res.json({
      success: true,
      message: 'Leave cancelled successfully',
      data: leave
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Get all leave applications (Admin)
 * GET /api/leaves/all
 */
exports.getAllLeaves = async (req, res) => {
  try {
    // Only Admin and Super Admin can view all leaves
    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      status,
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;
    if (leaveTypeId) query.leaveTypeId = leaveTypeId;

    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email employeeCode role')
      .populate('leaveTypeId', 'name code color')
      .populate('approvalFlow.approverId', 'name email role')
      .sort({ appliedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      data: leaves,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Helper function to build approval flow
async function buildApprovalFlow(user) {
  try {
    const approvalFlow = [];
    let level = 1;

    // Add immediate manager
    if (user.manager && user.manager.length > 0) {
      approvalFlow.push({
        approverId: user.manager[0]._id,
        approverLevel: level++,
        approverRole: user.manager[0].role
      });
    }

    // Add higher level approvals based on role hierarchy
    const roleHierarchy = [
      'User',
      'Manager',
      'Area Manager', 
      'Zonal Manager',
      'State Head',
      'National Head',
      'Admin'
    ];

    const currentRoleIndex = roleHierarchy.indexOf(user.role);
    
    // Add next level approver if exists
    if (currentRoleIndex >= 0 && currentRoleIndex < roleHierarchy.length - 1) {
      const nextRole = roleHierarchy[currentRoleIndex + 1];
      const nextApprover = await User.findOne({ role: nextRole, isActive: true });
      
      if (nextApprover && !approvalFlow.find(a => a.approverId.toString() === nextApprover._id.toString())) {
        approvalFlow.push({
          approverId: nextApprover._id,
          approverLevel: level++,
          approverRole: nextApprover.role
        });
      }
    }

    // If no approval flow, add a default admin approver
    if (approvalFlow.length === 0) {
      const adminUser = await User.findOne({ role: 'Admin', isActive: true });
      if (adminUser) {
        approvalFlow.push({
          approverId: adminUser._id,
          approverLevel: 1,
          approverRole: 'Admin'
        });
      }
    }

    return approvalFlow;
  } catch (error) {
    console.error('Error building approval flow:', error);
    // Return a default approval flow with admin
    const adminUser = await User.findOne({ role: 'Admin', isActive: true });
    return adminUser ? [{
      approverId: adminUser._id,
      approverLevel: 1,
      approverRole: 'Admin'
    }] : [];
  }
}