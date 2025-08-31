const express = require('express');
const router = express.Router();
const Designation = require('./Designation');
const authMiddleware = require('../middleware/authMiddleware');

// GET all designations
router.get('/', async (req, res) => {
  try {
    const designations = await Designation.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      data: designations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET designation by ID
router.get('/:id', async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }
    res.json({
      success: true,
      data: designation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST create new designation
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Designation name is required'
      });
    }

    const designation = new Designation({
      name,
      description
    });

    await designation.save();
    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: designation
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Designation name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT update designation
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      { name, description, isActive },
      { new: true, runValidators: true }
    );

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    res.json({
      success: true,
      message: 'Designation updated successfully',
      data: designation
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Designation name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE designation (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    res.json({
      success: true,
      message: 'Designation deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;