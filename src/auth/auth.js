const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../user/User');
const router = express.Router();
const nodemailer = require('nodemailer');
const { uploadUserDocuments } = require('../middleware/upload');

const HeadOffice = require('./../headoffice/Model');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      mobileNumber,
      headOffice,
      employeeCode,
      gender,
      salaryType,
      salaryAmount,
      address,
      dateOfBirth,
      dateOfJoining,
      bankDetails,
      emergencyContact,
      reference,
      branch,
      department,
      employmentType,
      state,
      managers,
      areaManagers,
      headOffices
    } = req.body;

    // Validate required fields
    if (!name) return res.status(400).json({ msg: 'Name is required' });
    if (!email) return res.status(400).json({ msg: 'Email is required' });
    if (!password) return res.status(400).json({ msg: 'Password is required' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const validRoles = [
      'Super Admin',
      'Admin',
      'Opps Team',
      'National Head',
      'State Head',
      'Zonal Manager',
      'Area Manager',
      'Manager',
      'User'
    ];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ msg: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: role || 'User',
      mobileNumber: mobileNumber || phone,
      headOffice: headOffice || undefined,
      employeeCode,
      gender,
      salaryType,
      salaryAmount: salaryAmount ? parseFloat(salaryAmount) : undefined,
      address,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
      bankDetails,
      emergencyContact,
      reference,
      branch: branch || undefined,
      department: department || undefined,
      employmentType: employmentType || undefined,
      state: state || undefined,
      managers,
      areaManagers,
      headOffices,
      // Admin-created accounts are automatically email verified
      emailVerified: true,
      emailVerifiedAt: new Date()
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

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        phone: user.phone,
        headOffice: user.headOffice,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
})

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

// ========================
// EMAIL-BASED LOGIN ENDPOINTS
// ========================

// CHECK EMAIL REGISTERED
router.post('/check-email-registered', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ 
      success: false, 
      msg: 'Email is required' 
    });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ 
      success: false, 
      msg: 'Invalid email format' 
    });

    // Check if user exists
    const user = await User.findOne({ email }).select('email name role emailVerified');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Email not registered in the system' 
      });
    }

    res.json({ 
      success: true, 
      msg: 'Email is registered', 
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (err) {
    console.error('Check email registered error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: err.message 
    });
  }
});

// SEND EMAIL OTP
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ 
      success: false, 
      msg: 'Email is required' 
    });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ 
      success: false, 
      msg: 'Invalid email format' 
    });

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ 
      success: false, 
      msg: 'Email not registered in the system' 
    });

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Log OTP to terminal for development
    console.log(`🔐 Email Login OTP for ${email}: ${otp}`);

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

    // Send OTP email with enhanced template
    const mailOptions = {
      from: '"GlucksCare Pharmaceuticals" <gluckscarepharmaceuticals@gmail.com>',
      to: user.email,
      subject: 'Your Login OTP - GlucksCare Pharmaceuticals',
      text: `Your login OTP code is: ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://gluckscare.com/logo.png" alt="GlucksCare Pharmaceuticals" style="height: 60px;">
            </div>
            <h2 style="color: #c71d51; text-align: center; margin-bottom: 20px;">Login Verification Code</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Your login verification code is:</p>
            <div style="background-color: #f8f9fa; border: 2px dashed #c71d51; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #c71d51; letter-spacing: 3px;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">This code is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© 2025 GlucksCare Pharmaceuticals. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Email login OTP sent:', info.response);
      res.json({ 
        success: true, 
        msg: 'OTP sent successfully to your email',
        data: {
          email: user.email,
          expiresIn: '10 minutes'
        }
      });
    } catch (emailError) {
      console.error('❌ Error sending email OTP:', emailError);
      return res.status(500).json({ 
        success: false, 
        msg: 'Failed to send OTP email', 
        error: emailError.message 
      });
    }
  } catch (err) {
    console.error('Send email OTP error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: err.message 
    });
  }
});

// VERIFY EMAIL OTP
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ 
      success: false, 
      msg: 'Email and OTP are required' 
    });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ 
      success: false, 
      msg: 'Invalid email format' 
    });

    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ 
      success: false, 
      msg: 'User not found' 
    });

    if (user.otp !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid or expired OTP' 
      });
    }

    // Clear OTP and mark email as verified
    user.otp = null;
    user.otpExpire = null;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    console.log(`✅ Email OTP verified for ${email}`);

    res.json({ 
      success: true, 
      msg: 'OTP verified successfully',
      data: {
        email: user.email,
        emailVerified: true
      }
    });
  } catch (err) {
    console.error('Verify email OTP error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: err.message 
    });
  }
});

// EMAIL LOGIN (Passwordless)
router.post('/email-login', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ 
      success: false, 
      msg: 'Email and OTP are required' 
    });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ 
      success: false, 
      msg: 'Invalid email format' 
    });

    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ 
      success: false, 
      msg: 'User not found' 
    });

    // Verify OTP
    if (user.otp !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid or expired OTP' 
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Email not verified. Please verify your email first.' 
      });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    console.log(`🚀 Email login successful for ${email}`);

    res.json({
      success: true,
      msg: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        headOffice: user.headOffice,
        employeeCode: user.employeeCode
      },
    });
  } catch (err) {
    console.error('Email login error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: err.message 
    });
  }
});

module.exports = router;