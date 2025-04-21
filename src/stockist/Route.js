const express = require('express');
const router = express.Router();
const Stockist = require('./Stockist');

// Add a new stockist
router.post('/', async (req, res) => {
  try {
    const stockist = new Stockist(req.body);
    await stockist.save();
    res.status(201).json({ message: 'Stockist added successfully', stockist });
  } catch (error) {
    res.status(400).json({ message: 'Error adding stockist', error: error.message });
  }
});

// Get all stockists
router.get('/', async (req, res) => {
  try {
    const stockists = await Stockist.find();
    res.status(200).json(stockists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stockists', error: error.message });
  }
});

// Get a single stockist by ID
router.get('/:id', async (req, res) => {
  try {
    const stockist = await Stockist.findById(req.params.id);
    if (!stockist) {
      return res.status(404).json({ message: 'Stockist not found' });
    }
    res.status(200).json(stockist);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stockist', error: error.message });
  }
});

// Update a stockist
router.put('/:id', async (req, res) => {
  try {
    const stockist = await Stockist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!stockist) {
      return res.status(404).json({ message: 'Stockist not found' });
    }
    res.status(200).json({ message: 'Stockist updated successfully', stockist });
  } catch (error) {
    res.status(400).json({ message: 'Error updating stockist', error: error.message });
  }
});

// Delete a stockist
router.delete('/:id', async (req, res) => {
  try {
    const stockist = await Stockist.findByIdAndDelete(req.params.id);
    if (!stockist) {
      return res.status(404).json({ message: 'Stockist not found' });
    }
    res.status(200).json({ message: 'Stockist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting stockist', error: error.message });
  }
});

module.exports = router;