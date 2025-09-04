const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  userName: { 
    type: String,
    required: true
  },
  latitude: { 
    type: Number, 
    required: true,
    min: -90,
    max: 90,
    validate: {
      validator: function(value) {
        // Add basic validation for reasonable coordinates
        return value !== null && value !== undefined && !isNaN(value);
      },
      message: 'Invalid latitude coordinate'
    }
  },
  longitude: { 
    type: Number, 
    required: true,
    min: -180,
    max: 180,
    validate: {
      validator: function(value) {
        // Add basic validation for reasonable coordinates
        return value !== null && value !== undefined && !isNaN(value);
      },
      message: 'Invalid longitude coordinate'
    }
  },
  deviceId: {
    type: String,
    required: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now
  },
  // Optional enhanced fields
  accuracy: {
    type: Number,
    default: null,
    validate: {
      validator: function(value) {
        // Only accept locations with reasonable accuracy (less than 100 meters)
        return value === null || value === undefined || (value >= 0 && value <= 100);
      },
      message: 'Location accuracy must be between 0 and 100 meters'
    }
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
  },
  // Add country/region validation
  country: {
    type: String,
    default: null
  },
  // Add flag for suspicious locations
  isSuspicious: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
locationSchema.index({ userId: 1, timestamp: -1 });
locationSchema.index({ timestamp: -1 });
locationSchema.index({ userId: 1, createdAt: -1 });
locationSchema.index({ latitude: 1, longitude: 1 }); // For geospatial queries
locationSchema.index({ isSuspicious: 1 }); // For filtering suspicious locations

// Pre-save middleware to validate location
locationSchema.pre('save', function(next) {
  // Check for common invalid coordinates that might indicate GPS errors
  const lat = this.latitude;
  const lon = this.longitude;
  
  // Check for null island (0, 0) or other suspicious coordinates
  if ((lat === 0 && lon === 0) || 
      (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001)) {
    this.isSuspicious = true;
  }
  
  // Add India geofencing (approximate bounds)
  // India bounds: lat 8.4 to 37.6, lon 68.7 to 97.25
  const isInIndia = lat >= 8.0 && lat <= 38.0 && lon >= 68.0 && lon <= 98.0;
  
  if (!isInIndia) {
    this.isSuspicious = true;
    this.country = 'Unknown';
  } else {
    this.country = 'India';
  }
  
  next();
});

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
    },
    // Filter out suspicious locations by default
    isSuspicious: { $ne: true }
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
  // First try to find by userId, excluding suspicious locations
  return this.findOne({ 
    userId: userId,
    isSuspicious: { $ne: true }
  })
    .sort({ timestamp: -1 })
    .populate('userId', 'name email employeeCode role');
};

// New method to get suspicious locations for admin review
locationSchema.statics.getSuspiciousLocations = function(userId = null) {
  const query = { isSuspicious: true };
  if (userId) {
    query.userId = userId;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('userId', 'name email employeeCode role');
};

module.exports = mongoose.model('Location', locationSchema);
