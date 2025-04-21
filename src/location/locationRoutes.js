// src/location/locationRoutes.js
const express = require('express');
const router = express.Router();
const Location = require('./Location');

// POST route to save location data
router.post('/', async (req, res) => {
  try {
    const { latitude, longitude, userName } = req.body;
    // Optionally: if you use authentication, get userId from req.user
    const userId = req.user ? req.user.id : null;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Latitude and longitude are required." });
    }

    const location = new Location({
      userId,
      userName,
      latitude,
      longitude,
    });

    await location.save();
    res.status(200).json({ message: "Location saved successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to fetch location data for admin
router.get('/', async (req, res) => {
  try {
    // Optionally: add authentication to ensure only admin can access
    const locations = await Location.find().sort({ timestamp: -1 });
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
