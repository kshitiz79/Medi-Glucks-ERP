// routes/userRoutes.js
const express = require('express');
const router = express.Router();
// Make sure the path and file name match exactly
const { getAllUsers, getUserById, updateUser, deleteUser } = require('./controller');


// GET all users
router.get('/', getAllUsers);

// GET one user by ID
router.get('/:id', getUserById);

// UPDATE user by ID
router.put('/:id', updateUser);

// DELETE user by ID
router.delete('/:id', deleteUser);

module.exports = router;
