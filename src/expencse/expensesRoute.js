const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const Expense = require('./Expense');
const User = require('./../user/User');

// POST /api/expenses - Create a new expense
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      category,
      description,
      bill,            // base64 string (optional)
      amount: manualAmount,
      travelDetails,   // array of { from, to, km }
      dailyAllowanceType // headoffice or outside
    } = req.body;

    // 1. Fetch user to get name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Upload bill if provided
    let billUrl = '';
    if (bill) {
      const result = await cloudinary.uploader.upload(bill, {
        folder: 'expenses',
      });
      billUrl = result.secure_url;
    }

    // 3. Compute amount for travel vs. daily
    let computedAmount = manualAmount;
    let totalDistanceKm = 0;
    if (category === 'travel' && Array.isArray(travelDetails)) {
      totalDistanceKm = travelDetails
        .reduce((sum, leg) => sum + Number(leg.km || 0), 0);
      computedAmount = totalDistanceKm * 2.40;
    } else if (category === 'daily') {
      computedAmount = dailyAllowanceType === 'headoffice' ? 150 : 175;
    }

    // 4. Build and save expense document
    const expense = new Expense({
      user: user._id,
      userName: user.name,
      category,
      description,
      bill: billUrl,
      status: 'pending',
      date: new Date(),
      amount: computedAmount,
      // only include travelDetails and summary fields if travel
      ...(category === 'travel' && {
        travelDetails,
        totalDistanceKm,
        ratePerKm: 2.40
      }),
      // only include dailyAllowanceType if daily
      ...(category === 'daily' && {
        dailyAllowanceType
      })
    });

    const createdExpense = await expense.save();
    res.status(201).json(createdExpense);

  } catch (error) {
    console.error('Error in POST /api/expenses:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/expenses - Fetch all expenses or filter by userId if provided
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