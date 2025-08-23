const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  userName: { 
    type: String,
    required: true
  },
  latitude: { 
    type: Number, 
    required: true,
    min: -90,
    max: 90
  },
  longitude: { 
    type: Number, 
    required: true,
    min: -180,
    max: 180
  },
  deviceId: {
    type: String,
    required: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  // Optional enhanced fields
  accuracy: {
    type: Number,
    default: null
  },
  batteryLevel: {
    type: Number,
    default: null
  },
  networkType: {
    type: String,
    default: 'unknown'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
locationSchema.index({ userId: 1, timestamp: -1 });
locationSchema.index({ timestamp: -1 });
locationSchema.index({ userId: 1, createdAt: -1 });

// Instance method to calculate distance from another location
locationSchema.methods.distanceFrom = function(otherLocation) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (otherLocation.latitude - this.latitude) * Math.PI / 180;
  const dLon = (otherLocation.longitude - this.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.latitude * Math.PI / 180) * Math.cos(otherLocation.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Static method to get user's location history for a specific date
locationSchema.statics.getUserLocationHistory = function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Handle both old and new data formats
  const query = {
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  };
  
  // Support both userId and old format without userId
  if (userId) {
    query.$or = [
      { userId: userId },
      { userId: { $exists: false }, userName: { $exists: true } } // For old data without userId
    ];
  }
  
  return this.find(query).sort({ timestamp: 1 }).populate('userId', 'name email employeeCode role');
};

// Static method to get user's current location
locationSchema.statics.getUserCurrentLocation = function(userId) {
  // First try to find by userId
  return this.findOne({ userId: userId })
    .sort({ timestamp: -1 })
    .populate('userId', 'name email employeeCode role');
};

module.exports = mongoose.model('Location', locationSchema);
