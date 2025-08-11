const express = require('express');
const router = express.Router();
const Location = require('./Location');

// POST route to save location data - Flexible for multiple scenarios
router.post('/', async (req, res) => {
  try {
    const { latitude, longitude, userName, userId, deviceId } = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Latitude and longitude are required." });
    }

    // Validate that at least one identifier is provided
    if (!deviceId && !userId) {
      return res.status(400).json({
        message: "At least one identifier (deviceId or userId) is required."
      });
    }

    // Create location object with flexible fields
    const locationData = {
      latitude,
      longitude,
    };

    // Add optional fields only if they are provided
    if (deviceId) {
      locationData.deviceId = deviceId;
    }

    if (userId) {
      locationData.userId = userId;
    }

    if (userName) {
      locationData.userName = userName;
    }

    const location = new Location(locationData);
    await location.save();

    // Create response message based on what was provided
    let responseMessage = "Location saved successfully";
    if (userId && userName) {
      responseMessage += ` for user ${userName} (ID: ${userId})`;
    } else if (deviceId) {
      responseMessage += ` for device ${deviceId}`;
    }

    res.status(200).json({
      message: responseMessage,
      locationId: location._id,
      savedData: {
        latitude: location.latitude,
        longitude: location.longitude,
        deviceId: location.deviceId || null,
        userId: location.userId || null,
        userName: location.userName || null,
        timestamp: location.timestamp
      }
    });
  } catch (error) {
    console.error('Location save error:', error);
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
