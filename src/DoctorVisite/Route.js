// backend/routes/doctorVisits.js
const express = require('express');
const router = express.Router();
const DoctorVisit = require('./DoctorVisit');
const Doctor = require('../doctor/Doctor');
const User = require('./../user/User');
const Location = require('../location/Location');

// Haversine formula for distance calculation
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// CREATE a new doctor visit
router.post('/', async (req, res) => {
  try {
    const { doctorId, userId, date, notes } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newVisit = new DoctorVisit({
      doctor: doctorId,
      user: userId,
      date,
      notes,
    });
    await newVisit.save();
    res.status(201).json({ message: 'Visit created', visit: newVisit });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET all visits
router.get('/', async (req, res) => {
  try {
    const visits = await DoctorVisit.find()
      .populate('doctor', 'name specialization')
      .populate('user', 'name email');
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CONFIRM a visit
// CONFIRM a visit
router.put('/:visitId/confirm', async (req, res) => {
  try {
    const visit = await DoctorVisit.findById(req.params.visitId).populate('doctor');
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    let userLatitude = req.body.userLatitude;
    let userLongitude = req.body.userLongitude;

    // If coordinates not provided, fetch the latest from Location model
    if (!userLatitude || !userLongitude) {
      const user = await User.findById(visit.user);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const latestLocation = await Location.findOne({ userId: user._id }).sort({ timestamp: -1 });
      if (!latestLocation) {
        return res.status(400).json({ message: 'No recent user location available. Please provide current location.' });
      }

      userLatitude = latestLocation.latitude;
      userLongitude = latestLocation.longitude;
    }

    const doctor = visit.doctor;

    // Check if doctor's location is available for distance calculation
    if (doctor.latitude && doctor.longitude) {
      // Calculate distance
      const distance = getDistance(
        userLatitude,
        userLongitude,
        doctor.latitude,
        doctor.longitude
      );

      // Check if distance is within 200 meters
      if (distance > 200) {
        return res.status(200).json({
          status: false,
          message: `You are ${Math.round(distance)} meters away from the doctor's location. Please be within 200 meters to confirm the visit.`,
        });
      }
    } else {
      // Log that doctor's location is not available, but proceed with confirmation
      console.log(`Doctor ${doctor._id} has no location data. Skipping distance check.`);
    }

    // Confirm the visit and save user's location
    visit.confirmed = true;
    visit.latitude = userLatitude;
    visit.longitude = userLongitude;
    await visit.save();

    res.status(200).json({
      status: true,
      message: 'Visit confirmed successfully',
    });
  } catch (error) {
    console.error('Confirm visit error:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE (reschedule) a visit
router.put('/:visitId', async (req, res) => {
  try {
    const { doctorId, date, notes } = req.body;
    const visit = await DoctorVisit.findById(req.params.visitId);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    // Optionally allow changing the doctor
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
      visit.doctor = doctorId;
    }

    // Update date and notes
    if (date)  visit.date  = date;
    if (notes) visit.notes = notes;

    await visit.save();
    res.json({ message: 'Visit rescheduled', visit });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// GET visits by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const visits = await DoctorVisit.find({ user: req.params.userId })
      .populate('doctor', 'name specialization')
      .populate('user', 'name');
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;