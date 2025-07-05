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
  latitude: { 
    type: Number 
  }, 
  longitude: { 
    type: Number 
  }, 
  confirmed: {
    type: Boolean,
    default: false,
  },
  remark: {
    type: String,
    required: false, // Remark is optional
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false, // Product is optional
  },
}, { timestamps: true });

module.exports = mongoose.model('DoctorVisit', doctorVisitSchema);