const express = require('express');
const router = express.Router();
const Doctor = require('./Doctor');

// GET all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('headOffice');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('headOffice');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE a new doctor
router.post('/', async (req, res) => {
  const {
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
    head_office,
  } = req.body;

  const doctorData = {
    name,
    specialization,
    location,
    latitude,
    longitude,
    phone,
    registration_number,
    years_of_experience,
    date_of_birth,
    gender,
    anniversary,
    headOffice: head_office,
  };

  // Only set email if it is provided and non-empty
  if (email && email.trim() !== '') {
    doctorData.email = email;
  }

  const doctor = new Doctor(doctorData);

  try {
    const newDoctor = await doctor.save();
    res.status(201).json(newDoctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// UPDATE a doctor
router.put('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Update fields if provided
    doctor.name = req.body.name || doctor.name;
    doctor.specialization = req.body.specialization || doctor.specialization;
    doctor.location = req.body.location || doctor.location;
    doctor.latitude = req.body.latitude !== undefined ? req.body.latitude : doctor.latitude;
    doctor.longitude = req.body.longitude !== undefined ? req.body.longitude : doctor.longitude;
    if (req.body.email && req.body.email.trim() !== '') {
      doctor.email = req.body.email; // Only update email if provided and non-empty
    } else if (req.body.email === null || req.body.email === '') {
      doctor.email = undefined; // Remove email if explicitly set to null or empty
    }
    doctor.phone = req.body.phone || doctor.phone;
    doctor.registration_number = req.body.registration_number || doctor.registration_number;
    doctor.years_of_experience = req.body.years_of_experience || doctor.years_of_experience;
    doctor.date_of_birth = req.body.date_of_birth || doctor.date_of_birth;
    doctor.gender = req.body.gender || doctor.gender;
    doctor.anniversary = req.body.anniversary || doctor.anniversary;
    doctor.headOffice = req.body.head_office || doctor.headOffice;

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
