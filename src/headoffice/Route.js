// routes/headOffice.js
const express = require('express');
const router = express.Router();
const HeadOffice = require('./Model');

// GET all head offices
router.get('/', async (req, res) => {
  try {
    const headOffices = await HeadOffice.find();
    res.json(headOffices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new head office
router.post('/', async (req, res) => {
  const headOffice = new HeadOffice({
    name: req.body.name,
  });
  try {
    const newHeadOffice = await headOffice.save();
    res.status(201).json(newHeadOffice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
