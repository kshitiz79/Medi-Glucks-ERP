// Backend/src/attendance/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        }
    },

    // Multiple punch sessions in a day
    punchSessions: [{
        punchIn: {
            type: Date,
            required: true
        },
        punchOut: {
            type: Date,
            required: false
        },
        punchInLocation: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        punchOutLocation: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        }
    }],

    // Current active session (for quick access)
    currentSession: {
        type: Number,
        default: -1 // -1 means no active session
    },

    // Auto-calculated break periods (time between punch out and next punch in)
    autoBreaks: [{
        breakStart: {
            type: Date,
            required: true
        },
        breakEnd: {
            type: Date,
            required: true
        },
        duration: {
            type: Number, // in minutes
            required: true
        },
        isAutoCalculated: {
            type: Boolean,
            default: true
        }
    }],

    // Working hours calculation
    totalWorkingMinutes: {
        type: Number,
        default: 0
    },
    totalBreakMinutes: {
        type: Number,
        default: 0
    },

    // Attendance status
    status: {
        type: String,
        enum: ['present', 'absent', 'half_day', 'late', 'on_leave', 'punched_in', 'punched_out'],
        default: 'absent'
    },

    // Additional details
    isLate: {
        type: Boolean,
        default: false
    },
    lateByMinutes: {
        type: Number,
        default: 0
    },

    // First punch in time (for late calculation)
    firstPunchIn: {
        type: Date,
        required: false
    },

    // Last punch out time
    lastPunchOut: {
        type: Date,
        required: false
    },

    // Shift information
    expectedPunchIn: {
        type: Date,
        required: false
    },
    expectedPunchOut: {
        type: Date,
        required: false
    },
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        required: false
    },

    // Overtime
    overtimeMinutes: {
        type: Number,
        default: 0
    },

    // Notes and remarks
    notes: {
        type: String,
        trim: true
    },
    adminRemarks: {
        type: String,
        trim: true
    },

    // Approval status (for attendance corrections)
    isApproved: {
        type: Boolean,
        default: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    approvedAt: {
        type: Date,
        required: false
    },

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

// Compound index for efficient queries
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ userId: 1, date: -1 });

// Pre-save middleware to calculate working hours and auto breaks
attendanceSchema.pre('save', function(next) {
    // Calculate total working minutes from all sessions
    let totalWorkingMinutes = 0;
    let totalBreakMinutes = 0;

    if (this.punchSessions && this.punchSessions.length > 0) {
        // Calculate working time from completed sessions
        this.punchSessions.forEach(session => {
            if (session.punchIn && session.punchOut) {
                const sessionMinutes = (session.punchOut - session.punchIn) / (1000 * 60);
                totalWorkingMinutes += sessionMinutes;
            }
        });

        // Calculate auto breaks between sessions
        this.autoBreaks = [];
        for (let i = 0; i < this.punchSessions.length - 1; i++) {
            const currentSession = this.punchSessions[i];
            const nextSession = this.punchSessions[i + 1];
            
            if (currentSession.punchOut && nextSession.punchIn) {
                const breakDuration = (nextSession.punchIn - currentSession.punchOut) / (1000 * 60);
                if (breakDuration > 0) {
                    this.autoBreaks.push({
                        breakStart: currentSession.punchOut,
                        breakEnd: nextSession.punchIn,
                        duration: breakDuration,
                        isAutoCalculated: true
                    });
                    totalBreakMinutes += breakDuration;
                }
            }
        }

        // Set first punch in and last punch out
        this.firstPunchIn = this.punchSessions[0].punchIn;
        const lastSession = this.punchSessions[this.punchSessions.length - 1];
        if (lastSession.punchOut) {
            this.lastPunchOut = lastSession.punchOut;
        }
    }

    this.totalWorkingMinutes = Math.max(0, totalWorkingMinutes);
    this.totalBreakMinutes = totalBreakMinutes;

    // Determine status based on working hours and current state
    if (this.currentSession >= 0) {
        this.status = 'punched_in';
    } else if (this.punchSessions.length > 0 && this.lastPunchOut) {
        if (this.totalWorkingMinutes >= 480) { // 8 hours
            this.status = 'present';
        } else if (this.totalWorkingMinutes >= 240) { // 4 hours
            this.status = 'half_day';
        } else if (this.totalWorkingMinutes > 0) {
            this.status = 'present'; // Partial day
        } else {
            this.status = 'punched_out';
        }
    } else if (this.punchSessions.length > 0) {
        this.status = 'punched_in';
    }

    // Calculate overtime (assuming 8 hour standard work day)
    this.overtimeMinutes = Math.max(0, this.totalWorkingMinutes - 480);

    // Check if late (assuming 9:00 AM standard start time)
    if (this.firstPunchIn && this.expectedPunchIn) {
        const lateBy = (this.firstPunchIn - this.expectedPunchIn) / (1000 * 60);
        if (lateBy > 15) { // More than 15 minutes late
            this.isLate = true;
            this.lateByMinutes = lateBy;
        }
    }

    next();
});

// Instance method to format working hours
attendanceSchema.methods.getFormattedWorkingHours = function() {
    const hours = Math.floor(this.totalWorkingMinutes / 60);
    const minutes = Math.round(this.totalWorkingMinutes % 60);
    return `${hours}h ${minutes}m`;
};

// Instance method to get current punch status
attendanceSchema.methods.getCurrentPunchStatus = function() {
    if (this.currentSession >= 0) {
        return 'punched_in';
    } else if (this.punchSessions.length > 0) {
        return 'punched_out';
    }
    return 'not_started';
};

// Instance method to get attendance summary
attendanceSchema.methods.getSummary = function() {
    const currentStatus = this.getCurrentPunchStatus();
    const activeSession = this.currentSession >= 0 ? this.punchSessions[this.currentSession] : null;
    
    return {
        date: this.date,
        status: currentStatus,
        punchSessions: this.punchSessions,
        currentSession: this.currentSession,
        activeSession: activeSession,
        firstPunchIn: this.firstPunchIn,
        lastPunchOut: this.lastPunchOut,
        workingHours: this.getFormattedWorkingHours(),
        totalWorkingMinutes: this.totalWorkingMinutes,
        totalBreakMinutes: this.totalBreakMinutes,
        autoBreaks: this.autoBreaks,
        isLate: this.isLate,
        lateByMinutes: this.lateByMinutes,
        overtimeMinutes: this.overtimeMinutes,
        // Legacy fields for backward compatibility
        punchIn: this.firstPunchIn,
        punchOut: this.lastPunchOut
    };
};

// Static method to get monthly summary for a user
attendanceSchema.statics.getMonthlyAttendance = async function(userId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return await this.find({
        userId: userId,
        date: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ date: 1 });
};

// Static method to get attendance statistics
attendanceSchema.statics.getAttendanceStats = async function(userId, startDate, endDate) {
    const pipeline = [{
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalDays: { $sum: 1 },
                presentDays: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
                    }
                },
                halfDays: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0]
                    }
                },
                absentDays: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
                    }
                },
                lateDays: {
                    $sum: {
                        $cond: ['$isLate', 1, 0]
                    }
                },
                totalWorkingMinutes: { $sum: '$totalWorkingMinutes' },
                totalOvertimeMinutes: { $sum: '$overtimeMinutes' }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalDays: 0,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalWorkingMinutes: 0,
        totalOvertimeMinutes: 0
    };
};

module.exports = mongoose.model('Attendance', attendanceSchema);