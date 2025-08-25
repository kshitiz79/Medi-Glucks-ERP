// models/Holiday.js
const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Holiday date is required']
  },
  type: {
    type: String,
    enum: ['National', 'Regional', 'Religious', 'Company', 'Optional'],
    required: [true, 'Holiday type is required']
  },
  description: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: ['Yearly', 'Monthly', 'Weekly'],
    default: null
  },
  applicableStates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    default: []
  }],
  applicableRoles: [{
    type: String,
    enum: [
      'Super Admin',
      'Admin',
      'Opps Team', 
      'National Head',
      'State Head',
      'Zonal Manager',
      'Area Manager',
      'Manager',
      'User'
    ]
  }],
  isOptional: {
    type: Boolean,
    default: false
  },
  maxOptionalTakers: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#EF4444'
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

// Compound index for efficient date range queries
holidaySchema.index({ date: 1, isActive: 1 });
holidaySchema.index({ type: 1, isActive: 1 });

// Static method to get holidays for a date range
holidaySchema.statics.getHolidaysInRange = function(startDate, endDate, userState = null, userRole = null) {
  const query = {
    date: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  };

  // Add state filter if provided
  if (userState) {
    query.$or = [
      { applicableStates: { $exists: false } }, // No states field
      { applicableStates: { $size: 0 } }, // No specific states (applies to all)
      { applicableStates: userState }
    ];
  }

  // Add role filter if provided
  if (userRole) {
    const orConditions = query.$or || [];
    orConditions.push(
      { applicableRoles: { $exists: false } }, // No roles field
      { applicableRoles: { $size: 0 } }, // No specific roles (applies to all)
      { applicableRoles: userRole }
    );
    query.$or = orConditions;
  }

  return this.find(query).sort({ date: 1 });
};

// Method to check if a date is a holiday
holidaySchema.statics.isHoliday = async function(date, userState = null, userRole = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holidays = await this.getHolidaysInRange(startOfDay, endOfDay, userState, userRole);
  return holidays.length > 0;
};

module.exports = mongoose.model('Holiday', holidaySchema);