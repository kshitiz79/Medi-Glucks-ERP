const express = require('express');
const router = express.Router();
const Chemist = require('./Chemist');

// Add a new chemist
router.post('/', async (req, res) => {
  try {
    const chemist = new Chemist(req.body);
    await chemist.save();
    res.status(201).json({ message: 'Chemist added successfully', chemist });
  } catch (error) {
    res.status(400).json({ message: 'Error adding chemist', error: error.message });
  }
});

// Get all chemists
router.get('/', async (req, res) => {
  try {
    const chemists = await Chemist.find();
    res.status(200).json(chemists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chemists', error: error.message });
  }
});

// Get a single chemist by ID
router.get('/:id', async (req, res) => {
  try {
    const chemist = await Chemist.findById(req.params.id);
    if (!chemist) {
      return res.status(404).json({ message: 'Chemist not found' });
    }
    res.status(200).json(chemist);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chemist', error: error.message });
  }
});

// Update a chemist
router.put('/:id', async (req, res) => {
  try {
    const chemist = await Chemist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!chemist) {
      return res.status(404).json({ message: 'Chemist not found' });
    }
    res.status(200).json({ message: 'Chemist updated successfully', chemist });
  } catch (error) {
    res.status(400).json({ message: 'Error updating chemist', error: error.message });
  }
});

// Delete a chemist
router.delete('/:id', async (req, res) => {
  try {
    const chemist = await Chemist.findByIdAndDelete(req.params.id);
    if (!chemist) {
      return res.status(404).json({ message: 'Chemist not found' });
    }
    res.status(200).json({ message: 'Chemist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting chemist', error: error.message });
  }
});

module.exports = router;