const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../user/User');
const router = express.Router();
const nodemailer = require('nodemailer');

const HeadOffice = require('./../headoffice/Model');

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
      headOffice,
    });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '60h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        headOffice: user.headOffice,
      },
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
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const headOffice = await HeadOffice.findOne({});

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        phone: user.phone,
      },
      headOffice: headOffice ? { id: headOffice._id, name: headOffice.name } : null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GENERATE OTP (Email-based)
router.post('/generate-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ msg: 'Email is required' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: 'Invalid email format' });

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Log OTP to terminal
    console.log(`Generated OTP for ${email}: ${otp}`);

    // Save OTP and expiration
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    await user.save();

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER || 'gluckscarepharmaceuticals@gmail.com',
        pass: process.env.EMAIL_PASS || 'ldgmqixyufjdzylv',
      },
    });

    // Verify SMTP connection
    await transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP connection error:', error);
        return res.status(500).json({ msg: 'SMTP configuration error', error: error.message });
      }
      console.log('SMTP server is ready:', success);
    });

    // Send OTP email
    const mailOptions = {
      from: '"GlucksCare Pharmaceuticals" <gluckscarepharmaceuticals@gmail.com>',
      to: user.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>It is valid for 10 minutes.</p>`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
      res.json({ msg: 'OTP sent successfully' });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ msg: 'Failed to send OTP', error: emailError.message });
    }
  } catch (err) {
    console.error('Generate OTP error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ msg: 'Email and OTP are required' });

    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.otp !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    user.otp = null;
    user.otpExpire = null;
    user.emailVerified = true;
    await user.save();

    res.json({ msg: 'OTP verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// SET PIN
router.post('/set-pin', async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) return res.status(400).json({ msg: 'Email and PIN are required' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: 'Invalid email format' });

    if (pin.length !== 4 || isNaN(pin)) {
      return res.status(400).json({ msg: 'PIN must be a 4-digit number' });
    }

    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.pin = pin;
    user.pinExpire = Date.now() + 10 * 60 * 1000; // PIN expires in 10 minutes
    await user.save();

    console.log(`Set PIN for ${email}: ${pin}`);

    res.json({ msg: 'PIN set successfully' });
  } catch (err) {
    console.error('Set PIN error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// VALIDATE PIN
router.post('/validate-pin', async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) return res.status(400).json({ msg: 'Email and PIN are required' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: 'Invalid email format' });

    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.pin !== pin || user.pinExpire < Date.now()) {
      return res.status(400).json({ msg: 'Invalid or expired PIN' });
    }

    res.json({ msg: 'PIN validated successfully, you can now access the app' });
  } catch (err) {
    console.error('Validate PIN error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;