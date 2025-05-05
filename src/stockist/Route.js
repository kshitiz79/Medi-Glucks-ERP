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

// Inside POST: Create a new stockist
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

    // Validate annualTurnover for last two years (2024 and 2023)
    const currentYear = new Date().getFullYear();
    const requiredYears = [currentYear - 1, currentYear - 2]; // e.g., [2024, 2023]
    const turnoverYears = annualTurnover ? annualTurnover.map(t => t.year) : [];

    const missingYears = requiredYears.filter(year => !turnoverYears.includes(year));
    if (missingYears.length > 0) {
      return res.status(400).json({
        message: `Annual turnover data for years ${missingYears.join(', ')} is mandatory.`,
      });
    }

    // Ensure amounts are provided and valid
    for (const turnover of annualTurnover || []) {
      if (!turnover.year || !turnover.amount || turnover.amount <= 0) {
        return res.status(400).json({
          message: 'Invalid turnover data. Year and positive amount are required.',
        });
      }
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

    // Fetch the visit and populate the stockist data
    const visit = await StockistVisit.findById(visitId).populate('stockist');
    if (!visit) {
      return res.status(404).json({
        success: "false",
        message: 'Visit not found',
        Data: [] // No data returned
      });
    }

    // If no latitude/longitude provided, fetch the user's last known location
    if (!userLatitude || !userLongitude) {
      const latestLocation = await Location.findOne({ userId: visit.user }).sort({ timestamp: -1 });
      if (!latestLocation) {
        return res.status(400).json({
          success: "false",
          message: 'No recent user location available. Please provide current location.',
          Data: [] // No data returned
        });
      }
      userLatitude = latestLocation.latitude;
      userLongitude = latestLocation.longitude;
    }

    // Ensure stockist location is available
    if (!visit.stockist.latitude || !visit.stockist.longitude) {
      return res.status(400).json({
        success: "false",
        message: 'Stockist location not available.',
        Data: [] // No data returned
      });
    }

    // Calculate the distance between the user and the stockist
    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      visit.stockist.latitude,
      visit.stockist.longitude
    );

    // If the user is more than 200 meters away, return a failure message
    if (distance > 200) {
      return res.status(200).json({
        success: "false",
        message: `You are ${Math.round(distance)} meters away from the stockist. Please be within 200 meters to confirm.`,
        Data: [] // No data returned
      });
    }

    // Confirm the visit if within the allowed distance
    visit.confirmed = true;
    visit.latitude = userLatitude;
    visit.longitude = userLongitude;
    await visit.save();

    // Return success message without data
    res.status(200).json({
      success: "true",
      message: "Visit confirmed successfully",
      Data: [] // No data returned after confirmation
    });

  } catch (error) {
    res.status(400).json({
      success: "false",
      message: error.message,
      Data: [] // No data returned in case of error
    });
  }
});



router.get('/by-head-office/:headOfficeId', async (req, res) => {
  try {
    const stockists = await Stockist.find({ headOffice: req.params.headOfficeId }).populate('headOffice');
    res.json(stockists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});









module.exports = router;