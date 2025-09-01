const express = require('express');
const router = express.Router();
const { getUserDashboard } = require('./userDashboardController');
const auth = require('../middleware/authMiddleware');

/**
 * @route   GET /api/dashboard/user
 * @desc    Get comprehensive user dashboard data
 * @access  Private (Authenticated users only)
 */
router.get('/user', auth, getUserDashboard);

/**
 * @route   GET /api/dashboard/test
 * @desc    Test endpoint to verify dashboard API is working
 * @access  Private (Authenticated users only)
 */
router.get('/test', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard API is working',
    user: {
      id: req.user.id,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @route   GET /api/dashboard/debug
 * @desc    Debug endpoint to check user data
 * @access  Private (Authenticated users only)
 */
router.get('/debug', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const mongoose = require('mongoose');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    const Visit = require('../visit/Visit');
    const SalesActivity = require('../sales/SalesActivity');
    const Expense = require('../expencse/Expense');
    const SalesTarget = require('../salesTarget/SalesTarget');
    
    // Check what data exists for this user
    const [visits, sales, expenses, targets] = await Promise.all([
      Visit.find({ representativeId: userObjectId }).limit(5),
      SalesActivity.find({ user: userObjectId }).limit(5),
      Expense.find({ user: userObjectId }).limit(5),
      SalesTarget.find({ userId: userObjectId }).limit(5)
    ]);
    
    res.json({
      success: true,
      userId: userId,
      userObjectId: userObjectId.toString(),
      data: {
        visits: visits.map(v => ({ id: v._id, createdAt: v.createdAt, status: v.status })),
        sales: sales.map(s => ({ id: s._id, createdAt: s.createdAt, doctorName: s.doctorName })),
        expenses: expenses.map(e => ({ id: e._id, createdAt: e.createdAt, status: e.status, amount: e.amount })),
        targets: targets.map(t => ({ id: t._id, targetMonth: t.targetMonth, targetYear: t.targetYear, targetAmount: t.targetAmount }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/dashboard/targets-only
 * @desc    Get only targets data for debugging
 * @access  Private
 */
router.get('/targets-only', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const mongoose = require('mongoose');
    const SalesTarget = require('../salesTarget/SalesTarget');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    const targets = await SalesTarget.find({ userId: userObjectId });
    const currentTarget = await SalesTarget.findOne({
      userId: userObjectId,
      targetMonth: currentMonth,
      targetYear: currentYear
    });
    
    res.json({
      success: true,
      data: {
        userId,
        currentMonth,
        currentYear,
        allTargets: targets,
        currentTarget
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/dashboard/visits-only
 * @desc    Get only visits data for debugging
 * @access  Private
 */
router.get('/visits-only', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const mongoose = require('mongoose');
    const Visit = require('../visit/Visit');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    const allVisits = await Visit.find({ representativeId: userObjectId });
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    const currentMonthVisits = await Visit.find({
      representativeId: userObjectId,
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    
    res.json({
      success: true,
      data: {
        userId,
        currentMonth,
        currentYear,
        monthStart,
        monthEnd,
        totalVisits: allVisits.length,
        currentMonthVisits: currentMonthVisits.length,
        allVisits: allVisits.map(v => ({
          id: v._id,
          createdAt: v.createdAt,
          status: v.status,
          doctorName: v.doctorChemistName
        })),
        currentMonthVisitsDetail: currentMonthVisits.map(v => ({
          id: v._id,
          createdAt: v.createdAt,
          status: v.status,
          doctorName: v.doctorChemistName
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;