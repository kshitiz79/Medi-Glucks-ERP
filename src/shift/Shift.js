// Backend/src/shift/Shift.js
const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Shift name is required'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },

    // Time settings
    startTime: {
        type: String, // Format: "HH:MM" (24-hour format)
        required: [true, 'Start time is required'],
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Start time must be in HH:MM format'
        }
    },
    endTime: {
        type: String, // Format: "HH:MM" (24-hour format)
        required: [true, 'End time is required'],
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'End time must be in HH:MM format'
        }
    },

    // Work days
    workDays: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    }],

    // Break settings
    breakDuration: {
        type: Number, // Duration in minutes
        default: 60,
        min: [0, 'Break duration cannot be negative'],
        max: [180, 'Break duration cannot exceed 3 hours']
    },

    // Grace period for late punch-in (in minutes)
    gracePeriod: {
        type: Number,
        default: 15,
        min: [0, 'Grace period cannot be negative'],
        max: [60, 'Grace period cannot exceed 1 hour']
    },

    // Minimum hours required for full day
    minimumHours: {
        type: Number,
        default: 8,
        min: [1, 'Minimum hours must be at least 1 hour'],
        max: [24, 'Minimum hours cannot exceed 24 hours']
    },

    // Half day threshold
    halfDayThreshold: {
        type: Number,
        default: 4,
        min: [1, 'Half day threshold must be at least 1 hour'],
        max: [12, 'Half day threshold cannot exceed 12 hours']
    },

    // Overtime calculation
    overtimeEnabled: {
        type: Boolean,
        default: true
    },
    overtimeThreshold: {
        type: Number,
        default: 8, // Hours after which overtime starts
        min: [1, 'Overtime threshold must be at least 1 hour']
    },

    // Location-based punch restrictions
    locationRestricted: {
        type: Boolean,
        default: false
    },
    allowedLocations: [{
        name: {
            type: String,
            required: true
        },
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        radius: {
            type: Number, // Radius in meters
            default: 100
        }
    }],

    // Shift status
    isActive: {
        type: Boolean,
        default: true
    },

    // Assigned users
    assignedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Auto-assign settings
    autoAssignNewUsers: {
        type: Boolean,
        default: false
    },
    autoAssignDepartments: [{
        type: String,
        trim: true
    }],
    autoAssignRoles: [{
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

    // Audit fields
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

// Indexes for better performance
shiftSchema.index({ name: 1 });
shiftSchema.index({ isActive: 1 });
shiftSchema.index({ assignedUsers: 1 });
shiftSchema.index({ workDays: 1 });

// Virtual to calculate shift duration
shiftSchema.virtual('duration').get(function() {
    const [startHour, startMinute] = this.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.endTime.split(':').map(Number);

    let startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;

    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
    }

    return endMinutes - startMinutes; // Duration in minutes
});

// Virtual to format duration as hours
shiftSchema.virtual('durationHours').get(function() {
    const totalMinutes = this.duration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
});

// Instance method to check if shift is active on a given day
shiftSchema.methods.isActiveOnDay = function(dayName) {
    return this.workDays.includes(dayName);
};

// Instance method to get today's shift times for a specific date
shiftSchema.methods.getShiftTimesForDate = function(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const [startHour, startMinute] = this.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.endTime.split(':').map(Number);

    const startTime = new Date(year, month, day, startHour, startMinute);
    let endTime = new Date(year, month, day, endHour, endMinute);

    // Handle overnight shifts
    if (endTime <= startTime) {
        endTime = new Date(year, month, day + 1, endHour, endMinute);
    }

    return { startTime, endTime };
};

// Instance method to check if user can punch in from location
shiftSchema.methods.canPunchFromLocation = function(latitude, longitude) {
    if (!this.locationRestricted || this.allowedLocations.length === 0) {
        return true;
    }

    // Check if user is within any allowed location radius
    return this.allowedLocations.some(location => {
        const distance = this.calculateDistance(
            latitude, longitude,
            location.latitude, location.longitude
        );
        return distance <= location.radius;
    });
};

// Helper method to calculate distance between two points
shiftSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// Static method to get shift for user on specific day
shiftSchema.statics.getShiftForUser = async function(userId, date) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    return await this.findOne({
        assignedUsers: userId,
        workDays: dayName,
        isActive: true
    });
};

// Static method to auto-assign users to shifts
shiftSchema.statics.autoAssignUser = async function(user) {
    const shifts = await this.find({
        autoAssignNewUsers: true,
        isActive: true,
        $or: [
            { autoAssignDepartments: user.department },
            { autoAssignRoles: user.role }
        ]
    });

    for (const shift of shifts) {
        if (!shift.assignedUsers.includes(user._id)) {
            shift.assignedUsers.push(user._id);
            await shift.save();
        }
    }

    return shifts;
};

// Pre-save validation
shiftSchema.pre('save', function(next) {
    // Validate that end time is after start time (for same-day shifts)
    const [startHour, startMinute] = this.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Allow overnight shifts but validate they don't exceed 24 hours
    if (endMinutes <= startMinutes) {
        const duration = (24 * 60) - startMinutes + endMinutes;
        if (duration > 24 * 60) {
            return next(new Error('Shift duration cannot exceed 24 hours'));
        }
    }

    // Validate work days array is not empty
    if (!this.workDays || this.workDays.length === 0) {
        return next(new Error('At least one work day must be selected'));
    }

    // Validate half day threshold is less than minimum hours
    if (this.halfDayThreshold >= this.minimumHours) {
        return next(new Error('Half day threshold must be less than minimum hours'));
    }

    next();
});

// Method to get shift summary
shiftSchema.methods.getSummary = function() {
    return {
        id: this._id,
        name: this.name,
        description: this.description,
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.durationHours,
        workDays: this.workDays,
        assignedUsersCount: this.assignedUsers.length,
        isActive: this.isActive
    };
};

module.exports = mongoose.model('Shift', shiftSchema);