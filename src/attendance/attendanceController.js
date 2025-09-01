// Backend/src/attendance/attendanceController.js
const Attendance = require('./Attendance');
const User = require('../user/User');
const Shift = require('../shift/Shift');
const mongoose = require('mongoose');

// Enhanced Punch In/Out Toggle with Multiple Sessions Support
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

        // Find or create today's attendance record
        let attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today
        });

        if (!attendance) {
            attendance = new Attendance({
                userId: attendanceUserId,
                date: today,
                shiftId: shiftId || null,
                punchSessions: [],
                currentSession: -1
            });
        }

        let action = '';
        let message = '';

        // Check current status
        if (attendance.currentSession >= 0) {
            // User is currently punched in - PUNCH OUT
            const activeSession = attendance.punchSessions[attendance.currentSession];
            activeSession.punchOut = new Date();
            
            if (location) {
                activeSession.punchOutLocation = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address
                };
            }

            attendance.currentSession = -1; // No active session
            action = 'punch-out';
            message = 'Punched out successfully';

        } else {
            // User is not punched in - PUNCH IN (new session)
            const newSession = {
                punchIn: new Date(),
                punchOut: null
            };

            if (location) {
                newSession.punchInLocation = {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address
                };
            }

            attendance.punchSessions.push(newSession);
            attendance.currentSession = attendance.punchSessions.length - 1;

            // Set shift info for first punch in of the day
            if (attendance.punchSessions.length === 1 && shiftId) {
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

            action = 'punch-in';
            message = `Punched in successfully (Session ${attendance.punchSessions.length})`;
        }

        await attendance.save();

        // Get io instance and emit update
        const io = req.app.get('io');
        if (io) {
            io.to(`user-${attendanceUserId}`).emit('attendance-update', {
                type: action,
                data: attendance.getSummary()
            });
        }

        res.status(200).json({
            success: true,
            message: message,
            action: action,
            data: attendance.getSummary()
        });

    } catch (error) {
        console.error('Toggle punch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle punch',
            error: error.message
        });
    }
};

