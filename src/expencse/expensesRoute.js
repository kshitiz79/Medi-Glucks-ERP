const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const Expense = require('./Expense');
const User = require('./../user/User');

// POST /api/expenses - Create a new expense
router.post('/', async (req, res) => {
  console.log('POST /api/expenses received with body:', req.body);
  try {
    const { userId, category, amount, description, bill } = req.body;
    
    // Look up the user using the provided userId.
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found for userId:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    let billUrl = '';
    if (bill) {
      // Upload the base64-encoded image to Cloudinary.
      const result = await cloudinary.uploader.upload(bill, {
        folder: 'expenses',
      });
      billUrl = result.secure_url;
    }

    // Create new expense including user's name.
    const expense = new Expense({
      user: userId,
      userName: user.name,
      category,
      amount,
      description,
      bill: billUrl,
      status: 'pending',
      date: new Date(),
    });

    const createdExpense = await expense.save();
    console.log('Expense created successfully:', createdExpense);
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
    let expenses;
    if (userId) {
      expenses = await Expense.find({ user: userId });
    } else {
      // No userId provided: return all expenses.
      expenses = await Expense.find({});
    }
    res.json(expenses);
  } catch (error) {
    console.error('Error in GET /api/expenses:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/expenses/:expenseId - Fetch a single expense by its ID
router.get('/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    console.error('Error in GET /api/expenses/:expenseId:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/expenses/:expenseId/approve - Approve an expense (no restrictions)
router.put('/:expenseId/approve', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    expense.status = 'approved';
    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    console.error('Error in approving expense:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/expenses/:expenseId/reject - Reject an expense (no restrictions)
router.put('/:expenseId/reject', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    expense.status = 'rejected';
    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    console.error('Error in rejecting expense:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
