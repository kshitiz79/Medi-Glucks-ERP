const express = require('express');
const router = express.Router();
const Doctor = require('./Doctor');
const User = require('../user/User');
const authMiddleware = require('./../middleware/authMiddleware');
const HeadOffice = require('../headoffice/Model');
const { validateObjectId, isValidObjectId } = require('../middleware/validateObjectId');

// Middleware to log all requests (commented out to reduce terminal noise)
// router.use((req, res, next) => {
//   console.log(`Doctor route hit: ${req.method} ${req.originalUrl}`);
//   console.log('Route params:', req.params);
//   console.log('Query params:', req.query);
//   next();
// });


// Test route to verify routing is working
router.get('/test', (req, res) => {
  console.log('=== TEST ROUTE HIT ===');
  res.json({
    success: true,
    message: 'Doctor routes are working',
    timestamp: new Date().toISOString()
  });
});

// GET all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('headOffice');
    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET doctors for current user's head offices (using token) - MUST BE BEFORE /:id
router.get('/my-doctors', (req, res, next) => {
  console.log('=== MY-DOCTORS ROUTE HIT ===');
  console.log('URL:', req.originalUrl);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  next();
}, authMiddleware, async (req, res) => {
  try {
    console.log('My-doctors route authenticated with user:', req.user?.id);

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

    // Find all doctors assigned to user's head offices
    const doctors = await Doctor.find({
      headOffice: { $in: headOfficeIds }
    }).populate('headOffice', 'name code');

    console.log(`Found ${doctors.length} doctors for user ${req.user.id}`);

    // Return same format as /by-head-office/:headOfficeId for consistency
    res.json(doctors);
  } catch (error) {
    console.error('Get my doctors error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// GET doctor by ID - with parameter validation middleware
router.get('/:id', (req, res, next) => {
  // Clean up the ID parameter
  if (req.params.id) {
    const originalId = req.params.id;
    req.params.id = req.params.id.trim();
    if (originalId !== req.params.id) {
      console.log(`Cleaned ID parameter: "${originalId}" -> "${req.params.id}"`);
    }
  }
  next();
}, async (req, res) => {
  try {
    const id = req.params.id;

    // Prevent specific route conflicts
    if (id === 'my-doctors' || id.includes('my-doctors')) {
      console.log(`Route conflict detected: "${id}" should use /my-doctors endpoint`);
      return res.status(400).json({
        success: false,
        message: 'Invalid route. Use /my-doctors endpoint instead.'
      });
    }

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }

    const doctor = await Doctor.findById(id).populate('headOffice');
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// CREATE a new doctor

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, specialization, location, latitude, longitude, email, phone, registration_number, years_of_experience, date_of_birth, gender, anniversary } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Doctor name is required' });
    }

    // Fetch user to get headOffice
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.headOffice) {
      return res.status(400).json({ message: 'No head office assigned to user' });
    }

    // Verify headOffice exists
    const headOfficeExists = await HeadOffice.findById(user.headOffice);
    if (!headOfficeExists) {
      return res.status(400).json({ message: `Head Office with ID ${user.headOffice} does not exist` });
    }

    const doctor = new Doctor({
      name,
      specialization,
      location,
      latitude,
      longitude,
      email,
      phone,
      registration_number,
      years_of_experience,
      date_of_birth,
      gender,
      anniversary,
      headOffice: user.headOffice,
    });

    const newDoctor = await doctor.save();
    res.status(201).json(newDoctor);
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(400).json({ message: error.message || 'Failed to create doctor' });
  }
});





// UPDATE a doctor
router.put('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    doctor.name = req.body.name || doctor.name;
    doctor.specialization = req.body.specialization || doctor.specialization;
    doctor.location = req.body.location || doctor.location;
    doctor.latitude = req.body.latitude !== undefined ? req.body.latitude : doctor.latitude;
    doctor.longitude = req.body.longitude !== undefined ? req.body.longitude : doctor.longitude;
    doctor.email = req.body.email || doctor.email;
    doctor.phone = req.body.phone || doctor.phone;
    doctor.registration_number = req.body.registration_number || doctor.registration_number;
    doctor.years_of_experience = req.body.years_of_experience || doctor.years_of_experience;
    doctor.date_of_birth = req.body.date_of_birth || doctor.date_of_birth;
    doctor.gender = req.body.gender || doctor.gender;
    doctor.anniversary = req.body.anniversary || doctor.anniversary;
    doctor.headOffice = req.body.headOffice || doctor.headOffice;

    const updatedDoctor = await doctor.save();
    res.json(updatedDoctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a doctor
router.delete('/:id', async (req, res) => {
  try {
    const deletedDoctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!deletedDoctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new visit
router.post('/:id/visit', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { date, notes, userName, salesRep } = req.body;
    doctor.visit_history.push({ date, notes, userName, salesRep });
    await doctor.save();
    res.status(201).json({ message: 'Visit added', doctor });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Confirm a visit
router.put('/:id/visit/:visitId/confirm', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const visit = doctor.visit_history.id(req.params.visitId);
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    visit.confirmed = true;
    await doctor.save();
    res.json({ message: 'Visit confirmed', doctor });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET doctors by HeadOffice ID
router.get('/by-head-office/:headOfficeId', async (req, res) => {
  try {
    const doctors = await Doctor.find({ headOffice: req.params.headOfficeId }).populate('headOffice');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;