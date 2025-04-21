const mongoose = require('mongoose');

const stockistSchema = new mongoose.Schema({
  firmName: { type: String, required: true }, // Required for identification
  registeredBusinessName: { type: String },
  natureOfBusiness: {
    type: String,
    enum: ['Proprietorship', 'Partnership', 'Private Ltd.', 'Public Ltd.'],
    required: true, // Required to define business type
  },
  gstNumber: { type: String },
  drugLicenseNumber: { type: String },
  panNumber: { type: String },
  registeredOfficeAddress: { type: String },
  contactPerson: { type: String },
  designation: { type: String },
  mobileNumber: { type: String },
  emailAddress: { type: String },
  website: { type: String },
  yearsInBusiness: { type: Number },
  areasOfOperation: { type: [String] },
  currentPharmaDistributorships: { type: [String] },
  annualTurnover: [
    {
      year: { type: Number },
      amount: { type: Number },
    },
  ],
  warehouseFacility: { type: Boolean, default: false },
  storageFacilitySize: { type: Number }, // In square feet
  coldStorageAvailable: { type: Boolean, default: false },
  numberOfSalesRepresentatives: { type: Number },
  bankDetails: {
    bankName: { type: String },
    branch: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Stockist', stockistSchema);