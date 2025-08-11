// routes/headOffice.js
const express = require('express');
const router = express.Router();
const HeadOffice = require('./Model');

// GET all head offices
router.get('/', async (req, res) => {
  try {
    const headOffices = await HeadOffice.find({ isActive: true })
      .populate('state', 'name code')
      .sort({ name: 1 });
    res.json(headOffices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET head office by ID
router.get('/:id', async (req, res) => {
  try {
    const headOffice = await HeadOffice.findById(req.params.id)
      .populate('state', 'name code');
    if (!headOffice) {
      return res.status(404).json({ message: 'Head Office not found' });
    }
    res.json(headOffice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new head office
router.post('/', async (req, res) => {
  try {
    const { name, address, city, state, pincode, phone, email } = req.body;

    // Check if head office with same name already exists
    const existingHeadOffice = await HeadOffice.findOne({ 
      name: name.trim(),
      isActive: true 
    });

    if (existingHeadOffice) {
      return res.status(400).json({ 
        message: 'Head Office with this name already exists' 
      });
    }

    const headOffice = new HeadOffice({
      name: name.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state || null,
      pincode: pincode?.trim(),
      phone: phone?.trim(),
      email: email?.trim()
    });

    const newHeadOffice = await headOffice.save();
    const populatedHeadOffice = await HeadOffice.findById(newHeadOffice._id)
      .populate('state', 'name code');
    
    res.status(201).json(populatedHeadOffice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update a head office
router.put('/:id', async (req, res) => {
  try {
    const { name, address, city, state, pincode, phone, email, isActive } = req.body;
    
    // Check if another head office has the same name
    if (name) {
      const existingHeadOffice = await HeadOffice.findOne({
        _id: { $ne: req.params.id },
        name: name.trim(),
        isActive: true
      });

      if (existingHeadOffice) {
        return res.status(400).json({ 
          message: 'Another Head Office with this name already exists' 
        });
      }
    }

    const updatedHeadOffice = await HeadOffice.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name: name.trim() }),
        ...(address !== undefined && { address: address?.trim() }),
        ...(city !== undefined && { city: city?.trim() }),
        ...(state !== undefined && { state: state || null }),
        ...(pincode !== undefined && { pincode: pincode?.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() }),
        ...(email !== undefined && { email: email?.trim() }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    ).populate('state', 'name code');

    if (!updatedHeadOffice) {
      return res.status(404).json({ message: 'Head Office not found' });
    }

    res.json(updatedHeadOffice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a head office (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const deletedHeadOffice = await HeadOffice.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!deletedHeadOffice) {
      return res.status(404).json({ message: 'Head Office not found' });
    }

    res.json({ message: 'Head Office deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
