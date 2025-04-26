// src/routes/chemistRoutes.js
const express = require('express');
const router = express.Router();
const Chemist = require('./../chemist/Chemist');
const ChemistVisit = require('./../chemistVisite/ChemistVisite');
const HeadOffice = require('./../headoffice/Model');
const Location = require('./../location/Location');
const mongoose = require('mongoose');

// Helper function to calculate distance (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// POST: Create a new chemist
router.post('/', async (req, res) => {
  try {
    const {
      firmName,
      contactPersonName,
      designation,
      mobileNo,
      emailId,
      drugLicenseNumber,
      gstNo,
      address,
      latitude,
      longitude,
      yearsInBusiness,
      annualTurnover,
      headOffice,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(headOffice)) {
      return res.status(400).json({ message: 'Invalid Head Office ID' });
    }

    const officeExists = await HeadOffice.findById(headOffice);
    if (!officeExists) {
      return res.status(400).json({ message: 'Head Office does not exist' });
    }

    const chemist = new Chemist({
      firmName,
      contactPersonName,
      designation,
      mobileNo,
      emailId,
      drugLicenseNumber,
      gstNo,
      address,
      latitude,
      longitude,
      yearsInBusiness,
      annualTurnover,
      headOffice,
    });

    await chemist.save();
    res.status(201).json(chemist);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// GET: Fetch all chemists
router.get('/', async (req, res) => {
  try {
    const chemists = await Chemist.find().populate('headOffice');
    res.status(200).json(chemists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE: Delete a chemist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chemist = await Chemist.findByIdAndDelete(id);
    if (!chemist) {
      return res.status(404).json({ message: 'Chemist not found' });
    }
    res.status(200).json({ message: 'Chemist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Schedule a chemist visit
router.post('/visits', async (req, res) => {
  try {
    const { chemistId, userId, date, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chemistId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid Chemist ID or User ID' });
    }

    const chemist = await Chemist.findById(chemistId);
    if (!chemist) {
      return res.status(404).json({ message: 'Chemist not found' });
    }

    const visit = new ChemistVisit({
      chemist: chemistId,
      user: userId,
      date,
      notes,
    });

    await visit.save();
    res.status(201).json(visit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET: Fetch visits for a user
router.get('/visits/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    const visits = await ChemistVisit.find({ user: userId }).populate('chemist');
    res.status(200).json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT: Confirm a chemist visit with location validation
router.put('/visits/:visitId/confirm', async (req, res) => {
  try {
    const { visitId } = req.params;
    let { userLatitude, userLongitude } = req.body;

    const visit = await ChemistVisit.findById(visitId).populate('chemist');
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    if (!userLatitude || !userLongitude) {
      const latestLocation = await Location.findOne({ userId: visit.user }).sort({ timestamp: -1 });
      if (!latestLocation) {
        return res.status(400).json({ message: 'No recent user location available. Please provide current location.' });
      }
      userLatitude = latestLocation.latitude;
      userLongitude = latestLocation.longitude;
    }

    if (!visit.chemist.latitude || !visit.chemist.longitude) {
      return res.status(400).json({ message: 'Chemist location not available.' });
    }

    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      visit.chemist.latitude,
      visit.chemist.longitude
    );

    if (distance > 200) {
      return res.status(400).json({
        message: `You are ${Math.round(distance)} meters away from the chemist. Please be within 200 meters to confirm.`,
      });
    }

    visit.confirmed = true;
    visit.latitude = userLatitude;
    visit.longitude = userLongitude;
    await visit.save();

    res.status(200).json(visit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;