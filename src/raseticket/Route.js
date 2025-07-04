// src/routes/ticketsRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ticket = require('./RaiseTicket');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Configure Multer for temporary file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  },
});

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    console.error('JWT verify failed:', err);
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

// POST /api/tickets - Create a new ticket
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, userName, userId, status } = req.body;
    if (!title || !description || !userName) {
      return res.status(400).json({ msg: 'Title, description, and userName are required' });
    }
    // Determine userObjectId
    let userObjectId = req.user.id;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) userObjectId = userId;

    // Upload image if provided
    let imageUrl = null;
    if (req.file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'tickets' },
          (error, result) => {
            if (error) return reject(new Error('Cloudinary upload failed'));
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = await uploadPromise;
    }

    const newTicket = new Ticket({
      title,
      description,
      image: imageUrl,
      userId: userObjectId,
      userName,
      status: ['IN PROGRESS','RESOLVED','REJECTED','CLOSED'].includes(status) ? status : 'IN PROGRESS',
    });
    await newTicket.save();
    res.status(201).json({ msg: 'Ticket raised successfully', ticket: newTicket });
  } catch (err) {
    console.error('Error in ticket creation:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/tickets - All tickets (Admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('userId', 'name email');
    res.json(tickets);
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/tickets/user - Tickets for current user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id });
    res.json(tickets);
  } catch (err) {
    console.error('Get user tickets error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// NEW: GET /api/tickets/user/:userId - Tickets by specific user (Admin only)
router.get('/user/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Invalid userId parameter' });
    }
    const tickets = await Ticket.find({ userId });
    return res.json(tickets);
  } catch (err) {
    console.error('Get tickets by userId error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
