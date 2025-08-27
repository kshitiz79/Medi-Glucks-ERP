// Backend/src/payroll/PayrollSettings.js
const mongoose = require('mongoose');

const payrollSettingsSchema = new mongoose.Schema({
    // Working hours configuration
    fullDayHours: {
        type: Number,
        required: true,
        default: 11,
        min: 1,
        max: 24
    },
    halfDayHours: {
        type: Number,
        required: true,
        default: 4,
        min: 1,
        max: 12
    },
    workingDaysPerMonth: {
        type: Number,
        required: true,
        default: 26,
        min: 20,
        max: 31
    },

    // Deduction percentages
    fullDayDeduction: {
        type: Number,
        required: true,
        default: 0, // No deduction for full day
        min: 0,
        max: 100
    },
    halfDayDeduction: {
        type: Number,
        required: true,
        default: 50, // 50% deduction for half day
        min: 0,
        max: 100
    },
    absentDeduction: {
        type: Number,
        required: true,
        default: 100, // 100% deduction for absent
        min: 0,
        max: 100
    },
    leaveDeduction: {
        type: Number,
        required: true,
        default: 0, // No deduction for approved leaves
        min: 0,
        max: 100
    },

    // Overtime configuration
    overtimeRate: {
        type: Number,
        required: true,
        default: 1.5, // 1.5x regular rate for overtime
        min: 1,
        max: 3
    },

    // Salary components configuration
    hra: {
        type: Number,
        default: 40, // HRA percentage
        min: 0,
        max: 100
    },
    da: {
        type: Number,
        default: 12, // DA percentage
        min: 0,
        max: 100
    },
    pf: {
        type: Number,
        default: 12, // PF percentage
        min: 0,
        max: 20
    },
    esi: {
        type: Number,
        default: 0.75, // ESI percentage
        min: 0,
        max: 5
    },
    lateComingDeduction: {
        type: Number,
        default: 10, // Per hour deduction
        min: 0,
        max: 100
    },

    // Enable/Disable toggles for payroll components
    enableOvertime: {
        type: Boolean,
        default: true
    },
    enableHRA: {
        type: Boolean,
        default: true
    },
    enableDA: {
        type: Boolean,
        default: true
    },
    enablePF: {
        type: Boolean,
        default: true
    },
    enableESI: {
        type: Boolean,
        default: true
    },
    enableHalfDayDeduction: {
        type: Boolean,
        default: true
    },
    enableAbsentDeduction: {
        type: Boolean,
        default: true
    },
    enableLeaveDeduction: {
        type: Boolean,
        default: false
    },
    enableLateComingDeduction: {
        type: Boolean,
        default: true
    },

    // Shift-specific settings
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        default: null // null means global settings
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

// Create compound index for shiftId (allowing multiple settings per shift)
payrollSettingsSchema.index({ shiftId: 1 }, { unique: true, sparse: true });

// Instance method to calculate daily salary
payrollSettingsSchema.methods.calculateDailySalary = function (monthlySalary, workingHours, attendanceStatus) {
    const dailySalary = monthlySalary / this.workingDaysPerMonth;
    let earnings = dailySalary;
    let deductions = 0;

    switch (attendanceStatus) {
        case 'present':
        case 'punched_in':
            // Full day - check for overtime
            if (workingHours > this.fullDayHours) {
                const overtimeHours = workingHours - this.fullDayHours;
                const hourlyRate = dailySalary / this.fullDayHours;
                earnings += overtimeHours * hourlyRate * this.overtimeRate;
            }
            deductions = dailySalary * (this.fullDayDeduction / 100);
            break;

        case 'half_day':
            deductions = dailySalary * (this.halfDayDeduction / 100);
            break;

        case 'absent':
            deductions = dailySalary * (this.absentDeduction / 100);
            break;

        case 'on_leave':
            deductions = dailySalary * (this.leaveDeduction / 100);
            break;
    }

    const netSalary = Math.max(0, earnings - deductions);

    return {
        baseSalary: Math.round(dailySalary * 100) / 100,
        earnings: Math.round(earnings * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100
    };
};

// Static method to get or create default settings
payrollSettingsSchema.statics.getSettings = async function (shiftId = null) {
    try {
        console.log('PayrollSettings.getSettings called with shiftId:', shiftId);

        let settings = await this.findOne({ shiftId: shiftId });
        console.log('Found existing settings:', !!settings);
        console.log('Query used:', { shiftId: shiftId });

        if (settings) {
            console.log('Existing settings found with values:', {
                fullDayHours: settings.fullDayHours,
                halfDayHours: settings.halfDayHours,
                shiftId: settings.shiftId
            });
        }

        if (!settings) {
            console.log('Creating new default settings');
            settings = new this({
                fullDayHours: 11,
                halfDayHours: 4,
                workingDaysPerMonth: 26,
                fullDayDeduction: 0,
                halfDayDeduction: 50,
                absentDeduction: 100,
                leaveDeduction: 0,
                overtimeRate: 1.5,
                hra: 40,
                da: 12,
                pf: 12,
                esi: 0.75,
                lateComingDeduction: 10,
                enableOvertime: true,
                enableHRA: true,
                enableDA: true,
                enablePF: true,
                enableESI: true,
                enableHalfDayDeduction: true,
                enableAbsentDeduction: true,
                enableLeaveDeduction: false,
                enableLateComingDeduction: true,
                shiftId: shiftId
            });
            await settings.save();
            console.log('New settings created with ID:', settings._id);
        }

        return settings;
    } catch (error) {
        console.error('Error in PayrollSettings.getSettings:', error);
        throw error;
    }
};

module.exports = mongoose.model('PayrollSettings', payrollSettingsSchema);