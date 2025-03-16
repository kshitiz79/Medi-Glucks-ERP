// backend/routes/doctor.js
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
    email,
    phone,
    registration_number,
    years_of_experience,
    date_of_birth,
    gender,
    anniversary,
    head_office, // Expect head_office to be the ObjectId of a HeadOffice
  } = req.body;

  const doctor = new Doctor({
    name,
    specialization,
    location,
    email,
    phone,
    registration_number,
    years_of_experience,
    date_of_birth,
    gender,
    anniversary,
    headOffice: head_office,
  });

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
    doctor.email = req.body.email || doctor.email;
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
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    await doctor.remove();
    res.json({ message: 'Doctor deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.post('/:id/visit', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.visit_history.push(req.body);
    await doctor.save();
    res.status(201).json({ message: 'Visit added', doctor });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Confirm (or unconfirm) a specific visit
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



module.exports = router;
