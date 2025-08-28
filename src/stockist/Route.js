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

    // Extract headOffice ID if object is sent
    let headOfficeId = headOffice;
    if (typeof headOffice === 'object' && headOffice._id) {
      headOfficeId = headOffice._id;
    }

    if (!mongoose.Types.ObjectId.isValid(headOfficeId)) {
      return res.status(400).json({ message: 'Invalid Head Office ID' });
    }

    const officeExists = await HeadOffice.findById(headOfficeId);
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
      headOffice: headOfficeId,
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

// GET stockists for current user's head offices (using token) - MUST BE BEFORE /:id
router.get('/my-stockists', require('../middleware/authMiddleware'), async (req, res) => {
  try {
    const User = require('../user/User');
    
    // Get user from token
    const user = await User.findById(req.user.id)
      .populate('headOffice', '_id name code')
      .populate('headOffices', '_id name code');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all user's head office IDs
    let headOfficeIds = [];
    
    if (user.headOffices && user.headOffices.length > 0) {
      headOfficeIds = user.headOffices.map(office => office._id);
    } else if (user.headOffice) {
      headOfficeIds = [user.headOffice._id];
    }

    if (headOfficeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No head office assigned to your account. Please contact an administrator.'
      });
    }

    // Find all stockists assigned to user's head offices
    const stockists = await Stockist.find({ 
      headOffice: { $in: headOfficeIds } 
    }).populate('headOffice', 'name code');

    res.json({
      success: true,
      count: stockists.length,
      data: stockists,
      userHeadOffices: user.headOffices || [user.headOffice]
    });
  } catch (error) {
    console.error('Get my stockists error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// PUT: Update a stockist
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStockist = await Stockist.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedStockist) {
      return res.status(404).json({ message: 'Stockist not found' });
    }
    res.status(200).json(updatedStockist);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

// Get all visits (for admin)
router.get('/visits', async (req, res) => {
  try {
    const visits = await StockistVisit.find().populate('stockist').populate('user');
    res.status(200).json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        success: false,
        message: 'Visit not found',
        Data: [] // No data returned
      });
    }

    // If no latitude/longitude provided, fetch the user's last known location
    if (!userLatitude || !userLongitude) {
      const latestLocation = await Location.findOne({ userId: visit.user }).sort({ timestamp: -1 });
      if (!latestLocation) {
        return res.status(400).json({
          success: false,
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
        success: false,
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


    if (distance > 200) {
      return res.status(200).json({
        success: false,
        message: `You are ${Math.round(distance)} meters away from the stockist. Please be within 200 meters to confirm.`,
        Data: [] 
      });
    }


    visit.confirmed = true;
    visit.latitude = userLatitude;
    visit.longitude = userLongitude;
    await visit.save();


    res.status(200).json({
      success: true,
      message: "Visit confirmed successfully",
      Data: [] 
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      Data: [] 
    });
  }
});


router.get('/by-head-office/:headOfficeId', async (req, res) => {
  try {
    // Validate headOfficeId format
    if (!mongoose.Types.ObjectId.isValid(req.params.headOfficeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Head Office ID format.',
 
      });
    }

    // Fetch stockists by head office ID and populate the related head office data
    const stockists = await Stockist.find({ headOffice: req.params.headOfficeId }).populate('headOffice');

    // Check if no stockists are found
    if (stockists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No stockists found for the specified head office.',
    
      });
    }


    res.status(200).json({
      success: true,
      message: 'Stockists successfully retrieved.',
      data: stockists,
    });
  } catch (error) {
    // Log the error for internal tracking
    console.error('Error fetching stockists by head office:', error);

    // Return a professional error response
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching stockists. Please try again later.',
 
    });
  }
})








module.exports = router;