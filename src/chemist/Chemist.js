// src/models/Chemist.js
const mongoose = require('mongoose');

const chemistSchema = new mongoose.Schema({
  firmName: { type: String, required: true },
  contactPersonName: { type: String ,required: true },
  designation: { type: String },
  mobileNo: { type: String, required: true },
  emailId: { type: String, unique: true },
  drugLicenseNumber: { type: String, unique: true },
  gstNo: { type: String },
  address: { type: String ,required: true},
  latitude: { type: Number },
  longitude: { type: Number },
  yearsInBusiness: { type: Number },
  annualTurnover: { type: Number },
  headOffice: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'HeadOffice', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Chemist', chemistSchema);












