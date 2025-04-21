const mongoose = require('mongoose');

const chemistSchema = new mongoose.Schema({
  firmName: { type: String, required: true }, // Required for identification
  contactPersonName: { type: String },
  designation: { type: String },
  mobileNo: { type: String },
  emailId: { type: String },
  drugLicenseNumber: { type: String },
  gstNo: { type: String },
  address: { type: String },
  yearsInBusiness: { type: Number },
  annualTurnover: { type: Number }, // Single value for simplicity, can be array if needed
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Chemist', chemistSchema);