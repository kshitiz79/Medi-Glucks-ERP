// routes/userRoutes.js
const express = require('express');
const router = express.Router();
// Make sure the path and file name match exactly
const { getAllUsers, getUserById, createUser, updateUser, deleteUser, getUsersByRole, updateProfile, updateUserPassword, getUsersForShiftAssignment, getUsersByState, getMyHeadOffices } = require('./controller');
const auth = require('../middleware/authMiddleware');
const { uploadUserDocuments } = require('../middleware/upload');

// GET all users
router.get('/', auth, getAllUsers);

// GET users by state for State Head
router.get('/by-state', auth, getUsersByState);

// GET current user's assigned head offices
router.get('/my-head-offices', auth, getMyHeadOffices);

// GET active users for shift assignment
router.get('/for-shift-assignment', auth, getUsersForShiftAssignment);

// GET users by role
router.get('/role/:role', auth, getUsersByRole);

// GET one user by ID
router.get('/:id', auth, getUserById);

// CREATE new user (with file upload support)
router.post('/', auth, uploadUserDocuments, createUser);

// UPDATE user by ID (with file upload support)
router.put('/:id', auth, uploadUserDocuments, updateUser);

// UPDATE user profile (authenticated user can update their own profile)
router.patch('/profile', auth, updateProfile);

// UPDATE user password (Admin / Super Admin)
router.put('/:id/password', auth, updateUserPassword);

// DELETE user by ID
router.delete('/:id', auth, deleteUser);

module.exports = router;