// backend/src/auth/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../user/User');
const router = express.Router();

const HeadOffice = require('./../headoffice/Model')
// REGISTER
// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, headOffice } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    if (role && !['Admin', 'User'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role. Must be Admin or User' });
    }

    user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: role || 'User',
      phone,
      headOffice, // assign headOffice from the form data
    });
    await user.save();

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '60h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        headOffice: user.headOffice,
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// LOGIN






router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Query HeadOffice information. Adjust this query if you need a specific record.
    const headOffice = await HeadOffice.findOne({});

    // Return token, user data, and head office info
    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      },
      headOffice: headOffice ? { id: headOffice._id, name: headOffice.name } : null
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
