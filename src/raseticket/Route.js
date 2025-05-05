const express = require('express');
const router = express.Router();
const Ticket = require('./RaiseTicket'); // Correct path to the Ticket model
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); // Import Cloudinary config

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

// Middleware to verify JWT and extract user (used for other routes)
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

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, userName, userId, status } = req.body;
    let imageUrl = null;

    // Validate required fields
    if (!title || !description || !userName) {
      return res.status(400).json({ msg: 'Title, description, and userName are required' });
    }

    // Convert userId to ObjectId if it's a string
    let userObjectId = userId;
    if (userId && typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Invalid userId provided' });
    } else if (userId) {
      userObjectId = mongoose.Types.ObjectId(userId);
    }

    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'tickets' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(new Error('Cloudinary upload failed'));
            }
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = await uploadPromise;
    }

    // Default to 'IN_PROGRESS' if no status is provided
    const ticketStatus = status || 'IN PROGRESS';

    // Create new ticket
    const ticket = new Ticket({
      title,
      description,
      image: imageUrl,
      userId: userObjectId, // Ensure userId is a valid ObjectId
      userName,
      status: ticketStatus,
    });

    // Save to database
    await ticket.save();

    res.status(201).json({ msg: 'Ticket raised successfully', ticket });
  } catch (err) {
    console.error('Error in ticket creation:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});



// GET /api/tickets - Get all tickets (Admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Fetch tickets and populate userId with user details (name, email)
    const tickets = await Ticket.find().populate('userId', 'name email');
    
    // Sanitize the tickets to handle cases where userId might be missing
    const sanitizedTickets = tickets.map((ticket) => {
      if (ticket.userId && ticket.userId._id) {
        return {
          ...ticket.toObject(),
          userId: ticket.userId._id.toString(),
        };
      } else {
        return {
          ...ticket.toObject(),
          userId: 'Unknown User',  // Fallback if userId is missing
        };
      }
    });
    

    

    // Send the sanitized tickets as the response
    res.json(sanitizedTickets);
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// GET /api/tickets/user - Get tickets for the logged-in user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id });
    res.json(tickets);
  } catch (err) {
    console.error('Get user tickets error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/tickets/users - Get unique users who raised tickets (Admin only)
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