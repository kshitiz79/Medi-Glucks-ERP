// backend/routes/doctorVisits.js
const express = require('express');
const router = express.Router();
const DoctorVisit = require('./DoctorVisit');
const Doctor = require('./../doctor/Doctor');
const User = require('./../user/User');

// CREATE a new doctor visit
router.post('/', async (req, res) => {
    try {
      const { doctorId, userId, date, notes } = req.body;
  
      // Optional: verify these exist
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
        .populate('doctor', 'name specialization') // get doc details
        .populate('user', 'name email');           // get user details
      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // CONFIRM a visit
  router.put('/:visitId/confirm', async (req, res) => {
    try {
      const visit = await DoctorVisit.findById(req.params.visitId);
      if (!visit) return res.status(404).json({ message: 'Visit not found' });
  
      visit.confirmed = true;
      await visit.save();
      res.json({ message: 'Visit confirmed', visit });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  


  // GET /api/doctor-visits/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const visits = await DoctorVisit.find({ user: req.params.userId })
      .populate('doctor', 'name specialization')
      .populate('user', 'name');
    res.json(visits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

  // Optional: routes for GET one, DELETE, etc.
  
  module.exports = router;