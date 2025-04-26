const express = require('express');
const router = express.Router();
const Ticket = require('./../raseticket/RaiseTicket');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT and extract user
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// Middleware to restrict to Admins
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ msg: 'Admin access required' });
  }
  next();
};

// GET /tickets - Get all tickets (Admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const tickets = await Ticket.find().populate('userId', 'name email');
      // Sanitize userId to ensure it's a string
      const sanitizedTickets = tickets.map((ticket) => ({
        ...ticket.toObject(),
        userId: ticket.userId._id.toString(), // Ensure userId is string
      }));
      console.log('Sanitized tickets:', sanitizedTickets); // Debug
      res.json(sanitizedTickets);
    } catch (err) {
      console.error('Get tickets error:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  });
// GET /tickets/user - Get tickets for the logged-in user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id });
    res.json(tickets);
  } catch (err) {
    console.error('Get user tickets error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /tickets/users - Get unique users who raised tickets (Admin only, optional)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await Ticket.aggregate([
      { $group: { _id: '$userId', userName: { $first: '$userName' } } },
      { $project: { userId: '$_id', userName: 1, _id: 0 } },
    ]);
    res.json(users);
  } catch (err) {
    console.error('Get ticket users error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;