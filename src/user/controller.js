// controllers/userController.js
const User = require('./User');

/**
 * Get all users
 * GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // or add filters if needed
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
    // In a real app, you might sanitize or validate the data in req.body
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,          // fields to update
      { new: true }      // return the updated document
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
