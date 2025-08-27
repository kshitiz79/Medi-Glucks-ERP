// Backend/src/payroll/payrollController.js
const Attendance = require('../attendance/Attendance');
const User = require('../user/User');
const Shift = require('../shift/Shift');
const mongoose = require('mongoose');

// Payroll Settings Schema
const PayrollSettings = require('./PayrollSettings');

// Get payroll settings
const getPayrollSettings = async (req, res) => {
    try {
        const { shiftId } = req.params;
        console.log('Getting payroll settings for shiftId:', shiftId);
        
        // Convert shiftId to ObjectId if it's not null/undefined
        let shiftObjectId = null;
        if (shiftId && shiftId !== 'null' && shiftId !== 'undefined') {
            try {
                shiftObjectId = mongoose.Types.ObjectId.createFromHexString(shiftId);
            } catch (err) {
                console.error('Invalid shiftId format:', shiftId);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shift ID format'
                });
            }
        }
            
        const settings = await PayrollSettings.getSettings(shiftObjectId);
        console.log('Retrieved settings:', settings._id);

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get payroll settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payroll settings',
            error: error.message
        });
    }
};

// Update payroll settings
const updatePayrollSettings = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const settingsData = req.body;

        console.log('Updating payroll settings for shiftId:', shiftId);
        console.log('Settings data:', settingsData);

        // Convert shiftId to ObjectId if it's not null/undefined
        let shiftObjectId = null;
        if (shiftId && shiftId !== 'null' && shiftId !== 'undefined') {
            try {
                shiftObjectId = mongoose.Types.ObjectId.createFromHexString(shiftId);
            } catch (err) {
                console.error('Invalid shiftId format:', shiftId);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shift ID format'
                });
            }
        }

        let settings = await PayrollSettings.findOne({ shiftId: shiftObjectId });

        if (!settings) {
            console.log('Creating new payroll settings');
            settings = new PayrollSettings({ 
                shiftId: shiftObjectId,
                ...settingsData
            });
        } else {
            console.log('Updating existing payroll settings');
            // Update all provided fields
            Object.keys(settingsData).forEach(key => {
                if (settingsData[key] !== undefined) {
                    settings[key] = settingsData[key];
                }
            });
        }

        settings.updatedBy = req.user?.id;
        const savedSettings = await settings.save();
        
        console.log('Payroll settings saved successfully:', savedSettings._id);
        console.log('Saved settings values:', {
            fullDayHours: savedSettings.fullDayHours,
            halfDayHours: savedSettings.halfDayHours,
            shiftId: savedSettings.shiftId
        });

        res.status(200).json({
            success: true,
            message: 'Payroll settings updated successfully',
            data: savedSettings
        });
    } catch (error) {
        console.error('Update payroll settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payroll settings',
            error: error.message
        });
    }
};

// Get attendance report
const getAttendanceReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get all attendance records in date range
        const attendanceRecords = await Attendance.find({
            date: {
                $gte: start,
                $lte: end
            }
        }).populate('userId', 'name employeeCode email department role salary');

        // Get all active users to include those with no attendance
        const allUsers = await User.find({ isActive: true });

        // Create comprehensive report
        const reportData = [];

        // Generate date range
        const dateRange = [];
        const currentDate = new Date(start);
        while (currentDate <= end) {
            dateRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // For each user and each date, create a record
        for (const user of allUsers) {
            for (const date of dateRange) {
                const attendance = attendanceRecords.find(record =>
                    record.userId._id.toString() === user._id.toString() &&
                    record.date.toDateString() === date.toDateString()
                );

                let status = 'absent';
                let totalWorkingMinutes = 0;
                let totalBreakMinutes = 0;
                let punchSessions = [];

                if (attendance) {
                    totalWorkingMinutes = attendance.totalWorkingMinutes || 0;
                    totalBreakMinutes = attendance.totalBreakMinutes || 0;
                    punchSessions = attendance.punchSessions || [];

                    // Determine status based on working hours
                    const workingHours = totalWorkingMinutes / 60;
                    if (attendance.status === 'punched_in') {
                        status = 'punched_in';
                    } else if (workingHours >= 8) {
                        status = 'present';
                    } else if (workingHours >= 4) {
                        status = 'half_day';
                    } else if (workingHours > 0) {
                        status = 'present';
                    } else {
                        status = 'absent';
                    }
                }

                reportData.push({
                    date: date,
                    employee: {
                        id: user._id,
                        name: user.name,
                        employeeCode: user.employeeCode,
                        email: user.email,
                        department: user.department || 'Unassigned',
                        role: user.role,
                        salary: user.salary || 0
                    },
                    status: status,
                    totalWorkingMinutes: totalWorkingMinutes,
                    totalBreakMinutes: totalBreakMinutes,
                    punchSessions: punchSessions
                });
            }
        }

        res.status(200).json({
            success: true,
            data: reportData
        });
    } catch (error) {
        console.error('Get attendance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance report',
            error: error.message
        });
    }
};

