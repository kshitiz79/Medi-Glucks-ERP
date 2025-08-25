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

    // Punch times
    punchIn: {
        type: Date,
        required: false
    },
    punchOut: {
        type: Date,
        required: false
    },

    // Break times
    breaks: [{
        breakStart: {
            type: Date,
            required: true
        },
        breakEnd: {
            type: Date,
            required: false
        },
        reason: {
            type: String,
            default: 'Break'
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
        enum: ['present', 'absent', 'half_day', 'late', 'on_leave'],
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

    // Location data (optional)
    punchInLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },
    punchOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
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

// Pre-save middleware to calculate working hours
attendanceSchema.pre('save', function(next) {
    if (this.punchIn && this.punchOut) {
        // Calculate total working time
        let totalMinutes = (this.punchOut - this.punchIn) / (1000 * 60);

        // Subtract break time
        if (this.breaks && this.breaks.length > 0) {
            this.totalBreakMinutes = this.breaks.reduce((total, breakItem) => {
                if (breakItem.breakStart && breakItem.breakEnd) {
                    return total + ((breakItem.breakEnd - breakItem.breakStart) / (1000 * 60));
                }
                return total;
            }, 0);

            totalMinutes -= this.totalBreakMinutes;
        }

        this.totalWorkingMinutes = Math.max(0, totalMinutes);

        // Determine status based on working hours
        if (this.totalWorkingMinutes >= 480) { // 8 hours
            this.status = 'present';
        } else if (this.totalWorkingMinutes >= 240) { // 4 hours
            this.status = 'half_day';
        } else if (this.totalWorkingMinutes > 0) {
            this.status = 'present'; // Partial day
        }

        // Calculate overtime (assuming 8 hour standard work day)
        this.overtimeMinutes = Math.max(0, this.totalWorkingMinutes - 480);

        // Check if late (assuming 9:00 AM standard start time)
        if (this.punchIn && this.expectedPunchIn) {
            const lateBy = (this.punchIn - this.expectedPunchIn) / (1000 * 60);
            if (lateBy > 15) { // More than 15 minutes late
                this.isLate = true;
                this.lateByMinutes = lateBy;
            }
        }
    } else if (this.punchIn && !this.punchOut) {
        // Still working
        this.status = 'present';
    }

    next();
});

// Instance method to format working hours
attendanceSchema.methods.getFormattedWorkingHours = function() {
    const hours = Math.floor(this.totalWorkingMinutes / 60);
    const minutes = this.totalWorkingMinutes % 60;
    return `${hours}h ${minutes}m`;
};

// Instance method to get attendance summary
attendanceSchema.methods.getSummary = function() {
    return {
        date: this.date,
        punchIn: this.punchIn,
        punchOut: this.punchOut,
        workingHours: this.getFormattedWorkingHours(),
        status: this.status,
        isLate: this.isLate,
        lateByMinutes: this.lateByMinutes,
        overtimeMinutes: this.overtimeMinutes,
        totalBreakMinutes: this.totalBreakMinutes
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