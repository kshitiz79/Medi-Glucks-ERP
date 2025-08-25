// Backend/src/attendance/attendanceController.js
const Attendance = require('./Attendance');
const User = require('../user/User');
const Shift = require('../shift/Shift');
const mongoose = require('mongoose');

// Punch In
const punchIn = async(req, res) => {
    try {
        const { userId, location, shiftId } = req.body;

        // Use userId from request body or token
        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if already punched in today
        let attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today
        });

        if (attendance && attendance.punchIn && !attendance.punchOut) {
            return res.status(400).json({
                success: false,
                message: 'Already punched in today. Please punch out first.'
            });
        }

        // If punched out, don't allow punch in again for the same day
        if (attendance && attendance.punchOut) {
            return res.status(400).json({
                success: false,
                message: 'Already completed attendance for today'
            });
        }

        // Create new attendance record
        if (!attendance) {
            attendance = new Attendance({
                userId: attendanceUserId,
                date: today,
                shiftId: shiftId || null
            });
        }

        attendance.punchIn = new Date();
        attendance.punchOut = null; // Ensure punchOut is null
        attendance.status = 'present';

        if (location) {
            attendance.punchInLocation = {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address
            };
        }

        // Check if late (if shift is provided)
        if (shiftId) {
            const shift = await Shift.findById(shiftId);
            if (shift) {
                const expectedPunchInTime = new Date(today);
                expectedPunchInTime.setHours(
                    shift.startTime.getHours(),
                    shift.startTime.getMinutes(),
                    0, 0
                );
                attendance.expectedPunchIn = expectedPunchInTime;
            }
        }

        await attendance.save();

        // Get io instance and emit update
        const io = req.app.get('io');
        if (io) {
            io.to(`user-${attendanceUserId}`).emit('attendance-update', {
                type: 'punch-in',
                data: attendance.getSummary()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Punched in successfully',
            data: attendance.getSummary()
        });

    } catch (error) {
        console.error('Punch in error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to punch in',
            error: error.message
        });
    }
};

// Punch Out
const punchOut = async(req, res) => {
    try {
        const { userId, location } = req.body;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today,
            punchIn: { $exists: true },
            punchOut: { $exists: false }
        });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'No active punch-in found for today. Please punch in first.'
            });
        }

        attendance.punchOut = new Date();

        if (location) {
            attendance.punchOutLocation = {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address
            };
        }

        await attendance.save();

        // Get io instance and emit update
        const io = req.app.get('io');
        if (io) {
            io.to(`user-${attendanceUserId}`).emit('attendance-update', {
                type: 'punch-out',
                data: attendance.getSummary()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Punched out successfully',
            data: attendance.getSummary()
        });

    } catch (error) {
        console.error('Punch out error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to punch out',
            error: error.message
        });
    }
};

// Toggle Punch (Smart Punch In/Out)
const togglePunch = async(req, res) => {
    try {
        const { userId, location, shiftId } = req.body;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's attendance record
        let attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today
        });

        // Determine action based on current state
        if (!attendance || !attendance.punchIn) {
            // No punch in yet - PUNCH IN
            if (!attendance) {
                attendance = new Attendance({
                    userId: attendanceUserId,
                    date: today,
                    shiftId: shiftId || null
                });
            }

            attendance.punchIn = new Date();
            attendance.punchOut = null;
            attendance.status = 'present';

            if (location) {
                attendance.punchInLocation = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address
                };
            }

            await attendance.save();

            // Get io instance and emit update
            const io = req.app.get('io');
            if (io) {
                io.to(`user-${attendanceUserId}`).emit('attendance-update', {
                    type: 'punch-in',
                    data: attendance.getSummary()
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Punched in successfully',
                action: 'punch-in',
                data: attendance.getSummary()
            });

        } else if (attendance.punchIn && !attendance.punchOut) {
            // Already punched in - PUNCH OUT
            attendance.punchOut = new Date();

            if (location) {
                attendance.punchOutLocation = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address
                };
            }

            await attendance.save();

            // Get io instance and emit update
            const io = req.app.get('io');
            if (io) {
                io.to(`user-${attendanceUserId}`).emit('attendance-update', {
                    type: 'punch-out',
                    data: attendance.getSummary()
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Punched out successfully',
                action: 'punch-out',
                data: attendance.getSummary()
            });

        } else {
            // Already completed for the day
            return res.status(400).json({
                success: false,
                message: 'Attendance already completed for today'
            });
        }

    } catch (error) {
        console.error('Toggle punch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle punch',
            error: error.message
        });
    }
};

// Start Break
const startBreak = async(req, res) => {
    try {
        const { userId, reason } = req.body;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today,
            punchIn: { $exists: true },
            punchOut: { $exists: false }
        });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'No active attendance found for today'
            });
        }

        // Check if already on break
        const activeBreak = attendance.breaks.find(b => b.breakStart && !b.breakEnd);
        if (activeBreak) {
            return res.status(400).json({
                success: false,
                message: 'Already on break'
            });
        }

        attendance.breaks.push({
            breakStart: new Date(),
            reason: reason || 'Break'
        });

        await attendance.save();

        res.status(200).json({
            success: true,
            message: 'Break started successfully',
            data: attendance.getSummary()
        });

    } catch (error) {
        console.error('Start break error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start break',
            error: error.message
        });
    }
};

