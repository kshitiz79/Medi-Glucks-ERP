const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const Expense = require('./Expense');
const User = require('./../user/User');
const ExpenseSettings = require('./ExpenseSettings');

// GET /api/expenses/settings - Fetch expense settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await ExpenseSettings.findOne();
    if (!settings) {
      return res.json({
        ratePerKm: 2.40,
        headOfficeAmount: 150,
        outsideHeadOfficeAmount: 175,
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error in GET /api/expenses/settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/expenses/settings - Update expense settings
router.put('/settings', async (req, res) => {
  try {
    const { ratePerKm, headOfficeAmount, outsideHeadOfficeAmount } = req.body;
    let settings = await ExpenseSettings.findOne();
    if (!settings) {
      settings = new ExpenseSettings({ ratePerKm, headOfficeAmount, outsideHeadOfficeAmount });
    } else {
      settings.ratePerKm = ratePerKm;
      settings.headOfficeAmount = headOfficeAmount;
      settings.outsideHeadOfficeAmount = outsideHeadOfficeAmount;
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Error in PUT /api/expenses/settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/expenses - Create a new expense
router.post('/', async (req, res) => {
  try {
    const { userId, category, description, bill, travelDetails, dailyAllowanceType } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const settings = await ExpenseSettings.findOne() || {
      ratePerKm: 2.40,
      headOfficeAmount: 150,
      outsideHeadOfficeAmount: 175,
    };

    let billUrl = '';
    if (bill) {
      const result = await cloudinary.uploader.upload(bill, { folder: 'expenses' });
      billUrl = result.secure_url;
    }

    let computedAmount = 0;
    let totalDistanceKm = 0;
    if (category === 'travel' && Array.isArray(travelDetails)) {
      totalDistanceKm = travelDetails.reduce((sum, leg) => sum + Number(leg.km || 0), 0);
      computedAmount = totalDistanceKm * settings.ratePerKm;
    } else if (category === 'daily') {
      computedAmount = dailyAllowanceType === 'headoffice' ? settings.headOfficeAmount : settings.outsideHeadOfficeAmount;
    }

    const expense = new Expense({
      user: user._id,
      userName: user.name,
      category,
      description,
      bill: billUrl,
      status: 'pending',
      date: new Date(),
      amount: computedAmount,
      ...(category === 'travel' && { travelDetails, totalDistanceKm, ratePerKm: settings.ratePerKm }),
      ...(category === 'daily' && { dailyAllowanceType }),
      editCount: 0, // Initialize editCount
    });

    const createdExpense = await expense.save();
    res.status(201).json(createdExpense);
  } catch (error) {
    console.error('Error in POST /api/expenses:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/expenses/:expenseId - Update an expense
router.put('/:expenseId', async (req, res) => {
  try {
    const { userId, category, description, bill, travelDetails, dailyAllowanceType } = req.body;

    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'pending') return res.status(400).json({ message: 'Can only edit pending expenses' });
    if (expense.editCount >= 1) return res.status(400).json({ message: 'Expense can only be edited once' });
    if (expense.user.toString() !== userId) return res.status(403).json({ message: 'Unauthorized to edit this expense' });

    const settings = await ExpenseSettings.findOne() || {
      ratePerKm: 2.40,
      headOfficeAmount: 150,
      outsideHeadOfficeAmount: 175,
    };

    let billUrl = expense.bill;
    if (bill && bill !== expense.bill) {
      const result = await cloudinary.uploader.upload(bill, { folder: 'expenses' });
      billUrl = result.secure_url;
    }

    let computedAmount = 0;
    let totalDistanceKm = 0;
    if (category === 'travel' && Array.isArray(travelDetails)) {
      totalDistanceKm = travelDetails.reduce((sum, leg) => sum + Number(leg.km || 0), 0);
      computedAmount = totalDistanceKm * settings.ratePerKm;
    } else if (category === 'daily') {
      computedAmount = dailyAllowanceType === 'headoffice' ? settings.headOfficeAmount : settings.outsideHeadOfficeAmount;
    }

    expense.category = category;
    expense.description = description;
    expense.bill = billUrl;
    expense.amount = computedAmount;
    if (category === 'travel') {
      expense.travelDetails = travelDetails;
      expense.totalDistanceKm = totalDistanceKm;
      expense.ratePerKm = settings.ratePerKm;
      expense.dailyAllowanceType = undefined;
    } else if (category === 'daily') {
      expense.dailyAllowanceType = dailyAllowanceType;
      expense.travelDetails = [];
      expense.totalDistanceKm = 0;
      expense.ratePerKm = undefined;
    }
    expense.editCount = expense.editCount + 1; // Increment edit count

    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    console.error('Error in PUT /api/expenses/:expenseId:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/expenses - Fetch all expenses or filter by userId
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { user: userId } : {};
    const expenses = await Expense.find(filter);
    res.json(expenses);
  } catch (error) {
    console.error('Error in GET /api/expenses:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/expenses/:expenseId - Fetch a single expense by its ID
router.get('/:expenseId', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    console.error('Error in GET /api/expenses/:expenseId:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/expenses/:expenseId/approve - Approve an expense
router.put('/:expenseId/approve', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    expense.status = 'approved';
    await expense.save();
    res.json(expense);
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/expenses/:expenseId/reject - Reject an expense
router.put('/:expenseId/reject', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    expense.status = 'rejected';
    await expense.save();
    res.json(expense);
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;