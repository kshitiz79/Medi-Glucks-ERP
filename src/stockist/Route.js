// src/routes/stockistRoutes.js
const express = require('express');
const router = express.Router();
const Stockist = require('./../stockist/Stockist');
const StockistVisit = require('./../stockistVisite/StockistVisit');
const HeadOffice = require('./../headoffice/Model');
const Location = require('./../location/Location');
const mongoose = require('mongoose');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

router.post('/', async (req, res) => {
  try {
    const {
      firmName,
      registeredBusinessName,
      natureOfBusiness,
      gstNumber,
      drugLicenseNumber,
      panNumber,
      registeredOfficeAddress,
      latitude,
      longitude,
      contactPerson,
      designation,
      mobileNumber,
      emailAddress,
      website,
      yearsInBusiness,
      areasOfOperation,
      currentPharmaDistributorships,
      annualTurnover,
      warehouseFacility,
      storageFacilitySize,
      coldStorageAvailable,
      numberOfSalesRepresentatives,
      bankDetails,
      headOffice,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(headOffice)) {
      return res.status(400).json({ message: 'Invalid Head Office ID' });
    }

    const officeExists = await HeadOffice.findById(headOffice);
    if (!officeExists) {
      return res.status(400).json({ message: 'Head Office does not exist' });
    }

    const stockist = new Stockist({
      firmName,
      registeredBusinessName,
      natureOfBusiness,
      gstNumber,
      drugLicenseNumber,
      panNumber,
      registeredOfficeAddress,
      latitude,
      longitude,
      contactPerson,
      designation,
      mobileNumber,
      emailAddress,
      website,
      yearsInBusiness,
      areasOfOperation,
      currentPharmaDistributorships,
      annualTurnover,
      warehouseFacility,
      storageFacilitySize,
      coldStorageAvailable,
      numberOfSalesRepresentatives,
      bankDetails,
      headOffice,
    });

    await stockist.save();
    res.status(201).json(stockist);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const stockists = await Stockist.find().populate('headOffice');
    res.status(200).json(stockists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stockist = await Stockist.findByIdAndDelete(id);
    if (!stockist) {
      return res.status(404).json({ message: 'Stockist not found' });
    }
    res.status(200).json({ message: 'Stockist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/visits', async (req, res) => {
  try {
    const { stockistId, userId, date, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(stockistId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid Stockist ID or User ID' });
    }

    const stockist = await Stockist.findById(stockistId);
    if (!stockist) {
      return res.status(404).json({ message: 'Stockist not found' });
    }

    const visit = new StockistVisit({
      stockist: stockistId,
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

router.get('/visits/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    const visits = await StockistVisit.find({ user: userId }).populate('stockist');
    res.status(200).json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/visits/:visitId/confirm', async (req, res) => {
  try {
    const { visitId } = req.params;
    let { userLatitude, userLongitude } = req.body;

    const visit = await StockistVisit.findById(visitId).populate('stockist');
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

    if (!visit.stockist.latitude || !visit.stockist.longitude) {
      return res.status(400).json({ message: 'Stockist location not available.' });
    }

    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      visit.stockist.latitude,
      visit.stockist.longitude
    );

    if (distance > 200) {
      return res.status(400).json({
        message: `You are ${Math.round(distance)} meters away from the stockist. Please be within 200 meters to confirm.`,
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