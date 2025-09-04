// models/Leave.js
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee ID is required']
  },
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: [true, 'Leave type is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  totalDays: {
    type: Number,
    required: [true, 'Total days is required'],
    min: [0.5, 'Minimum leave is 0.5 days']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Withdrawn'],
    default: 'Pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  approvalFlow: [{
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approverLevel: {
      type: Number,
      required: true
    },
    approverRole: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    actionDate: {
      type: Date
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [300, 'Comments cannot exceed 300 characters']
    }
  }],
  currentApprovalLevel: {
    type: Number,
    default: 1
  },
  finalApprovalDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [300, 'Rejection reason cannot exceed 300 characters']
  },
  documents: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relation: {
      type: String,
      trim: true
    }
  },
  handoverNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Handover notes cannot exceed 1000 characters']
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayType: {
    type: String,
    enum: ['First Half', 'Second Half'],
    default: null
  },
  compensatoryOffDate: {
    type: Date,
    default: null
  },
  actualReturnDate: {
    type: Date
  },
  extendedDays: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
leaveSchema.index({ employeeId: 1, startDate: -1 });
leaveSchema.index({ status: 1, appliedDate: -1 });
leaveSchema.index({ 'approvalFlow.approverId': 1, 'approvalFlow.status': 1 });

// Validation: End date should be after start date
leaveSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Calculate total days automatically
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (this.isHalfDay) {
      this.totalDays = 0.5;
    } else {
      this.totalDays = daysDiff;
    }
  }
  next();
});

// Static method to get leave balance for a user
leaveSchema.statics.getLeaveBalance = async function (employeeId, leaveTypeId, year = new Date().getFullYear()) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const approvedLeaves = await this.find({
    employeeId,
    leaveTypeId,
    status: 'Approved',
    startDate: { $gte: startOfYear, $lte: endOfYear }
  });

  const totalUsed = approvedLeaves.reduce((sum, leave) => sum + leave.totalDays, 0);

  // Get leave type to calculate balance
  const LeaveType = mongoose.model('LeaveType');
  const leaveType = await LeaveType.findById(leaveTypeId);

  return {
    allocated: leaveType ? leaveType.maxDaysPerYear : 0,
    used: totalUsed,
    balance: leaveType ? leaveType.maxDaysPerYear - totalUsed : 0
  };
};

// Static method to get pending approvals for a user
leaveSchema.statics.getPendingApprovals = function (approverId) {
  return this.find({
    'approvalFlow.approverId': approverId,
    'approvalFlow.status': 'Pending',
    status: 'Pending'
  })
    .populate('employeeId', 'name email employeeCode')
    .populate('leaveTypeId', 'name code color')
    .sort({ appliedDate: 1 });
};

module.exports = mongoose.model('Leave', leaveSchema);