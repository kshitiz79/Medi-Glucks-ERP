// controllers/userController.js
const User = require('./User');

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
