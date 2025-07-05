const express = require('express');
const router = express.Router();
const Location = require('./Location');

// POST route to save location data
router.post('/', async (req, res) => {
  try {
    const { latitude, longitude, userName, userId, deviceId } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Latitude and longitude are required." });
    }

    const location = new Location({
      userId,
      userName,
      deviceId, 
      latitude,
      longitude,
    });

    await location.save();
    res.status(200).json({ message: "Location saved successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to fetch all locations
router.get('/', async (req, res) => {
  try {
    const locations = await Location.find().sort({ timestamp: -1 });
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