// Legacy Punch In (for backward compatibility)
const punchIn = async(req, res) => {
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

        let attendance = await Attendance.findOne({
            userId: attendanceUserId,
            date: today
        });

        // Check if already punched in
        if (attendance && attendance.currentSession >= 0) {
            return res.status(400).json({
                success: false,
                message: 'Already punched in. Please punch out first.'
            });
        }

        // Create new attendance record if doesn't exist
        if (!attendance) {
            attendance = new Attendance({
                userId: attendanceUserId,
                date: today,
                shiftId: shiftId || null,
                punchSessions: [],
                currentSession: -1
            });
        }

        // Add new punch in session
        const newSession = {
            punchIn: new Date(),
            punchOut: null
        };

        if (location) {
            newSession.punchInLocation = {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address
            };
        }

        attendance.punchSessions.push(newSession);
        attendance.currentSession = attendance.punchSessions.length - 1;

        // Set shift info for first punch in of the day
        if (attendance.punchSessions.length === 1 && shiftId) {
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
            message: `Punched in successfully (Session ${attendance.punchSessions.length})`,
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

// Legacy Punch Out (for backward compatibility)
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
            date: today
        });

        if (!attendance || attendance.currentSession < 0) {
            return res.status(400).json({
                success: false,
                message: 'No active punch-in found for today. Please punch in first.'
            });
        }

        // Punch out from current active session
        const activeSession = attendance.punchSessions[attendance.currentSession];
        activeSession.punchOut = new Date();

        if (location) {
            activeSession.punchOutLocation = {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address
            };
        }

        attendance.currentSession = -1; // No active session

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
                    punchSessions: [],
                    currentSession: -1,
                    activeSession: null,
                    firstPunchIn: null,
                    lastPunchOut: null,
                    workingHours: '0h 0m',
                    totalWorkingMinutes: 0,
                    totalBreakMinutes: 0,
                    autoBreaks: [],
                    // Legacy fields
                    punchIn: null,
                    punchOut: null
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
        const weeklyData = await Promise.all(weekDays.map(async (day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });

            const attendance = attendanceRecords.find(record =>
                record.date.toDateString() === dayDate.toDateString()
            );

            // Check if user had a shift assigned for this day
            const Shift = require('../shift/Shift');
            const hasShiftAssigned = await Shift.findOne({
                assignedUsers: attendanceUserId,
                workDays: dayName,
                isActive: true
            });

            return {
                day,
                date: dayDate,
                hours: attendance ? Math.round((attendance.totalWorkingMinutes / 60) * 10) / 10 : 0,
                status: attendance ? attendance.status : (hasShiftAssigned ? 'absent' : 'no_shift'),
                hasShiftAssigned: !!hasShiftAssigned
            };
        }));

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
        const monthlyData = Array.from({ length: daysInMonth }, async (_, i) => {
            const day = i + 1;
            const dayDate = new Date(targetYear, targetMonth, day);
            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });

            const attendance = attendanceRecords.find(record =>
                record.date.getDate() === day
            );

            // Check if user had a shift assigned for this day
            const Shift = require('../shift/Shift');
            const hasShiftAssigned = await Shift.findOne({
                assignedUsers: attendanceUserId,
                workDays: dayName,
                isActive: true
            });

            return {
                day,
                date: dayDate,
                hours: attendance ? Math.round((attendance.totalWorkingMinutes / 60) * 10) / 10 : 0,
                status: attendance ? attendance.status : (hasShiftAssigned ? 'absent' : 'no_shift'),
                hasShiftAssigned: !!hasShiftAssigned
            };
        });

        // Wait for all async operations to complete
        const resolvedMonthlyData = await Promise.all(monthlyData);

        res.status(200).json({
            success: true,
            data: resolvedMonthlyData
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

// Admin: Get All Attendance (Today or Date Range)
const getAllAttendanceToday = async(req, res) => {
    try {
        const { startDate, endDate, department, status } = req.query;
        
        // If date range is provided, use it; otherwise use today
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            start = end = today;
        }

        // Build query filters
        let attendanceQuery = {
            date: { $gte: start, $lte: end }
        };

        const attendanceRecords = await Attendance.find(attendanceQuery)
            .populate({
                path: 'userId',
                select: 'name employeeCode email role department',
                populate: {
                    path: 'department',
                    select: 'name code'
                }
            })
            .populate('shiftId', 'name startTime endTime')
            .sort({ date: -1, 'userId.name': 1 });

        // Get all active users for the date range to include absent days
        let userQuery = { isActive: true };
        if (department) {
            userQuery.department = department;
        }

        const allUsers = await User.find(userQuery, 'name employeeCode email role department')
            .populate('department', 'name code');

        // If date range is provided, create comprehensive report
        if (startDate && endDate) {
            const reportData = [];
            const currentDate = new Date(start);
            const Shift = require('../shift/Shift');

            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
                
                // Get all shifts for this day to optimize queries
                const shiftsForDay = await Shift.find({
                    workDays: dayName,
                    isActive: true
                }).populate('assignedUsers', '_id');

                for (const user of allUsers) {
                    const attendance = attendanceRecords.find(record => 
                        record.userId && 
                        record.userId._id.toString() === user._id.toString() &&
                        record.date.toISOString().split('T')[0] === dateStr
                    );

                    // Check if user had shift assigned for this day
                    const hasShiftAssigned = shiftsForDay.some(shift => 
                        shift.assignedUsers.some(assignedUser => 
                            assignedUser._id.toString() === user._id.toString()
                        )
                    );

                    const recordStatus = attendance ? attendance.status : (hasShiftAssigned ? 'absent' : 'no_shift');
                    
                    // Apply status filter if provided
                    if (status && recordStatus !== status) {
                        continue;
                    }

                    const attendanceData = attendance ? attendance.getSummary() : {
                        status: recordStatus,
                        punchSessions: [],
                        currentSession: -1,
                        firstPunchIn: null,
                        lastPunchOut: null,
                        workingHours: '0h 0m',
                        totalWorkingMinutes: 0,
                        totalBreakMinutes: 0,
                        autoBreaks: [],
                        hasShiftAssigned: !!hasShiftAssigned
                    };

                    reportData.push({
                        date: dateStr,
                        user: {
                            _id: user._id,
                            name: user.name,
                            employeeCode: user.employeeCode,
                            email: user.email,
                            role: user.role,
                            department: user.department?.name || 'Unassigned'
                        },
                        attendance: attendanceData,
                        shift: attendance?.shiftId || null,
                        hasShiftAssigned: !!hasShiftAssigned
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Calculate summary statistics for date range
            const summary = {
                totalRecords: reportData.length,
                presentDays: reportData.filter(r => r.attendance.status === 'present' || r.attendance.status === 'punched_in').length,
                absentDays: reportData.filter(r => r.attendance.status === 'absent').length,
                halfDays: reportData.filter(r => r.attendance.status === 'half_day').length,
                noShiftDays: reportData.filter(r => r.attendance.status === 'no_shift').length,
                totalWorkingHours: Math.round(reportData.reduce((sum, r) => sum + (r.attendance.totalWorkingMinutes / 60), 0) * 100) / 100,
                averageWorkingHours: reportData.length > 0 ? 
                    Math.round((reportData.reduce((sum, r) => sum + (r.attendance.totalWorkingMinutes / 60), 0) / reportData.length) * 100) / 100 : 0
            };

            return res.status(200).json({
                success: true,
                data: reportData,
                summary,
                dateRange: { startDate, endDate },
                filters: { department, status }
            });
        }

        // Original today-only logic
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
                department: user.department?.name || 'N/A',
                attendance: attendance ? attendance.getSummary() : {
                    status: 'absent',
                    punchSessions: [],
                    currentSession: -1,
                    firstPunchIn: null,
                    lastPunchOut: null,
                    workingHours: '0h 0m',
                    totalWorkingMinutes: 0,
                    totalBreakMinutes: 0,
                    autoBreaks: []
                }
            };
        });

        // Calculate summary statistics
        const summary = {
            totalEmployees: allUsers.length,
            presentToday: attendanceRecords.filter(a => a.status === 'present' || a.status === 'punched_in').length,
            absentToday: allUsers.length - attendanceRecords.length,
            currentlyPunchedIn: attendanceRecords.filter(a => a.currentSession >= 0).length,
            totalHoursToday: Math.round(attendanceRecords.reduce((sum, a) => sum + (a.totalWorkingMinutes / 60), 0) * 100) / 100
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

// Admin: Get Attendance Report (Date Range)
const getAttendanceReport = async(req, res) => {
    try {
        const { startDate, endDate, userId, department, status } = req.query;

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

        // Build query filters
        let attendanceQuery = {
            date: { $gte: start, $lte: end }
        };

        if (userId) {
            attendanceQuery.userId = userId;
        }

        // Get attendance records
        const attendanceRecords = await Attendance.find(attendanceQuery)
            .populate({
                path: 'userId',
                select: 'name employeeCode email role department',
                populate: {
                    path: 'department',
                    select: 'name code'
                }
            })
            .populate('shiftId', 'name startTime endTime')
            .sort({ date: -1, 'userId.name': 1 });

        // Get all active users for the date range to include absent days
        let userQuery = { isActive: true };
        if (department) {
            userQuery.department = department;
        }

        const allUsers = await User.find(userQuery, 'name employeeCode email role department')
            .populate('department', 'name code');

        // Create comprehensive report data
        const reportData = [];
        const currentDate = new Date(start);
        const Shift = require('../shift/Shift');

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
            
            // Get all shifts for this day to optimize queries
            const shiftsForDay = await Shift.find({
                workDays: dayName,
                isActive: true
            }).populate('assignedUsers', '_id');

            for (const user of allUsers) {
                const attendance = attendanceRecords.find(record => 
                    record.userId && 
                    record.userId._id.toString() === user._id.toString() &&
                    record.date.toISOString().split('T')[0] === dateStr
                );

                // Check if user had shift assigned for this day
                const hasShiftAssigned = shiftsForDay.some(shift => 
                    shift.assignedUsers.some(assignedUser => 
                        assignedUser._id.toString() === user._id.toString()
                    )
                );

                const recordStatus = attendance ? attendance.status : (hasShiftAssigned ? 'absent' : 'no_shift');
                
                // Apply status filter if provided
                if (status && recordStatus !== status) {
                    continue;
                }

                const attendanceData = attendance ? attendance.getSummary() : {
                    status: recordStatus,
                    punchSessions: [],
                    currentSession: -1,
                    firstPunchIn: null,
                    lastPunchOut: null,
                    workingHours: '0h 0m',
                    totalWorkingMinutes: 0,
                    totalBreakMinutes: 0,
                    autoBreaks: [],
                    hasShiftAssigned: !!hasShiftAssigned
                };

                reportData.push({
                    date: dateStr,
                    user: {
                        _id: user._id,
                        name: user.name,
                        employeeCode: user.employeeCode,
                        email: user.email,
                        role: user.role,
                        department: user.department?.name || 'Unassigned'
                    },
                    attendance: attendanceData,
                    shift: attendance?.shiftId || null,
                    hasShiftAssigned: !!hasShiftAssigned
                });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate summary statistics
        const summary = {
            totalRecords: reportData.length,
            presentDays: reportData.filter(r => r.attendance.status === 'present' || r.attendance.status === 'punched_in').length,
            absentDays: reportData.filter(r => r.attendance.status === 'absent').length,
            halfDays: reportData.filter(r => r.attendance.status === 'half_day').length,
            noShiftDays: reportData.filter(r => r.attendance.status === 'no_shift').length,
            totalWorkingHours: Math.round(reportData.reduce((sum, r) => sum + (r.attendance.totalWorkingMinutes / 60), 0) * 100) / 100,
            averageWorkingHours: reportData.length > 0 ? 
                Math.round((reportData.reduce((sum, r) => sum + (r.attendance.totalWorkingMinutes / 60), 0) / reportData.length) * 100) / 100 : 0
        };

        res.status(200).json({
            success: true,
            data: reportData,
            summary,
            dateRange: { startDate, endDate },
            filters: { userId, department, status }
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

// Remove legacy break functions since breaks are now auto-calculated
// But keep them for backward compatibility (they will do nothing)
const startBreak = async(req, res) => {
    res.status(200).json({
        success: true,
        message: 'Breaks are now automatically calculated between punch sessions',
        data: null
    });
};

const endBreak = async(req, res) => {
    res.status(200).json({
        success: true,
        message: 'Breaks are now automatically calculated between punch sessions',
        data: null
    });
};

module.exports = {
    punchIn,
    punchOut,
    togglePunch,
    startBreak, // Legacy - does nothing
    endBreak,   // Legacy - does nothing
    getTodayAttendance,
    getWeeklyAttendance,
    getMonthlyAttendance,
    getAttendanceStats,
    getAllAttendanceToday,
    getAttendanceReport
};