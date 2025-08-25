// routes/state.js
const express = require('express');
const router = express.Router();
const State = require('./State');

// GET all states
router.get('/', async (req, res) => {
  try {
    const states = await State.find({ isActive: true }).sort({ name: 1 });
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET state by ID
router.get('/:id', async (req, res) => {
  try {
    const state = await State.findById(req.params.id);
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    res.json(state);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new state
router.post('/', async (req, res) => {
  try {
    const { name, code, country } = req.body;

    // Check if state already exists
    const existingState = await State.findOne({
      $or: [
        { name: name.trim() },
        { code: code.trim().toUpperCase() }
      ]
    });

    if (existingState) {
      return res.status(400).json({ 
        message: 'State with this name or code already exists' 
      });
    }

    const state = new State({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      country: country?.trim() || 'India'
    });

    const newState = await state.save();
    res.status(201).json(newState);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update a state
router.put('/:id', async (req, res) => {
  try {
    const { name, code, country, isActive } = req.body;
    
    // Check if another state has the same name or code
    const existingState = await State.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { name: name?.trim() },
        { code: code?.trim().toUpperCase() }
      ]
    });

    if (existingState) {
      return res.status(400).json({ 
        message: 'Another state with this name or code already exists' 
      });
    }

    const updatedState = await State.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(country && { country: country.trim() }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    );

    if (!updatedState) {
      return res.status(404).json({ message: 'State not found' });
    }

    res.json(updatedState);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a state (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const deletedState = await State.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!deletedState) {
      return res.status(404).json({ message: 'State not found' });
    }

    res.json({ message: 'State deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST restore a state
router.post('/:id/restore', async (req, res) => {
  try {
    const restoredState = await State.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!restoredState) {
      return res.status(404).json({ message: 'State not found' });
    }

    res.json(restoredState);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;