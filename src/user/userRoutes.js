// routes/userRoutes.js
const express = require('express');
const router = express.Router();
// Make sure the path and file name match exactly
const { getAllUsers, getUserById, updateUser, deleteUser, getUsersByRole, updateProfile, updateUserPassword } = require('./controller');
const auth = require('../middleware/authMiddleware');

// GET all users
router.get('/', getAllUsers);

// GET users by role
router.get('/role/:role', getUsersByRole);

// GET one user by ID
router.get('/:id', getUserById);

// UPDATE user by ID
router.put('/:id', updateUser);

// UPDATE user profile (authenticated user can update their own profile)
router.patch('/profile', auth, updateProfile);

// UPDATE user password (Admin / Super Admin)
router.put('/:id/password', auth, updateUserPassword);

// DELETE user by ID
router.delete('/:id', deleteUser);

module.exports = router;
