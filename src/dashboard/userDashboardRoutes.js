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
    
    const DoctorVisit = require('../DoctorVisite/DoctorVisit');
    const ChemistVisit = require('../chemistVisite/ChemistVisite');
    const StockistVisit = require('../stockistVisite/StockistVisit');
    const SalesActivity = require('../sales/SalesActivity');
    const Expense = require('../expencse/Expense');
    const SalesTarget = require('../salesTarget/SalesTarget');
    
    // Check what data exists for this user
    const [doctorVisits, chemistVisits, stockistVisits, sales, expenses, targets] = await Promise.all([
      DoctorVisit.find({ user: userObjectId }).limit(5),
      ChemistVisit.find({ user: userObjectId }).limit(5),
      StockistVisit.find({ user: userObjectId }).limit(5),
      SalesActivity.find({ user: userObjectId }).limit(5),
      Expense.find({ user: userObjectId }).limit(5),
      SalesTarget.find({ userId: userObjectId }).limit(5)
    ]);
    
    res.json({
      success: true,
      userId: userId,
      userObjectId: userObjectId.toString(),
      data: {
        doctorVisits: doctorVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
        chemistVisits: chemistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
        stockistVisits: stockistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
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
    const DoctorVisit = require('../DoctorVisite/DoctorVisit');
    const ChemistVisit = require('../chemistVisite/ChemistVisite');
    const StockistVisit = require('../stockistVisite/StockistVisit');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? mongoose.Types.ObjectId.createFromHexString(userId) : userId;
    
    const [allDoctorVisits, allChemistVisits, allStockistVisits] = await Promise.all([
      DoctorVisit.find({ user: userObjectId }),
      ChemistVisit.find({ user: userObjectId }),
      StockistVisit.find({ user: userObjectId })
    ]);
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    const [currentMonthDoctorVisits, currentMonthChemistVisits, currentMonthStockistVisits] = await Promise.all([
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
    
    res.json({
      success: true,
      data: {
        userId,
        currentMonth,
        currentYear,
        monthStart,
        monthEnd,
        totalVisits: {
          doctor: allDoctorVisits.length,
          chemist: allChemistVisits.length,
          stockist: allStockistVisits.length,
          total: allDoctorVisits.length + allChemistVisits.length + allStockistVisits.length
        },
        currentMonthVisits: {
          doctor: currentMonthDoctorVisits.length,
          chemist: currentMonthChemistVisits.length,
          stockist: currentMonthStockistVisits.length,
          total: currentMonthDoctorVisits.length + currentMonthChemistVisits.length + currentMonthStockistVisits.length
        },
        allVisits: {
          doctor: allDoctorVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
          chemist: allChemistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
          stockist: allStockistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed }))
        },
        currentMonthVisitsDetail: {
          doctor: currentMonthDoctorVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
          chemist: currentMonthChemistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed })),
          stockist: currentMonthStockistVisits.map(v => ({ id: v._id, date: v.date, confirmed: v.confirmed }))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;