// End Break
const endBreak = async(req, res) => {
    try {
        const { userId } = req.body;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today,
            punchIn: { $exists: true },
            punchOut: { $exists: false }
        });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'No active attendance found for today'
            });
        }

        // Find active break
        const activeBreak = attendance.breaks.find(b => b.breakStart && !b.breakEnd);
        if (!activeBreak) {
            return res.status(400).json({
                success: false,
                message: 'No active break found'
            });
        }

        activeBreak.breakEnd = new Date();

        await attendance.save();

        res.status(200).json({
            success: true,
            message: 'Break ended successfully',
            data: attendance.getSummary()
        });

    } catch (error) {
        console.error('End break error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end break',
            error: error.message
        });
    }
};

// Get Today's Attendance
const getTodayAttendance = async(req, res) => {
    try {
        const { userId } = req.params;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today
        }).populate('shiftId', 'name startTime endTime');

        if (!attendance) {
            return res.status(200).json({
                success: true,
                data: {
                    date: today,
                    status: 'not_started',
                    punchIn: null,
                    punchOut: null,
                    workingHours: '0h 0m',
                    totalWorkingMinutes: 0
                }
            });
        }

        res.status(200).json({
            success: true,
            data: attendance.getSummary()
        });

    } catch (error) {
        console.error('Get today attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance',
            error: error.message
        });
    }
};

// Get Weekly Attendance
const getWeeklyAttendance = async(req, res) => {
    try {
        const { userId } = req.params;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
        endOfWeek.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            userId: attendanceUserId,
            date: {
                $gte: startOfWeek,
                $lte: endOfWeek
            }
        }).sort({ date: 1 });

        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyData = weekDays.map((day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);

            const attendance = attendanceRecords.find(record =>
                record.date.toDateString() === dayDate.toDateString()
            );

            return {
                day,
                date: dayDate,
                hours: attendance ? Math.round((attendance.totalWorkingMinutes / 60) * 10) / 10 : 0,
                status: attendance ? attendance.status : 'absent'
            };
        });

        res.status(200).json({
            success: true,
            data: weeklyData
        });

    } catch (error) {
        console.error('Get weekly attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get weekly attendance',
            error: error.message
        });
    }
};

// Get Monthly Attendance
const getMonthlyAttendance = async(req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // Month is 0-indexed

        const attendanceRecords = await Attendance.getMonthlyAttendance(
            attendanceUserId,
            targetYear,
            targetMonth + 1
        );

        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayDate = new Date(targetYear, targetMonth, day);

            const attendance = attendanceRecords.find(record =>
                record.date.getDate() === day
            );

            return {
                day,
                date: dayDate,
                hours: attendance ? Math.round((attendance.totalWorkingMinutes / 60) * 10) / 10 : 0,
                status: attendance ? attendance.status : 'absent'
            };
        });

        res.status(200).json({
            success: true,
            data: monthlyData
        });

    } catch (error) {
        console.error('Get monthly attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monthly attendance',
            error: error.message
        });
    }
};

// Get Attendance Statistics
const getAttendanceStats = async(req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        const attendanceUserId = userId || (req.user && req.user.id);

        if (!attendanceUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const stats = await Attendance.getAttendanceStats(attendanceUserId, start, end);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance statistics',
            error: error.message
        });
    }
};

// Admin: Get All Attendance (Today)
const getAllAttendanceToday = async(req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendanceRecords = await Attendance.find({
                date: today
            }).populate('userId', 'name employeeCode email role department')
            .populate('shiftId', 'name startTime endTime');

        // Get all users to include those who haven't punched in
        const allUsers = await User.find({ isActive: true }, 'name employeeCode email role department');

        const attendanceData = allUsers.map(user => {
            const attendance = attendanceRecords.find(record =>
                record.userId && record.userId._id.toString() === user._id.toString()
            );

            return {
                userId: user._id,
                name: user.name,
                employeeCode: user.employeeCode,
                email: user.email,
                role: user.role,
                department: user.department || 'N/A',
                attendance: attendance ? attendance.getSummary() : {
                    status: 'absent',
                    punchIn: null,
                    punchOut: null,
                    workingHours: '0h 0m',
                    totalWorkingMinutes: 0
                }
            };
        });

        // Calculate summary statistics
        const summary = {
            totalEmployees: allUsers.length,
            presentToday: attendanceRecords.filter(a => a.status === 'present').length,
            absentToday: allUsers.length - attendanceRecords.length,
            onBreak: attendanceRecords.filter(a => a.breaks.some(b => b.breakStart && !b.breakEnd)).length,
            totalHoursToday: attendanceRecords.reduce((sum, a) => sum + (a.totalWorkingMinutes / 60), 0)
        };

        res.status(200).json({
            success: true,
            data: {
                summary,
                employees: attendanceData
            }
        });

    } catch (error) {
        console.error('Get all attendance today error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance data',
            error: error.message
        });
    }
};

module.exports = {
    punchIn,
    punchOut,
    togglePunch,
    startBreak,
    endBreak,
    getTodayAttendance,
    getWeeklyAttendance,
    getMonthlyAttendance,
    getAttendanceStats,
    getAllAttendanceToday
};