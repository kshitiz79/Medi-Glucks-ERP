const User = require('../user/User');
const DoctorVisit = require('../DoctorVisite/DoctorVisit');
const ChemistVisit = require('../chemistVisite/ChemistVisite');
const StockistVisit = require('../stockistVisite/StockistVisit');
const SalesActivity = require('../sales/SalesActivity');
const Expense = require('../expencse/Expense');
const SalesTarget = require('../salesTarget/SalesTarget');

/**
 * Get comprehensive user dashboard data
 * GET /api/dashboard/user
 */
const getUserDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Debug logging
        console.log('Dashboard Debug:', {
            userId,
            currentMonth,
            currentYear,
            currentDate: currentDate.toISOString(),
            getMonth: currentDate.getMonth(),
            getFullYear: currentDate.getFullYear()
        });

        // Get start and end of current month
        const monthStart = new Date(currentYear, currentMonth - 1, 1);
        const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        console.log('Date Range:', {
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString()
        });

        // Parallel data fetching for better performance
        const [
            visitStats,
            salesData,
            expenseData,
            targetData,
            userInfo
        ] = await Promise.all([
            getVisitStatistics(userId, monthStart, monthEnd),
            getSalesData(userId, monthStart, monthEnd),
            getExpenseData(userId, monthStart, monthEnd),
            getTargetData(userId, currentMonth, currentYear),
            User.findById(userId).select('name role department')
        ]);

        console.log('Dashboard Results:', {
            visitStats,
            salesData,
            expenseData,
            targetData
        });

        // Helper function to ensure double representation with guaranteed decimal places
        const toDoubleString = (value) => {
            return parseFloat(parseFloat(value).toFixed(1));
        };

        // Construct dashboard response
        const dashboardData = {
            user: {
                id: userId,
                name: userInfo.name,
                role: userInfo.role,
                department: userInfo.department?.name || 'N/A'
            },
            period: {
                month: currentMonth,
                year: currentYear,
                monthName: monthStart.toLocaleDateString('en-US', { month: 'long' })
            },
            visits: visitStats,
            sales: salesData,
            expenses: expenseData,
            targets: {
                ...targetData,
                // Add helpful context about target period
                displayMessage: targetData.isCurrentMonth 
                    ? `Current month target (${targetData.targetPeriod || 'N/A'})`
                    : `Latest target: ${targetData.targetPeriod || 'N/A'} (No current month target found)`
            },
            summary: {
                totalActivities: (visitStats.total + salesData.totalActivities).toFixed(1),
                visitCompletionRate: (visitStats.total > 0 ? ((visitStats.approved / visitStats.total) * 100) : 0).toFixed(1),
                targetAchievement: (targetData.achievementPercentage).toFixed(1),
                pendingExpenses: (expenseData.pending).toFixed(1),
                totalExpenseAmount: (expenseData.totalAmount).toFixed(1)
            }
        };

        // Create response with custom serialization for summary fields
        const responseJSON = JSON.stringify({
            success: true,
            data: dashboardData,
            message: 'Dashboard data retrieved successfully'
        }, (key, value) => {
            // Custom serializer to force decimal representation for summary fields
            if (key === 'totalActivities' || key === 'visitCompletionRate' || 
                key === 'targetAchievement' || key === 'pendingExpenses' || 
                key === 'totalExpenseAmount') {
                // Return as number with guaranteed 1 decimal place
                return parseFloat(Number(value).toFixed(1));
            }
            return value;
        });
        
        res.setHeader('Content-Type', 'application/json');
        res.send(responseJSON);

    } catch (error) {
        console.error('Get user dashboard error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch dashboard data'
        });
    }
};

/**
 * Get visit statistics for the user
 */
