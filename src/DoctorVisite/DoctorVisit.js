// backend/models/DoctorVisit.js
const mongoose = require('mongoose');

const doctorVisitSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
  },
  latitude: { type: Number }, 
  longitude: { type: Number }, 
  confirmed: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('DoctorVisit', doctorVisitSchema);
