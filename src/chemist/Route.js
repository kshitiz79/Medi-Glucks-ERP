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
// Inside POST: Create a new chemist
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
      annualTurnover, // Now expects an array of { year, amount }
      headOffice,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(headOffice)) {
      return res.status(400).json({
        success: "false",
        message: 'Invalid Head Office ID',
        Data: []
      });
    }

    const officeExists = await HeadOffice.findById(headOffice);
    if (!officeExists) {
      return res.status(400).json({
        success: "false",
        message: 'Head Office does not exist',
        Data: []
      });
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
      annualTurnover: annualTurnover || [], // Default to empty array if not provided
      headOffice,
    });

    await chemist.save();
    res.status(201).json({
      success: "true",
      message: "Chemist added successfully",
      Data: chemist
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: "false",
      message: error.message,
      Data: []
    });
  }
});

// GET: Fetch all chemists
router.get('/', async (req, res) => {
  try {
    const chemists = await Chemist.find().populate('headOffice');
    res.status(200).json({
      success: "true",
      message: "Chemists fetched successfully",
      Data: chemists
    });
  } catch (error) {
    res.status(500).json({
      success: "false",
      message: error.message,
      Data: []
    });
  }
});

// DELETE: Delete a chemist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chemist = await Chemist.findByIdAndDelete(id);
    if (!chemist) {
      return res.status(404).json({
        success: "false",
        message: 'Chemist not found',
        Data: []
      });
    }
    res.status(200).json({
      success: "true",
      message: 'Chemist deleted successfully',
      Data: []
    });
  } catch (error) {
    res.status(500).json({
      success: "false",
      message: error.message,
      Data: []
    });
  }
});

// POST: Schedule a chemist visit
router.post('/visits', async (req, res) => {
  try {
    const { chemistId, userId, date, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chemistId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: "false",
        message: 'Invalid Chemist ID or User ID',
        Data: []
      });
    }

    const chemist = await Chemist.findById(chemistId);
    if (!chemist) {
      return res.status(404).json({
        success: "false",
        message: 'Chemist not found',
        Data: []
      });
    }

    const visit = new ChemistVisit({
      chemist: chemistId,
      user: userId,
      date,
      notes,
    });

    await visit.save();
    res.status(201).json({
      success: "true",
      message: "Visit scheduled successfully",
      Data: visit
    });
  } catch (error) {
    res.status(400).json({
      success: "false",
      message: error.message,
      Data: []
    });
  }
});

// GET: Fetch visits for a user
router.get('/visits/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: "false",
        message: 'Invalid User ID',
        Data: []
      });
    }

    const visits = await ChemistVisit.find({ user: userId }).populate('chemist');
    res.status(200).json({
      success: "true",
      message: "Visits fetched successfully",
      Data: visits
    });
  } catch (error) {
    res.status(500).json({
      success: "false",
      message: error.message,
      Data: []
    });
  }
});

// PUT: Confirm a chemist visit with location validation
router.put('/visits/:visitId/confirm', async (req, res) => {
  try {
    const { visitId } = req.params;
    let { userLatitude, userLongitude } = req.body;

    const visit = await ChemistVisit.findById(visitId).populate('chemist');
    if (!visit) {
      return res.status(404).json({
        success: "false",
        message: 'Visit not found',
        Data: []  // No data returned in case of failure
      });
    }

    if (!userLatitude || !userLongitude) {
      const latestLocation = await Location.findOne({ userId: visit.user }).sort({ timestamp: -1 });
      if (!latestLocation) {
        return res.status(400).json({
          success: false,
          message: 'No recent user location available. Please provide current location.',
          Data: []  // No data returned in case of failure
        });
      }
      userLatitude = latestLocation.latitude;
      userLongitude = latestLocation.longitude;
    }

    if (!visit.chemist.latitude || !visit.chemist.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Chemist location not available.',
        Data: []  // No data returned in case of failure
      });
    }

    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      visit.chemist.latitude,
      visit.chemist.longitude
    );

    
    if (distance > 200) {
      return res.status(200).json({
        success: false,
        message: `You are ${Math.round(distance)} meters away from the chemist. Please be within 200 meters to confirm.`,
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
      Data: []  // No data returned after confirmation
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
    // Validate headOfficeId format (optional but recommended)
    if (!mongoose.Types.ObjectId.isValid(req.params.headOfficeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Head Office ID format.',

      });
    }

    // Fetch chemists by head office ID and populate the related head office data
    const chemists = await Chemist.find({ headOffice: req.params.headOfficeId }).populate('headOffice');

    // Check if any chemists are found
    if (chemists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No chemists found for the specified head office.',

      });
    }

    // Return the found chemists with a success message
    res.status(200).json({
      success: true,
      message: 'Chemists successfully retrieved.',
      data: chemists,
    });
  } catch (error) {
    // Log the error for internal tracking
    console.error('Error fetching chemists by head office:', error);

    // Return a professional error response with a message
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching chemists. Please try again later.',
     
    });
  }
});






module.exports = router;