const getVisitStatistics = async (userId, monthStart, monthEnd) => {
    try {
        console.log('Visit Query:', { userId, monthStart, monthEnd });

        // Convert userId to ObjectId if it's a string
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? mongoose.Types.ObjectId.createFromHexString(userId) : userId;

        // Get visits from all three models for the user in the current month
        const [doctorVisits, chemistVisits, stockistVisits] = await Promise.all([
            DoctorVisit.find({
                user: userObjectId,
                createdAt: { $gte: monthStart, $lte: monthEnd }
            }),
            ChemistVisit.find({
                user: userObjectId,
                createdAt: { $gte: monthStart, $lte: monthEnd }
            }),
            StockistVisit.find({
                user: userObjectId,
                createdAt: { $gte: monthStart, $lte: monthEnd }
            })
        ]);

        console.log('Visits Found:', {
            doctor: doctorVisits.length,
            chemist: chemistVisits.length,
            stockist: stockistVisits.length,
            total: doctorVisits.length + chemistVisits.length + stockistVisits.length
        });

        // Let's also check if there are any visits for this user at all
        const [anyDoctorVisits, anyChemistVisits, anyStockistVisits] = await Promise.all([
            DoctorVisit.find({ user: userObjectId }).limit(3),
            ChemistVisit.find({ user: userObjectId }).limit(3),
            StockistVisit.find({ user: userObjectId }).limit(3)
        ]);

        console.log('Any visits for user (samples):', {
            doctor: anyDoctorVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
            chemist: anyChemistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
            stockist: anyStockistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed }))
        });

        // Initialize counters
        const stats = {
            doctor: { scheduled: 0, confirmed: 0, total: doctorVisits.length },
            chemist: { scheduled: 0, confirmed: 0, total: chemistVisits.length },
            stockist: { scheduled: 0, confirmed: 0, total: stockistVisits.length },
            total: doctorVisits.length + chemistVisits.length + stockistVisits.length,
            scheduled: 0,
            confirmed: 0,
            submitted: 0,
            approved: 0,
            rejected: 0,
            draft: 0
        };

        // Process doctor visits
        doctorVisits.forEach(visit => {
            if (visit.confirmed) {
                stats.doctor.confirmed++;
                stats.confirmed++;
                stats.approved++; // Map confirmed to approved for backward compatibility
            } else {
                stats.doctor.scheduled++;
                stats.scheduled++;
                stats.draft++; // Map unconfirmed to draft for backward compatibility
            }
        });

        // Process chemist visits
        chemistVisits.forEach(visit => {
            if (visit.confirmed) {
                stats.chemist.confirmed++;
                stats.confirmed++;
                stats.approved++;
            } else {
                stats.chemist.scheduled++;
                stats.scheduled++;
                stats.draft++;
            }
        });

        // Process stockist visits
        stockistVisits.forEach(visit => {
            if (visit.confirmed) {
                stats.stockist.confirmed++;
                stats.confirmed++;
                stats.approved++;
            } else {
                stats.stockist.scheduled++;
                stats.scheduled++;
                stats.draft++;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error fetching visit statistics:', error);
        return {
            doctor: { scheduled: 0, confirmed: 0, total: 0 },
            chemist: { scheduled: 0, confirmed: 0, total: 0 },
            stockist: { scheduled: 0, confirmed: 0, total: 0 },
            total: 0,
            scheduled: 0,
            confirmed: 0,
            submitted: 0,
            approved: 0,
            rejected: 0,
            draft: 0
        };
    }
};

/**
 * Get sales data for the user
 */
const getSalesData = async (userId, monthStart, monthEnd) => {
    try {
        console.log('Sales Query:', { userId, monthStart, monthEnd });

        // Convert userId to ObjectId if it's a string
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? mongoose.Types.ObjectId.createFromHexString(userId) : userId;

        // Get sales activities for the user in the current month
        const salesActivities = await SalesActivity.find({
            user: userObjectId,
            createdAt: { $gte: monthStart, $lte: monthEnd }
        });

        console.log('Sales Activities Found:', salesActivities.length);

        // Since SalesActivity doesn't have amount field, we'll provide activity counts
        const salesData = {
            totalActivities: salesActivities.length,
            totalCalls: salesActivities.length, // Same as activities for now
            avgCallsPerDay: 0
        };

        // Calculate average calls per day
        const daysInMonth = Math.ceil((monthEnd - monthStart) / (1000 * 60 * 60 * 24));
        if (daysInMonth > 0) {
            salesData.avgCallsPerDay = Math.round(salesActivities.length / daysInMonth * 10) / 10;
        }

        return salesData;
    } catch (error) {
        console.error('Error fetching sales data:', error);
        return {
            totalActivities: 0,
            totalCalls: 0,
            avgCallsPerDay: 0
        };
    }
};

/**
 * Get expense data for the user
 */
const getExpenseData = async (userId, monthStart, monthEnd) => {
    try {
        console.log('Expense Query:', { userId, monthStart, monthEnd });

        // Convert userId to ObjectId if it's a string
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? mongoose.Types.ObjectId.createFromHexString(userId) : userId;

        const expenseAggregation = await Expense.aggregate([
            {
                $match: {
                    user: userObjectId,
                    createdAt: { $gte: monthStart, $lte: monthEnd }
                }
            },
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const expenseData = {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            totalAmount: 0,
            approvedAmount: 0,
            pendingAmount: 0,
            rejectedAmount: 0
        };

        expenseAggregation.forEach(item => {
            const status = item._id?.toLowerCase() || 'pending';
            const amount = item.totalAmount || 0;
            const count = item.count || 0;

            expenseData.total += count;
            expenseData.totalAmount += amount;

            if (status === 'approved') {
                expenseData.approved = count;
                expenseData.approvedAmount = amount;
            } else if (status === 'rejected') {
                expenseData.rejected = count;
                expenseData.rejectedAmount = amount;
            } else {
                expenseData.pending += count;
                expenseData.pendingAmount += amount;
            }
        });

        return expenseData;
    } catch (error) {
        console.error('Error fetching expense data:', error);
        return {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            totalAmount: 0,
            approvedAmount: 0,
            pendingAmount: 0,
            rejectedAmount: 0
        };
    }
};

/**
 * Get target data for the user
 */
const getTargetData = async (userId, month, year) => {
    try {
        console.log('Target Query:', { userId, month, year });

        // Convert userId to ObjectId if it's a string
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? mongoose.Types.ObjectId.createFromHexString(userId) : userId;

        // First try to find target for current month
        let target = await SalesTarget.findOne({
            userId: userObjectId,
            targetMonth: month,
            targetYear: year
        });

        console.log('Current month target found:', target);

        // If no target for current month, find the most recent target
        if (!target) {
            target = await SalesTarget.findOne({
                userId: userObjectId
            }).sort({ targetYear: -1, targetMonth: -1 });
            
            console.log('Most recent target found:', target);
        }

        if (!target) {
            console.log('No target found for user');
            return {
                monthlyTarget: 0,
                achieved: 0,
                remaining: 0,
                achievementPercentage: 0,
                status: 'No Target Set',
                targetMonth: month,
                targetYear: year,
                isCurrentMonth: true
            };
        }

        const achieved = target.achievedAmount || 0;
        const monthlyTarget = target.targetAmount || 0;
        const remaining = Math.max(0, monthlyTarget - achieved);
        const achievementPercentage = monthlyTarget > 0 ? ((achieved / monthlyTarget) * 100).toFixed(1) : 0;

        // Check if this is the current month target or a different month
        const isCurrentMonth = target.targetMonth === month && target.targetYear === year;

        return {
            monthlyTarget,
            achieved,
            remaining,
            achievementPercentage: parseFloat(achievementPercentage),
            status: target.status || 'Active',
            deadline: target.completionDeadline,
            targetMonth: target.targetMonth,
            targetYear: target.targetYear,
            isCurrentMonth,
            targetPeriod: `${getMonthName(target.targetMonth)} ${target.targetYear}`
        };
    } catch (error) {
        console.error('Error fetching target data:', error);
        return {
            monthlyTarget: 0,
            achieved: 0,
            remaining: 0,
            achievementPercentage: 0,
            status: 'Error',
            targetMonth: month,
            targetYear: year,
            isCurrentMonth: true
        };
    }
};

/**
 * Helper function to get month name
 */
const getMonthName = (monthNumber) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'Unknown';
};

module.exports = {
    getUserDashboard
};