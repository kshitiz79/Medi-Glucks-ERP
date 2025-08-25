// models/LeaveType.js
const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Leave type name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Leave type code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  maxDaysPerYear: {
    type: Number,
    required: [true, 'Maximum days per year is required'],
    min: [0, 'Maximum days cannot be negative']
  },
  maxConsecutiveDays: {
    type: Number,
    default: null,
    min: [1, 'Maximum consecutive days must be at least 1']
  },
  carryForward: {
    type: Boolean,
    default: false
  },
  carryForwardLimit: {
    type: Number,
    default: 0,
    min: [0, 'Carry forward limit cannot be negative']
  },
  encashable: {
    type: Boolean,
    default: false
  },
  requiresDocuments: {
    type: Boolean,
    default: false
  },
  documentTypes: [{
    type: String,
    trim: true
  }],
  applicableFor: [{
    type: String,
    enum: ['All', 'Male', 'Female', 'Permanent', 'Contract', 'Probation'],
    default: 'All'
  }],
  minimumServiceMonths: {
    type: Number,
    default: 0,
    min: [0, 'Minimum service months cannot be negative']
  },
  advanceApplication: {
    type: Number,
    default: 0,
    min: [0, 'Advance application days cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
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

// Index for efficient queries
leaveTypeSchema.index({ isActive: 1 });
// Note: code field already has unique: true which creates an index automatically

module.exports = mongoose.model('LeaveType', leaveTypeSchema);