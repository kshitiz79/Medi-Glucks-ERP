const express = require('express');
const router = express.Router();
const SalesActivity = require('./SalesActivity');
const User = require('./../user/User');

// Create a new sales activity record


// Create a new SalesActivity
router.post('/', async (req, res) => {
  try {
    const { doctorName, salesRep, callNotes, userId } = req.body;
    if (!doctorName || !salesRep || !callNotes || !userId) {
      return res.status(400).json({ msg: 'All fields are required.' });
    }

    // Fetch user from DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ msg: 'User not found.' });
    }

    // Create new Sales Activity
    const newSale = new SalesActivity({
      doctorName,
      salesRep,
      callNotes,
      user: userId,
      userName: user.name,
    });

    const savedSale = await newSale.save();
    res.status(201).json(savedSale);
  } catch (err) {
    console.error('Error creating sales record:', err);
    res.status(500).json({ msg: 'Server error.' });
  }
});

// Get sales for specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const sales = await SalesActivity.find({ user: userId })
      .populate('user', 'name email');
    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales for user:', err);
    res.status(500).json({ msg: 'Server error.' });
  }
});

// Get all sales (for admin)
router.get('/', async (req, res) => {
  try {
    const sales = await SalesActivity.find().populate('user', 'name');
    res.json(sales);
  } catch (err) {
    console.error('Error fetching all sales:', err);
    res.status(500).json({ msg: 'Server error.' });
  }
});

module.exports = router;
