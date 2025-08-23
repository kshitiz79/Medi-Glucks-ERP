// models/SalesTarget.js
const mongoose = require('mongoose');

const salesTargetSchema = new mongoose.Schema({
  // User assignment
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  // Target details
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [0, 'Target amount must be positive']
  },
  
  // Target period
  targetMonth: {
    type: Number,
    required: [true, 'Target month is required'],
    min: [1, 'Month must be between 1-12'],
    max: [12, 'Month must be between 1-12']
  },
  
  targetYear: {
    type: Number,
    required: [true, 'Target year is required'],
    min: [2020, 'Year must be valid']
  },
  
  // Completion deadline
  completionDeadline: {
    type: Date,
    required: [true, 'Completion deadline is required']
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Overdue', 'Cancelled'],
    default: 'Active'
  },
  
  // Achievement tracking
  achievedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Achieved amount cannot be negative']
  },
  
  achievementPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Achievement percentage cannot be negative']
  },
  
  // Notes and comments
  notes: {
    type: String,
    trim: true
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index to ensure one target per user per month/year
salesTargetSchema.index({ userId: 1, targetMonth: 1, targetYear: 1 }, { unique: true });

// Pre-save middleware to calculate achievement percentage
salesTargetSchema.pre('save', function(next) {
  if (this.targetAmount > 0) {
    this.achievementPercentage = Math.round((this.achievedAmount / this.targetAmount) * 100);
  }
  
  // Update status based on achievement and deadline
  const now = new Date();
  if (this.achievementPercentage >= 100) {
    this.status = 'Completed';
  } else if (now > this.completionDeadline) {
    this.status = 'Overdue';
  } else {
    this.status = 'Active';
  }
  
  next();
});

// Static method to get targets by user and date range
salesTargetSchema.statics.getTargetsByUserAndPeriod = function(userId, startDate, endDate) {
  return this.find({
    userId: userId,
    $or: [
      {
        $and: [
          { targetYear: { $gte: startDate.getFullYear() } },
          { targetYear: { $lte: endDate.getFullYear() } }
        ]
      }
    ]
  }).populate('userId', 'name email employeeCode role')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
};

// Instance method to update achievement
salesTargetSchema.methods.updateAchievement = function(newAchievedAmount) {
  this.achievedAmount = newAchievedAmount;
  return this.save();
};

module.exports = mongoose.model('SalesTarget', salesTargetSchema);