// Calculate salary based on attendance and settings
const calculateDailySalary = (baseSalary, workingHours, attendanceStatus, settings) => {
    const dailySalary = baseSalary / settings.workingDaysPerMonth;
    let earnings = dailySalary;
    let deductions = 0;

    switch (attendanceStatus) {
        case 'present':
        case 'punched_in':
            // Full day - no deduction
            if (workingHours > settings.fullDayHours) {
                // Overtime calculation
                const overtimeHours = workingHours - settings.fullDayHours;
                const hourlyRate = dailySalary / settings.fullDayHours;
                earnings += overtimeHours * hourlyRate * settings.overtimeRate;
            }
            break;

        case 'half_day':
            // Half day deduction
            deductions = dailySalary * (settings.halfDayDeduction / 100);
            break;

        case 'absent':
            // Absent deduction
            deductions = dailySalary * (settings.absentDeduction / 100);
            break;

        case 'on_leave':
            // Leave deduction (usually 0%)
            deductions = dailySalary * (settings.leaveDeduction / 100);
            break;
    }

    const netSalary = Math.max(0, earnings - deductions);

    return {
        baseSalary: dailySalary,
        earnings: earnings,
        deductions: deductions,
        netSalary: netSalary
    };
};

// Get payroll report
const getPayrollReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Get payroll settings
        const settings = await PayrollSettings.findOne() || {
            fullDayHours: 11,
            halfDayHours: 4,
            halfDayDeduction: 50,
            absentDeduction: 100,
            overtimeRate: 1.5,
            leaveDeduction: 0,
            workingDaysPerMonth: 26
        };

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get attendance records
        const attendanceRecords = await Attendance.find({
            date: {
                $gte: start,
                $lte: end
            }
        }).populate('userId', 'name employeeCode email department role salary');

        // Get all active users
        const allUsers = await User.find({ isActive: true });

        // Generate payroll data
        const payrollData = [];

        // Generate date range
        const dateRange = [];
        const currentDate = new Date(start);
        while (currentDate <= end) {
            dateRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // For each user and each date, calculate salary
        for (const user of allUsers) {
            for (const date of dateRange) {
                const attendance = attendanceRecords.find(record =>
                    record.userId._id.toString() === user._id.toString() &&
                    record.date.toDateString() === date.toDateString()
                );

                let attendanceStatus = 'absent';
                let workingHours = 0;

                if (attendance) {
                    workingHours = (attendance.totalWorkingMinutes || 0) / 60;

                    if (attendance.status === 'punched_in') {
                        attendanceStatus = 'punched_in';
                    } else if (workingHours >= settings.fullDayHours) {
                        attendanceStatus = 'present';
                    } else if (workingHours >= settings.halfDayHours) {
                        attendanceStatus = 'half_day';
                    } else if (workingHours > 0) {
                        attendanceStatus = 'present';
                    }
                }

                // Calculate salary
                const salaryCalculation = calculateDailySalary(
                    user.salary || 0,
                    workingHours,
                    attendanceStatus,
                    settings
                );

                payrollData.push({
                    id: `${user._id}_${date.toISOString().split('T')[0]}`,
                    date: date,
                    employee: {
                        id: user._id,
                        name: user.name,
                        employeeCode: user.employeeCode,
                        email: user.email,
                        department: user.department || 'Unassigned',
                        role: user.role
                    },
                    baseSalary: Math.round(salaryCalculation.baseSalary * 100) / 100,
                    workingHours: Math.round(workingHours * 100) / 100,
                    attendanceStatus: attendanceStatus,
                    earnings: Math.round(salaryCalculation.earnings * 100) / 100,
                    deductions: Math.round(salaryCalculation.deductions * 100) / 100,
                    netSalary: Math.round(salaryCalculation.netSalary * 100) / 100,
                    notes: ''
                });
            }
        }

        res.status(200).json({
            success: true,
            data: payrollData
        });
    } catch (error) {
        console.error('Get payroll report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payroll report',
            error: error.message
        });
    }
};

// Update payroll record (manual editing)
const updatePayrollRecord = async (req, res) => {
    try {
        const { recordId, earnings, deductions, netSalary, notes } = req.body;

        // For now, we'll store manual adjustments in a separate collection
        // In a real application, you might want to create a PayrollAdjustments model

        // Here we'll just return success as the frontend handles the temporary changes
        // In production, you'd want to store these adjustments in the database

        res.status(200).json({
            success: true,
            message: 'Payroll record updated successfully',
            data: {
                recordId,
                earnings,
                deductions,
                netSalary,
                notes,
                updatedBy: req.user?.id,
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Update payroll record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payroll record',
            error: error.message
        });
    }
};

module.exports = {
    getPayrollSettings,
    updatePayrollSettings,
    getAttendanceReport,
    getPayrollReport,
    updatePayrollRecord
};