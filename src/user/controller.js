// controllers/userController.js
const User = require('./User');
const bcrypt = require('bcryptjs');

/**
 * Get all users
 * GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query)
      .populate('headOffice', 'name')
      .populate('manager', 'name email role')
      .populate('managers', 'name email role')
      .populate('areaManagers', 'name email role')
      .populate('state', 'name code');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get users by role
 * GET /api/users/role/:role
 */
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.find({ role })
      .populate('headOffice', 'name')
      .populate('manager', 'name email role')
      .populate('managers', 'name email role')
      .populate('areaManagers', 'name email role')
      .populate('state', 'name code');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

 
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Update user by ID
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body, // This now includes headOffice if provided in the request body
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Update user profile (authenticated user can update their own profile)
 * PATCH /api/users/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    
    // Only allow updating specific fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error' 
    });
  }
};

/**
 * Admin: Update a user's password
 * PUT /api/users/:id/password
 */
exports.updateUserPassword = async (req, res) => {
  try {
    // Only Admins or Super Admins can update others' passwords
    if (!req.user || !['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashed },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update user password error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Delete user by ID
 * DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
